import { angka } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  jam: number;
  menit: number;
}

export const jamAnalog: Templat<P> = {
  id: 'jam_analog',
  nama: 'Jam analog',
  dipakai: 'Waktu',
  parameter: 'jam (0–23), menit (0–59)',
  contoh: { jam: 3, menit: 30 },
  baca(m) {
    return { jam: angka(m, 'jam', { min: 0, maks: 23, bulat: true }), menit: angka(m, 'menit', { min: 0, maks: 59, bulat: true }) };
  },
  gambar(p) {
    const cx = 100;
    const cy = 100;
    const r = 86;
    const pr: Primitif[] = [{ t: 'lingkaran', cx, cy, r, tebal: 2 }];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 2 * Math.PI;
      const dalam = i % 5 === 0 ? r - 10 : r - 5;
      pr.push({ t: 'garis', x1: cx + dalam * Math.sin(a), y1: cy - dalam * Math.cos(a), x2: cx + r * Math.sin(a), y2: cy - r * Math.cos(a), tebal: i % 5 === 0 ? 1.4 : 0.7 });
    }
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * 2 * Math.PI;
      pr.push({ t: 'teks', x: cx + (r - 24) * Math.sin(a), y: cy - (r - 24) * Math.cos(a), s: String(h), ukuran: 14 });
    }
    const aJam = (((p.jam % 12) + p.menit / 60) / 12) * 2 * Math.PI;
    const aMenit = (p.menit / 60) * 2 * Math.PI;
    pr.push({ t: 'garis', x1: cx, y1: cy, x2: cx + 46 * Math.sin(aJam), y2: cy - 46 * Math.cos(aJam), tebal: 4 });
    pr.push({ t: 'garis', x1: cx, y1: cy, x2: cx + 68 * Math.sin(aMenit), y2: cy - 68 * Math.cos(aMenit), tebal: 2 });
    pr.push({ t: 'lingkaran', cx, cy, r: 4, isi: 'hitam' });
    const m = String(p.menit).padStart(2, '0');
    return { lebar: 200, tinggi: 200, primitif: pr, alt: `Jam analog menunjukkan pukul ${p.jam % 12 === 0 ? 12 : p.jam % 12}.${m}.` };
  },
  lingkup(p) {
    return { jam: p.jam, menit: p.menit, total_menit: p.jam * 60 + p.menit };
  },
};
