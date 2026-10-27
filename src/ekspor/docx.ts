import {
  AlignmentType,
  BorderStyle,
  BuilderElement,
  Document,
  HeightRule,
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
  VerticalAlign,
  WidthType,
  type ParagraphChild,
  type XmlComponent,
} from 'docx';
import type { HurufOpsi } from '../db/tipe';
import { HURUF_KANAN } from '../db/tipe';
import { uraiTeks, type Simpul } from '../matematika/teks';
import { dominanArab, pisahArab } from './arab';
import { FONT_DOKUMEN, UKURAN_DOKUMEN, kolomOpsi, teksPenskoran, type BagianDok, type ButirDok, type DokumenSoal } from './model';

/** Ubah SVG ke PNG (Word memerlukan gambar raster). Disuntikkan agar modul ini dapat diuji tanpa kanvas. */
export type UbahPng = (svg: string, lebarPx: number, tinggiPx: number) => Promise<Uint8Array>;

// Font dan ukuran diatur sekali pada gaya dokumen, bukan per paragraf, agar suntingan guru tetap konsisten.
const UKURAN = UKURAN_DOKUMEN * 2; // setengah poin
// Huruf Arab (ukuran aksara kompleks, w:szCs) 16 pt agar harakat terbaca; huruf Latin tetap 12 pt.
const UKURAN_ARAB = 32;
// Tanda kiri-ke-kanan di kedua sisi "3." dan "A." di paragraf kanan-ke-kiri, agar titik tetap di kanan angka atau huruf.
const LRM = '\u200E';
const LEBAR_ISI = 9638; // twip: A4 dengan tepi 2 cm
const INDEN = 425; // nomor rata kiri, isi soal menggantung 0,75 cm
const GARIS = { style: BorderStyle.SINGLE, size: 6, color: '000000' } as const;
const TANPA = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;

type AnakMath = MathRun | MathFraction | MathSuperScript | MathSubScript | MathRadical | XmlComponent;

function elemen(name: string, children: XmlComponent[] = [], val?: string | number): XmlComponent {
  return new BuilderElement<{ val: string | number }>({ name, children, ...(val === undefined ? {} : { attributes: { val: { key: 'm:val', value: val } } }) });
}

/** Matriks Office Math (m:m) di dalam tanda kurung (m:d); pustaka docx belum menyediakannya. */
function matriksKeOmml(n: Extract<Simpul, { t: 'matriks' }>): XmlComponent {
  const kolom = Math.max(1, ...n.baris.map((b) => b.length));
  const sifat = elemen('m:mPr', [
    elemen('m:mcs', [elemen('m:mc', [elemen('m:mcPr', [elemen('m:count', [], kolom), elemen('m:mcJc', [], n.kiri === '{' && !n.kanan ? 'left' : 'center')])])]),
  ]);
  const baris = n.baris.map((b) => elemen('m:mr', Array.from({ length: kolom }, (_, i) => elemen('m:e', simpulKeOmml(b[i] ?? [])))));
  const m = elemen('m:m', [sifat, ...baris]);
  if (!n.kiri && !n.kanan) return m;
  return kurungOmml(n.kiri, n.kanan, [m]);
}

/** Tanda kurung yang membesar mengikuti isinya (m:d). */
function kurungOmml(kiri: string, kanan: string, isi: AnakMath[]): XmlComponent {
  return elemen('m:d', [elemen('m:dPr', [elemen('m:begChr', [], kiri), elemen('m:endChr', [], kanan)]), elemen('m:e', isi)]);
}

// Operator besar yang batasnya di bawah dan di atas; selebihnya (integral) di samping kanan.
const BATAS_BAWAH_ATAS = new Set(['∑', '∏', '∐', '⋃', '⋂', '⊕', '⊗']);
// Hiasan berupa tanda panjang di atas (m:groupChr), bukan aksen satu huruf (m:acc).
const TANDA_KELOMPOK = new Set(['→', '←', '↔', '⌒']);

