import type { Kesukaran } from '../db/tipe';

export const KATEGORI: Kesukaran[] = ['mudah', 'sedang', 'sulit'];

/**
 * Metode sisa terbesar. n_k = floor(n * p_k / 100) + delta_k; sisa dibagikan satu per satu
 * ke kategori dengan pecahan sisa terbesar. Bila seri, kategori yang lebih mudah didahulukan.
 * Dihitung dalam bilangan bulat (n * p mod 100) agar tidak ada galat pembulatan.
 */
export function bagiKomposisi(n: number, persen: readonly number[]): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('Jumlah soal harus bilangan bulat tak negatif.');
  const total = persen.reduce((a, b) => a + b, 0);
  if (total !== 100) throw new Error('Persentase harus berjumlah 100.');
  if (persen.some((p) => !Number.isInteger(p) || p < 0)) throw new Error('Persentase harus bilangan bulat tak negatif.');
  const dasar = persen.map((p) => Math.floor((n * p) / 100));
  const sisa = persen.map((p) => (n * p) % 100);
  let lebih = n - dasar.reduce((a, b) => a + b, 0);
  const urut = persen.map((_, i) => i).sort((a, b) => sisa[b] - sisa[a] || a - b);
  for (let k = 0; lebih > 0; k++, lebih--) dasar[urut[k]] += 1;
  return dasar;
}

/**
 * Ubah satu penggeser sambil menjaga total 100. Sedang menjadi penyeimbang;
 * bila sedang habis, kategori lain yang menyerap.
 */
export function geserPersen(persen: [number, number, number], indeks: 0 | 1 | 2, nilaiBaru: number): [number, number, number] {
  const v = Math.max(0, Math.min(100, Math.round(nilaiBaru)));
  const hasil: [number, number, number] = [...persen];
  hasil[indeks] = v;
  let selisih = 100 - (hasil[0] + hasil[1] + hasil[2]);
  const penyerap = indeks === 1 ? [2, 0] : [1, indeks === 0 ? 2 : 0];
  for (const j of penyerap) {
    if (selisih === 0) break;
    const baru = Math.max(0, Math.min(100, hasil[j] + selisih));
    selisih -= baru - hasil[j];
    hasil[j] = baru;
  }
  return hasil;
}
