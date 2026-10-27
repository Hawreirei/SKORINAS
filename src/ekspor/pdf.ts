import { jsPDF } from 'jspdf';
import type { HurufOpsi } from '../db/tipe';
import { HURUF_KANAN } from '../db/tipe';
import { FONT_PDF, FONT_SIMBOL, gambarParagraf, lebarTeks, tataParagraf, tinggiParagraf, type Baris, type GayaTeks } from './pdf-tata';
import { UKURAN_DOKUMEN, kolomOpsi, teksPenskoran, type BagianDok, type ButirDok, type DokumenSoal } from './model';

/** Gambar SVG vektor ke PDF. Di peramban memakai svg2pdf.js; disuntikkan agar dapat diuji. */
export type GambarSvg = (doc: jsPDF, svg: string, x: number, y: number, w: number, h: number) => Promise<void>;

export interface AsetPdf {
  fontBiasa: string;
  fontTebal: string;
  fontMiring: string;
  /** public/fonts/GenSoalSimbol.ttf: simbol matematika yang tidak ada di Liberation Serif. */
  fontSimbol: string;
  gambarSvg: GambarSvg;
}

const A4 = { w: 595.28, h: 841.89 };
const TEPI = { kiri: 56.7, kanan: 56.7, atas: 56.7, bawah: 56.7 };
const LEBAR = A4.w - TEPI.kiri - TEPI.kanan;
const UKURAN = UKURAN_DOKUMEN;
const INDEN = 21.3; // 0,75 cm: nomor rata kiri, isi soal menggantung
const ABU: [number, number, number] = [75, 85, 99];
const KECIL = 9; // nomor halaman

const g = (o: Partial<GayaTeks> = {}): GayaTeks => ({ ukuran: UKURAN, ...o });

class Penulis {
  y = TEPI.atas;
  constructor(
    readonly doc: jsPDF,
    readonly aset: AsetPdf,
  ) {}

  halamanBaru() {
    this.doc.addPage();
    this.y = TEPI.atas;
  }

  /** Pindah halaman bila tinggi h tidak muat, agar soal dan tempat jawabnya tidak terpisah. */
  ruang(h: number) {
    if (this.y + h > A4.h - TEPI.bawah && this.y > TEPI.atas + 1) this.halamanBaru();
  }

  paragraf(teks: string, gaya: GayaTeks, opsi: { x?: number; lebar?: number; rata?: 'kiri' | 'tengah' | 'kanan'; jarak?: number } = {}) {
    const lebar = opsi.lebar ?? LEBAR;
    const baris = tataParagraf(this.doc, teks, lebar, gaya);
    for (const b of baris) {
      const h = tinggiParagraf([b], gaya);
      this.ruang(h);
      gambarParagraf(this.doc, [b], opsi.x ?? TEPI.kiri, this.y, gaya, opsi.rata, lebar);
      this.y += h;
    }
    this.y += opsi.jarak ?? 0;
  }

  garis(y: number, tebal = 0.8, x1 = TEPI.kiri, x2 = A4.w - TEPI.kanan) {
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(tebal);
    this.doc.line(x1, y, x2, y);
  }
}

/** Gambar label pendek (nomor, huruf opsi) sejajar garis dasar baris pertama paragraf di sebelahnya. */
function labelSejajar(doc: jsPDF, label: string, x: number, y: number, lebar: number, gaya: GayaTeks, rujukan: Baris[]) {
  const t = tataParagraf(doc, label, lebar, gaya);
  const geser = (rujukan[0]?.naik ?? t[0].naik) - t[0].naik;
  gambarParagraf(doc, t, x, y + geser, gaya);
}

function ukuranGambar(b: ButirDok, lebarTersedia: number): { w: number; h: number } {
  // Tidak melebihi lebar kolom.
  const w = Math.max(110, Math.min(lebarTersedia, (b.gambar!.lebar / 520) * 312, 312));
  return { w, h: (w * b.gambar!.tinggi) / b.gambar!.lebar };
}

function persegi(doc: jsPDF, x: number, y: number, w: number, h: number, tebal = 0.6) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(tebal);
  doc.rect(x, y, w, h);
}

