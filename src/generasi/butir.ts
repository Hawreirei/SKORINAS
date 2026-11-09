import type { HurufOpsi, IsiSoal, ParameterPaket, Slot } from '../db/tipe';
import { GalatAi } from '../ai/galat';
import type { JawabanAi } from '../ai/tipe';
import { bacaIsiSoal, ekstrakJson, GalatSkema } from '../verifikasi/skema';
import { periksaSoal, type HasilPeriksa } from '../verifikasi';
import { seimbangkanKunci } from '../verifikasi/acak';
import { periksaPengaturan, terapkanPengaturan } from '../verifikasi/pengaturan';
import { periksaStimulus } from '../verifikasi/stimulus';
import { susunPesan, susunPesanKelompok, SISTEM, SISTEM_KELOMPOK, type ButirDiminta } from './prompt';
import { teksPembanding } from '../db/tipe';
import { teksPolos } from '../matematika/teks';

export const MAKS_PERCOBAAN = 3;

export interface Percobaan {
  jawaban: JawabanAi | null;
  alasan: string[];
  isi: IsiSoal | null;
}

export interface HasilButir {
  ok: boolean;
  isi: IsiSoal | null;
  periksa: HasilPeriksa | null;
  percobaan: Percobaan[];
  /** Galat yang menghentikan pekerjaan (kunci, batas, jaringan). */
  henti: GalatAi | null;
}

export interface MasukanButir {
  param: ParameterPaket;
  slot: Slot;
  pokokLain: string[];
  kunciTerpakai: Partial<Record<HurufOpsi, number>>;
  revisi?: { lama: IsiSoal; catatan: string } | null;
  /**
   * Konteks paket terbaru (soal lain dan sebaran kunci). Bila ada, dibaca ulang tiap percobaan sehingga
   * butir yang dikerjakan serentak saling melihat soal yang sudah tersimpan.
   */
  konteks?: () => Promise<{ pokokLain: string[]; kunciTerpakai: Partial<Record<HurufOpsi, number>> }>;
  maksPercobaan?: number;
  signal?: AbortSignal;
  /**
   * Bacaan bersama kelompok slot ini (F-40). `teks` bila sudah ada; bila belum, `ambil` membuatnya sekali untuk
   * seluruh kelompok (pengatur mencegah pembuatan ganda saat butir dikerjakan serentak).
   */
  bacaan?: { id: string; teks: string | null; ambil?: (kirim: Pengirim, signal?: AbortSignal, catat?: PencatatPercobaan) => Promise<string> } | null;
}

export type Pengirim = (sistem: string, pesan: string, signal?: AbortSignal, opsi?: { maksKeluar?: number }) => Promise<JawabanAi>;
export type PencatatPercobaan = (p: Percobaan, lolos: boolean) => Promise<void> | void;

/** Galat yang tidak akan membaik dengan mencoba ulang butir yang sama. */
export function harusBerhenti(g: GalatAi): boolean {
  return g.jenis === 'kunci' || g.jenis === 'batas' || g.jenis === 'jaringan' || g.jenis === 'dibatalkan' || (g.jenis === 'model' && g.status === 404);
}

/**
 * Buat satu butir: generasi terstruktur, validasi skema, verifikasi, kaidah.
 * Gagal berarti dibuat ulang dengan alasan penolakan, maksimal tiga percobaan.
 */