function hiasanKeOmml(n: Extract<Simpul, { t: 'hiasan' }>): XmlComponent {
  const e = elemen('m:e', simpulKeOmml(n.isi));
  switch (n.jenis) {
    case 'garis_atas':
    case 'garis_bawah':
      return elemen('m:bar', [elemen('m:barPr', [elemen('m:pos', [], n.jenis === 'garis_atas' ? 'top' : 'bot')]), e]);
    case 'kotak':
      return elemen('m:borderBox', [e]);
    case 'aksen':
      if (TANDA_KELOMPOK.has(n.tanda)) return elemen('m:groupChr', [elemen('m:groupChrPr', [elemen('m:chr', [], n.tanda), elemen('m:pos', [], 'top'), elemen('m:vertJc', [], 'bot')]), e]);
      return elemen('m:acc', [elemen('m:accPr', [elemen('m:chr', [], n.tanda)]), e]);
  }
}

function besarKeOmml(n: Extract<Simpul, { t: 'besar' }>): XmlComponent {
  const sifat = [
    elemen('m:chr', [], n.op),
    elemen('m:limLoc', [], BATAS_BAWAH_ATAS.has(n.op) ? 'undOvr' : 'subSup'),
    ...(n.bawah ? [] : [elemen('m:subHide', [], 1)]),
    ...(n.atas ? [] : [elemen('m:supHide', [], 1)]),
  ];
  return elemen('m:nary', [elemen('m:naryPr', sifat), elemen('m:sub', simpulKeOmml(n.bawah ?? [])), elemen('m:sup', simpulKeOmml(n.atas ?? [])), elemen('m:e', simpulKeOmml(n.isi))]);
}

function batasKeOmml(n: Extract<Simpul, { t: 'batas' }>): XmlComponent {
  let hasil: AnakMath[] = simpulKeOmml(n.basis);
  if (n.bawah) hasil = [elemen('m:limLow', [elemen('m:e', hasil), elemen('m:lim', simpulKeOmml(n.bawah))])];
  if (n.atas) hasil = [elemen('m:limUpp', [elemen('m:e', hasil), elemen('m:lim', simpulKeOmml(n.atas))])];
  return hasil[0];
}

