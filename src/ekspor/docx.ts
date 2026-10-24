import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Math as OMath,
  MathFraction,
  MathRadical,
  MathRun,
  MathSubScript,
  MathSuperScript,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ParagraphChild,
} from 'docx';
import type { HurufOpsi } from '../db/tipe';
import { uraiTeks, type Simpul } from '../matematika/teks';
import { opsiPerBaris, type ButirDok, type DokumenSoal } from './model';

/** Ubah SVG ke PNG (Word memerlukan gambar raster). Disuntikkan agar modul ini dapat diuji tanpa kanvas. */
export type UbahPng = (svg: string, lebarPx: number, tinggiPx: number) => Promise<Uint8Array>;

const UKURAN = 24; // setengah poin: 12 pt
const FONT = 'Arial';

type AnakMath = MathRun | MathFraction | MathSuperScript | MathSubScript | MathRadical;

function simpulKeOmml(daftar: Simpul[]): AnakMath[] {
  return daftar.map((n): AnakMath => {
    switch (n.t) {
      case 'teks':
        return new MathRun(n.mentah ? n.s.slice(1) : n.s);
      case 'pecahan':
        return new MathFraction({ numerator: simpulKeOmml(n.atas), denominator: simpulKeOmml(n.bawah) });
      case 'pangkat':
        return new MathSuperScript({ children: simpulKeOmml(n.basis), superScript: simpulKeOmml(n.atas) });
      case 'indeks':
        return new MathSubScript({ children: simpulKeOmml(n.basis), subScript: simpulKeOmml(n.bawah) });
      case 'akar':
        return new MathRadical({ children: simpulKeOmml(n.isi), ...(n.derajat ? { degree: simpulKeOmml(n.derajat) } : {}) });
    }
  });
}

/** Teks soal menjadi run Word: kalimat sebagai TextRun, rumus sebagai Office Math asli (pecahan bertumpuk). */
export function teksKeRun(teks: string, gaya: { tebal?: boolean; miring?: boolean; ukuran?: number } = {}): ParagraphChild[] {
  const hasil: ParagraphChild[] = [];
  for (const g of uraiTeks(teks)) {
    if (g.jenis === 'teks') {
      g.s.split('\n').forEach((bagian, i) => {
        hasil.push(new TextRun({ text: bagian, bold: gaya.tebal, italics: gaya.miring, size: gaya.ukuran ?? UKURAN, font: FONT, break: i > 0 ? 1 : undefined }));
      });
    } else hasil.push(new OMath({ children: simpulKeOmml(g.simpul) }));
  }
  return hasil;
}

function p(anak: ParagraphChild[], opsi: ConstructorParameters<typeof Paragraph>[0] & object = {}): Paragraph {
  return new Paragraph({ spacing: { after: 80 }, ...opsi, children: anak });
}

function tr(text: string, o: { tebal?: boolean; miring?: boolean; ukuran?: number; warna?: string } = {}): TextRun {
  return new TextRun({ text, bold: o.tebal, italics: o.miring, size: o.ukuran ?? UKURAN, font: FONT, color: o.warna });
}

function dataUrlKeBytes(url: string): { data: Uint8Array; type: 'png' | 'jpg' } | null {
  const m = url.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, type: m[1] === 'png' ? 'png' : 'jpg' };
}