/** "Jawaban :" lalu kotak kecil di kanannya. Mengembalikan tinggi. */
function labelKotak(doc: jsPDF, label: string, x: number, y: number, gambar: boolean): number {
  const gt = g({ tebal: true });
  const tinggi = 22;
  if (gambar) {
    const t = tataParagraf(doc, label, 200, gt);
    gambarParagraf(doc, t, x, y + (tinggi - tinggiParagraf(t, gt)) / 2 + 1, gt);
    persegi(doc, x + lebarTeks(doc, label, gt) + 8, y, 170, tinggi);
  }
  return tinggi;
}

/** Gambar (atau ukur bila gambar=false) satu butir pilihan ganda, isian, atau uraian. Mengembalikan tinggi. */
async function butir(p: Penulis, b: ButirDok, d: DokumenSoal, x: number, y: number, gambar: boolean): Promise<number> {
  const doc = p.doc;
  const isi = b.soal.isi_json;
  const gaya = g();
  const lebarIsi = LEBAR - INDEN;
  const xi = x + INDEN;
  let cy = y;
  const pokok = tataParagraf(doc, isi.pokok, lebarIsi, gaya);
  if (gambar) {
    labelSejajar(doc, `${b.nomor}.`, x, cy, INDEN, gaya, pokok);
    gambarParagraf(doc, pokok, xi, cy, gaya);
  }
  cy += tinggiParagraf(pokok, gaya);
  if (isi.terjemahan?.pokok) {
    const gt = g({ miring: true, warna: ABU });
    const t = tataParagraf(doc, isi.terjemahan.pokok, lebarIsi, gt);
    if (gambar) gambarParagraf(doc, t, xi, cy, gt);
    cy += tinggiParagraf(t, gt);
  }
  // Gambar diletakkan di bawah teks soal.
  if (b.gambar && b.svg) {
    const u = ukuranGambar(b, lebarIsi);
    cy += 6;
    if (gambar) await p.aset.gambarSvg(doc, b.svg, xi, cy, u.w, u.h);
    cy += u.h + 6;
  }
  if (isi.opsi) {
    const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
    const kolom = kolomOpsi(b);
    const lebarSel = lebarIsi / kolom;
    cy += 3;
    for (let mulai = 0; mulai < huruf.length; mulai += kolom) {
      let tinggi = 0;
      huruf.slice(mulai, mulai + kolom).forEach((h, i) => {
        const lebarLabel = 20;
        const t = tataParagraf(doc, isi.opsi![h] ?? '', lebarSel - lebarLabel - 8, gaya);
        const sx = xi + i * lebarSel;
        if (gambar) {
          labelSejajar(doc, `${h}.`, sx, cy, lebarLabel, gaya, t);
          gambarParagraf(doc, t, sx + lebarLabel, cy, gaya);
        }
        tinggi = Math.max(tinggi, tinggiParagraf(t, gaya));
      });
      cy += tinggi + 1;
    }
  }
  if (isi.pasangan) {
    // Menjodohkan: kolom kiri bernomor dan kolom kanan berhuruf dengan titik; ruang tengah untuk menarik garis.
    const { kiri, kanan } = isi.pasangan;
    const tengah = 70;
    const lebarKolom = (lebarIsi - tengah) / 2;
    const lebarLabel = 20;
    cy += 4;
    for (let i = 0; i < Math.max(kiri.length, kanan.length); i++) {
      const tk = kiri[i] !== undefined ? tataParagraf(doc, kiri[i], lebarKolom - lebarLabel - 12, gaya) : null;
      const tn = kanan[i] !== undefined ? tataParagraf(doc, kanan[i], lebarKolom - lebarLabel - 12, gaya) : null;
      const tinggi = Math.max(tk ? tinggiParagraf(tk, gaya) : 0, tn ? tinggiParagraf(tn, gaya) : 0);
      const yTitik = cy + Math.min(tinggi, UKURAN * 1.35) / 2;
      if (gambar) {
        doc.setFillColor(0, 0, 0);
        if (tk) {
          labelSejajar(doc, `${i + 1}.`, xi, cy, lebarLabel, gaya, tk);
          gambarParagraf(doc, tk, xi + lebarLabel, cy, gaya);
          doc.circle(xi + lebarKolom - 3, yTitik, 2, 'F');
        }
        if (tn) {
          const xk = xi + lebarKolom + tengah;
          doc.circle(xk + 3, yTitik, 2, 'F');
          labelSejajar(doc, `${HURUF_KANAN[i]}.`, xk + 12, cy, lebarLabel, gaya, tn);
          gambarParagraf(doc, tn, xk + 12 + lebarLabel, cy, gaya);
        }
      }
      cy += tinggi + 8;
    }
  }
  const t = b.tempat;
  const jawab = d.inggris ? 'Answer :' : 'Jawaban :';
  if (t.jenis === 'titik') {
    cy += 4;
    const label = `${jawab} `;
    const titik = '.'.repeat(Math.floor((lebarIsi * 0.62 - lebarTeks(doc, label, gaya)) / lebarTeks(doc, '.', gaya)));
    const baris = tataParagraf(doc, label + titik, lebarIsi, gaya);
    if (gambar) gambarParagraf(doc, baris, xi, cy, gaya);
    cy += tinggiParagraf(baris, gaya);
  } else if (t.jenis === 'kotak') {
    cy += 5;
    cy += labelKotak(doc, jawab, xi, cy, gambar);
  } else if (t.jenis === 'garis') {
    for (let i = 0; i < t.jumlah; i++) {
      cy += 22;
      if (gambar) p.garis(cy, 0.5, xi, x + LEBAR);
    }
    cy += 4;
  } else if (t.jenis === 'hitungan') {
    cy += 6;
    const h = 110;
    if (gambar) {
      persegi(doc, xi, cy, lebarIsi, h);
      const gk = g({ ukuran: 10, warna: ABU });
      gambarParagraf(doc, tataParagraf(doc, d.inggris ? 'Working :' : 'Cara pengerjaan :', lebarIsi, gk), xi + 5, cy + 4, gk);
    }
    cy += h + 8;
    cy += labelKotak(doc, d.inggris ? 'Final answer :' : 'Jawaban akhir :', xi, cy, gambar);
  }
  return cy - y;
}

