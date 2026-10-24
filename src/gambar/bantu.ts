import { angkaDariTeks } from '../verifikasi/angka';

export class GalatTemplat extends Error {}

type Mentah = Record<string, unknown>;

export function angka(p: Mentah, nama: string, opsi: { min?: number; maks?: number; bulat?: boolean; bawaan?: number } = {}): number {
  let v = p[nama];
  if (v === undefined || v === null || v === '') {
    if (opsi.bawaan !== undefined) return opsi.bawaan;
    throw new GalatTemplat(`Parameter ${nama} wajib diisi.`);
  }
  if (typeof v === 'string') {
    const n = angkaDariTeks(v, 'en');
    if (n === null) throw new GalatTemplat(`Parameter ${nama} harus bilangan.`);
    v = n;
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new GalatTemplat(`Parameter ${nama} harus bilangan.`);
  if (opsi.bulat && !Number.isInteger(v)) throw new GalatTemplat(`Parameter ${nama} harus bilangan bulat.`);
  if (opsi.min !== undefined && v < opsi.min) throw new GalatTemplat(`Parameter ${nama} minimal ${opsi.min}.`);
  if (opsi.maks !== undefined && v > opsi.maks) throw new GalatTemplat(`Parameter ${nama} maksimal ${opsi.maks}.`);
  return v;
}

export function daftarAngka(p: Mentah, nama: string, opsi: { min?: number; maks?: number; panjangMin?: number; panjangMaks?: number; bulat?: boolean } = {}): number[] {
  const v = p[nama];
  if (!Array.isArray(v)) throw new GalatTemplat(`Parameter ${nama} harus berupa daftar.`);
  if (opsi.panjangMin !== undefined && v.length < opsi.panjangMin) throw new GalatTemplat(`Parameter ${nama} minimal ${opsi.panjangMin} isian.`);
  if (opsi.panjangMaks !== undefined && v.length > opsi.panjangMaks) throw new GalatTemplat(`Parameter ${nama} maksimal ${opsi.panjangMaks} isian.`);
  return v.map((_, i) => angka({ x: v[i] }, 'x', opsi));
}

export function daftarTeks(p: Mentah, nama: string, opsi: { panjangMin?: number; panjangMaks?: number; wajib?: boolean } = {}): string[] {
  const v = p[nama];
  if (v === undefined && !opsi.wajib) return [];
  if (!Array.isArray(v)) throw new GalatTemplat(`Parameter ${nama} harus berupa daftar teks.`);
  if (opsi.panjangMin !== undefined && v.length < opsi.panjangMin) throw new GalatTemplat(`Parameter ${nama} minimal ${opsi.panjangMin} isian.`);
  if (opsi.panjangMaks !== undefined && v.length > opsi.panjangMaks) throw new GalatTemplat(`Parameter ${nama} maksimal ${opsi.panjangMaks} isian.`);
  return v.map((x) => String(x).slice(0, 24));
}

export function teks(p: Mentah, nama: string, bawaan = ''): string {
  const v = p[nama];
  return v === undefined || v === null ? bawaan : String(v).slice(0, 60);
}

export function pilihan<T extends string>(p: Mentah, nama: string, daftar: readonly T[], bawaan?: T): T {
  const v = p[nama];
  if ((v === undefined || v === null) && bawaan !== undefined) return bawaan;
  if (typeof v !== 'string' || !daftar.includes(v as T)) throw new GalatTemplat(`Parameter ${nama} harus salah satu dari: ${daftar.join(', ')}.`);
  return v as T;
}

/** Format bilangan untuk label gambar (koma desimal, tanpa nol berlebih). */
export function fmt(n: number, lokal: 'id' | 'en' = 'id'): string {
  const r = Math.round(n * 1000) / 1000;
  const s = Number.isInteger(r) ? String(r) : String(r);
  return lokal === 'id' ? s.replace('.', ',') : s;
}

/** Penyebut kecil bila n adalah pecahan sederhana, mis. 0.25 -> [1, 4]. */
export function sebagaiPecahan(n: number, maksPenyebut = 12): [number, number] | null {
  for (let d = 1; d <= maksPenyebut; d++) {
    const a = n * d;
    if (Math.abs(a - Math.round(a)) < 1e-9) return [Math.round(a), d];
  }
  return null;
}
