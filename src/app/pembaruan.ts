/**
 * Pembaruan otomatis aplikasi (PWA). Versi baru diperiksa berkala dan saat tab kembali dibuka, lalu dipasang sendiri
 * (muat ulang) pada saat yang aman: tidak ada soal yang sedang dibuat di tab ini, dan guru baru saja membuka
 * aplikasi, pindah layar, atau sedang tidak melihat tab ini. Isian layar Buat tersimpan sebagai draf, jadi tidak hilang.
 */

/** Selang pemeriksaan versi baru selama aplikasi terbuka. */
export const JEDA_PERIKSA_MS = 30 * 60_000;

/** Versi baru yang ditemukan sesaat setelah aplikasi dibuka langsung dipasang. */
export const MASA_AWAL_MS = 20_000;

export interface KeadaanPembaruan {
  /** Soal sedang dibuat di tab ini. */
  berjalan: boolean;
  /** Tab sedang tidak dilihat (di belakang atau aplikasi diminimalkan). */
  tersembunyi: boolean;
  /** Guru pindah layar sejak versi baru ditemukan. */
  pindahLayar: boolean;
  /** Lama sejak halaman dimuat. */
  msSejakMuat: number;
}

export function saatnyaPasang(k: KeadaanPembaruan): boolean {
  return !k.berjalan && (k.tersembunyi || k.pindahLayar || k.msSejakMuat < MASA_AWAL_MS);
}
