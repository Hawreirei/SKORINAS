import type { jsPDF } from 'jspdf';
import { uraiTeks, type Simpul } from '../matematika/teks';

// Penata huruf kecil untuk PDF: kata dan rumus (pecahan bertumpuk, pangkat, akar) diukur,
// dipatah per baris, lalu digambar dengan font yang ditanam.

// Liberation Serif: metrik sama dengan Times New Roman, lisensi OFL sehingga boleh ditanam di PDF.
export const FONT_PDF = 'LiberationSerif';

export interface Kotak {
  w: number;
  naik: number;
  turun: number;
  gambar(doc: jsPDF, x: number, garisDasar: number): void;
}

export interface GayaTeks {
  ukuran: number;
  tebal?: boolean;
  miring?: boolean;
  warna?: [number, number, number];
}

// Glif yang tidak ada di Liberation Serif diganti tulisan yang setara.
const PENGGANTI: Record<string, string> = { '∠': 'sudut ', '△': 'segitiga ', '∥': '//', '≅': '≈', '∈': 'anggota ', '⋯': '…', '∼': '~', '⊥': 'tegak lurus ', '∉': 'bukan anggota ', '∪': 'U', '∅': '{ }', '✓': '√', '☐': '□' };

export function amankan(s: string): string {
  return s.replace(/[∠△∥≅∈⋯∼⊥∉∪∅✓☐]/g, (c) => PENGGANTI[c] ?? c);
}

function aturFont(doc: jsPDF, g: GayaTeks) {
  doc.setFont(FONT_PDF, g.tebal ? 'bold' : g.miring ? 'italic' : 'normal');
  doc.setFontSize(g.ukuran);
}

export function lebarTeks(doc: jsPDF, s: string, g: GayaTeks): number {
  aturFont(doc, g);
  return doc.getTextWidth(amankan(s));
}

export function kotakTeks(doc: jsPDF, s: string, g: GayaTeks): Kotak {
  const teks = amankan(s);
  const w = lebarTeks(doc, teks, g);
  return {
    w,
    naik: g.ukuran * 0.74,
    turun: g.ukuran * 0.24,
    gambar(d, x, y) {
      aturFont(d, g);
      d.setTextColor(...(g.warna ?? [0, 0, 0]));
      d.text(teks, x, y);
    },
  };
}

function hbox(daftar: Kotak[]): Kotak {
  return {
    w: daftar.reduce((a, k) => a + k.w, 0),
    naik: Math.max(0, ...daftar.map((k) => k.naik)),
    turun: Math.max(0, ...daftar.map((k) => k.turun)),
    gambar(d, x, y) {
      let cx = x;
      for (const k of daftar) {
        k.gambar(d, cx, y);
        cx += k.w;
      }
    },
  };
}

function spasi(w: number): Kotak {
  return { w, naik: 0, turun: 0, gambar() {} };
}

const OPERATOR = /^[+\-−×÷=<>≤≥≠≈:·±]$/;

