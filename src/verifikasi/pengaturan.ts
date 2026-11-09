import type { AturBentuk, IsiSoal } from '../db/tipe';
import { hurufKunci } from '../db/tipe';
import { teksPolos } from '../matematika/teks';
import { angkaDariTeks, type Lokal } from './angka';

/**
 * Periksa butir dari AI terhadap rincian tiap bentuk yang diatur guru (opsi lanjutan v2). Pelanggaran membuat butir
 * dibuat ulang, sama seperti pelanggaran kaidah keras. Suntingan guru tidak diperiksa di sini.
 */
export function periksaPengaturan(isi: IsiSoal, atur: AturBentuk | null | undefined, lokal: Lokal = 'id'): string[] {
  if (!atur) return [];
  const alasan: string[] = [];
  if (isi.bentuk === 'pilihan_ganda_kompleks' && atur.pgk_benar) {
    const n = hurufKunci(isi.kunci).length;
    const { min, maks } = atur.pgk_benar;
    if (n < min || n > maks) alasan.push(min === maks ? `Pilihan ganda kompleks harus tepat ${min} jawaban benar, bukan ${n}.` : `Pilihan ganda kompleks harus ${min} sampai ${maks} jawaban benar, bukan ${n}.`);
  }
  if (isi.bentuk === 'pilihan_ganda_kategori' && atur.kategori && isi.pernyataan && isi.pernyataan.length !== atur.kategori.pernyataan)
    alasan.push(`PG kompleks kategori harus berisi ${atur.kategori.pernyataan} pernyataan, bukan ${isi.pernyataan.length}.`);
  if (isi.bentuk === 'menjodohkan' && atur.jodoh && isi.pasangan) {
    const { kiri, pengecoh } = atur.jodoh;
    if (isi.pasangan.kiri.length !== kiri) alasan.push(`Kolom kiri menjodohkan harus ${kiri} butir, bukan ${isi.pasangan.kiri.length}.`);
    else if (isi.pasangan.kanan.length !== kiri + pengecoh) alasan.push(`Kolom kanan menjodohkan harus ${kiri + pengecoh} butir (${pengecoh} pengecoh), bukan ${isi.pasangan.kanan.length}.`);
  }
  if (isi.bentuk === 'isian_singkat' && atur.isian && atur.isian !== 'bebas') {
    const kunci = teksPolos(isi.kunci).trim();
    const angka = angkaDariTeks(isi.kunci, lokal);
    if (atur.isian === 'bilangan_bulat' && (angka === null || !Number.isInteger(angka) || /[a-z]/i.test(kunci))) alasan.push('Jawaban isian harus satu bilangan bulat tanpa satuan.');
    if (atur.isian === 'bilangan' && angka === null && !/^-?\d/.test(kunci)) alasan.push('Jawaban isian harus berupa bilangan.');
    if (atur.isian === 'kata' && /\d/.test(kunci)) alasan.push('Jawaban isian harus berupa kata atau istilah, bukan bilangan.');
  }
  return alasan;
}

/** Terapkan rincian yang dapat langsung ditetapkan tanpa membuat ulang: jenis uraian yang dipilih guru. */
export function terapkanPengaturan(isi: IsiSoal, atur: AturBentuk | null | undefined): IsiSoal {
  if (isi.bentuk === 'uraian' && atur?.uraian && isi.jenis_uraian !== atur.uraian) return { ...isi, jenis_uraian: atur.uraian };
  return isi;
}