/** Benar-salah: tabel No | Pernyataan | Benar | Salah, atau No | Pernyataan | Jawaban (lingkari B / S). */
function tabelBenarSalah(p: Penulis, bg: BagianDok, d: DokumenSoal) {
  const doc = p.doc;
  const gaya = g();
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const lingkari = d.cara_bs === 'lingkari';
  const lebar = lingkari ? [34, LEBAR - 34 - 90, 90] : [34, LEBAR - 34 - 120, 60, 60];
  const kepala = lingkari ? ['No', L('Pernyataan', 'Statement'), L('Jawaban', 'Answer')] : ['No', L('Pernyataan', 'Statement'), L('Benar', 'True'), L('Salah', 'False')];
  const pad = 5;
  const gambarBaris = (sel: (Baris[] | 'kotak' | null)[], h: number, latar: boolean, tengah: boolean[]) => {
    let x = TEPI.kiri;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    sel.forEach((s, i) => {
      if (latar) {
        doc.setFillColor(242, 242, 242);
        doc.rect(x, p.y, lebar[i], h, 'FD');
      } else doc.rect(x, p.y, lebar[i], h);
      if (s === 'kotak') persegi(doc, x + (lebar[i] - 10) / 2, p.y + (h - 10) / 2, 10, 10, 0.7);
      else if (s) {
        const th = tinggiParagraf(s, latar ? g({ tebal: true }) : gaya);
        const gy = latar ? g({ tebal: true }) : gaya;
        gambarParagraf(doc, s, x + pad, p.y + (h - th) / 2, gy, tengah[i] ? 'tengah' : 'kiri', lebar[i] - pad * 2);
      }
      x += lebar[i];
    });
    p.y += h;
  };
  const gk = g({ tebal: true });
  const tataKepala = kepala.map((k, i) => tataParagraf(doc, k, lebar[i] - pad * 2, gk));
  const hKepala = Math.max(...tataKepala.map((t) => tinggiParagraf(t, gk))) + pad * 2;
  const tengah = lebar.map((_, i) => i !== 1);
  const baris = bg.butir.map((b) => {
    const teks = b.soal.isi_json.terjemahan?.pokok ? `${b.soal.isi_json.pokok}\n${b.soal.isi_json.terjemahan.pokok}` : b.soal.isi_json.pokok;
    const sel: (Baris[] | 'kotak' | null)[] = [tataParagraf(doc, String(b.nomor), lebar[0] - pad * 2, gaya), tataParagraf(doc, teks, lebar[1] - pad * 2, gaya)];
    if (lingkari) sel.push(tataParagraf(doc, d.inggris ? 'T        F' : 'B        S', lebar[2] - pad * 2, gaya));
    else sel.push('kotak', 'kotak');
    const h = Math.max(22, tinggiParagraf(sel[1] as Baris[], gaya) + pad * 2);
    return { sel, h };
  });
  p.ruang(hKepala + (baris[0]?.h ?? 0));
  gambarBaris(tataKepala, hKepala, true, tengah);
  for (const r of baris) {
    if (p.y + r.h > A4.h - TEPI.bawah) {
      p.halamanBaru();
      gambarBaris(tataKepala, hKepala, true, tengah);
    }
    gambarBaris(r.sel, r.h, false, tengah);
  }
  p.y += 6;
}

