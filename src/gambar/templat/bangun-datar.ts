import { GalatTemplat, daftarAngka, daftarTeks, fmt, pilihan, teks } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

const JENIS = ['persegi', 'persegi_panjang', 'segitiga', 'segitiga_siku', 'jajar_genjang', 'trapesium', 'belah_ketupat', 'layang_layang', 'lingkaran'] as const;
type Jenis = (typeof JENIS)[number];

const JUMLAH_SISI: Record<Jenis, [number, string]> = {
  persegi: [1, '[sisi]'],
  persegi_panjang: [2, '[panjang, lebar]'],
  segitiga: [2, '[alas, tinggi]'],
  segitiga_siku: [2, '[alas, tinggi]'],
  jajar_genjang: [2, '[alas, tinggi] atau [alas, tinggi, sisi_miring]'],
  trapesium: [3, '[sisi_atas, sisi_bawah, tinggi] atau dengan sisi_miring ke-4 (trapesium sama kaki)'],
  belah_ketupat: [2, '[diagonal_1, diagonal_2]'],
  layang_layang: [2, '[diagonal_1, diagonal_2]'],
  lingkaran: [1, '[jari_jari]'],
};

interface P {
  jenis: Jenis;
  sisi: number[];
  label: string[];
  satuan: string;
  tampilUkuran: boolean;
  pi: number;
  sudut: string[];
}

