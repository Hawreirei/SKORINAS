import { GalatTemplat, angka } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  baris: number;
  kolom: number;
  sel: Set<string>;
}

export const gridLuas: Templat<P> = {
  id: 'grid_luas',
  nama: 'Petak luas',
  dipakai: 'Luas dengan petak satuan',
  parameter: 'baris (1–12), kolom (1–16), sel_diarsir: daftar [baris, kolom] mulai dari 1, atau "semua"',
  contoh: { baris: 4, kolom: 6, sel_diarsir: [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3]] },
  baca(m) {
    const baris = angka(m, 'baris', { min: 1, maks: 12, bulat: true });
    const kolom = angka(m, 'kolom', { min: 1, maks: 16, bulat: true });
    const sel = new Set<string>();
    if (m.sel_diarsir === 'semua') {
      for (let r = 1; r <= baris; r++) for (let c = 1; c <= kolom; c++) sel.add(`${r},${c}`);
    } else if (Array.isArray(m.sel_diarsir)) {
      for (const x of m.sel_diarsir) {
        if (!Array.isArray(x) || x.length !== 2) throw new GalatTemplat('Setiap sel_diarsir harus [baris, kolom].');
        const r = angka({ v: x[0] }, 'v', { min: 1, maks: baris, bulat: true });
        const c = angka({ v: x[1] }, 'v', { min: 1, maks: kolom, bulat: true });
        sel.add(`${r},${c}`);
      }
    } else throw new GalatTemplat('sel_diarsir harus daftar atau "semua".');
    return { baris, kolom, sel };
  },
  gambar(p) {
    const ukuran = Math.min(28, 440 / p.kolom, 280 / p.baris);
    const W = p.kolom * ukuran + 20;
    const H = p.baris * ukuran + 20;
    const pr: Primitif[] = [];
    for (let r = 1; r <= p.baris; r++)
      for (let c = 1; c <= p.kolom; c++)
        pr.push({ t: 'kotak', x: 10 + (c - 1) * ukuran, y: 10 + (r - 1) * ukuran, w: ukuran, h: ukuran, isi: p.sel.has(`${r},${c}`) ? 'arsir' : 'kosong', tebal: 0.8 });
    return { lebar: W, tinggi: H, primitif: pr, alt: `Petak ${p.baris} baris × ${p.kolom} kolom; ${p.sel.size} petak diarsir.` };
  },
  lingkup(p) {
    return { luas: p.sel.size, baris: p.baris, kolom: p.kolom, total_sel: p.baris * p.kolom };
  },
};