export async function buatButir(kirim: Pengirim, m: MasukanButir, catat?: PencatatPercobaan): Promise<HasilButir> {
  const percobaan: Percobaan[] = [];
  let alasan: string[] = [];
  const maks = m.maksPercobaan ?? MAKS_PERCOBAAN;
  const tp = m.param.tp[m.slot.tp_index];
  let teksBacaan = m.bacaan?.teks ?? null;
  for (let i = 0; i < maks; i++) {
    if (m.signal?.aborted) return { ok: false, isi: null, periksa: null, percobaan, henti: new GalatAi('dibatalkan', 'Dibatalkan.') };
    // Jatah harian yang dipesan pembatas laju dilepas setelah percobaan ini tercatat (atau tidak akan tercatat).
    let lepas: (() => void) | undefined;
    try {
      if (m.bacaan && !teksBacaan) {
        if (!m.bacaan.ambil) throw new Error('Bacaan bersama belum ada.');
        try {
          teksBacaan = await m.bacaan.ambil(kirim, m.signal, catat);
        } catch (e) {
          const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
          lepas = g.lepas;
          percobaan.push({ jawaban: null, alasan: [g.message], isi: null });
          if (harusBerhenti(g)) return { ok: false, isi: null, periksa: null, percobaan, henti: g };
          alasan = [g.message];
          continue;
        }
      }
      const ctx = m.konteks ? await m.konteks() : { pokokLain: m.pokokLain, kunciTerpakai: m.kunciTerpakai };
      const pesan = susunPesan({ param: m.param, slot: m.slot, pokokLain: ctx.pokokLain, alasanGagal: alasan, revisi: m.revisi, bacaan: teksBacaan });
      let jawaban: JawabanAi;
      try {
        jawaban = await kirim(SISTEM, pesan, m.signal);
        lepas = jawaban.lepas;
      } catch (e) {
        const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
        lepas = g.lepas;
        const p: Percobaan = { jawaban: null, alasan: [g.message], isi: null };
        percobaan.push(p);
        if (harusBerhenti(g)) return { ok: false, isi: null, periksa: null, percobaan, henti: g };
        alasan = [g.message];
        await catat?.(p, false);
        continue;
      }
      let isi: IsiSoal;
      try {
        isi = bacaIsiSoal(ekstrakJson(jawaban.teks), { bentuk: m.slot.bentuk, level: m.slot.level, kesukaran: m.slot.kesukaran, tp: tp.rumusan, kategori: m.param.atur_bentuk?.kategori?.label });
      } catch (e) {
        alasan = e instanceof GalatSkema ? e.daftar : [(e as Error).message];
        const p = { jawaban, alasan, isi: null };
        percobaan.push(p);
        await catat?.(p, false);
        continue;
      }
      isi = terapkanPengaturan(isi, m.param.atur_bentuk);
      if (m.bacaan && teksBacaan) isi = { ...isi, stimulus: { id: m.bacaan.id, teks: teksBacaan } };
      const terbaru = m.konteks ? await m.konteks() : ctx;
      const periksa = periksaSoal(isi, {
        rumpun: m.param.rumpun,
        kelas: m.param.kelas,
        fase: m.param.fase,
        lokal: m.param.bahasa === 'en' ? 'en' : 'id',
        literasi: (m.slot.gaya ?? m.param.gaya) === 'literasi' || m.param.wajib_stimulus,
        pokokLain: terbaru.pokokLain,
        gambarDiizinkan: m.param.gambar !== 'mati',
        opsiPg: m.param.opsi_pg ? { jumlah: m.param.opsi_pg, wajib: true } : null,
      });
      // Rincian tiap bentuk dari guru (jumlah jawaban benar, pasangan, jenis jawaban isian) juga wajib dipenuhi.
      const langgar = [
        ...periksaPengaturan(isi, m.param.atur_bentuk, m.param.bahasa === 'en' ? 'en' : 'id'),
        // Paket berstimulus wajib (mis. TKA): soal tanpa cerita atau bacaan yang cukup dibuat ulang.
        ...(m.param.wajib_stimulus && !isi.stimulus ? periksaStimulus(isi, { kelas: m.param.kelas, bahasa: m.param.rumpun === 'bahasa', panjang: m.param.panjang_stimulus }) : []),
      ];
      const lolos = periksa.lolos && !langgar.length;
      const p: Percobaan = { jawaban, alasan: [...periksa.alasan, ...langgar], isi };
      percobaan.push(p);
      await catat?.(p, lolos);
      if (lolos) return { ok: true, isi: seimbangkanKunci(isi, terbaru.kunciTerpakai), periksa, percobaan, henti: null };
      alasan = p.alasan;
    } finally {
      lepas?.();
    }
  }
  return { ok: false, isi: percobaan.at(-1)?.isi ?? null, periksa: null, percobaan, henti: null };
}

