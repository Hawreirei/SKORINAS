import { hitungBiaya } from '../ai';
import type { ModelRegistri } from '../ai/tipe';

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

export function hapusDraf(): void {
  try {
    localStorage.removeItem(KUNCI_DRAF);
  } catch {
    // Abaikan; draf lama akan tertimpa isian berikutnya.
  }
}
