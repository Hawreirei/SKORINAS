import { GalatTemplat, angka } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  ratusan: number;
  puluhan: number;
  satuan: number;
}

export const blokNilaiTempat: Templat<P> = {
  id: 'blok_nilai_tempat',
  nama: 'Blok nilai tempat',
  dipakai: 'Nilai tempat',
  parameter: 'ratusan (0–9), puluhan (0–9), satuan (0–9); satu blok ratusan = 10 × 10 kubus kecil, satu batang puluhan = 10 kubus',
  contoh: { ratusan: 2, puluhan: 3, satuan: 5 },
  baca(m) {
    const p = {
      ratusan: angka(m, 'ratusan', { min: 0, maks: 9, bulat: true, bawaan: 0 }),
      puluhan: angka(m, 'puluhan', { min: 0, maks: 9, bulat: true, bawaan: 0 }),
      satuan: angka(m, 'satuan', { min: 0, maks: 9, bulat: true, bawaan: 0 }),
    };
    if (p.ratusan + p.puluhan + p.satuan === 0) throw new GalatTemplat('Minimal satu blok.');
    return p;
  },
  gambar(p) {
    const k = 7;
    const pr: Primitif[] = [];
    let x = 10;
    const y0 = 10;
    for (let i = 0; i < p.ratusan; i++) {
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) pr.push({ t: 'kotak', x: x + c * k, y: y0 + r * k, w: k, h: k, isi: 'abu', tebal: 0.5 });
      pr.push({ t: 'kotak', x, y: y0, w: 10 * k, h: 10 * k, tebal: 1.4 });
      x += 10 * k + 12;
    }
    if (p.ratusan) x += 8;
    for (let i = 0; i < p.puluhan; i++) {
      for (let r = 0; r < 10; r++) pr.push({ t: 'kotak', x, y: y0 + r * k, w: k, h: k, isi: 'abu', tebal: 0.5 });
      pr.push({ t: 'kotak', x, y: y0, w: k, h: 10 * k, tebal: 1.4 });
      x += k + 8;
    }
    if (p.puluhan) x += 8;
    for (let i = 0; i < p.satuan; i++) {
      const kol = i % 3;
      const brs = Math.floor(i / 3);
      pr.push({ t: 'kotak', x: x + kol * (k + 5), y: y0 + 10 * k - (brs + 1) * (k + 5) + 5, w: k, h: k, isi: 'abu', tebal: 1.2 });
    }
    if (p.satuan) x += 3 * (k + 5);
    return {
      lebar: Math.max(120, x + 10),
      tinggi: 10 * k + 20,
      primitif: pr,
      alt: `Blok nilai tempat: ${p.ratusan} blok ratusan, ${p.puluhan} batang puluhan, ${p.satuan} kubus satuan.`,
    };
  },
  lingkup(p) {
    return { ...p, nilai: p.ratusan * 100 + p.puluhan * 10 + p.satuan };
  },
};
