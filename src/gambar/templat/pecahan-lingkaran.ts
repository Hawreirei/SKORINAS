import { angka } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  penyebut: number;
  diarsir: number;
  jumlah: number;
}

export const pecahanLingkaran: Templat<P> = {
  id: 'pecahan_lingkaran',
  nama: 'Pecahan lingkaran',
  dipakai: 'Pecahan dasar',
  parameter: 'penyebut (1–12), diarsir (0 sampai penyebut × jumlah_lingkaran), jumlah_lingkaran (1–3, bawaan 1)',
  contoh: { penyebut: 4, diarsir: 3 },
  baca(m) {
    const penyebut = angka(m, 'penyebut', { min: 1, maks: 12, bulat: true });
    const jumlah = angka(m, 'jumlah_lingkaran', { min: 1, maks: 3, bulat: true, bawaan: 1 });
    const diarsir = angka(m, 'diarsir', { min: 0, maks: penyebut * jumlah, bulat: true });
    return { penyebut, diarsir, jumlah };
  },
  gambar(p) {
    const r = 62;
    const pr: Primitif[] = [];
    let sisa = p.diarsir;
    for (let j = 0; j < p.jumlah; j++) {
      const cx = 80 + j * 160;
      const cy = 80;
      const sudut = 360 / p.penyebut;
      for (let k = 0; k < p.penyebut; k++) {
        pr.push({ t: 'juring', cx, cy, r, dari: k * sudut, ke: (k + 1) * sudut, isi: sisa > 0 ? 'arsir' : 'kosong' });
        sisa--;
      }
      if (p.penyebut === 1) pr.push({ t: 'lingkaran', cx, cy, r });
    }
    return {
      lebar: Math.max(170, p.jumlah * 160),
      tinggi: 160,
      primitif: pr,
      alt: `${p.jumlah > 1 ? `${p.jumlah} lingkaran, masing-masing` : 'Lingkaran'} dibagi ${p.penyebut} bagian sama besar; ${p.diarsir} bagian diarsir.`,
    };
  },
  lingkup(p) {
    return { pecahan: p.diarsir / p.penyebut, diarsir: p.diarsir, penyebut: p.penyebut };
  },
};