export function kotakMath(doc: jsPDF, daftar: Simpul[], g: GayaTeks): Kotak {
  const anak: Kotak[] = [];
  for (const n of daftar) {
    switch (n.t) {
      case 'teks': {
        const s = (n.mentah ? n.s.slice(1) : n.s).replace(/\s+/g, '');
        for (const bagian of s.split(/([+\-−×÷=<>≤≥≠≈:·±])/)) {
          if (!bagian) continue;
          if (OPERATOR.test(bagian)) {
            const sela = g.ukuran * 0.2;
            anak.push(spasi(sela), kotakTeks(doc, bagian === '-' ? '−' : bagian, g), spasi(sela));
          } else anak.push(kotakTeks(doc, bagian, g));
        }
        break;
      }
      case 'pecahan': {
        const gk = { ...g, ukuran: g.ukuran * 0.82 };
        const atas = kotakMath(doc, n.atas, gk);
        const bawah = kotakMath(doc, n.bawah, gk);
        const w = Math.max(atas.w, bawah.w) + g.ukuran * 0.3;
        const sumbu = g.ukuran * 0.3;
        const sela = g.ukuran * 0.12;
        anak.push({
          w: w + 2,
          naik: sumbu + sela + atas.naik + atas.turun,
          turun: Math.max(0, sela + bawah.naik + bawah.turun - sumbu),
          gambar(d, x, y) {
            atas.gambar(d, x + 1 + (w - atas.w) / 2, y - sumbu - sela - atas.turun);
            bawah.gambar(d, x + 1 + (w - bawah.w) / 2, y - sumbu + sela + bawah.naik);
            d.setDrawColor(0, 0, 0);
            d.setLineWidth(Math.max(0.5, g.ukuran * 0.045));
            d.line(x + 1, y - sumbu, x + 1 + w, y - sumbu);
          },
        });
        break;
      }
      case 'pangkat':
      case 'indeks': {
        const basis = kotakMath(doc, n.basis, g);
        const kecil = kotakMath(doc, n.t === 'pangkat' ? n.atas : n.bawah, { ...g, ukuran: g.ukuran * 0.65 });
        const geser = n.t === 'pangkat' ? -g.ukuran * 0.38 : g.ukuran * 0.18;
        anak.push({
          w: basis.w + kecil.w + 0.5,
          naik: Math.max(basis.naik, kecil.naik - geser),
          turun: Math.max(basis.turun, kecil.turun + geser),
          gambar(d, x, y) {
            basis.gambar(d, x, y);
            kecil.gambar(d, x + basis.w + 0.5, y + geser);
          },
        });
        break;
      }
      case 'akar': {
        const isi = kotakMath(doc, n.isi, g);
        const u = g.ukuran;
        anak.push({
          w: u * 0.45 + isi.w + 2,
          naik: isi.naik + 3,
          turun: isi.turun,
          gambar(d, x, y) {
            d.setDrawColor(0, 0, 0);
            d.setLineWidth(0.6);
            const atas = y - isi.naik - 2;
            d.line(x, y - u * 0.3, x + u * 0.12, y - u * 0.36);
            d.line(x + u * 0.12, y - u * 0.36, x + u * 0.25, y + isi.turun * 0.5);
            d.line(x + u * 0.25, y + isi.turun * 0.5, x + u * 0.4, atas);
            d.line(x + u * 0.4, atas, x + u * 0.45 + isi.w + 2, atas);
            isi.gambar(d, x + u * 0.45, y);
          },
        });
        break;
      }
      case 'matriks': {
        const sel = n.baris.map((b) => b.map((x) => kotakMath(doc, x, g)));
        const kolom = Math.max(1, ...sel.map((b) => b.length));
        const lebarKolom = Array.from({ length: kolom }, (_, i) => Math.max(0, ...sel.map((b) => b[i]?.w ?? 0)));
        const tinggi = sel.map((b) => ({ naik: Math.max(g.ukuran * 0.74, ...b.map((k) => k.naik)), turun: Math.max(g.ukuran * 0.24, ...b.map((k) => k.turun)) }));
        const selaKolom = g.ukuran * 0.8;
        const selaBaris = g.ukuran * 0.2;
        const kurung = g.ukuran * 0.4;
        const wIsi = lebarKolom.reduce((a, w) => a + w, 0) + selaKolom * (kolom - 1);
        const hIsi = tinggi.reduce((a, t) => a + t.naik + t.turun, 0) + selaBaris * Math.max(0, tinggi.length - 1);
        const sumbu = g.ukuran * 0.3;
        const atas = hIsi / 2 + sumbu;
        const bawah = hIsi / 2 - sumbu;
        const kiri = n.kiri ? kurung : 0;
        const kanan = n.kanan ? kurung : 0;
        // Tanda kurung digambar sebagai garis agar tingginya mengikuti isi matriks. arah -1: kurung kiri, 1: kurung kanan.
        const gambarKurung = (d: jsPDF, c: string, x: number, y1: number, y2: number, arah: number) => {
          const h = y2 - y1;
          const mulai = x + kurung * (arah < 0 ? 0.75 : 0.25);
          const tarik = (ruas: number[][]) => d.lines(ruas, mulai, y1, [1, 1], 'S', false);
          if (c === '|') d.line(x + kurung / 2, y1, x + kurung / 2, y2);
          else if (c === '‖') {
            d.line(x + kurung * 0.35, y1, x + kurung * 0.35, y2);
            d.line(x + kurung * 0.65, y1, x + kurung * 0.65, y2);
          } else if (c === '[' || c === ']') tarik([[arah * kurung * 0.5, 0], [0, h], [-arah * kurung * 0.5, 0]]);
          else if (c === '{' || c === '}') {
            const t = Math.min(1.5, h / 4);
            tarik([[arah * kurung * 0.25, t], [0, h / 2 - 2 * t], [arah * kurung * 0.25, t], [-arah * kurung * 0.25, t], [0, h / 2 - 2 * t], [-arah * kurung * 0.25, t]]);
          } else tarik([[arah * kurung * 0.6, h * 0.25, arah * kurung * 0.6, h * 0.75, 0, h]]);
        };
        anak.push({
          w: kiri + wIsi + kanan + g.ukuran * 0.3,
          naik: atas + 1,
          turun: bawah + 1,
          gambar(d, x, y) {
            d.setDrawColor(0, 0, 0);
            d.setLineWidth(Math.max(0.5, g.ukuran * 0.05));
            const y1 = y - atas;
            const y2 = y + bawah;
            const x0 = x + g.ukuran * 0.15;
            if (n.kiri) gambarKurung(d, n.kiri, x0, y1, y2, -1);
            let cy = y1;
            sel.forEach((b, r) => {
              const dasar = cy + tinggi[r].naik;
              let cx = x0 + kiri;
              lebarKolom.forEach((w, c) => {
                const k = b[c];
                if (k) k.gambar(d, cx + (n.kiri === '{' && !n.kanan ? 0 : (w - k.w) / 2), dasar);
                cx += w + selaKolom;
              });
              cy = dasar + tinggi[r].turun + selaBaris;
            });
            if (n.kanan) gambarKurung(d, n.kanan, x0 + kiri + wIsi, y1, y2, 1);
          },
        });
        break;
      }
    }
  }
  return hbox(anak);
}