async function bagianSoal(p: Penulis, d: DokumenSoal) {
  for (const bg of d.bagian) {
    // Judul bagian dan petunjuk tetap bersama soal pertamanya.
    const judul = tataParagraf(p.doc, bg.judul, LEBAR, g({ tebal: true }));
    const petunjuk = tataParagraf(p.doc, bg.petunjuk, LEBAR, g({ miring: true }));
    const hAwal = bg.bentuk === 'benar_salah' ? 60 : await butir(p, bg.butir[0], d, 0, 0, false);
    p.ruang(12 + tinggiParagraf(judul, g()) + tinggiParagraf(petunjuk, g()) + 8 + hAwal);
    p.y += 12;
    p.paragraf(bg.judul, g({ tebal: true }), { jarak: 1 });
    p.paragraf(bg.petunjuk, g({ miring: true }), { jarak: 8 });
    if (bg.bentuk === 'benar_salah') {
      tabelBenarSalah(p, bg, d);
      continue;
    }
    for (const b of bg.butir) {
      const h = await butir(p, b, d, 0, 0, false);
      p.ruang(h);
      await butir(p, b, d, TEPI.kiri, p.y, true);
      p.y += h + 10;
    }
  }
}

function tabelKisi(p: Penulis, d: DokumenSoal) {
  const doc = p.doc;
  const gaya = g();
  const gayaKepala = g({ tebal: true });
  const lebar = [24, 118, 150, 36, 72, 82].map((w) => (w / 482) * LEBAR);
  const kepala = ['No', 'TP', d.inggris ? 'Indicator' : 'Indikator', 'Level', d.inggris ? 'Difficulty' : 'Kesukaran', d.inggris ? 'Type' : 'Bentuk'];
  const pad = 4;
  const baris = (sel: string[], gy: GayaTeks) => {
    const tata = sel.map((s, i) => tataParagraf(doc, s, lebar[i] - pad * 2, gy));
    const h = Math.max(...tata.map((t) => tinggiParagraf(t, gy))) + pad * 2;
    return { tata, h };
  };
  const gambarBaris = (r: ReturnType<typeof baris>, gy: GayaTeks, latar = false) => {
    let x = TEPI.kiri;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    r.tata.forEach((t, i) => {
      if (latar) {
        doc.setFillColor(242, 242, 242);
        doc.rect(x, p.y, lebar[i], r.h, 'FD');
      } else doc.rect(x, p.y, lebar[i], r.h);
      gambarParagraf(doc, t, x + pad, p.y + pad, gy);
      x += lebar[i];
    });
    p.y += r.h;
  };
  const rk = baris(kepala, gayaKepala);
  p.ruang(rk.h * 3);
  gambarBaris(rk, gayaKepala, true);
  for (const k of d.kisi) {
    const r = baris([String(k.nomor), k.tp + (k.tp_kode ? ` (${k.tp_kode})` : ''), k.indikator, k.level, k.kesukaran, k.bentuk], gaya);
    if (p.y + r.h > A4.h - TEPI.bawah) {
      p.halamanBaru();
      gambarBaris(rk, gayaKepala, true);
    }
    gambarBaris(r, gaya);
  }
}