async function butirKeParagraf(b: ButirDok, d: DokumenSoal, ubahPng: UbahPng): Promise<(Paragraph | Table)[]> {
  const isi = b.soal.isi_json;
  const hasil: (Paragraph | Table)[] = [];
  const kepala: ParagraphChild[] = [tr(`${b.nomor}.\t`), ...teksKeRun(isi.pokok)];
  if (isi.bentuk === 'benar_salah') kepala.push(tr(d.inggris ? '\t( T / F )' : '\t( B / S )'));
  hasil.push(
    p(kepala, {
      indent: { left: 440, hanging: 440 },
      tabStops: [
        { type: TabStopType.LEFT, position: 440 },
        { type: TabStopType.RIGHT, position: 9000 },
      ],
      spacing: { before: 160, after: 80 },
      keepNext: true,
    }),
  );
  if (isi.terjemahan?.pokok) hasil.push(p(teksKeRun(isi.terjemahan.pokok, { miring: true }), { indent: { left: 440 } }));
  if (b.gambar && b.svg) {
    // lebar cetak maksimal 11 cm; PNG 300 dpi
    const lebarCm = Math.min(11, (b.gambar.lebar / 520) * 11);
    const lebarPt = (lebarCm / 2.54) * 72;
    const tinggiPt = lebarPt * (b.gambar.tinggi / b.gambar.lebar);
    const png = await ubahPng(b.svg, Math.round((lebarPt / 72) * 300), Math.round((tinggiPt / 72) * 300));
    hasil.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
        children: [new ImageRun({ type: 'png', data: png, transformation: { width: Math.round((lebarPt * 96) / 72), height: Math.round((tinggiPt * 96) / 72) }, altText: { name: `Gambar soal ${b.nomor}`, description: b.gambar.alt, title: `Gambar soal ${b.nomor}` } })],
      }),
    );
  }
  if (isi.bentuk === 'pilihan_ganda' && isi.opsi) {
    const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
    const perBaris = opsiPerBaris(b, huruf.length);
    if (perBaris > 1) {
      const langkah = Math.floor(8600 / perBaris);
      for (let mulai = 0; mulai < huruf.length; mulai += perBaris) {
        const anak: ParagraphChild[] = [];
        huruf.slice(mulai, mulai + perBaris).forEach((h, i) => {
          if (i) anak.push(tr('\t'));
          anak.push(tr(`${h}. `), ...teksKeRun(isi.opsi![h] ?? ''));
        });
        hasil.push(p(anak, { indent: { left: 440 }, keepNext: mulai + perBaris < huruf.length, spacing: { after: 40 }, tabStops: Array.from({ length: perBaris - 1 }, (_, i) => ({ type: TabStopType.LEFT, position: 440 + langkah * (i + 1) })) }));
      }
    } else {
      for (const h of huruf) hasil.push(p([tr(`${h}.\t`), ...teksKeRun(isi.opsi[h] ?? '')], { indent: { left: 880, hanging: 440 }, tabStops: [{ type: TabStopType.LEFT, position: 880 }], spacing: { after: 40 }, keepNext: h !== huruf.at(-1) }));
    }
  }
  if (b.kotakJawaban) {
    const tinggi = isi.bentuk === 'uraian' ? 2400 : 1200;
    hasil.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ height: { value: tinggi, rule: 'atLeast' }, children: [new TableCell({ children: [p([tr(d.inggris ? 'Answer:' : 'Jawaban:', { ukuran: 18, warna: '5B616B' })])] })] })],
      }),
    );
  }
  return hasil;
}

