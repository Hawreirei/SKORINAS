import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import { dominanArab, pisahArab, sambungArab, urutanVisual } from '../src/ekspor/arab';
import { buatDocx } from '../src/ekspor/docx';
import { bangunDokumen } from '../src/ekspor/model';
import { FONT_ARAB, FONT_PDF, gambarParagraf, tataParagraf } from '../src/ekspor/pdf-tata';
import { buatTex } from '../src/ekspor/tex';
import { teksKeHtml } from '../src/komponen/TeksSoal';
import { kemiripan } from '../src/verifikasi/kemiripan';
import type { Soal } from '../src/db/tipe';
import { paketUji, profilUji, soalUji } from './bantu-soal';

const AYAT = 'Perhatikan ayat berikut!\nإِنَّ مَعَ الْعُسْرِ يُسْرًا\nAyat tersebut terdapat dalam surah ...';
const SOAL_ARAB = 'أَيْنَ يَذْهَبُ أَحْمَدُ فِي السَّاعَةِ 7 صَبَاحًا؟';
const OPSI_ARAB = { A: 'إِلَى الْمَدْرَسَةِ', B: 'إِلَى السُّوقِ', C: 'إِلَى الْمَسْجِدِ', D: 'إِلَى الْبَيْتِ' };

const kode = (s: string) => sambungArab(s).map((g) => g.glif.codePointAt(0)!);

function soalArab(): Soal[] {
  const dasar = soalUji().find((s) => s.bentuk === 'pilihan_ganda')!;
  const buat = (i: number, pokok: string, opsi: Record<string, string>) => ({ ...dasar, id: `ar${i}`, slot_id: `ar${i}`, urutan: i, isi_json: { ...dasar.isi_json, pokok, opsi, gambar: null, kunci: 'A', pembahasan: [opsi.A] } });
  return [buat(1, AYAT, { A: 'Al-Insyirah', B: 'Ad-Duha', C: 'Al-Ikhlas', D: 'An-Nas' }), buat(2, 'Arti kata مَدْرَسَةٌ adalah ...', { A: 'sekolah', B: 'masjid', C: 'pasar', D: 'rumah' }), buat(3, SOAL_ARAB, OPSI_ARAB)] as Soal[];
}
const dokumen = () => bangunDokumen(paketUji(), soalArab(), profilUji(), { kop: false, kunci: true, kisi: false, pembahasan: true });

describe('penyambung huruf Arab', () => {
  it('bentuk awal, tengah, akhir, dan tunggal', () => {
    expect(kode('مدرسة')).toEqual([0xfee3, 0xfeaa, 0xfead, 0xfeb3, 0xfe94]);
    expect(kode('بيت')).toEqual([0xfe91, 0xfef4, 0xfe96]);
    expect(kode('ـمـ')).toEqual([0x640, 0xfee4, 0x640]);
  });
  it('harakat tidak memutus sambungan dan ikut gugus hurufnya', () => {
    const g = sambungArab('مَدْرَسَةٌ');
    expect(g.map((x) => x.glif.codePointAt(0))).toEqual(kode('مدرسة'));
    expect(g.map((x) => x.tanda.join(''))).toEqual(['\u064E', '\u0652', '\u064E', '\u064E', '\u064C']);
  });
  it('lam-alif menjadi ligatur, dengan harakat lam dan alif', () => {
    expect(kode('سلام')).toEqual([0xfeb3, 0xfefc, 0xfee1]);
    const [lam] = sambungArab('لَا');
    expect([lam.glif.codePointAt(0), lam.tanda]).toEqual([0xfefb, ['\u064E']]);
  });
  it('urutan gambar: gugus dibalik, angka tetap, kurung dicerminkan', () => {
    expect(urutanVisual(sambungArab('(مدرسة)')).map((g) => g.glif).join('')).toBe('(\uFE94\uFEB3\uFEAD\uFEAA\uFEE3)');
    expect(urutanVisual(sambungArab('ص12')).map((g) => g.glif).join('')).toBe('12\uFEB9');
  });
  it('arah paragraf dan pemisahan bagian Arab', () => {
    expect(dominanArab('Arti kata مَدْرَسَةٌ adalah ...')).toBe(false);
    expect(dominanArab(SOAL_ARAB)).toBe(true);
    expect(dominanArab('Hitung $x^2$')).toBe(false);
    expect(pisahArab('kata مَدْرَسَةٌ dan إِلَى الْبَيْتِ.')).toEqual([
      { s: 'kata ', arab: false },
      { s: 'مَدْرَسَةٌ', arab: true },
      { s: ' dan ', arab: false },
      { s: 'إِلَى الْبَيْتِ', arab: true },
      { s: '.', arab: false },
    ]);
  });
});

