import type { jsPDF } from 'jspdf';
import { uraiTeks, type Simpul } from '../matematika/teks';

// Penata huruf kecil untuk PDF: kata dan rumus (pecahan bertumpuk, pangkat, akar, matriks, operator besar) diukur,
// dipatah per baris, lalu digambar dengan font yang ditanam.

// Liberation Serif: metrik sama dengan Times New Roman, lisensi OFL sehingga boleh ditanam di PDF.
export const FONT_PDF = 'LiberationSerif';
// Simbol matematika yang tidak ada di Liberation Serif (∀, ⊆, ⇒, ℝ, ⌊ ⌋, …): potongan DejaVu Sans, public/fonts/GenSoalSimbol.ttf.
export const FONT_SIMBOL = 'GenSoalSimbol';
// Daftar ini dicetak oleh scripts/buat-font-simbol.py.
export const KARAKTER_SIMBOL = new Set('ℂℍℑℕℙℚℜℝℤℵ↗↘↦⇌⇐⇒∀∁∃∄∅∇∈∉∋∌∐∓∖∗∘∝∠∡∣∤∥∧∨∪∬∭∮∴∵∼∽≃≅≌≐≪≫≮≯≰≱⊂⊃⊄⊅⊆⊇⊈⊉⊊⊋⊕⊗⊤⊥⋂⋃⋄⋆⋍⋮⋯⋰⋱⌈⌉⌊⌋△◠☐✓⟨⟩⟵⟶⟹⟺');

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

// Glif yang tidak ada di kedua font diganti yang setara.
const PENGGANTI: Record<string, string> = { '⌢': '◠', '⌒': '◠', '⌣': '◠', '\u0338': '', '\u200B': '' };

export function amankan(s: string): string {
  return s.replace(/[⌢⌒⌣\u0338\u200B]/g, (c) => PENGGANTI[c] ?? c);
}

/** Pecah teks menjadi potongan berfont huruf dan berfont simbol. */
function potongFont(s: string): { s: string; simbol: boolean }[] {
  const hasil: { s: string; simbol: boolean }[] = [];
  for (const c of amankan(s)) {
    const simbol = KARAKTER_SIMBOL.has(c);
    const akhir = hasil[hasil.length - 1];
    if (akhir && akhir.simbol === simbol) akhir.s += c;
    else hasil.push({ s: c, simbol });
  }
  return hasil;
}

function aturFont(doc: jsPDF, g: GayaTeks, simbol = false) {
  if (simbol) doc.setFont(FONT_SIMBOL, 'normal');
  else doc.setFont(FONT_PDF, g.tebal ? 'bold' : g.miring ? 'italic' : 'normal');
  doc.setFontSize(g.ukuran);
}

export function lebarTeks(doc: jsPDF, s: string, g: GayaTeks): number {
  return potongFont(s).reduce((a, p) => {
    aturFont(doc, g, p.simbol);
    return a + doc.getTextWidth(p.s);
  }, 0);
}