/** Pedoman penskoran: Bentuk soal | Jumlah soal | Skor per soal | Skor maksimal, baris jumlah, lalu rumus nilai. */
function tabelPenskoran(p: Penulis, d: DokumenSoal) {
  const doc = p.doc;
  const t = teksPenskoran(d.inggris);
  const lebar = [0.4, 0.2, 0.2, 0.2].map((w) => w * LEBAR);
  const pad = 4;
  const baris = [...d.penskoran!.baris.map((b) => [b.bentuk, String(b.jumlah), String(b.skor), String(b.maks)]), [t.total, '', '', String(d.penskoran!.total)]];
  const tinggiBaris = UKURAN * 1.35 + pad * 2;
  p.y += 16;
  p.ruang(tinggiBaris * (baris.length + 1) + 40);
  p.paragraf(t.judul, g({ tebal: true }), { jarak: 4 });
  [t.kepala, ...baris].forEach((r, ri) => {
    const tebal = ri === 0 || ri === baris.length;
    const gy = g({ tebal });
    let x = TEPI.kiri;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    r.forEach((teks, i) => {
      if (ri === 0) {
        doc.setFillColor(242, 242, 242);
        doc.rect(x, p.y, lebar[i], tinggiBaris, 'FD');
      } else doc.rect(x, p.y, lebar[i], tinggiBaris);
      if (teks) {
        const tt = tataParagraf(doc, teks, lebar[i] - pad * 2, gy);
        gambarParagraf(doc, tt, x + pad, p.y + (tinggiBaris - tinggiParagraf(tt, gy)) / 2, gy, i ? 'tengah' : 'kiri', lebar[i] - pad * 2);
      }
      x += lebar[i];
    });
    p.y += tinggiBaris;
  });
  p.y += 6;
  p.paragraf(t.rumus, g());
}

function kepalaDokumen(p: Penulis, d: DokumenSoal) {
  const doc = p.doc;
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const mapelKelas = `${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`;
  if (d.kop) {
    const awal = p.y;
    const gt = g({ tebal: true });
    const lebarKanan = Math.min(200, lebarTeks(doc, mapelKelas, gt) + 4);
    let x = TEPI.kiri;
    if (d.kop.logo) {
      try {
        doc.addImage(d.kop.logo, TEPI.kiri, p.y, 44, 44);
        x += 52;
      } catch {
        /* logo rusak diabaikan */
      }
    }
    const lebarKiri = LEBAR - (x - TEPI.kiri) - lebarKanan - 12;
    p.paragraf(d.kop.sekolah.toUpperCase(), gt, { x, lebar: lebarKiri });
    for (const b of d.kop.baris) p.paragraf(b, g(), { x, lebar: lebarKiri });
    if (d.kop.alamat) p.paragraf(d.kop.alamat, g({ ukuran: 10, warna: ABU }), { x, lebar: lebarKiri });
    const bawah = Math.max(p.y, awal + (x > TEPI.kiri ? 46 : 0));
    const t = tataParagraf(doc, mapelKelas, lebarKanan, gt);
    gambarParagraf(doc, t, A4.w - TEPI.kanan - lebarKanan, bawah - tinggiParagraf(t, gt), gt, 'kanan', lebarKanan);
    p.y = bawah + 4;
    p.garis(p.y, 1.2);
    p.y += 12;
  }
  if (d.identitas.length) {
    const n = d.identitas.length;
    const gi = g();
    const lebarKolom = d.identitas.map((_, i) => (n === 1 ? LEBAR : i === 0 ? LEBAR * 0.45 : (LEBAR * 0.55) / (n - 1)));
    let x = TEPI.kiri;
    d.identitas.forEach((f, i) => {
      const label = `${f} :`;
      const wl = lebarTeks(doc, label, gi) + 5;
      gambarParagraf(doc, tataParagraf(doc, label, wl + 10, gi), x, p.y, gi);
      p.garis(p.y + 13, 0.5, x + wl, x + lebarKolom[i] - 14);
      x += lebarKolom[i];
    });
    p.y += 26;
  }
  p.paragraf(d.judul.toUpperCase(), g({ tebal: true }), { rata: 'tengah', jarak: d.kop ? 4 : 0 });
  if (!d.kop) p.paragraf(mapelKelas, g(), { rata: 'tengah', jarak: 4 });
}

/** Kepala berkas kunci jawaban dan kisi-kisi: judul berkas, nama sekolah bila kop dipakai, judul paket, mapel, dan kelas. */
function kepalaLampiran(p: Penulis, d: DokumenSoal, judulBerkas: string) {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  p.paragraf(judulBerkas, g({ tebal: true }), { rata: 'tengah', jarak: 2 });
  if (d.kop) p.paragraf(d.kop.sekolah.toUpperCase(), g(), { rata: 'tengah' });
  p.paragraf(`${d.judul} · ${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`, g(), { rata: 'tengah', jarak: 14 });
}

