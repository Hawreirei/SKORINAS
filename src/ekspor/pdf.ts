import { jsPDF } from 'jspdf';
import type { HurufOpsi } from '../db/tipe';
import { keSvg } from '../gambar/svg';
import { FONT_PDF, gambarParagraf, lebarTeks, tataParagraf, tinggiParagraf, type Baris, type GayaTeks } from './pdf-tata';
import { opsiPerBaris, type ButirDok, type DokumenSoal } from './model';

/** Gambar SVG vektor ke PDF. Di peramban memakai svg2pdf.js; disuntikkan agar dapat diuji. */
export type GambarSvg = (doc: jsPDF, svg: string, x: number, y: number, w: number, h: number) => Promise<void>;

export interface AsetPdf {
  fontBiasa: string;
  fontTebal: string;
  gambarSvg: GambarSvg;
}

const A4 = { w: 595.28, h: 841.89 };
const TEPI = { kiri: 50, kanan: 50, atas: 50, bawah: 60 };
const LEBAR = A4.w - TEPI.kiri - TEPI.kanan;
const UKURAN = 14;
const INDEN = 24;
const ABU: [number, number, number] = [91, 97, 107];

const g = (ukuran = UKURAN, tebal = false, warna?: [number, number, number]): GayaTeks => ({ ukuran, tebal, warna });

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

  garis(y: number, tebal = 0.8) {
    this.doc.setDrawColor(11, 12, 14);
    this.doc.setLineWidth(tebal);
    this.doc.line(TEPI.kiri, y, A4.w - TEPI.kanan, y);
  }
}

/** Gambar label pendek (nomor, huruf opsi) sejajar garis dasar baris pertama paragraf di sebelahnya. */
function labelSejajar(doc: jsPDF, label: string, x: number, y: number, lebar: number, gaya: GayaTeks, rujukan: Baris[]) {
  const t = tataParagraf(doc, label, lebar, gaya);
  const geser = (rujukan[0]?.naik ?? t[0].naik) - t[0].naik;
  gambarParagraf(doc, t, x, y + geser, gaya);
}

function ukuranGambar(b: ButirDok, lebarTersedia: number): { w: number; h: number } {
  const maks = Math.min(lebarTersedia, (b.gambar!.lebar / 520) * 312, 312);
  const w = Math.max(110, maks);
  return { w, h: (w * b.gambar!.tinggi) / b.gambar!.lebar };
}

/** Gambar (atau ukur bila gambar=false) satu butir pada lebar tertentu. Mengembalikan tinggi. */
async function butir(p: Penulis, b: ButirDok, d: DokumenSoal, x: number, y: number, lebar: number, gambar: boolean): Promise<number> {
  const doc = p.doc;
  const isi = b.soal.isi_json;
  const gaya = g();
  let cy = y;
  const lebarIsi = lebar - INDEN;
  const tandaBs = isi.bentuk === 'benar_salah' ? (d.inggris ? 'T  /  F' : 'B  /  S') : '';
  const lebarBs = tandaBs ? lebarTeks(doc, tandaBs, gaya) + 16 : 0;
  const pokok = tataParagraf(doc, isi.pokok, lebarIsi - lebarBs, gaya);
  if (gambar) {
    labelSejajar(doc, `${b.nomor}.`, x, cy, INDEN, gaya, pokok);
    gambarParagraf(doc, pokok, x + INDEN, cy, gaya);
    if (tandaBs) labelSejajar(doc, tandaBs, x + lebar - lebarBs + 16, cy, lebarBs, gaya, pokok);
  }
  cy += tinggiParagraf(pokok, gaya);
  if (isi.terjemahan?.pokok) {
    const gt = g(UKURAN - 2, false, ABU);
    const t = tataParagraf(doc, isi.terjemahan.pokok, lebarIsi, gt);
    if (gambar) gambarParagraf(doc, t, x + INDEN, cy, gt);
    cy += tinggiParagraf(t, gt);
  }
  if (b.gambar && b.svg) {
    const u = ukuranGambar(b, lebarIsi);
    cy += 6;
    if (gambar) await p.aset.gambarSvg(doc, keSvg(b.gambar, { font: FONT_PDF }), x + INDEN + (lebarIsi - u.w) / 2, cy, u.w, u.h);
    cy += u.h + 6;
  }
  if (isi.bentuk === 'pilihan_ganda' && isi.opsi) {
    const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
    const perBaris = opsiPerBaris(b, huruf.length);
    const lebarSel = lebarIsi / perBaris;
    cy += 4;
    for (let mulai = 0; mulai < huruf.length; mulai += perBaris) {
      let tinggi = 0;
      huruf.slice(mulai, mulai + perBaris).forEach((h, i) => {
        const label = `${h}.`;
        const lebarLabel = 20;
        const t = tataParagraf(doc, isi.opsi![h] ?? '', lebarSel - lebarLabel - 6, gaya);
        const sx = x + INDEN + i * lebarSel;
        if (gambar) {
          labelSejajar(doc, label, sx, cy, lebarLabel, gaya, t);
          gambarParagraf(doc, t, sx + lebarLabel, cy, gaya);
        }
        tinggi = Math.max(tinggi, tinggiParagraf(t, gaya));
      });
      cy += tinggi + 2;
    }
  }
  if (b.kotakJawaban) {
    const h = isi.bentuk === 'uraian' ? 130 : 64;
    cy += 6;
    if (gambar) {
      doc.setDrawColor(11, 12, 14);
      doc.setLineWidth(0.6);
      doc.rect(x + INDEN, cy, lebarIsi, h);
      gambarParagraf(doc, tataParagraf(doc, d.inggris ? 'Answer:' : 'Jawaban:', lebarIsi, g(9, false, ABU)), x + INDEN + 6, cy + 4, g(9, false, ABU));
    }
    cy += h;
  }
  return cy - y;
}