function teksKeOmml(n: Extract<Simpul, { t: 'teks' }>, berikut: Simpul | undefined): AnakMath {
  if (n.mentah) return new MathRun(n.s.slice(1));
  switch (n.gaya) {
    case 'tegak':
      // Seperti tombol "Normal Text" di Word: tegak, berfont dokumen, spasinya tetap.
      return new MathRun({ text: n.s, normalText: true });
    case 'tebal':
      return new MathRun({ text: n.s, style: 'bold' });
    case 'fungsi': {
      // sin x, log 2: beri spasi tipis bila argumen langsung menempel.
      const tempel = berikut && !(berikut.t === 'teks' && /^[\s(\[|]/.test(berikut.s)) && !(berikut.t === 'kurung' && berikut.kiri === '(');
      return new MathRun({ text: n.s + (tempel ? ' ' : ''), style: 'plain' });
    }
    default:
      return new MathRun(n.s);
  }
}

function simpulKeOmml(daftar: Simpul[]): AnakMath[] {
  // Wadah kosong (mis. dasar {}^5C_2) diisi spasi nol-lebar agar Word tidak menampilkan kotak tempat isian.
  if (!daftar.length) return [new MathRun('\u200B')];
  return daftar.map((n, i): AnakMath => {
    switch (n.t) {
      case 'teks':
        return teksKeOmml(n, daftar[i + 1]);
      case 'pecahan':
        if (n.tanpaGaris) return elemen('m:f', [elemen('m:fPr', [elemen('m:type', [], 'noBar')]), elemen('m:num', simpulKeOmml(n.atas)), elemen('m:den', simpulKeOmml(n.bawah))]);
        return new MathFraction({ numerator: simpulKeOmml(n.atas), denominator: simpulKeOmml(n.bawah) });
      case 'pangkat':
        return new MathSuperScript({ children: simpulKeOmml(n.basis), superScript: simpulKeOmml(n.atas) });
      case 'indeks':
        return new MathSubScript({ children: simpulKeOmml(n.basis), subScript: simpulKeOmml(n.bawah) });
      case 'akar':
        return new MathRadical({ children: simpulKeOmml(n.isi), ...(n.derajat ? { degree: simpulKeOmml(n.derajat) } : {}) });
      case 'matriks':
        return matriksKeOmml(n);
      case 'kurung':
        return kurungOmml(n.kiri, n.kanan, simpulKeOmml(n.isi));
      case 'hiasan':
        return hiasanKeOmml(n);
      case 'besar':
        return besarKeOmml(n);
      case 'batas':
        return batasKeOmml(n);
    }
  });
}

/** Teks soal menjadi run Word: kalimat sebagai TextRun, rumus sebagai Office Math asli (pecahan bertumpuk). */
export function teksKeRun(teks: string, gaya: { tebal?: boolean; miring?: boolean } = {}): ParagraphChild[] {
  const hasil: ParagraphChild[] = [];
  for (const g of uraiTeks(teks)) {
    if (g.jenis === 'teks') {
      g.s.split('\n').forEach((bagian, i) => {
        // Bagian Arab ditandai kanan-ke-kiri (w:rtl) agar Word memakai aturan dan ukuran aksara kompleks.
        const potong = pisahArab(bagian);
        (potong.length ? potong : [{ s: '', arab: false }]).forEach((pt, j) => {
          const awal = j === 0 && i > 0 ? 1 : undefined;
          hasil.push(new TextRun({ text: pt.s, bold: gaya.tebal, italics: gaya.miring, break: awal, ...(pt.arab ? { rightToLeft: true, language: { bidirectional: 'ar-SA' } } : {}) }));
        });
      });
    } else hasil.push(new OMath({ children: simpulKeOmml(g.simpul) }));
  }
  return hasil;
}

function p(anak: ParagraphChild[], opsi: ConstructorParameters<typeof Paragraph>[0] & object = {}): Paragraph {
  return new Paragraph({ spacing: { after: 60 }, ...opsi, children: anak });
}

/** Paragraf kanan-ke-kiri (w:bidi) untuk teks yang dominan Arab: rata kanan, nomor dan indentasi di kanan. */
function arah(teks: string): { bidirectional?: true } {
  return dominanArab(teks) ? { bidirectional: true } : {};
}

/**
 * Pokok soal: nomor, lalu teks. Baris yang arahnya berbeda dari baris sebelumnya (mis. ayat di soal berbahasa
 * Indonesia) menjadi paragraf tersendiri agar ayat rata kanan.
 */
function paragrafPokok(nomor: number, pokok: string, keepNextAkhir: boolean): Paragraph[] {
  const blok: { teks: string; rtl: boolean }[] = [];
  for (const baris of pokok.split('\n')) {
    const rtl = dominanArab(baris) || (!baris.trim() && !!blok.length && blok[blok.length - 1].rtl);
    const akhir = blok[blok.length - 1];
    if (akhir && akhir.rtl === rtl) akhir.teks += `\n${baris}`;
    else blok.push({ teks: baris, rtl });
  }
  return blok.map((b, i) => {
    const keepNext = i < blok.length - 1 || keepNextAkhir;
    if (i === 0) {
      const tab = [{ type: TabStopType.LEFT, position: INDEN }];
      return b.rtl
        ? p([tr(`${LRM}${nomor}.${LRM}\t`), ...teksKeRun(b.teks)], { bidirectional: true, indent: { start: INDEN, hanging: INDEN }, tabStops: tab, spacing: { before: 160, after: 60 }, keepNext, keepLines: true })
        : p([tr(`${nomor}.\t`), ...teksKeRun(b.teks)], { indent: { left: INDEN, hanging: INDEN }, tabStops: tab, spacing: { before: 160, after: 60 }, keepNext, keepLines: true });
    }
    return b.rtl
      ? p(teksKeRun(b.teks), { bidirectional: true, indent: { end: INDEN }, spacing: { after: 60 }, keepNext, keepLines: true })
      : p(teksKeRun(b.teks), { indent: { left: INDEN }, spacing: { after: 60 }, keepNext, keepLines: true });
  });
}

function tr(text: string, o: { tebal?: boolean; miring?: boolean; kecil?: boolean; warna?: string } = {}): TextRun {
  return new TextRun({ text, bold: o.tebal, italics: o.miring, color: o.warna, ...(o.kecil ? { size: 20 } : {}) });
}

function dataUrlKeBytes(url: string): { data: Uint8Array; type: 'png' | 'jpg' } | null {
  const m = url.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { data, type: m[1] === 'png' ? 'png' : 'jpg' };
}

/** Kotak satu sel; dipakai untuk kotak jawaban dan kotak cara pengerjaan. */
function kotak(isi: Paragraph[], lebar: number, tinggi: number, inden = INDEN): Table {
  return new Table({
    width: { size: lebar, type: WidthType.DXA },
    columnWidths: [lebar],
    indent: { size: inden, type: WidthType.DXA },
    borders: { top: GARIS, bottom: GARIS, left: GARIS, right: GARIS, insideHorizontal: TANPA, insideVertical: TANPA },
    rows: [new TableRow({ cantSplit: true, height: { value: tinggi, rule: HeightRule.ATLEAST }, children: [new TableCell({ width: { size: lebar, type: WidthType.DXA }, margins: { top: 60, left: 100, right: 100 }, children: isi })] })],
  });
}

/** "Jawaban :" diikuti kotak kecil di sebelah kanannya. */
function labelDanKotak(label: string, lebarKotak: number, keepNext: boolean): Table {
  const lebarLabel = 1700;
  return new Table({
    width: { size: lebarLabel + lebarKotak, type: WidthType.DXA },
    columnWidths: [lebarLabel, lebarKotak],
    indent: { size: INDEN, type: WidthType.DXA },
    borders: { top: TANPA, bottom: TANPA, left: TANPA, right: TANPA, insideHorizontal: TANPA, insideVertical: TANPA },
    rows: [
      new TableRow({
        cantSplit: true,
        height: { value: 520, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({ width: { size: lebarLabel, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { left: 0 }, children: [p([tr(label, { tebal: true })], { spacing: { after: 0 }, keepNext })] }),
          new TableCell({ width: { size: lebarKotak, type: WidthType.DXA }, borders: { top: GARIS, bottom: GARIS, left: GARIS, right: GARIS }, children: [p([], { spacing: { after: 0 }, keepNext })] }),
        ],
      }),
    ],
  });
}

async function gambarButir(b: ButirDok, ubahPng: UbahPng): Promise<Paragraph | null> {
  if (!b.gambar || !b.svg) return null;
  // Di bawah teks soal, tidak melebihi lebar kolom (maks. 11 cm); PNG 300 dpi.
  const lebarCm = Math.min(11, (b.gambar.lebar / 520) * 11);
  const lebarPt = (lebarCm / 2.54) * 72;
  const tinggiPt = lebarPt * (b.gambar.tinggi / b.gambar.lebar);
  const png = await ubahPng(b.svg, Math.round((lebarPt / 72) * 300), Math.round((tinggiPt / 72) * 300));
  return new Paragraph({
    indent: { left: INDEN },
    keepNext: true,
    spacing: { before: 60, after: 60 },
    children: [new ImageRun({ type: 'png', data: png, transformation: { width: Math.round((lebarPt * 96) / 72), height: Math.round((tinggiPt * 96) / 72) }, altText: { name: `Gambar soal ${b.nomor}`, description: b.gambar.alt, title: `Gambar soal ${b.nomor}` } })],
  });
}

/** Satu butir pilihan ganda, isian, atau uraian. Semua paragraf memakai keepNext agar soal dan tempat jawabnya tidak terpisah halaman. */
async function butirKeParagraf(b: ButirDok, d: DokumenSoal, ubahPng: UbahPng): Promise<(Paragraph | Table)[]> {
  const isi = b.soal.isi_json;
  const hasil: (Paragraph | Table)[] = [];
  const t = b.tempat;
  const adaSesudah = !!isi.opsi || !!isi.pasangan || t.jenis !== 'tidak_ada' || !!b.gambar;
  hasil.push(...paragrafPokok(b.nomor, isi.pokok, true));
  if (isi.terjemahan?.pokok) hasil.push(p(teksKeRun(isi.terjemahan.pokok, { miring: true }), { indent: { left: INDEN }, keepNext: adaSesudah }));
  const g = await gambarButir(b, ubahPng);
  if (g) hasil.push(g);
  if (isi.opsi) {
    const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
    const kolom = kolomOpsi(b);
    const langkah = Math.floor((LEBAR_ISI - INDEN) / 2);
    // Opsi soal berbahasa Arab ditata dari kanan: A paling kanan.
    const rtl = dominanArab(isi.pokok);
    for (let mulai = 0; mulai < huruf.length; mulai += kolom) {
      const anak: ParagraphChild[] = [];
      huruf.slice(mulai, mulai + kolom).forEach((h, i) => {
        if (i) anak.push(tr('\t'));
        anak.push(tr(rtl ? `${LRM}${h}.${LRM}  ` : `${h}.  `), ...teksKeRun(isi.opsi![h] ?? ''));
      });
      const terakhir = mulai + kolom >= huruf.length;
      const tab = kolom > 1 ? [{ type: TabStopType.LEFT, position: INDEN + langkah }] : [];
      hasil.push(p(anak, { ...(rtl ? { bidirectional: true, indent: { start: INDEN } } : { indent: { left: INDEN } }), keepNext: !terakhir, keepLines: true, spacing: { after: 40 }, tabStops: tab }));
    }
  }
  if (isi.pasangan) hasil.push(tabelJodoh(isi.pasangan));
  if (t.jenis === 'titik') hasil.push(p([tr(d.inggris ? 'Answer : ' : 'Jawaban : '), tr('.'.repeat(60))], { indent: { left: INDEN }, spacing: { before: 80, after: 60 } }));
  if (t.jenis === 'kotak') hasil.push(labelDanKotak(d.inggris ? 'Answer :' : 'Jawaban :', 3400, false));
  if (t.jenis === 'garis') {
    for (let i = 0; i < t.jumlah; i++)
      hasil.push(new Paragraph({ indent: { left: INDEN }, spacing: { before: 300, after: 0 }, keepNext: i < t.jumlah - 1, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 1 } }, children: [] }));
  }
  if (t.jenis === 'hitungan') {
    hasil.push(kotak([p([tr(d.inggris ? 'Working :' : 'Cara pengerjaan :', { kecil: true })], { spacing: { after: 0 }, keepNext: true })], LEBAR_ISI - INDEN, 2200));
    hasil.push(p([], { spacing: { after: 40 }, keepNext: true }));
    hasil.push(labelDanKotak(d.inggris ? 'Final answer :' : 'Jawaban akhir :', 3400, false));
  }
  return hasil;
}

/** Menjodohkan: tabel tanpa garis, kolom kiri bernomor dengan titik di ujung kanan, kolom tengah kosong untuk menarik garis, kolom kanan berhuruf. */
function tabelJodoh(pasangan: { kiri: string[]; kanan: string[] }): Table {
  const tengah = 1400;
  const kolom = Math.floor((LEBAR_ISI - INDEN - tengah) / 2);
  const titik = '●';
  const baris = Math.max(pasangan.kiri.length, pasangan.kanan.length);
  const selIsi = (anak: ParagraphChild[], lebar: number, rataKanan = false, terakhir = false) =>
    new TableCell({
      width: { size: lebar, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [p(anak, { spacing: { after: 0 }, keepNext: !terakhir, tabStops: rataKanan ? [{ type: TabStopType.RIGHT, position: lebar - 140 }] : [] })],
    });
  return new Table({
    width: { size: LEBAR_ISI - INDEN, type: WidthType.DXA },
    columnWidths: [kolom, tengah, kolom],
    indent: { size: INDEN, type: WidthType.DXA },
    borders: { top: TANPA, bottom: TANPA, left: TANPA, right: TANPA, insideHorizontal: TANPA, insideVertical: TANPA },
    rows: Array.from({ length: baris }, (_, i) => {
      const terakhir = i === baris - 1;
      const kiri = pasangan.kiri[i];
      const kanan = pasangan.kanan[i];
      return new TableRow({
        cantSplit: true,
        children: [
          selIsi(kiri !== undefined ? [tr(`${i + 1}.  `), ...teksKeRun(kiri), tr(`\t${titik}`)] : [], kolom, true, terakhir),
          selIsi([], tengah, false, terakhir),
          selIsi(kanan !== undefined ? [tr(`${titik}   ${HURUF_KANAN[i]}.  `), ...teksKeRun(kanan)] : [], kolom, false, terakhir),
        ],
      });
    }),
  });
}

/** Pedoman penskoran di berkas kunci jawaban. */
function tabelPenskoran(d: DokumenSoal): (Paragraph | Table)[] {
  const t = teksPenskoran(d.inggris);
  const lebar = [40, 20, 20, 20];
  const selTeks = (teks: string, i: number, tebal = false) =>
    new TableCell({
      width: { size: lebar[i], type: WidthType.PERCENTAGE },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [p([tr(teks, { tebal })], { alignment: i ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 0 } })],
    });
  return [
    p([tr(t.judul, { tebal: true })], { spacing: { before: 320, after: 80 }, keepNext: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: t.kepala.map((k, i) => selTeks(k, i, true)) }),
        ...d.penskoran!.baris.map((b) => new TableRow({ cantSplit: true, children: [b.bentuk, String(b.jumlah), String(b.skor), String(b.maks)].map((x, i) => selTeks(x, i)) })),
        new TableRow({ cantSplit: true, children: [t.total, '', '', String(d.penskoran!.total)].map((x, i) => selTeks(x, i, true)) }),
      ],
    }),
    p([tr(t.rumus)], { spacing: { before: 120 } }),
  ];
}

