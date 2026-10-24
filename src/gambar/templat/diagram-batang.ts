import { GalatTemplat, angka, daftarAngka, daftarTeks, fmt, teks } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  kategori: string[];
  nilai: number[];
  skala: number;
  judul: string;
  satuan: string;
}

export const diagramBatang: Templat<P> = {
  id: 'diagram_batang',
  nama: 'Diagram batang',
  dipakai: 'Data dan statistik sederhana',
  parameter: 'kategori: ["Senin", ...] (2–8), nilai: bilangan tak negatif sepanjang kategori, skala: jarak garis bantu (mis. 2 atau 5), judul, satuan (opsional)',
  contoh: { kategori: ['Senin', 'Selasa', 'Rabu', 'Kamis'], nilai: [6, 8, 4, 10], skala: 2, judul: 'Buku dibaca' },
  baca(m) {
    const kategori = daftarTeks(m, 'kategori', { panjangMin: 2, panjangMaks: 8, wajib: true });
    const nilai = daftarAngka(m, 'nilai', { min: 0, maks: 100000, panjangMin: kategori.length, panjangMaks: kategori.length });
    const skala = angka(m, 'skala', { min: 0.1 });
    const maks = Math.max(...nilai);
    if (maks / skala > 20) throw new GalatTemplat('Skala terlalu kecil untuk nilai terbesar (maksimal 20 garis bantu).');
    for (const v of nilai) {
      const k = v / skala;
      if (Math.abs(k * 2 - Math.round(k * 2)) > 1e-9) throw new GalatTemplat('Setiap nilai harus kelipatan setengah skala agar terbaca dari gambar.');
    }
    return { kategori, nilai, skala, judul: teks(m, 'judul'), satuan: teks(m, 'satuan') };
  },
  gambar(p) {
    const W = 520;
    const H = 300;
    const kiri = 56;
    const bawah = 250;
    const atas = p.judul ? 40 : 20;
    const maksSkala = Math.ceil(Math.max(...p.nilai) / p.skala) * p.skala || p.skala;
    const sy = (v: number) => bawah - (v / maksSkala) * (bawah - atas);
    const pr: Primitif[] = [];
    if (p.judul) pr.push({ t: 'teks', x: W / 2, y: 16, s: p.judul, tebal: true });
    for (let v = 0; v <= maksSkala + 1e-9; v += p.skala) {
      pr.push({ t: 'garis', x1: kiri, y1: sy(v), x2: W - 16, y2: sy(v), tebal: 0.5, putus: v > 0 });
      pr.push({ t: 'teks', x: kiri - 8, y: sy(v), s: fmt(v), jangkar: 'akhir', ukuran: 11 });
    }
    pr.push({ t: 'garis', x1: kiri, y1: atas - 6, x2: kiri, y2: bawah });
    const lebarSlot = (W - 16 - kiri) / p.kategori.length;
    p.kategori.forEach((k, i) => {
      const x = kiri + i * lebarSlot + lebarSlot * 0.2;
      const w = lebarSlot * 0.6;
      pr.push({ t: 'kotak', x, y: sy(p.nilai[i]), w, h: bawah - sy(p.nilai[i]), isi: 'arsir' });
      pr.push({ t: 'teks', x: x + w / 2, y: bawah + 16, s: k, ukuran: 11 });
    });
    if (p.satuan) pr.push({ t: 'teks', x: 8, y: atas - 12, s: p.satuan, jangkar: 'awal', ukuran: 10 });
    return {
      lebar: W,
      tinggi: H,
      primitif: pr,
      alt: `Diagram batang${p.judul ? ` "${p.judul}"` : ''}: ${p.kategori.map((k, i) => `${k} ${fmt(p.nilai[i])}`).join(', ')}.`,
    };
  },
  lingkup(p) {
    const total = p.nilai.reduce((a, b) => a + b, 0);
    return { nilai: p.nilai, total, maks: Math.max(...p.nilai), min: Math.min(...p.nilai), rata: total / p.nilai.length };
  },
};