function pdfUji(): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('L.ttf', readFileSync('public/fonts/LiberationSerif-Regular.ttf').toString('base64'));
  doc.addFont('L.ttf', FONT_PDF, 'normal');
  doc.addFileToVFS('A.ttf', readFileSync('public/fonts/GenSoalArab.ttf').toString('base64'));
  doc.addFont('A.ttf', FONT_ARAB, 'normal');
  return doc;
}

describe('PDF berhuruf Arab', () => {
  it('font Arab memuat semua bentuk sajian dan harakat yang dihasilkan penyambung', () => {
    const doc = pdfUji();
    const peta = (doc as unknown as { getFont(n: string, g: string): { metadata: { cmap: { unicode: { codeMap: Record<number, number> } } } } }).getFont(FONT_ARAB, 'normal').metadata.cmap.unicode.codeMap;
    const huruf = 'ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيٱپچژڤکگی';
    const contoh = [...huruf].flatMap((h) => [h, `${h}ب`, `ب${h}`, `ب${h}ب`]).join(' ') + ' لا لأ لإ لآ بلا ' + 'بَبِبُبًبٍبٌبّبْبٰ';
    const hilang = sambungArab(contoh).flatMap((g) => [g.glif, ...g.tanda]).filter((c) => c && c !== ' ' && !peta[c.codePointAt(0)!]);
    expect(hilang).toEqual([]);
  });
  it('paragraf Arab ditata kanan-ke-kiri: kata pertama paling kanan, rata kanan', () => {
    const doc = pdfUji();
    const [b] = tataParagraf(doc, 'إِلَى الْمَدْرَسَةِ', 400, { ukuran: 12 });
    expect(b.arah).toBe('rtl');
    const [kedua, pertama] = b.kotak;
    expect(pertama.x).toBeGreaterThan(kedua.x);
    const xGambar: number[] = [];
    const asli = doc.text.bind(doc);
    doc.text = ((t: string, x: number, ...r: unknown[]) => (xGambar.push(x), (asli as (...a: unknown[]) => jsPDF)(t, x, ...r))) as typeof doc.text;
    gambarParagraf(doc, [b], 0, 0, { ukuran: 12 });
    expect(Math.max(...xGambar)).toBeGreaterThan(300);
  });
  it('kalimat Indonesia dengan frasa Arab: urutan kata Arab dibalik, kata Latin tetap', () => {
    const doc = pdfUji();
    const [b] = tataParagraf(doc, 'kata إِلَى الْبَيْتِ saja', 400, { ukuran: 12 });
    expect(b.arah).toBe('ltr');
    expect(b.kotak.map(({ k }) => k.arah)).toEqual(['ltr', 'rtl', 'rtl', 'ltr']);
    // Logis: kata, إِلَى, الْبَيْتِ, saja. Gambar dari kiri: kata, الْبَيْتِ, إِلَى, saja.
    const lebarKata = (k: string) => tataParagraf(doc, k, 400, { ukuran: 12 })[0].kotak[0].k.w;
    expect(b.kotak[1].k.w).toBeCloseTo(lebarKata('الْبَيْتِ'));
    expect(b.kotak[2].k.w).toBeCloseTo(lebarKata('إِلَى'));
    expect(b.kotak.map(({ x }) => x)).toEqual([...b.kotak.map(({ x }) => x)].sort((p, q) => p - q));
  });
  it('baris ayat di tengah soal berbahasa Indonesia rata kanan', () => {
    const baris = tataParagraf(pdfUji(), AYAT, 400, { ukuran: 12 });
    expect(baris.map((b) => b.arah)).toEqual(['ltr', 'rtl', 'ltr']);
  });
  it('PDF utuh menanam font Arab', async () => {
    const { buatPdf } = await import('../src/ekspor/pdf');
    const f = (n: string) => readFileSync(`public/fonts/${n}.ttf`).toString('base64');
    const blob = await buatPdf(dokumen(), { fontBiasa: f('LiberationSerif-Regular'), fontTebal: f('LiberationSerif-Bold'), fontMiring: f('LiberationSerif-Italic'), fontSimbol: f('GenSoalSimbol'), fontArab: f('GenSoalArab'), gambarSvg: async () => {} });
    expect(Buffer.from(await blob.arrayBuffer()).toString('latin1')).toMatch(/GenSoalArab/);
  }, 60000);
});