export function kotakTeks(doc: jsPDF, s: string, g: GayaTeks): Kotak {
  const potongan = potongFont(s).map((p) => {
    aturFont(doc, g, p.simbol);
    return { ...p, w: doc.getTextWidth(p.s) };
  });
  return {
    w: potongan.reduce((a, p) => a + p.w, 0),
    naik: g.ukuran * 0.74,
    turun: g.ukuran * 0.24,
    gambar(d, x, y) {
      let cx = x;
      for (const p of potongan) {
        aturFont(d, g, p.simbol);
        d.setTextColor(...(g.warna ?? [0, 0, 0]));
        d.text(p.s, cx, y);
        cx += p.w;
      }
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

function garis(d: jsPDF, tebal: number) {
  d.setDrawColor(0, 0, 0);
  d.setLineWidth(tebal);
}

/**
 * Tanda kurung setinggi y1..y2 di dalam kolom selebar `lebar` mulai x. arah -1: kurung kiri, 1: kurung kanan.
 * Digambar dengan garis agar tingginya mengikuti isi.
 */
function gambarPembatas(d: jsPDF, c: string, x: number, y1: number, y2: number, lebar: number, arah: number) {
  const h = y2 - y1;
  const mulai = x + lebar * (arah < 0 ? 0.75 : 0.25);
  const tengah = (y1 + y2) / 2;
  const tarik = (ruas: number[][], dariY = y1, dariX = mulai) => d.lines(ruas, dariX, dariY, [1, 1], 'S', false);
  if (c === '|') d.line(x + lebar / 2, y1, x + lebar / 2, y2);
  else if (c === '‖') {
    d.line(x + lebar * 0.35, y1, x + lebar * 0.35, y2);
    d.line(x + lebar * 0.65, y1, x + lebar * 0.65, y2);
  } else if (c === '[' || c === ']') tarik([[arah * lebar * 0.5, 0], [0, h], [-arah * lebar * 0.5, 0]]);
  else if (c === '⌊' || c === '⌋') tarik([[0, h], [-arah * lebar * 0.5, 0]]);
  else if (c === '⌈' || c === '⌉') tarik([[-arah * lebar * 0.5, 0], [0, h]], y1, mulai + arah * lebar * 0.5);
  else if (c === '⟨' || c === '⟩') tarik([[arah * lebar * 0.5, h / 2], [-arah * lebar * 0.5, h / 2]]);
  else if (c === '{' || c === '}') {
    const t = Math.min(1.5, h / 4);
    tarik([[arah * lebar * 0.25, t], [0, h / 2 - 2 * t], [arah * lebar * 0.25, t], [-arah * lebar * 0.25, t], [0, h / 2 - 2 * t], [-arah * lebar * 0.25, t]]);
  } else if (c === '(' || c === ')') tarik([[arah * lebar * 0.6, h * 0.25, arah * lebar * 0.6, h * 0.75, 0, h]]);
  else if (c) {
    // Pembatas lain: tulis sebagai huruf di tengah tinggi.
    d.text(c, x, tengah + lebar * 0.5);
  }
}

/** Isi diapit tanda kurung. Isi setinggi satu baris memakai huruf kurung biasa; isi yang lebih tinggi memakai kurung yang digambar. */
function kotakKurung(doc: jsPDF, isi: Kotak, kiri: string, kanan: string, g: GayaTeks): Kotak {
  const tinggiBiasa = isi.naik <= g.ukuran * 0.8 && isi.turun <= g.ukuran * 0.3;
  if (tinggiBiasa) return hbox([...(kiri ? [kotakTeks(doc, kiri, g)] : []), isi, ...(kanan ? [kotakTeks(doc, kanan, g)] : [])]);
  const lebar = g.ukuran * 0.4;
  const sumbu = g.ukuran * 0.3;
  // Kurung simetris terhadap sumbu matematika agar pecahan berada di tengah.
  const separuh = Math.max(isi.naik - sumbu, isi.turun + sumbu) + 1;
  const wKiri = kiri ? lebar : 0;
  const wKanan = kanan ? lebar : 0;
  return {
    w: wKiri + isi.w + wKanan + 1,
    naik: sumbu + separuh,
    turun: separuh - sumbu,
    gambar(d, x, y) {
      garis(d, Math.max(0.5, g.ukuran * 0.05));
      const y1 = y - sumbu - separuh;
      const y2 = y - sumbu + separuh;
      if (kiri) gambarPembatas(d, kiri, x, y1, y2, lebar, -1);
      isi.gambar(d, x + wKiri + 0.5, y);
      if (kanan) gambarPembatas(d, kanan, x + wKiri + isi.w + 1, y1, y2, lebar, 1);
    },
  };
}

/** Tanda di atas isi: panah vektor, topi, garis, titik, gelombang, atau busur. */
function kotakAksen(isi: Kotak, tanda: string, g: GayaTeks): Kotak {
  const u = g.ukuran;
  const w = Math.max(isi.w, u * 0.45);
  const ruang = u * 0.32;
  return {
    w,
    naik: isi.naik + ruang,
    turun: isi.turun,
    gambar(d, x, y) {
      isi.gambar(d, x + (w - isi.w) / 2, y);
      garis(d, Math.max(0.4, u * 0.045));
      const ya = y - isi.naik - ruang * 0.45;
      const x1 = x + w * 0.1;
      const x2 = x + w * 0.9;
      const xm = x + w / 2;
      const kepala = u * 0.13;
      switch (tanda) {
        case '\u20D7':
        case '→':
        case '←':
        case '↔':
          d.line(x1, ya, x2, ya);
          if (tanda !== '←') d.lines([[-kepala, -kepala * 0.7], [kepala, kepala * 0.7], [-kepala, kepala * 0.7]], x2, ya, [1, 1], 'S', false);
          if (tanda === '←' || tanda === '↔') d.lines([[kepala, -kepala * 0.7], [-kepala, kepala * 0.7], [kepala, kepala * 0.7]], x1, ya, [1, 1], 'S', false);
          break;
        case '\u0302': {
          // Topi selebar isi untuk \widehat{ABC}, sempit untuk satu huruf.
          const lebar = Math.max(u * 0.15, (isi.w * 0.8) / 2);
          d.lines([[lebar, -u * 0.12], [lebar, u * 0.12]], xm - lebar, ya + u * 0.05, [1, 1], 'S', false);
          break;
        }
        case '\u030C':
          d.lines([[u * 0.15, u * 0.12], [u * 0.15, -u * 0.12]], xm - u * 0.15, ya - u * 0.07, [1, 1], 'S', false);
          break;
        case '\u0307':
        case '\u0308':
          d.setFillColor(0, 0, 0);
          for (const dx of tanda === '\u0307' ? [0] : [-u * 0.1, u * 0.1]) d.circle(xm + dx, ya, u * 0.04, 'F');
          break;
        case '\u0303':
          d.lines([[u * 0.1, -u * 0.12, u * 0.2, u * 0.12, u * 0.3, 0]], xm - u * 0.15, ya, [1, 1], 'S', false);
          break;
        case '\u0301':
        case '\u0300':
          d.line(xm - u * 0.06, ya + (tanda === '\u0301' ? u * 0.06 : -u * 0.06), xm + u * 0.06, ya + (tanda === '\u0301' ? -u * 0.06 : u * 0.06));
          break;
        case '⌒':
        case '\u0306':
          d.lines([[(x2 - x1) * 0.2, -u * 0.16, (x2 - x1) * 0.8, -u * 0.16, x2 - x1, 0]], x1, ya + u * 0.06, [1, 1], 'S', false);
          break;
        default:
          d.line(x1, ya, x2, ya);
      }
    },
  };
}

/** Kotak dengan tulisan kecil di atas dan/atau di bawahnya, rata tengah (lim, ∑, \overset). */
function kotakBertumpuk(dasar: Kotak, atas: Kotak | null, bawah: Kotak | null, sela: number): Kotak {
  const w = Math.max(dasar.w, atas?.w ?? 0, bawah?.w ?? 0);
  return {
    w,
    naik: dasar.naik + (atas ? sela + atas.naik + atas.turun : 0),
    turun: dasar.turun + (bawah ? sela + bawah.naik + bawah.turun : 0),
    gambar(d, x, y) {
      dasar.gambar(d, x + (w - dasar.w) / 2, y);
      if (atas) atas.gambar(d, x + (w - atas.w) / 2, y - dasar.naik - sela - atas.turun);
      if (bawah) bawah.gambar(d, x + (w - bawah.w) / 2, y + dasar.turun + sela + bawah.naik);
    },
  };
}

const OPERATOR = /^[+\-−×÷=<>≤≥≠≈≡:·±∓⇒⇔→←↔∈∉⊂⊆⊃⊇∪∩∧∨≅∼∝≪≫∴∵]$/;
const OPERATOR_POLA = /([+\-−×÷=<>≤≥≠≈≡:·±∓⇒⇔→←↔∈∉⊂⊆⊃⊇∪∩∧∨≅∼∝≪≫∴∵])/;
const BATAS_BAWAH_ATAS = new Set(['∑', '∏', '∐', '⋃', '⋂', '⊕', '⊗']);

export function kotakMath(doc: jsPDF, daftar: Simpul[], g: GayaTeks): Kotak {
  const anak: Kotak[] = [];
  const kecil = { ...g, ukuran: g.ukuran * 0.7 };
  for (const n of daftar) {
    switch (n.t) {
      case 'teks': {
        if (n.gaya === 'tegak' || n.gaya === 'tebal') {
          // \text dan \mathbf: spasi dipertahankan.
          anak.push(kotakTeks(doc, n.s.replace(/\s+/g, ' '), { ...g, tebal: n.gaya === 'tebal' || g.tebal }));
          break;
        }
        if (n.gaya === 'fungsi') {
          anak.push(kotakTeks(doc, n.s, g), spasi(g.ukuran * 0.15));
          break;
        }
        // Spasi biasa di rumus dibuang; spasi dari \, \quad, dan ~ (spasi Unicode) dipertahankan.
        const s = (n.mentah ? n.s.slice(1) : n.s).replace(/[ \t\n]+/g, '');
        for (const bagian of s.split(OPERATOR_POLA)) {
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
        const tanpaGaris = n.tanpaGaris;
        anak.push({
          w: w + 2,
          naik: sumbu + sela + atas.naik + atas.turun,
          turun: Math.max(0, sela + bawah.naik + bawah.turun - sumbu),
          gambar(d, x, y) {
            atas.gambar(d, x + 1 + (w - atas.w) / 2, y - sumbu - sela - atas.turun);
            bawah.gambar(d, x + 1 + (w - bawah.w) / 2, y - sumbu + sela + bawah.naik);
            if (tanpaGaris) return;
            garis(d, Math.max(0.5, g.ukuran * 0.045));
            d.line(x + 1, y - sumbu, x + 1 + w, y - sumbu);
          },
        });
        break;
      }
      case 'pangkat':
      case 'indeks': {
        const basis = kotakMath(doc, n.basis, g);
        const kecilnya = kotakMath(doc, n.t === 'pangkat' ? n.atas : n.bawah, { ...g, ukuran: g.ukuran * 0.65 });
        const geser = n.t === 'pangkat' ? -g.ukuran * 0.38 : g.ukuran * 0.18;
        anak.push({
          w: basis.w + kecilnya.w + 0.5,
          naik: Math.max(basis.naik, kecilnya.naik - geser),
          turun: Math.max(basis.turun, kecilnya.turun + geser),
          gambar(d, x, y) {
            basis.gambar(d, x, y);
            kecilnya.gambar(d, x + basis.w + 0.5, y + geser);
          },
        });
        break;
      }
      case 'akar': {
        const isi = kotakMath(doc, n.isi, g);
        const derajat = n.derajat ? kotakMath(doc, n.derajat, { ...g, ukuran: g.ukuran * 0.55 }) : null;
        const u = g.ukuran;
        const geser = derajat ? Math.max(0, derajat.w - u * 0.2) : 0;
        anak.push({
          w: geser + u * 0.45 + isi.w + 2,
          naik: Math.max(isi.naik + 3, derajat ? u * 0.3 + derajat.naik + derajat.turun : 0),
          turun: isi.turun,
          gambar(d, x, y) {
            garis(d, 0.6);
            const atas = y - isi.naik - 2;
            const x0 = x + geser;
            if (derajat) derajat.gambar(d, x, y - u * 0.3 - derajat.turun);
            d.line(x0, y - u * 0.3, x0 + u * 0.12, y - u * 0.36);
            d.line(x0 + u * 0.12, y - u * 0.36, x0 + u * 0.25, y + isi.turun * 0.5);
            d.line(x0 + u * 0.25, y + isi.turun * 0.5, x0 + u * 0.4, atas);
            d.line(x0 + u * 0.4, atas, x0 + u * 0.45 + isi.w + 2, atas);
            isi.gambar(d, x0 + u * 0.45, y);
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
        const kiriRata = n.kiri === '{' && !n.kanan;
        const wIsi = lebarKolom.reduce((a, w) => a + w, 0) + selaKolom * (kolom - 1);
        const hIsi = tinggi.reduce((a, t) => a + t.naik + t.turun, 0) + selaBaris * Math.max(0, tinggi.length - 1);
        const sumbu = g.ukuran * 0.3;
        const isi: Kotak = {
          w: wIsi + g.ukuran * 0.2,
          naik: hIsi / 2 + sumbu,
          turun: hIsi / 2 - sumbu,
          gambar(d, x, y) {
            let cy = y - hIsi / 2 - sumbu;
            sel.forEach((b, r) => {
              const dasar = cy + tinggi[r].naik;
              let cx = x + g.ukuran * 0.1;
              lebarKolom.forEach((w, c) => {
                const k = b[c];
                if (k) k.gambar(d, cx + (kiriRata ? 0 : (w - k.w) / 2), dasar);
                cx += w + selaKolom;
              });
              cy = dasar + tinggi[r].turun + selaBaris;
            });
          },
        };
        anak.push(n.kiri || n.kanan ? kotakKurung(doc, { ...isi, naik: isi.naik + g.ukuran * 0.3, turun: isi.turun + g.ukuran * 0.3 }, n.kiri, n.kanan, g) : isi);
        break;
      }
      case 'kurung':
        anak.push(kotakKurung(doc, kotakMath(doc, n.isi, g), n.kiri, n.kanan, g));
        break;
      case 'hiasan': {
        const isi = kotakMath(doc, n.isi, g);
        const u = g.ukuran;
        if (n.jenis === 'aksen') {
          anak.push(kotakAksen(isi, n.tanda, g));
          break;
        }
        const pad = n.jenis === 'kotak' ? u * 0.15 : 0;
        const ruang = n.jenis === 'garis_atas' ? u * 0.15 : n.jenis === 'garis_bawah' ? 0 : pad;
        anak.push({
          w: isi.w + 2 * pad,
          naik: isi.naik + ruang + (n.jenis === 'kotak' ? 1 : 0),
          turun: isi.turun + (n.jenis === 'garis_bawah' ? u * 0.12 : pad + (n.jenis === 'kotak' ? 1 : 0)),
          gambar(d, x, y) {
            isi.gambar(d, x + pad, y);
            garis(d, Math.max(0.4, u * 0.045));
            if (n.jenis === 'garis_atas') d.line(x, y - isi.naik - ruang * 0.6, x + isi.w, y - isi.naik - ruang * 0.6);
            else if (n.jenis === 'garis_bawah') d.line(x, y + isi.turun + u * 0.06, x + isi.w, y + isi.turun + u * 0.06);
            else d.rect(x, y - isi.naik - pad, isi.w + 2 * pad, isi.naik + isi.turun + 2 * pad, 'S');
          },
        });
        break;
      }
      case 'besar': {
        const op = kotakTeks(doc, n.op, { ...g, ukuran: g.ukuran * 1.35 });
        const opTengah: Kotak = { ...op, naik: op.naik * 0.95, turun: op.turun + g.ukuran * 0.1, gambar: (d, x, y) => op.gambar(d, x, y + g.ukuran * 0.12) };
        const bawah = n.bawah ? kotakMath(doc, n.bawah, kecil) : null;
        const atas = n.atas ? kotakMath(doc, n.atas, kecil) : null;
        if (BATAS_BAWAH_ATAS.has(n.op)) anak.push(kotakBertumpuk(opTengah, atas, bawah, g.ukuran * 0.05));
        else {
          // Integral: batas di samping kanan, atas dan bawah.
          const w = Math.max(atas?.w ?? 0, bawah?.w ?? 0);
          anak.push({
            w: opTengah.w + w + 1,
            naik: Math.max(opTengah.naik, atas ? opTengah.naik * 0.7 + atas.naik : 0),
            turun: Math.max(opTengah.turun, bawah ? opTengah.turun + bawah.naik * 0.6 : 0),
            gambar(d, x, y) {
              opTengah.gambar(d, x, y);
              atas?.gambar(d, x + opTengah.w + 1, y - opTengah.naik * 0.7);
              bawah?.gambar(d, x + opTengah.w - g.ukuran * 0.1, y + opTengah.turun);
            },
          });
        }
        anak.push(spasi(g.ukuran * 0.12), kotakMath(doc, n.isi, g));
        break;
      }
      case 'batas': {
        const dasar = kotakMath(doc, n.basis, g);
        const busur = n.atas?.length === 1 && n.atas[0].t === 'teks' && /^[⌢⌒◠]$/.test(n.atas[0].s);
        if (busur && !n.bawah) {
          anak.push(kotakAksen(dasar, '⌒', g));
          break;
        }
        const atas = n.atas ? kotakMath(doc, n.atas, kecil) : null;
        const bawah = n.bawah ? kotakMath(doc, n.bawah, kecil) : null;
        anak.push(kotakBertumpuk(dasar, atas, bawah, g.ukuran * 0.08));
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
