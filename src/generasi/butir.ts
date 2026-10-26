import type { HurufOpsi, IsiSoal, ParameterPaket, Slot } from '../db/tipe';
import { GalatAi } from '../ai/galat';
import type { JawabanAi } from '../ai/tipe';
import { bacaIsiSoal, ekstrakJson, GalatSkema } from '../verifikasi/skema';
import { periksaSoal, type HasilPeriksa } from '../verifikasi';
import { seimbangkanKunci } from '../verifikasi/acak';
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
  maksPercobaan?: number;
  signal?: AbortSignal;
}

export type Pengirim = (sistem: string, pesan: string, signal?: AbortSignal) => Promise<JawabanAi>;
export type PencatatPercobaan = (p: Percobaan, lolos: boolean) => Promise<void> | void;

/** Galat yang tidak akan membaik dengan mencoba ulang butir yang sama. */
function harusBerhenti(g: GalatAi): boolean {
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
  for (let i = 0; i < maks; i++) {
    if (m.signal?.aborted) return { ok: false, isi: null, periksa: null, percobaan, henti: new GalatAi('dibatalkan', 'Dibatalkan.') };
    const pesan = susunPesan({ param: m.param, slot: m.slot, pokokLain: m.pokokLain, alasanGagal: alasan, revisi: m.revisi });
    let jawaban: JawabanAi;
    try {
      jawaban = await kirim(SISTEM, pesan, m.signal);
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      const p: Percobaan = { jawaban: null, alasan: [g.message], isi: null };
      percobaan.push(p);
      if (harusBerhenti(g)) return { ok: false, isi: null, periksa: null, percobaan, henti: g };
      alasan = [g.message];
      await catat?.(p, false);
      continue;
    }
    let isi: IsiSoal;
    try {
      isi = bacaIsiSoal(ekstrakJson(jawaban.teks), { bentuk: m.slot.bentuk, level: m.slot.level, kesukaran: m.slot.kesukaran, tp: tp.rumusan });
    } catch (e) {
      alasan = e instanceof GalatSkema ? e.daftar : [(e as Error).message];
      const p = { jawaban, alasan, isi: null };
      percobaan.push(p);
      await catat?.(p, false);
      continue;
    }
    const periksa = periksaSoal(isi, {
      rumpun: m.param.rumpun,
      kelas: m.param.kelas,
      fase: m.param.fase,
      lokal: m.param.bahasa === 'en' ? 'en' : 'id',
      literasi: m.param.gaya === 'literasi',
      pokokLain: m.pokokLain,
      gambarDiizinkan: m.param.gambar !== 'mati',
      opsiPg: m.param.opsi_pg ? { jumlah: m.param.opsi_pg, wajib: true } : null,
    });
    const p: Percobaan = { jawaban, alasan: periksa.alasan, isi };
    percobaan.push(p);
    await catat?.(p, periksa.lolos);
    if (periksa.lolos) return { ok: true, isi: seimbangkanKunci(isi, m.kunciTerpakai), periksa, percobaan, henti: null };
    alasan = periksa.alasan;
  }
  return { ok: false, isi: percobaan.at(-1)?.isi ?? null, periksa: null, percobaan, henti: null };
}