describe('Word berhuruf Arab', () => {
  it('huruf Arab 16 pt, run kanan-ke-kiri, paragraf soal Arab kanan-ke-kiri dengan nomor di kanan', async () => {
    const zip = await JSZip.loadAsync(await (await buatDocx(dokumen(), async () => new Uint8Array())).arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    const gaya = await zip.file('word/styles.xml')!.async('string');
    expect(gaya).toMatch(/<w:szCs w:val="32"\/>/);
    expect(gaya).toMatch(/<w:sz w:val="24"\/>/);
    expect(xml).toContain('<w:rtl/>');
    expect(xml).toContain('w:bidi="ar-SA"');
    // Soal 3 seluruhnya Arab; baris ayat di soal 1 menjadi paragraf kanan-ke-kiri sendiri.
    expect(xml.match(/<w:bidi\/>/g)!.length).toBeGreaterThanOrEqual(4);
    expect(xml).toContain('\u200E3.\u200E');
    expect(xml).toContain('\u200EA.\u200E');
    // Soal berbahasa Indonesia tetap kiri-ke-kanan tanpa tanda LRM.
    expect(xml).toContain('>2.\t<');
  });
});

describe('LaTeX berhuruf Arab', () => {
  it('beralih ke XeLaTeX dengan polyglossia; tanpa huruf Arab tetap pdflatex', () => {
    const tex = buatTex(dokumen());
    expect(tex).toMatch(/XeLaTeX/);
    expect(tex).toContain('\\setotherlanguage{arabic}');
    expect(tex).toContain('\\arab{إِنَّ مَعَ الْعُسْرِ يُسْرًا}');
    expect(tex).not.toContain('inputenc');
    const biasa = buatTex(bangunDokumen(paketUji(), soalUji(), profilUji(), { kop: false, kunci: false, kisi: false, pembahasan: false }));
    expect(biasa).toMatch(/pdflatex/);
    expect(biasa).not.toContain('polyglossia');
  });
  it.runIf(adaXelatex())('terkompilasi dengan XeLaTeX', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gensoal-arab-'));
    writeFileSync(join(dir, 'soal.tex'), buatTex(dokumen()));
    try {
      execFileSync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', 'soal.tex'], { cwd: dir, stdio: 'pipe', timeout: 120000 });
    } catch {
      const log = readFileSync(join(dir, 'soal.log'), 'utf8');
      throw new Error(log.split('\n').filter((l) => l.startsWith('!') || l.startsWith('l.')).slice(0, 6).join('\n'));
    }
  }, 180000);
});

function adaXelatex(): boolean {
  try {
    execFileSync('xelatex', ['--version'], { stdio: 'ignore' });
    execFileSync('fc-list', ['FreeSerif'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('layar dan pemeriksa kemiripan', () => {
  it('bagian Arab diberi lang dan dir; baris ayat menjadi blok rata kanan', () => {
    const html = teksKeHtml(AYAT);
    expect(html).toContain('<span class="baris-arab" dir="rtl"><span class="teks-arab" lang="ar" dir="rtl">');
    expect(html.match(/<br>/g) ?? []).toHaveLength(0);
    expect(teksKeHtml('Satu\nDua')).toBe('Satu<br>Dua');
  });
  it('harakat dan hamzah pada alif diabaikan saat membandingkan soal', () => {
    expect(kemiripan('ذَهَبَ أَحْمَدُ إِلَى الْمَدْرَسَةِ صَبَاحًا', 'ذهب احمد الى المدرسة صباحا')).toBeGreaterThan(0.9);
    expect(kemiripan('ذَهَبَ أَحْمَدُ إِلَى الْمَدْرَسَةِ', 'يَأْكُلُ الطَّالِبُ الْخُبْزَ فِي الْبَيْتِ')).toBeLessThan(0.3);
  });
});