async function bagianSoal(p: Penulis, d: DokumenSoal) {
  const kolom = (LEBAR - 24) / 2;
  for (const bg of d.bagian) {
    p.ruang(70);
    p.y += 8;
    p.paragraf(bg.judul, g(UKURAN, true), { jarak: 2 });
    p.paragraf(bg.petunjuk, g(11, false, ABU), { jarak: 8 });
    let i = 0;
    while (i < bg.butir.length) {
      const a = bg.butir[i];
      const b2 = bg.butir[i + 1];
      if (a.sederhana && b2?.sederhana) {
        const ha = await butir(p, a, d, 0, 0, kolom, false);
        const hb = await butir(p, b2, d, 0, 0, kolom, false);
        p.ruang(Math.max(ha, hb));
        await butir(p, a, d, TEPI.kiri, p.y, kolom, true);
        await butir(p, b2, d, TEPI.kiri + kolom + 24, p.y, kolom, true);
        p.y += Math.max(ha, hb) + 12;
        i += 2;
      } else {
        const h = await butir(p, a, d, 0, 0, LEBAR, false);
        p.ruang(h);
        await butir(p, a, d, TEPI.kiri, p.y, LEBAR, true);
        p.y += h + 12;
        i += 1;
      }
    }
  }
}

function tabelKisi(p: Penulis, d: DokumenSoal) {
  const doc = p.doc;
  const gaya = g(8.5);
  const gayaKepala = g(8.5, true);
  const lebar = [24, 128, 168, 34, 52, 89].map((w) => (w / 495) * LEBAR);
  const kepala = ['No', 'TP', d.inggris ? 'Indicator' : 'Indikator', 'Level', d.inggris ? 'Difficulty' : 'Kesukaran', d.inggris ? 'Type' : 'Bentuk'];
  const pad = 4;
  const baris = (sel: string[], gy: GayaTeks) => {
    const tata = sel.map((s, i) => tataParagraf(doc, s, lebar[i] - pad * 2, gy));
    const h = Math.max(...tata.map((t) => tinggiParagraf(t, gy))) + pad * 2;
    return { tata, h };
  };
  const gambarBaris = (r: ReturnType<typeof baris>, gy: GayaTeks, latar = false) => {
    let x = TEPI.kiri;
    doc.setDrawColor(11, 12, 14);
    doc.setLineWidth(0.5);
    r.tata.forEach((t, i) => {
      if (latar) {
        doc.setFillColor(246, 247, 248);
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

/** PDF lengkap langsung dari peramban: kop, soal, gambar vektor, kunci, pembahasan, kisi-kisi; font ditanam. */
export async function buatPdf(d: DokumenSoal, aset: AsetPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.addFileToVFS('InterTight-Regular.ttf', aset.fontBiasa);
  doc.addFont('InterTight-Regular.ttf', FONT_PDF, 'normal');
  doc.addFileToVFS('InterTight-SemiBold.ttf', aset.fontTebal);
  doc.addFont('InterTight-SemiBold.ttf', FONT_PDF, 'bold');
  doc.setProperties({ title: d.judul, subject: `${d.mapel} kelas ${d.kelas}`, creator: 'GenSoal', keywords: d.jejak });
  const p = new Penulis(doc, aset);
  const L = (id: string, en: string) => (d.inggris ? en : id);

  if (d.kop) {
    const awal = p.y;
    if (d.kop.logo) {
      try {
        doc.addImage(d.kop.logo, TEPI.kiri, p.y, 54, 54);
      } catch {
        /* logo rusak diabaikan */
      }
    }
    p.paragraf(d.kop.sekolah.toUpperCase(), g(16, true), { rata: 'tengah' });
    for (const b of d.kop.baris) p.paragraf(b, g(11), { rata: 'tengah' });
    if (d.kop.alamat) p.paragraf(d.kop.alamat, g(9.5, false, ABU), { rata: 'tengah' });
    p.y = Math.max(p.y, awal + (d.kop.logo ? 58 : 0)) + 6;
    p.garis(p.y, 1.6);
    p.garis(p.y + 2.5, 0.5);
    p.y += 16;
  }
  p.paragraf(d.judul, g(15, true), { rata: 'tengah' });
  p.paragraf(`${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`, g(11), { rata: 'tengah', jarak: 14 });
  if (d.identitas.length) {
    const n = d.identitas.length;
    const lebarKolom = d.identitas.map((_, i) => (n === 1 ? LEBAR : i === 0 ? LEBAR * 0.44 : (LEBAR * 0.52) / (n - 1)));
    let x = TEPI.kiri;
    const gi = g(11);
    d.identitas.forEach((f, i) => {
      const label = `${f}:`;
      const wl = lebarTeks(doc, label, gi) + 4;
      gambarParagraf(doc, tataParagraf(doc, label, wl + 10, gi), x, p.y, gi);
      doc.setDrawColor(11, 12, 14);
      doc.setLineWidth(0.5);
      doc.line(x + wl, p.y + 13, x + lebarKolom[i] - 10, p.y + 13);
      x += lebarKolom[i] + (i === 0 ? LEBAR * 0.04 / Math.max(1, n - 1) : 0);
    });
    p.y += 30;
  }
  await bagianSoal(p, d);
  p.y += 8;
  p.paragraf(d.jejak, g(7.5, false, ABU));

  if (d.opsi.kunci) {
    p.halamanBaru();
    p.paragraf(L('Kunci Jawaban', 'Answer Key'), g(16, true), { jarak: 10 });
    const pendek = d.kunci.filter((k) => !k.rubrik?.length);
    const kolom = (LEBAR - 24) / 2;
    const gk = g(11);
    for (let i = 0; i < pendek.length; i += 2) {
      const sel = [pendek[i], pendek[i + 1]].filter(Boolean).map((k) => tataParagraf(doc, `${k.nomor}.  ${k.teks}`, kolom, gk));
      const h = Math.max(...sel.map((t) => tinggiParagraf(t, gk)));
      p.ruang(h);
      sel.forEach((t, j) => gambarParagraf(doc, t, TEPI.kiri + j * (kolom + 24), p.y, gk));
      p.y += h + 2;
    }
    for (const k of d.kunci.filter((x) => x.rubrik?.length)) {
      p.y += 8;
      p.paragraf(`${k.nomor}.  ${k.teks}`, gk, { jarak: 2 });
      p.paragraf(L('Rubrik:', 'Rubric:'), g(10, true, ABU));
      for (const r of k.rubrik!) p.paragraf(`–  ${r}`, g(10), { x: TEPI.kiri + 14, lebar: LEBAR - 14 });
    }
  }
  if (d.opsi.pembahasan) {
    p.halamanBaru();
    p.paragraf(L('Pembahasan', 'Worked Solutions'), g(16, true), { jarak: 10 });
    for (const pb of d.pembahasan) {
      p.ruang(40);
      p.paragraf(`${pb.nomor}.`, g(11, true));
      for (const l of pb.langkah) p.paragraf(`–  ${l}`, g(11), { x: TEPI.kiri + 14, lebar: LEBAR - 14 });
      p.y += 6;
    }
  }
  if (d.opsi.kisi) {
    p.halamanBaru();
    p.paragraf(L('Kisi-kisi', 'Test Blueprint'), g(16, true), { jarak: 2 });
    p.paragraf(`${d.kurikulumLabel} · ${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas} · ${L('Fase', 'Phase')} ${d.fase}`, g(9.5, false, ABU), { jarak: 10 });
    tabelKisi(p, d);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont(FONT_PDF, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...ABU);
    doc.text(`${i} / ${total}`, A4.w / 2, A4.h - 30, { align: 'center' });
  }
  return doc.output('blob');
}
