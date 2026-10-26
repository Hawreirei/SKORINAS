import { hitungBiaya } from '../ai';
import type { ModelRegistri } from '../ai/tipe';
import type { Bentuk, Level } from '../db/tipe';
import { bagiKomposisi } from '../generasi/komposisi';

/**
 * Perkiraan di panel Rencana layar Buat (rancangan UI v0.5, UI-06): permintaan AI, waktu, kuota, dan biaya
 * sebelum guru menekan Buat soal.
 */

/** Soal yang ditolak pemeriksa dibuat ulang; sediakan sekitar 30% permintaan lebih. */
export const CADANGAN_ULANG = 1.3;
/** Token per permintaan bila belum ada riwayat pemakaian di perangkat ini. */
export const TOKEN_BAWAAN = { masuk: 2000, keluar: 600 };

export interface MasukanRencana {
  n: number;
  /** Batas efektif model utama; null bila tidak dibatasi. */
  rpm: number | null;
  rpd: number | null;
  /** Permintaan ke model utama sejak awal hari kuota. */
  terpakaiHariIni: number;
  adaCadangan: boolean;
  model?: ModelRegistri;
  /** Rata-rata token per permintaan dari riwayat; null bila belum ada. */
  tokenRata: { masuk: number; keluar: number } | null;
  /** Perkiraan biaya yang sudah terpakai hari ini; null bila tidak diketahui. */
  biayaHariIni: number | null;
  batasBiayaUsd: number;
}

export interface Rencana {
  permintaanMin: number;
  permintaanMaks: number;
  /** Perkiraan menit bila ada batas per menit dan soal lebih banyak dari batas itu. */
  menit: number | null;
  sisaKuota: number | null;
  /** Sisa kuota hari ini lebih kecil dari jumlah soal. */
  kuotaKurang: boolean;
  biayaMin: number | null;
  biayaMaks: number | null;
  /** Biaya hari ini ditambah perkiraan paket ini melewati batas peringatan biaya. */
  lewatBatasBiaya: boolean;
}

export function hitungRencana(m: MasukanRencana): Rencana {
  const permintaanMin = m.n;
  const permintaanMaks = Math.ceil(m.n * CADANGAN_ULANG);
  const menit = m.rpm && m.n > m.rpm ? Math.max(1, Math.ceil((m.n - m.rpm) / m.rpm)) : null;
  const sisaKuota = m.rpd ? Math.max(0, m.rpd - m.terpakaiHariIni) : null;
  const token = m.tokenRata ?? TOKEN_BAWAAN;
  const biaya = (permintaan: number) => hitungBiaya(m.model, token.masuk * permintaan, token.keluar * permintaan);
  const biayaMin = biaya(permintaanMin);
  const biayaMaks = biaya(permintaanMaks);
  return {
    permintaanMin,
    permintaanMaks,
    menit,
    sisaKuota,
    kuotaKurang: sisaKuota !== null && sisaKuota < m.n,
    biayaMin,
    biayaMaks,
    lewatBatasBiaya: biayaMaks !== null && biayaMaks > 0 && (m.biayaHariIni ?? 0) + biayaMaks > m.batasBiayaUsd,
  };
}

/** Draf isian layar Buat, disimpan per perangkat agar tidak hilang saat halaman dimuat ulang. */
export const KUNCI_DRAF = 'gensoal:draf-buat';

export function bacaDraf<T>(): T | null {
  try {
    const teks = localStorage.getItem(KUNCI_DRAF);
    return teks ? (JSON.parse(teks) as T) : null;
  } catch {
    return null;
  }
}

export function simpanDraf(isi: unknown): void {
  try {
    localStorage.setItem(KUNCI_DRAF, JSON.stringify(isi));
  } catch {
    // localStorage dapat ditolak (mode privat) atau penuh; isian tetap ada selama halaman terbuka.
  }
}

/** Batas jumlah soal per paket, dipakai layar Buat dan Mulai cepat di beranda. */
export const MIN_SOAL = 5;
export const MAKS_SOAL = 50;

/** Isian Mulai cepat di beranda; ditimpakan ke draf layar Buat agar isian lain di draf tetap ada. */
export interface IsianCepat {
  kelas: number;
  mapel: string;
  n: number;
}

export function bacaIsianCepat(): Partial<IsianCepat> {
  const f = bacaDraf<{ f?: Partial<IsianCepat> }>()?.f;
  return { kelas: f?.kelas || undefined, mapel: f?.mapel || undefined, n: f?.n || undefined };
}

/** Hanya nilai yang terisi dan sah yang ditimpakan; layar Buat memeriksa sisanya. */
export function simpanIsianCepat(isi: IsianCepat): void {
  const d = bacaDraf<{ f?: Record<string, unknown> }>() ?? {};
  const f: Record<string, unknown> = { ...d.f };
  if (isi.kelas >= 1 && isi.kelas <= 12) f.kelas = isi.kelas;
  if (isi.mapel.trim()) f.mapel = isi.mapel.trim();
  if (Number.isInteger(isi.n) && isi.n >= MIN_SOAL && isi.n <= MAKS_SOAL) f.n = isi.n;
  simpanDraf({ ...d, f });
}

export function hapusDraf(): void {
  try {
    localStorage.removeItem(KUNCI_DRAF);
  } catch {
    // Abaikan; draf lama akan tertimpa isian berikutnya.
  }
}

/** Bagi n soal rata ke beberapa kelompok; sisa diberikan ke kelompok paling awal. */
export function bagiRata(n: number, banyak: number): number[] {
  if (banyak <= 0) return [];
  return Array.from({ length: banyak }, (_, i) => Math.floor(n / banyak) + (i < n % banyak ? 1 : 0));
}

/** Jumlah per level C1–C6 dari persen kesukaran, sama seperti rencana bawaan (level bergantian dalam kategorinya). */
export function levelDariPersen(n: number, persen: [number, number, number]): Record<Level, number> {
  const kuota = bagiKomposisi(n, persen);
  const [m, s, h] = kuota.map((k) => [Math.ceil(k / 2), Math.floor(k / 2)]);
  return { C1: m[0], C2: m[1], C3: s[0], C4: s[1], C5: h[0], C6: h[1] };
}

/** Skor bawaan per soal saat guru menyalakan "Cantumkan skor". */
export const SKOR_BAWAAN: Record<Bentuk, number> = { pilihan_ganda: 1, pilihan_ganda_kompleks: 2, benar_salah: 1, menjodohkan: 3, isian_singkat: 2, uraian: 5 };