/** PDF satu berkas (lembar soal, kunci jawaban, atau kisi-kisi) langsung dari peramban, Times New Roman 12 (Liberation Serif tertanam): kop, soal, gambar vektor, kunci, pembahasan, kisi-kisi. */
export async function buatPdf(d: DokumenSoal, aset: AsetPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.addFileToVFS('LiberationSerif-Regular.ttf', aset.fontBiasa);
  doc.addFont('LiberationSerif-Regular.ttf', FONT_PDF, 'normal');
  doc.addFileToVFS('LiberationSerif-Bold.ttf', aset.fontTebal);
  doc.addFont('LiberationSerif-Bold.ttf', FONT_PDF, 'bold');
  doc.addFileToVFS('LiberationSerif-Italic.ttf', aset.fontMiring);
  doc.addFont('LiberationSerif-Italic.ttf', FONT_PDF, 'italic');
  doc.addFileToVFS('GenSoalSimbol.ttf', aset.fontSimbol);
  doc.addFont('GenSoalSimbol.ttf', FONT_SIMBOL, 'normal');
  doc.setProperties({ title: d.berkas === 'soal' ? d.judul : `${d.judul} · ${d.berkas === 'kunci' ? 'Kunci jawaban' : 'Kisi-kisi'}`, subject: `${d.mapel} kelas ${d.kelas}`, creator: 'GenSoal' });
  const p = new Penulis(doc, aset);
  const L = (id: string, en: string) => (d.inggris ? en : id);

  if (d.berkas === 'soal') {
    kepalaDokumen(p, d);
    await bagianSoal(p, d);
  }

  if (d.berkas === 'kunci') {
    kepalaLampiran(p, d, L('KUNCI JAWABAN', 'ANSWER KEY'));
    const pendek = d.kunci.filter((k) => !k.rubrik?.length);
    const kolom = (LEBAR - 24) / 2;
    const gk = g();
    for (let i = 0; i < pendek.length; i += 2) {
      const sel = [pendek[i], pendek[i + 1]].filter(Boolean).map((k) => tataParagraf(doc, `${k.nomor}.  ${k.teks}`, kolom, gk));
      const h = Math.max(...sel.map((t) => tinggiParagraf(t, gk)));
      p.ruang(h);
      sel.forEach((t, j) => gambarParagraf(doc, t, TEPI.kiri + j * (kolom + 24), p.y, gk));
      p.y += h + 2;
    }
    for (const k of d.kunci.filter((x) => x.rubrik?.length)) {
      p.y += 8;
      p.ruang(60);
      p.paragraf(`${k.nomor}.  ${k.teks}`, gk, { jarak: 2 });
      p.paragraf(L('Rubrik:', 'Rubric:'), g({ tebal: true }));
      for (const r of k.rubrik!) p.paragraf(`–  ${r}`, gk, { x: TEPI.kiri + INDEN, lebar: LEBAR - INDEN });
    }
    if (d.penskoran) tabelPenskoran(p, d);
    // Pembahasan ikut berkas kunci jawaban, mulai di halaman baru.
    if (d.opsi.pembahasan) {
      p.halamanBaru();
      p.paragraf(L('PEMBAHASAN', 'WORKED SOLUTIONS'), g({ tebal: true }), { rata: 'tengah', jarak: 10 });
      for (const pb of d.pembahasan) {
        p.ruang(40);
        p.paragraf(`${pb.nomor}.`, g({ tebal: true }));
        for (const l of pb.langkah) p.paragraf(`–  ${l}`, g(), { x: TEPI.kiri + INDEN, lebar: LEBAR - INDEN });
        p.y += 6;
      }
    }
  }

  if (d.berkas === 'kisi') {
    kepalaLampiran(p, d, L('KISI-KISI', 'TEST BLUEPRINT'));
    p.paragraf(`${L('Fase', 'Phase')} ${d.fase} · ${d.kurikulumLabel}`, g(), { jarak: 4 });
    if (d.cp) p.paragraf(`CP: ${d.cp}`, g(), { jarak: 8 });
    tabelKisi(p, d);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONT_PDF, 'normal');
    doc.setFontSize(KECIL);
    doc.setTextColor(...ABU);
    doc.text(`${i} / ${total}`, A4.w / 2, A4.h - 28, { align: 'center' });
  }
  return doc.output('blob');
}
