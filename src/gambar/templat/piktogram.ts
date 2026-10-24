import { GalatTemplat, angka, daftarAngka, daftarTeks, fmt, pilihan, teks } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  kategori: string[];
  jumlah: number[];
  nilaiPerIkon: number;
  ikon: 'lingkaran' | 'kotak' | 'bintang';
  judul: string;
}

function bintang(cx: number, cy: number, r: number): [number, number][] {
  const t: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    t.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return t;
}

export const piktogram: Templat<P> = {
  id: 'piktogram',
  nama: 'Piktogram',
  dipakai: 'Data kelas rendah',
  parameter: 'kategori (2–6), jumlah: banyak ikon per kategori (kelipatan 0,5; maks 10), nilai_per_ikon, ikon ("lingkaran", "kotak", "bintang"), judul',
  contoh: { kategori: ['Apel', 'Jeruk', 'Mangga'], jumlah: [3, 5, 2.5], nilai_per_ikon: 2, ikon: 'lingkaran', judul: 'Buah kesukaan' },
  baca(m) {
    const kategori = daftarTeks(m, 'kategori', { panjangMin: 2, panjangMaks: 6, wajib: true });
    const jumlah = daftarAngka(m, 'jumlah', { min: 0, maks: 10, panjangMin: kategori.length, panjangMaks: kategori.length });
    if (jumlah.some((j) => Math.abs(j * 2 - Math.round(j * 2)) > 1e-9)) throw new GalatTemplat('jumlah ikon harus kelipatan 0,5.');
    return {
      kategori,
      jumlah,
      nilaiPerIkon: angka(m, 'nilai_per_ikon', { min: 1, maks: 1000 }),
      ikon: pilihan(m, 'ikon', ['lingkaran', 'kotak', 'bintang'] as const, 'lingkaran'),
      judul: teks(m, 'judul'),
    };
  },
  gambar(p) {
    const W = 520;
    const tBaris = 40;
    const atas = p.judul ? 34 : 10;
    const pr: Primitif[] = [];
    if (p.judul) pr.push({ t: 'teks', x: W / 2, y: 16, s: p.judul, tebal: true });
    const kolomKategori = 110;
    p.kategori.forEach((k, i) => {
      const y = atas + i * tBaris;
      pr.push({ t: 'kotak', x: 10, y, w: kolomKategori, h: tBaris });
      pr.push({ t: 'kotak', x: 10 + kolomKategori, y, w: W - 20 - kolomKategori, h: tBaris });
      pr.push({ t: 'teks', x: 18, y: y + tBaris / 2, s: k, jangkar: 'awal' });
      const utuh = Math.floor(p.jumlah[i]);
      const setengah = p.jumlah[i] - utuh > 0;
      for (let j = 0; j < utuh + (setengah ? 1 : 0); j++) {
        const cx = 10 + kolomKategori + 22 + j * 36;
        const cy = y + tBaris / 2;
        const separuh = setengah && j === utuh;
        if (p.ikon === 'kotak') pr.push({ t: 'kotak', x: cx - 12, y: cy - 12, w: separuh ? 12 : 24, h: 24, isi: 'arsir' });
        else if (p.ikon === 'bintang' && !separuh) pr.push({ t: 'poligon', titik: bintang(cx, cy, 13), isi: 'arsir' });
        else if (separuh) pr.push({ t: 'juring', cx, cy, r: 12, dari: 180, ke: 360, isi: 'arsir' });
        else pr.push({ t: 'lingkaran', cx, cy, r: 12, isi: 'arsir' });
      }
    });
    const yKet = atas + p.kategori.length * tBaris + 22;
    pr.push({ t: 'lingkaran', cx: 22, cy: yKet, r: 8, isi: 'arsir' });
    pr.push({ t: 'teks', x: 38, y: yKet, s: `= ${fmt(p.nilaiPerIkon)}`, jangkar: 'awal' });
    return {
      lebar: W,
      tinggi: yKet + 18,
      primitif: pr,
      alt: `Piktogram${p.judul ? ` "${p.judul}"` : ''}, satu ikon bernilai ${fmt(p.nilaiPerIkon)}: ${p.kategori.map((k, i) => `${k} ${fmt(p.jumlah[i])} ikon`).join(', ')}.`,
    };
  },
  lingkup(p) {
    const nilai = p.jumlah.map((j) => j * p.nilaiPerIkon);
    return { jumlah: p.jumlah, nilai, nilai_per_ikon: p.nilaiPerIkon, total: nilai.reduce((a, b) => a + b, 0) };
  },
};