type Potongan = { jenis: 'kotak'; kotak: Kotak } | { jenis: 'spasi' } | { jenis: 'baris' };

function potong(doc: jsPDF, teks: string, g: GayaTeks): Potongan[] {
  const hasil: Potongan[] = [];
  for (const seg of uraiTeks(teks)) {
    if (seg.jenis === 'mat') {
      hasil.push({ jenis: 'kotak', kotak: kotakMath(doc, seg.simpul, g) });
      continue;
    }
    for (const bagian of seg.s.split(/(\n|[ \t]+)/)) {
      if (!bagian) continue;
      if (bagian === '\n') hasil.push({ jenis: 'baris' });
      else if (/^[ \t]+$/.test(bagian)) hasil.push({ jenis: 'spasi' });
      else hasil.push({ jenis: 'kotak', kotak: kotakTeks(doc, bagian, g) });
    }
  }
  return hasil;
}

export interface Baris {
  kotak: { x: number; k: Kotak }[];
  w: number;
  naik: number;
  turun: number;
}

/** Patah teks menjadi baris. Potongan tanpa spasi di antaranya (kata dan rumus) tidak dipisah. */
export function tataParagraf(doc: jsPDF, teks: string, lebar: number, g: GayaTeks): Baris[] {
  const potongan = potong(doc, teks, g);
  const lebarSpasi = lebarTeks(doc, ' ', g);
  const baris: Baris[] = [];
  let kini: Baris = { kotak: [], w: 0, naik: g.ukuran * 0.74, turun: g.ukuran * 0.24 };
  let adaSpasi = false;
  const tutup = () => {
    baris.push(kini);
    kini = { kotak: [], w: 0, naik: g.ukuran * 0.74, turun: g.ukuran * 0.24 };
    adaSpasi = false;
  };
  let i = 0;
  while (i < potongan.length) {
    const p = potongan[i];
    if (p.jenis === 'baris') {
      tutup();
      i++;
      continue;
    }
    if (p.jenis === 'spasi') {
      adaSpasi = kini.kotak.length > 0;
      i++;
      continue;
    }
    const grup: Kotak[] = [];
    while (i < potongan.length && potongan[i].jenis === 'kotak') grup.push((potongan[i++] as { kotak: Kotak }).kotak);
    const wGrup = grup.reduce((a, k) => a + k.w, 0);
    const sela = adaSpasi ? lebarSpasi : 0;
    if (kini.kotak.length && kini.w + sela + wGrup > lebar) tutup();
    let x = kini.w + (kini.kotak.length ? sela : 0);
    for (const k of grup) {
      kini.kotak.push({ x, k });
      x += k.w;
      kini.naik = Math.max(kini.naik, k.naik);
      kini.turun = Math.max(kini.turun, k.turun);
    }
    kini.w = x;
    adaSpasi = false;
  }
  if (kini.kotak.length || !baris.length) tutup();
  return baris;
}

export function tinggiBaris(b: Baris, g: GayaTeks): number {
  return b.naik + b.turun + g.ukuran * 0.28;
}

export function tinggiParagraf(baris: Baris[], g: GayaTeks): number {
  return baris.reduce((a, b) => a + tinggiBaris(b, g), 0);
}

export function gambarParagraf(doc: jsPDF, baris: Baris[], x: number, y: number, g: GayaTeks, rata: 'kiri' | 'tengah' | 'kanan' = 'kiri', lebar = 0): number {
  let cy = y;
  for (const b of baris) {
    const dasar = cy + b.naik;
    const geser = rata === 'tengah' ? (lebar - b.w) / 2 : rata === 'kanan' ? lebar - b.w : 0;
    for (const { x: kx, k } of b.kotak) k.gambar(doc, x + geser + kx, dasar);
    cy += tinggiBaris(b, g);
  }
  return cy - y;
}