function selTabel(anak: ParagraphChild[], lebar: number, o: { tengah?: boolean; tebal?: boolean; abu?: boolean; keepNext?: boolean; rtl?: boolean } = {}): TableCell {
  return new TableCell({
    width: { size: lebar, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: o.abu ? { fill: 'F2F2F2' } : undefined,
    // Paragraf kanan-ke-kiri tanpa perataan eksplisit: rata awal, yaitu kanan.
    children: [p(anak, { ...(o.tengah ? { alignment: AlignmentType.CENTER } : o.rtl ? { bidirectional: true } : { alignment: AlignmentType.LEFT }), spacing: { after: 0 }, keepNext: o.keepNext })],
  });
}

/** Benar-salah: tabel No | Pernyataan | Benar | Salah (centang kotak), atau No | Pernyataan | Jawaban (lingkari B / S). */
function tabelBenarSalah(bg: BagianDok, d: DokumenSoal): Table {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const lingkari = d.cara_bs === 'lingkari';
  const lebar = lingkari ? [700, LEBAR_ISI - 700 - 1600, 1600] : [700, LEBAR_ISI - 700 - 2400, 1200, 1200];
  const kepala = lingkari ? ['No', L('Pernyataan', 'Statement'), L('Jawaban', 'Answer')] : ['No', L('Pernyataan', 'Statement'), L('Benar', 'True'), L('Salah', 'False')];
  const kotakKecil = '☐';
  return new Table({
    width: { size: LEBAR_ISI, type: WidthType.DXA },
    columnWidths: lebar,
    borders: { top: GARIS, bottom: GARIS, left: GARIS, right: GARIS, insideHorizontal: GARIS, insideVertical: GARIS },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: kepala.map((k, i) => selTabel([tr(k, { tebal: true })], lebar[i], { tengah: true, abu: true, keepNext: true })) }),
      ...bg.butir.map(
        (b) =>
          new TableRow({
            cantSplit: true,
            children: [
              selTabel([tr(String(b.nomor))], lebar[0], { tengah: true }),
              selTabel([...teksKeRun(b.soal.isi_json.pokok), ...(b.soal.isi_json.terjemahan?.pokok ? [tr(' / '), ...teksKeRun(b.soal.isi_json.terjemahan.pokok, { miring: true })] : [])], lebar[1], { rtl: dominanArab(b.soal.isi_json.pokok) }),
              ...(lingkari ? [selTabel([tr(d.inggris ? 'T        F' : 'B        S')], lebar[2], { tengah: true })] : [selTabel([tr(kotakKecil)], lebar[2], { tengah: true }), selTabel([tr(kotakKecil)], lebar[3], { tengah: true })]),
            ],
          }),
      ),
    ],
  });
}