/** Hasil satu butir dalam permintaan berkelompok. */
export interface HasilButirKelompok {
  ok: boolean;
  isi: IsiSoal | null;
  periksa: HasilPeriksa | null;
  alasan: string[];
}

export interface HasilKelompok {
  /** Sejajar dengan butir yang diminta. */
  butir: HasilButirKelompok[];
  jawaban: JawabanAi | null;
  /** Galat yang menghentikan pekerjaan (kunci, batas, jaringan, dibatalkan). */
  henti: GalatAi | null;
  /** Seluruh jawaban tidak dapat dipakai (galat model, bukan JSON, atau terpotong). */
  gagalSemua: boolean;
  terpotong: boolean;
}

export interface MasukanKelompok {
  param: ParameterPaket;
  butir: ButirDiminta[];
  konteks: () => Promise<{ pokokLain: string[]; kunciTerpakai: Partial<Record<HurufOpsi, number>> }>;
  signal?: AbortSignal;
}

/** Satu permintaan tercatat di pemakaian AI beserta banyak butir yang lolos darinya. */
export type PencatatKelompok = (jawaban: JawabanAi | null, jumlahLolos: number) => Promise<void> | void;

/** Token keluaran per butir untuk penyedia yang mewajibkan batas keluaran. */
const TOKEN_PER_BUTIR = 2500;

/** Ambil daftar butir dari jawaban: {"butir": [...]}, larik, atau satu objek bila hanya satu butir diminta. */
export function uraiKelompok(data: unknown, banyak: number): unknown[] {
  const daftar = Array.isArray(data) ? data : Array.isArray((data as { butir?: unknown })?.butir) ? (data as { butir: unknown[] }).butir : banyak === 1 && data && typeof data === 'object' ? [data] : null;
  if (!daftar) throw new GalatSkema(['Keluaran model tidak memuat daftar "butir".']);
  // Cocokkan menurut "nomor" bila ada; selebihnya menurut urutan.
  const hasil: unknown[] = new Array(banyak).fill(undefined);
  const sisa: unknown[] = [];
  for (const x of daftar) {
    const n = Number((x as { nomor?: unknown })?.nomor);
    if (Number.isInteger(n) && n >= 1 && n <= banyak && hasil[n - 1] === undefined) hasil[n - 1] = x;
    else sisa.push(x);
  }
  for (let i = 0; i < banyak && sisa.length; i++) if (hasil[i] === undefined) hasil[i] = sisa.shift();
  return hasil;
}

/**
 * Buat beberapa butir dengan satu permintaan (F-38). Tiap butir divalidasi skema, diverifikasi, dan diperiksa
 * kaidahnya sendiri-sendiri; butir yang gagal dikembalikan dengan alasannya untuk dicoba lagi oleh pengatur.
 */