function sel(teks: string, opsi: { tebal?: boolean; lebar: number; rumus?: boolean }): TableCell {
  return new TableCell({
    width: { size: opsi.lebar, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [p(opsi.rumus ? teksKeRun(teks, { ukuran: 18, tebal: opsi.tebal }) : [tr(teks, { tebal: opsi.tebal, ukuran: 18 })], { spacing: { after: 0 } })],
  });
}

export async function buatDocx(d: DokumenSoal, ubahPng: UbahPng): Promise<Blob> {
  const en = d.inggris;
  const L = (id: string, inggris: string) => (en ? inggris : id);
  const isi: (Paragraph | Table)[] = [];

  if (d.kop) {
    const logo = d.kop.logo ? dataUrlKeBytes(d.kop.logo) : null;
    const teksKop = [
      p([tr(d.kop.sekolah.toUpperCase(), { tebal: true, ukuran: 30 })], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
      ...d.kop.baris.map((b) => p([tr(b, { ukuran: 22 })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })),
      ...(d.kop.alamat ? [p([tr(d.kop.alamat, { ukuran: 18 })], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })] : []),
    ];
    const tanpaGaris = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    isi.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: tanpaGaris, left: tanpaGaris, right: tanpaGaris, insideHorizontal: tanpaGaris, insideVertical: tanpaGaris, bottom: { style: BorderStyle.DOUBLE, size: 6, color: '0B0C0E' } },
        rows: [
          new TableRow({
            children: [
              ...(logo ? [new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: 64, height: 64 } })] })] })] : []),
              new TableCell({ width: { size: logo ? 85 : 100, type: WidthType.PERCENTAGE }, children: teksKop }),
            ],
          }),
        ],
      }),
    );
  }
  isi.push(p([tr(d.judul, { tebal: true, ukuran: 28 })], { alignment: AlignmentType.CENTER, spacing: { before: 200, after: 40 } }));
  isi.push(p([tr(`${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`)], { alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
  if (d.identitas.length) {
    const anak: ParagraphChild[] = [];
    d.identitas.forEach((f, i) => {
      if (i) anak.push(tr('\t'));
      anak.push(tr(`${f}: ______________`));
    });
    isi.push(p(anak, { tabStops: d.identitas.slice(1).map((_, i) => ({ type: TabStopType.LEFT, position: Math.round((9000 / d.identitas.length) * (i + 1)) })), spacing: { after: 240 } }));
  }
  for (const bg of d.bagian) {
    isi.push(p([tr(bg.judul, { tebal: true })], { spacing: { before: 240, after: 40 }, keepNext: true }));
    isi.push(p([tr(bg.petunjuk, { miring: true })], { keepNext: true }));
    for (const b of bg.butir) isi.push(...(await butirKeParagraf(b, d, ubahPng)));
  }
  isi.push(p([tr(d.jejak, { ukuran: 16, warna: '5B616B' })], { spacing: { before: 360 } }));

  if (d.opsi.kunci) {
    isi.push(p([tr(L('Kunci Jawaban', 'Answer Key'), { tebal: true, ukuran: 28 })], { pageBreakBefore: true, spacing: { after: 200 } }));
    for (const k of d.kunci) {
      isi.push(p([tr(`${k.nomor}.\t`), ...teksKeRun(k.teks)], { indent: { left: 440, hanging: 440 }, tabStops: [{ type: TabStopType.LEFT, position: 440 }], spacing: { after: 40 } }));
      if (k.rubrik?.length) for (const r of k.rubrik) isi.push(p([tr('– '), ...teksKeRun(r, { ukuran: 20 })], { indent: { left: 880 }, spacing: { after: 20 } }));
    }
  }
  if (d.opsi.pembahasan) {
    isi.push(p([tr(L('Pembahasan', 'Worked Solutions'), { tebal: true, ukuran: 28 })], { pageBreakBefore: true, spacing: { after: 200 } }));
    for (const pb of d.pembahasan) {
      isi.push(p([tr(`${pb.nomor}.`, { tebal: true })], { spacing: { before: 120, after: 20 }, keepNext: true }));
      for (const l of pb.langkah) isi.push(p([tr('– '), ...teksKeRun(l)], { indent: { left: 440 }, spacing: { after: 20 } }));
    }
  }
  if (d.opsi.kisi) {
    isi.push(p([tr(L('Kisi-kisi', 'Test Blueprint'), { tebal: true, ukuran: 28 })], { pageBreakBefore: true, spacing: { after: 80 } }));
    isi.push(p([tr(`${d.kurikulumLabel} · ${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas} · ${L('Fase', 'Phase')} ${d.fase}`, { ukuran: 18 })], { spacing: { after: 160 } }));
    const lebar = [6, 28, 32, 8, 12, 14];
    const kepala = ['No', 'TP', L('Indikator', 'Indicator'), 'Level', L('Kesukaran', 'Difficulty'), L('Bentuk', 'Type')];
    isi.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: kepala.map((k, i) => sel(k, { tebal: true, lebar: lebar[i] })) }),
          ...d.kisi.map(
            (k) =>
              new TableRow({
                cantSplit: true,
                children: [
                  sel(String(k.nomor), { lebar: lebar[0] }),
                  sel(k.tp + (k.tp_kode ? ` (${k.tp_kode})` : ''), { lebar: lebar[1], rumus: true }),
                  sel(k.indikator, { lebar: lebar[2], rumus: true }),
                  sel(k.level, { lebar: lebar[3] }),
                  sel(k.kesukaran, { lebar: lebar[4] }),
                  sel(k.bentuk, { lebar: lebar[5] }),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const doc = new Document({
    creator: 'GenSoal',
    title: d.judul,
    description: d.jejak,
    styles: { default: { document: { run: { font: FONT, size: UKURAN } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: isi }],
  });
  return Packer.toBlob(doc);
}
