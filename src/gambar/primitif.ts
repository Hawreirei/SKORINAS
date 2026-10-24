// Gambar soal dibangun dari primitif sederhana, lalu diterjemahkan ke SVG (layar, PDF, Word)
// dan ke TikZ (LaTeX) dari data yang sama.

export type Isi = 'kosong' | 'arsir' | 'abu' | 'hitam' | 'putih';

export type Primitif =
  | { t: 'garis'; x1: number; y1: number; x2: number; y2: number; tebal?: number; putus?: boolean; panah?: 'akhir' | 'dua' }
  | { t: 'kotak'; x: number; y: number; w: number; h: number; isi?: Isi; tebal?: number }
  | { t: 'lingkaran'; cx: number; cy: number; r: number; isi?: Isi; tebal?: number }
  | { t: 'juring'; cx: number; cy: number; r: number; dari: number; ke: number; isi?: Isi }
  | { t: 'poligon'; titik: [number, number][]; isi?: Isi; tebal?: number; putus?: boolean }
  | { t: 'kurva'; x1: number; y1: number; cx: number; cy: number; x2: number; y2: number; panah?: boolean }
  | { t: 'teks'; x: number; y: number; s: string; ukuran?: number; jangkar?: 'awal' | 'tengah' | 'akhir'; tebal?: boolean }
  | { t: 'pecahan'; x: number; y: number; atas: string; bawah: string; ukuran?: number };

export interface Gambar {
  lebar: number;
  tinggi: number;
  primitif: Primitif[];
  alt: string;
}

export const WARNA_ISI: Record<Isi, string> = {
  kosong: 'none',
  arsir: '#c9cdd3',
  abu: '#e4e6e9',
  hitam: '#0b0c0e',
  putih: '#ffffff',
};

export const TINTA = '#0b0c0e';
export const UKURAN_TEKS = 13;

/** Pembulatan agar keluaran SVG dan TikZ stabil untuk uji. */
export function b(n: number): number {
  return Math.round(n * 100) / 100;
}