export async function buatKelompok(kirim: Pengirim, m: MasukanKelompok, catat?: PencatatKelompok): Promise<HasilKelompok> {
  const banyak = m.butir.length;
  const semuaGagal = (alasan: string[], jawaban: JawabanAi | null, henti: GalatAi | null, terpotong = false): HasilKelompok => ({
    butir: m.butir.map(() => ({ ok: false, isi: null, periksa: null, alasan })),
    jawaban,
    henti,
    gagalSemua: true,
    terpotong,
  });
  if (m.signal?.aborted) return semuaGagal(['Dibatalkan.'], null, new GalatAi('dibatalkan', 'Dibatalkan.'));
  let lepas: (() => void) | undefined;
  try {
    const ctx = await m.konteks();
    const pesan = susunPesanKelompok({ param: m.param, butir: m.butir, pokokLain: ctx.pokokLain });
    let jawaban: JawabanAi;
    try {
      jawaban = await kirim(SISTEM_KELOMPOK, pesan, m.signal, { maksKeluar: Math.min(32_000, 4096 + TOKEN_PER_BUTIR * banyak) });
      lepas = jawaban.lepas;
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      lepas = g.lepas;
      if (harusBerhenti(g)) return semuaGagal([g.message], null, g);
      await catat?.(null, 0);
      return semuaGagal([g.message], null, null);
    }
    let mentah: unknown[];
    try {
      // Larik di tingkat teratas dibungkus agar ekstrakJson (yang mencari objek) dapat membacanya.
      const teks = /^\s*(```(?:json)?\s*)?\[/i.test(jawaban.teks) ? `{"butir":${jawaban.teks.replace(/```(?:json)?/gi, '')}}` : jawaban.teks;
      mentah = uraiKelompok(ekstrakJson(teks), banyak);
    } catch (e) {
      const alasan = e instanceof GalatSkema ? e.daftar : [(e as Error).message];
      await catat?.(jawaban, 0);
      return semuaGagal(jawaban.terpotong ? ['Jawaban model terpotong sebelum semua butir selesai.', ...alasan] : alasan, jawaban, null, !!jawaban.terpotong);
    }
    const terbaru = await m.konteks();
    const pokok = [...terbaru.pokokLain];
    const hasil: HasilButirKelompok[] = [];
    for (let i = 0; i < banyak; i++) {
      const { slot } = m.butir[i];
      const tp = m.param.tp[slot.tp_index];
      const x = mentah[i];
      if (!x || typeof x !== 'object') {
        hasil.push({ ok: false, isi: null, periksa: null, alasan: [jawaban.terpotong ? 'Jawaban model terpotong sebelum butir ini.' : 'Butir ini tidak ada dalam keluaran model.'] });
        continue;
      }
      const { nomor: _nomor, ...data } = x as Record<string, unknown>;
      let isi: IsiSoal;
      try {
        isi = bacaIsiSoal(data, { bentuk: slot.bentuk, level: slot.level, kesukaran: slot.kesukaran, tp: tp.rumusan, kategori: m.param.atur_bentuk?.kategori?.label });
      } catch (e) {
        hasil.push({ ok: false, isi: null, periksa: null, alasan: e instanceof GalatSkema ? e.daftar : [(e as Error).message] });
        continue;
      }
      isi = terapkanPengaturan(isi, m.param.atur_bentuk);
      // Bacaan bersama (F-40): disalin ke soal agar dicetak sekali untuk kelompoknya.
      const bacaan = m.butir[i].bacaan;
      if (bacaan) isi = { ...isi, stimulus: { id: bacaan.id, teks: bacaan.teks } };
      // Butir lain yang sudah lolos dalam permintaan yang sama ikut dibandingkan kemiripannya.
      const periksa = periksaSoal(isi, {
        rumpun: m.param.rumpun,
        kelas: m.param.kelas,
        fase: m.param.fase,
        lokal: m.param.bahasa === 'en' ? 'en' : 'id',
        literasi: (slot.gaya ?? m.param.gaya) === 'literasi' || m.param.wajib_stimulus,
        pokokLain: pokok,
        gambarDiizinkan: m.param.gambar !== 'mati',
        opsiPg: m.param.opsi_pg ? { jumlah: m.param.opsi_pg, wajib: true } : null,
      });
      const langgar = [
        ...periksaPengaturan(isi, m.param.atur_bentuk, m.param.bahasa === 'en' ? 'en' : 'id'),
        // Paket berstimulus wajib (mis. TKA): soal tanpa cerita atau bacaan yang cukup dibuat ulang (F-39).
        ...(m.param.wajib_stimulus && !isi.stimulus ? periksaStimulus(isi, { kelas: m.param.kelas, bahasa: m.param.rumpun === 'bahasa', panjang: m.param.panjang_stimulus }) : []),
      ];
      const lolos = periksa.lolos && !langgar.length;
      if (lolos) pokok.push(teksPolos(teksPembanding(isi)));
      hasil.push({ ok: lolos, isi, periksa: lolos ? periksa : null, alasan: [...periksa.alasan, ...langgar] });
    }
    await catat?.(jawaban, hasil.filter((h) => h.ok).length);
    return { butir: hasil, jawaban, henti: null, gagalSemua: false, terpotong: !!jawaban.terpotong };
  } finally {
    lepas?.();
  }
}