function sel(teks: string, opsi: { tebal?: boolean; lebar: number; rumus?: boolean }): TableCell {
  return new TableCell({
    width: { size: opsi.lebar, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [p(opsi.rumus ? teksKeRun(teks, { tebal: opsi.tebal }) : [tr(teks, { tebal: opsi.tebal })], { spacing: { after: 0 }, ...(opsi.rumus ? arah(teks) : {}) })],
  });
}

function kepalaDokumen(d: DokumenSoal): (Paragraph | Table)[] {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const hasil: (Paragraph | Table)[] = [];
  const mapelKelas = `${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`;
  if (d.kop) {
    const logo = d.kop.logo ? dataUrlKeBytes(d.kop.logo) : null;
    const kiri: Paragraph[] = [
      p([tr(d.kop.sekolah.toUpperCase(), { tebal: true })], { spacing: { after: 0 } }),
      ...d.kop.baris.map((b) => p([tr(b)], { spacing: { after: 0 } })),
      ...(d.kop.alamat ? [p([tr(d.kop.alamat, { kecil: true })], { spacing: { after: 0 } })] : []),
    ];
    const lebarLogo = logo ? 1100 : 0;
    const lebarKanan = 3200;
    const lebarKiri = LEBAR_ISI - lebarLogo - lebarKanan;
    hasil.push(
      new Table({
        width: { size: LEBAR_ISI, type: WidthType.DXA },
        columnWidths: [...(logo ? [lebarLogo] : []), lebarKiri, lebarKanan],
        borders: { top: TANPA, left: TANPA, right: TANPA, insideHorizontal: TANPA, insideVertical: TANPA, bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' } },
        rows: [
          new TableRow({
            children: [
              ...(logo ? [new TableCell({ width: { size: lebarLogo, type: WidthType.DXA }, children: [new Paragraph({ children: [new ImageRun({ type: logo.type, data: logo.data, transformation: { width: 56, height: 56 } })] })] })] : []),
              new TableCell({ width: { size: lebarKiri, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, margins: { bottom: 80 }, children: kiri }),
              new TableCell({ width: { size: lebarKanan, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, margins: { bottom: 80 }, children: [p([tr(mapelKelas, { tebal: true })], { alignment: AlignmentType.RIGHT, spacing: { after: 0 } })] }),
            ],
          }),
        ],
      }),
    );
  }
  if (d.identitas.length) {
    const anak: ParagraphChild[] = [];
    d.identitas.forEach((f, i) => {
      if (i) anak.push(tr('\t'));
      anak.push(tr(`${f} : ${i === 0 ? '____________________' : '________'}`));
    });
    // Kolom pertama (nama) lebih lebar; sisanya berbagi lebar yang tersisa.
    const n = d.identitas.length;
    const posisi = d.identitas.slice(1).map((_, i) => ({ type: TabStopType.LEFT, position: Math.round(LEBAR_ISI * (0.45 + (0.55 * i) / Math.max(1, n - 1))) }));
    hasil.push(p(anak, { tabStops: posisi, spacing: { before: 200, after: 120 } }));
  }
  hasil.push(p([tr(d.judul.toUpperCase(), { tebal: true })], { alignment: AlignmentType.CENTER, spacing: { before: 160, after: d.kop ? 160 : 0 } }));
  if (!d.kop) hasil.push(p([tr(mapelKelas)], { alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
  return hasil;
}

/** Kepala berkas kunci jawaban dan kisi-kisi: judul berkas, nama sekolah bila kop dipakai, judul paket, mapel, dan kelas. */
function kepalaLampiran(d: DokumenSoal, judulBerkas: string): Paragraph[] {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  return [
    p([tr(judulBerkas, { tebal: true })], { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    ...(d.kop ? [p([tr(d.kop.sekolah.toUpperCase())], { alignment: AlignmentType.CENTER, spacing: { after: 0 } })] : []),
    p([tr(`${d.judul} · ${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`)], { alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
  ];
}

export async function buatDocx(d: DokumenSoal, ubahPng: UbahPng): Promise<Blob> {
  const en = d.inggris;
  const L = (id: string, inggris: string) => (en ? inggris : id);
  const isi: (Paragraph | Table)[] = [];

  if (d.berkas === 'soal') {
    isi.push(...kepalaDokumen(d));
    for (const bg of d.bagian) {
      isi.push(p([tr(bg.judul, { tebal: true })], { spacing: { before: 240, after: 40 }, keepNext: true }));
      isi.push(p([tr(bg.petunjuk, { miring: true })], { keepNext: true, spacing: { after: 80 } }));
      if (bg.bentuk === 'benar_salah') isi.push(tabelBenarSalah(bg, d));
      else for (const b of bg.butir) isi.push(...(await butirKeParagraf(b, d, ubahPng)));
    }
  }

  if (d.berkas === 'kunci') {
    isi.push(...kepalaLampiran(d, L('KUNCI JAWABAN', 'ANSWER KEY')));
    for (const k of d.kunci) {
      const rtlKunci = dominanArab(k.teks);
      isi.push(p([tr(rtlKunci ? `${LRM}${k.nomor}.${LRM}\t` : `${k.nomor}.\t`), ...teksKeRun(k.teks)], { ...(rtlKunci ? { bidirectional: true, indent: { start: INDEN, hanging: INDEN } } : { indent: { left: INDEN, hanging: INDEN } }), tabStops: [{ type: TabStopType.LEFT, position: INDEN }], spacing: { after: 40 }, keepNext: !!k.rubrik?.length }));
      if (k.rubrik?.length) k.rubrik.forEach((r, i) => isi.push(p([tr('– '), ...teksKeRun(r)], { ...arah(r), indent: dominanArab(r) ? { start: INDEN * 2 } : { left: INDEN * 2 }, spacing: { after: 20 }, keepNext: i < k.rubrik!.length - 1 })));
    }
    if (d.penskoran) isi.push(...tabelPenskoran(d));
    // Pembahasan ikut berkas kunci jawaban, mulai di halaman baru.
    if (d.opsi.pembahasan) {
      isi.push(p([tr(L('PEMBAHASAN', 'WORKED SOLUTIONS'), { tebal: true })], { pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
      for (const pb of d.pembahasan) {
        isi.push(p([tr(`${pb.nomor}.`, { tebal: true })], { spacing: { before: 120, after: 20 }, keepNext: true }));
        pb.langkah.forEach((l, i) => isi.push(p([tr('– '), ...teksKeRun(l)], { ...arah(l), indent: dominanArab(l) ? { start: INDEN } : { left: INDEN }, spacing: { after: 20 }, keepNext: i < pb.langkah.length - 1 })));
      }
    }
  }

  if (d.berkas === 'kisi') {
    isi.push(...kepalaLampiran(d, L('KISI-KISI', 'TEST BLUEPRINT')));
    isi.push(p([tr(`${L('Fase', 'Phase')} ${d.fase} · ${d.kurikulumLabel}`)], { spacing: { after: d.cp ? 40 : 160 } }));
    if (d.cp) isi.push(p([tr('CP: ', { tebal: true }), ...teksKeRun(d.cp)], { spacing: { after: 160 } }));
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
    title: d.berkas === 'soal' ? d.judul : `${d.judul} · ${d.berkas === 'kunci' ? 'Kunci jawaban' : 'Kisi-kisi'}`,
    styles: {
      default: {
        document: { run: { font: FONT_DOKUMEN, size: UKURAN, sizeComplexScript: UKURAN_ARAB }, paragraph: { spacing: { line: 276 } } },
      },
      paragraphStyles: [{ id: 'Normal', name: 'Normal', run: { font: FONT_DOKUMEN, size: UKURAN, sizeComplexScript: UKURAN_ARAB } }],
    },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children: isi }],
  });
  return Packer.toBlob(doc);
}
