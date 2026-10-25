/**
 * Penanda kartu Langkah awal di beranda (rancangan UI v0.5, UI-10), disimpan per perangkat tanpa mengubah skema Dexie.
 * Langkah 3 selesai setelah unduhan pertama berhasil; guru juga dapat menyembunyikan kartunya.
 */
const KUNCI_SUDAH_UNDUH = 'gensoal:sudah-unduh';
const KUNCI_TERSEMBUNYI = 'gensoal:langkah-awal-tersembunyi';

function baca(kunci: string): boolean {
  try {
    return localStorage.getItem(kunci) === '1';
  } catch {
    return false;
  }
}

function tulis(kunci: string): void {
  try {
    localStorage.setItem(kunci, '1');
  } catch {
    // localStorage dapat ditolak (mode privat); kartu hanya tampil lebih lama.
  }
}

export const sudahUnduh = () => baca(KUNCI_SUDAH_UNDUH);
export const tandaiSudahUnduh = () => tulis(KUNCI_SUDAH_UNDUH);
export const langkahAwalTersembunyi = () => baca(KUNCI_TERSEMBUNYI);
export const sembunyikanLangkahAwal = () => tulis(KUNCI_TERSEMBUNYI);
