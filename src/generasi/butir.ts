import type { HurufOpsi, IsiSoal, ParameterPaket, Slot } from '../db/tipe';
import { GalatAi } from '../ai/galat';
import type { JawabanAi } from '../ai/tipe';
import { bacaIsiSoal, ekstrakJson, GalatSkema } from '../verifikasi/skema';
import { periksaSoal, type HasilPeriksa } from '../verifikasi';
import { seimbangkanKunci } from '../verifikasi/acak';
import { periksaPengaturan, terapkanPengaturan } from '../verifikasi/pengaturan';
import { periksaStimulus } from '../verifikasi/stimulus';
import { susunPesan, SISTEM } from './prompt';

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
   * Bacaan bersama kelompok slot ini (F-39). `teks` bila sudah ada; bila belum, `ambil` membuatnya sekali untuk
   * seluruh kelompok (pengatur mencegah pembuatan ganda saat butir dikerjakan serentak).
   */
  bacaan?: { id: string; teks: string | null; ambil?: (kirim: Pengirim, signal?: AbortSignal, catat?: PencatatPercobaan) => Promise<string> } | null;
}

export type Pengirim = (sistem: string, pesan: string, signal?: AbortSignal) => Promise<JawabanAi>;
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