export const bangunDatar: Templat<P> = {
  id: 'bangun_datar',
  nama: 'Bangun datar',
  dipakai: 'Keliling, luas, sifat bangun',
  parameter: `jenis (${JENIS.join(', ')}); sisi: ${Object.entries(JUMLAH_SISI)
    .map(([j, [, s]]) => `${j} ${s}`)
    .join('; ')}; label: nama titik sudut ["A","B","C","D"] (opsional); satuan (bawaan "cm"); tampil_ukuran (bawaan true); pi ("22/7" atau "3.14", untuk lingkaran); sudut: label sudut di tiap titik (opsional, mis. ["60°"])`,
  contoh: { jenis: 'persegi_panjang', sisi: [12, 5], label: ['A', 'B', 'C', 'D'], satuan: 'cm' },
  baca(m) {
    const jenis = pilihan(m, 'jenis', JENIS);
    const sisi = daftarAngka(m, 'sisi', { min: 0.1, maks: 1000, panjangMin: JUMLAH_SISI[jenis][0], panjangMaks: JUMLAH_SISI[jenis][0] + 1 });
    if (jenis === 'trapesium' && sisi[0] >= sisi[1]) throw new GalatTemplat('Sisi atas trapesium harus lebih pendek dari sisi bawah.');
    if (jenis === 'jajar_genjang' && sisi[2] !== undefined && sisi[2] < sisi[1]) throw new GalatTemplat('Sisi miring jajar genjang tidak boleh lebih pendek dari tingginya.');
    const piTeks = teks(m, 'pi', '22/7');
    const pi = piTeks === '3.14' || piTeks === '3,14' ? 3.14 : piTeks === 'pi' ? Math.PI : 22 / 7;
    return {
      jenis,
      sisi,
      label: daftarTeks(m, 'label', { panjangMaks: 4 }),
      satuan: teks(m, 'satuan', 'cm'),
      tampilUkuran: m.tampil_ukuran !== false,
      pi,
      sudut: daftarTeks(m, 'sudut', { panjangMaks: 4 }),
    };
  },
  gambar(p) {
    const W = 420;
    const H = 260;
    const pr: Primitif[] = [];
    const u = (n: number) => `${fmt(n)} ${p.satuan}`.trim();
    const [a, bb, c] = p.sisi;
    let titik: [number, number][] = [];
    let skala = 1;
    const muat = (lebar: number, tinggi: number) => {
      skala = Math.min(300 / lebar, 170 / tinggi);
      return [(W - lebar * skala) / 2, (H - tinggi * skala) / 2 + 6] as const;
    };
    let alt = '';
    switch (p.jenis) {
      case 'persegi':
      case 'persegi_panjang': {
        const pj = a;
        const lb = p.jenis === 'persegi' ? a : bb;
        const [x0, y0] = muat(pj, lb);
        titik = [[x0, y0 + lb * skala], [x0 + pj * skala, y0 + lb * skala], [x0 + pj * skala, y0], [x0, y0]];
        if (p.tampilUkuran) {
          pr.push({ t: 'teks', x: x0 + (pj * skala) / 2, y: y0 + lb * skala + 18, s: u(pj) });
          if (p.jenis === 'persegi_panjang') pr.push({ t: 'teks', x: x0 + pj * skala + 10, y: y0 + (lb * skala) / 2, s: u(lb), jangkar: 'awal' });
        }
        alt = p.jenis === 'persegi' ? `Persegi dengan sisi ${u(a)}.` : `Persegi panjang dengan panjang ${u(a)} dan lebar ${u(bb)}.`;
        break;
      }
      case 'segitiga':
      case 'segitiga_siku': {
        const [x0, y0] = muat(a, bb);
        const puncakX = p.jenis === 'segitiga_siku' ? x0 : x0 + a * skala * 0.35;
        titik = [[x0, y0 + bb * skala], [x0 + a * skala, y0 + bb * skala], [puncakX, y0]];
        if (p.jenis === 'segitiga') pr.push({ t: 'garis', x1: puncakX, y1: y0, x2: puncakX, y2: y0 + bb * skala, putus: true });
        else pr.push({ t: 'poligon', titik: [[x0, y0 + bb * skala - 12], [x0 + 12, y0 + bb * skala - 12], [x0 + 12, y0 + bb * skala]] , tebal: 1 });
        if (p.tampilUkuran) {
          pr.push({ t: 'teks', x: x0 + (a * skala) / 2, y: y0 + bb * skala + 18, s: u(a) });
          pr.push({ t: 'teks', x: puncakX - 8, y: y0 + (bb * skala) / 2, s: u(bb), jangkar: 'akhir' });
        }
        alt = `${p.jenis === 'segitiga_siku' ? 'Segitiga siku-siku' : 'Segitiga'} dengan alas ${u(a)} dan tinggi ${u(bb)}.`;
        break;
      }
      case 'jajar_genjang': {
        const geser = c !== undefined ? Math.sqrt(Math.max(0, c * c - bb * bb)) : a * 0.3;
        const [x0, y0] = muat(a + geser, bb);
        titik = [[x0, y0 + bb * skala], [x0 + a * skala, y0 + bb * skala], [x0 + (a + geser) * skala, y0], [x0 + geser * skala, y0]];
        pr.push({ t: 'garis', x1: x0 + geser * skala, y1: y0, x2: x0 + geser * skala, y2: y0 + bb * skala, putus: true });
        if (p.tampilUkuran) {
          pr.push({ t: 'teks', x: x0 + (a * skala) / 2, y: y0 + bb * skala + 18, s: u(a) });
          pr.push({ t: 'teks', x: x0 + geser * skala + 6, y: y0 + (bb * skala) / 2, s: u(bb), jangkar: 'awal' });
          if (c !== undefined) pr.push({ t: 'teks', x: x0 + ((a + geser) * skala) + 4, y: y0 + (bb * skala) / 2, s: u(c), jangkar: 'awal' });
        }
        alt = `Jajar genjang dengan alas ${u(a)} dan tinggi ${u(bb)}${c !== undefined ? `, sisi miring ${u(c)}` : ''}.`;
        break;
      }
      case 'trapesium': {
        const atas = a;
        const bawah = bb;
        const t = c;
        const [x0, y0] = muat(bawah, t);
        const geser = ((bawah - atas) / 2) * skala;
        titik = [[x0, y0 + t * skala], [x0 + bawah * skala, y0 + t * skala], [x0 + bawah * skala - geser, y0], [x0 + geser, y0]];
        pr.push({ t: 'garis', x1: x0 + geser, y1: y0, x2: x0 + geser, y2: y0 + t * skala, putus: true });
        if (p.tampilUkuran) {
          pr.push({ t: 'teks', x: x0 + (bawah * skala) / 2, y: y0 + t * skala + 18, s: u(bawah) });
          pr.push({ t: 'teks', x: x0 + (bawah * skala) / 2, y: y0 - 14, s: u(atas) });
          pr.push({ t: 'teks', x: x0 + geser + 6, y: y0 + (t * skala) / 2, s: u(t), jangkar: 'awal' });
        }
        alt = `Trapesium dengan sisi sejajar ${u(atas)} dan ${u(bawah)}, tinggi ${u(t)}.`;
        break;
      }
      case 'belah_ketupat':
      case 'layang_layang': {
        const [x0, y0] = muat(bb, a);
        const cx = x0 + (bb * skala) / 2;
        const potong = p.jenis === 'belah_ketupat' ? 0.5 : 0.3;
        const yPotong = y0 + a * skala * potong;
        titik = [[cx, y0 + a * skala], [x0 + bb * skala, yPotong], [cx, y0], [x0, yPotong]];
        pr.push({ t: 'garis', x1: cx, y1: y0, x2: cx, y2: y0 + a * skala, putus: true });
        pr.push({ t: 'garis', x1: x0, y1: yPotong, x2: x0 + bb * skala, y2: yPotong, putus: true });
        if (p.tampilUkuran) {
          pr.push({ t: 'teks', x: cx + 6, y: y0 + a * skala * 0.75, s: u(a), jangkar: 'awal' });
          pr.push({ t: 'teks', x: x0 + (bb * skala) * 0.25, y: yPotong - 12, s: u(bb) });
        }
        alt = `${p.jenis === 'belah_ketupat' ? 'Belah ketupat' : 'Layang-layang'} dengan diagonal ${u(a)} dan ${u(bb)}.`;
        break;
      }
      case 'lingkaran': {
        const r = 85;
        const cx = W / 2;
        const cy = H / 2;
        pr.push({ t: 'lingkaran', cx, cy, r });
        pr.push({ t: 'lingkaran', cx, cy, r: 2.5, isi: 'hitam' });
        pr.push({ t: 'garis', x1: cx, y1: cy, x2: cx + r, y2: cy });
        if (p.tampilUkuran) pr.push({ t: 'teks', x: cx + r / 2, y: cy - 12, s: u(a) });
        if (p.label[0]) pr.push({ t: 'teks', x: cx - 10, y: cy + 12, s: p.label[0] });
        alt = `Lingkaran dengan jari-jari ${u(a)}.`;
        break;
      }
    }
    if (titik.length) {
      pr.unshift({ t: 'poligon', titik });
      const pusatX = titik.reduce((s, t) => s + t[0], 0) / titik.length;
      const pusatY = titik.reduce((s, t) => s + t[1], 0) / titik.length;
      titik.forEach(([x, y], i) => {
        const dx = x - pusatX;
        const dy = y - pusatY;
        const pj = Math.hypot(dx, dy) || 1;
        if (p.label[i]) pr.push({ t: 'teks', x: x + (dx / pj) * 16, y: y + (dy / pj) * 16, s: p.label[i], tebal: true });
        if (p.sudut[i]) pr.push({ t: 'teks', x: x - (dx / pj) * 24, y: y - (dy / pj) * 24, s: p.sudut[i], ukuran: 11 });
      });
    }
    return { lebar: W, tinggi: H, primitif: pr, alt };
  },
  lingkup(p) {
    const [a, b, c, d] = p.sisi;
    const l: Record<string, number | number[]> = { sisi: p.sisi };
    switch (p.jenis) {
      case 'persegi':
        return { ...l, luas: a * a, keliling: 4 * a };
      case 'persegi_panjang':
        return { ...l, luas: a * b, keliling: 2 * (a + b) };
      case 'segitiga':
        return { ...l, luas: (a * b) / 2 };
      case 'segitiga_siku':
        return { ...l, luas: (a * b) / 2, keliling: a + b + Math.hypot(a, b), sisi_miring: Math.hypot(a, b) };
      case 'jajar_genjang':
        return { ...l, luas: a * b, ...(c !== undefined ? { keliling: 2 * (a + c) } : {}) };
      case 'trapesium':
        return { ...l, luas: ((a + b) * c) / 2, ...(d !== undefined ? { keliling: a + b + 2 * d } : {}) };
      case 'belah_ketupat':
        return { ...l, luas: (a * b) / 2, keliling: 4 * Math.hypot(a / 2, b / 2), sisi_miring: Math.hypot(a / 2, b / 2) };
      case 'layang_layang':
        return { ...l, luas: (a * b) / 2 };
      case 'lingkaran':
        return { ...l, luas: p.pi * a * a, keliling: 2 * p.pi * a, diameter: 2 * a, jari_jari: a };
    }
  },
};
