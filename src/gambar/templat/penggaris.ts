import { GalatTemplat, angka, fmt, teks } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  mulai: number;
  panjang: number;
  satuan: string;
  maks: number;
}

export const penggaris: Templat<P> = {
  id: 'penggaris',
  nama: 'Penggaris',
  dipakai: 'Pengukuran panjang',
  parameter: 'mulai (titik awal benda, 0–20), panjang_objek (kelipatan 0,1), satuan (bawaan "cm"); penggaris otomatis cukup panjang (maks 30)',
  contoh: { mulai: 2, panjang_objek: 7.5, satuan: 'cm' },
  baca(m) {
    const mulai = angka(m, 'mulai', { min: 0, maks: 20 });
    const panjang = angka(m, 'panjang_objek', { min: 0.1, maks: 30 });
    if (Math.abs(mulai * 10 - Math.round(mulai * 10)) > 1e-9 || Math.abs(panjang * 10 - Math.round(panjang * 10)) > 1e-9)
      throw new GalatTemplat('mulai dan panjang_objek harus kelipatan 0,1.');
    const maks = Math.ceil(mulai + panjang) + 1;
    if (maks > 30) throw new GalatTemplat('Benda terlalu panjang untuk penggaris 30.');
    return { mulai, panjang, satuan: teks(m, 'satuan', 'cm'), maks: Math.max(maks, 10) };
  },
  gambar(p) {
    const kiri = 20;
    const lebar = 500;
    const per = lebar / p.maks;
    const yAtas = 70;
    const pr: Primitif[] = [];
    // benda
    const x1 = kiri + p.mulai * per;
    const x2 = kiri + (p.mulai + p.panjang) * per;
    pr.push({ t: 'kotak', x: x1, y: 26, w: x2 - x1, h: 22, isi: 'abu' });
    pr.push({ t: 'garis', x1, y1: 48, x2: x1, y2: yAtas, putus: true, tebal: 0.8 });
    pr.push({ t: 'garis', x1: x2, y1: 48, x2: x2, y2: yAtas, putus: true, tebal: 0.8 });
    // penggaris
    pr.push({ t: 'kotak', x: kiri - 10, y: yAtas, w: lebar + 20, h: 50 });
    for (let i = 0; i <= p.maks * 10; i++) {
      const x = kiri + (i / 10) * per;
      const pj = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
      pr.push({ t: 'garis', x1: x, y1: yAtas, x2: x, y2: yAtas + pj, tebal: i % 10 === 0 ? 1 : 0.5 });
      if (i % 10 === 0) pr.push({ t: 'teks', x, y: yAtas + 30, s: String(i / 10), ukuran: 11 });
    }
    pr.push({ t: 'teks', x: kiri + lebar - 4, y: yAtas + 42, s: p.satuan, jangkar: 'akhir', ukuran: 10 });
    return {
      lebar: 540,
      tinggi: 130,
      primitif: pr,
      alt: `Benda diukur dengan penggaris; ujung kiri benda di angka ${fmt(p.mulai)} dan ujung kanan di angka ${fmt(p.mulai + p.panjang)} ${p.satuan}.`,
    };
  },
  lingkup(p) {
    return { mulai: p.mulai, panjang: p.panjang, akhir: p.mulai + p.panjang };
  },
};
