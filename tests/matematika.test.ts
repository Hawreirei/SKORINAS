import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import { HURUF_GANDA, OPERATOR_BESAR, SIMBOL, TIDAK, pulihkanLatex, simpulKePolos, uraiLatex, uraiTeks, type Simpul } from '../src/matematika/teks';
import { FONT_PDF, FONT_SIMBOL, KARAKTER_SIMBOL, amankan, tataParagraf } from '../src/ekspor/pdf-tata';
import { teksKeRun } from '../src/ekspor/docx';
import { teksKeHtml } from '../src/komponen/TeksSoal';
import { escLatex, keLatex } from '../src/matematika/latex';
import { ekstrakJson } from '../src/verifikasi/skema';
import { Document, Packer, Paragraph } from 'docx';
import JSZip from 'jszip';

async function xmlRun(teks: string): Promise<string> {
  const blob = await Packer.toBlob(new Document({ sections: [{ children: [new Paragraph({ children: teksKeRun(teks) })] }] }));
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file('word/document.xml')!.async('string');
}

describe('matriks', () => {
  it('pmatrix diurai menjadi baris dan sel', () => {
    const [m] = uraiLatex('\\begin{pmatrix} 2 & 3 \\\\ 1 & -4 \\end{pmatrix}');
    expect(m.t).toBe('matriks');
    if (m.t !== 'matriks') return;
    expect([m.kiri, m.kanan]).toEqual(['(', ')']);
    expect(m.baris.map((b) => b.map(simpulKePolos))).toEqual([
      ['2', '3'],
      ['1', '-4'],
    ]);
  });
  it('baris kosong sebelum \\end dibuang dan isi sel tetap diurai', () => {
    const simpul = uraiLatex('A = \\begin{bmatrix} x^{2} & \\frac{1}{2} \\\\ 0 & 1 \\\\ \\end{bmatrix} + B');
    const m = simpul.find((s) => s.t === 'matriks');
    expect(m && m.t === 'matriks' && m.baris.length).toBe(2);
    expect(m && m.t === 'matriks' && [m.kiri, m.kanan]).toEqual(['[', ']']);
    expect(m && m.t === 'matriks' && m.baris[0][0].some((s) => s.t === 'pangkat')).toBe(true);
    expect(simpulKePolos(simpul)).toMatch(/^A = .*\+ B$/);
  });
  it('determinan, array, dan cases', () => {
    const det = uraiLatex('\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}')[0];
    expect(det.t === 'matriks' && [det.kiri, det.kanan]).toEqual(['|', '|']);
    const [kurung] = uraiLatex('\\left(\\begin{array}{cc} 1 & 0 \\\\ 0 & 1 \\end{array}\\right)');
    expect(kurung.t === 'kurung' && [kurung.kiri, kurung.kanan]).toEqual(['(', ')']);
    const arr = kurung.t === 'kurung' ? kurung.isi.find((s) => s.t === 'matriks') : undefined;
    expect(arr && arr.t === 'matriks' && arr.baris.length).toBe(2);
    const kasus = uraiLatex('f(x) = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}').find((s) => s.t === 'matriks');
    expect(kasus && kasus.t === 'matriks' && [kasus.kiri, kasus.kanan]).toEqual(['{', '']);
  });
  it('LaTeX tanpa pembatas $ tetap dikenali sebagai rumus', () => {
    const seg = uraiTeks('Matriksnya adalah \\begin{pmatrix} 1 & -3 \\\\ -1 & 4 \\end{pmatrix}. Hasil \\frac{1}{2} \\times 4.');
    expect(seg.filter((g) => g.jenis === 'mat').map((g) => g.jenis === 'mat' && g.latex)).toEqual(['\\begin{pmatrix} 1 & -3 \\\\ -1 & 4 \\end{pmatrix}', '\\frac{1}{2}', '\\times']);
    expect(seg.map((g) => (g.jenis === 'teks' ? g.s : '')).join('')).not.toContain('\\');
  });
  it('Word: matriks menjadi Office Math m:m di dalam kurung, tanpa sisa perintah LaTeX', async () => {
    const xml = await xmlRun('Diketahui $P = \\begin{pmatrix} 2 & 3 \\\\ 1 & 4 \\end{pmatrix}$ dan $|A| = \\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$.');
    expect(xml).toContain('<m:m>');
    expect(xml.match(/<m:mr>/g)).toHaveLength(4);
    expect(xml).toContain('<m:count m:val="2"/>');
    expect(xml).toContain('<m:begChr m:val="("/>');
    expect(xml).toContain('<m:endChr m:val="|"/>');
    const teks = xml.replace(/<[^>]+>/g, '');
    expect(teks).not.toMatch(/begin|end|pmatrix|&amp;|\\/);
  });
});

describe('LaTeX yang rusak karena escape JSON', () => {
  it('tab, form feed, dan backspace dikembalikan menjadi perintah', () => {
    expect(pulihkanLatex('P(x) \times Q(x)')).toBe('P(x) \\times Q(x)');
    expect(pulihkanLatex('$\frac{1}{2}$ dan $\begin{pmatrix}1\\end{pmatrix}$')).toBe('$\\frac{1}{2}$ dan $\\begin{pmatrix}1\\end{pmatrix}$');
    expect(pulihkanLatex('$a \neq b$')).toBe('$a \\neq b$');
    // Baris baru dan tab biasa tidak diubah.
    expect(pulihkanLatex('Baris satu\nBaris dua\tKolom')).toBe('Baris satu\nBaris dua\tKolom');
  });
  it('butir daftar "i." dan "e." setelah baris baru tidak dibaca sebagai \\ni atau \\ne', () => {
    const teks = 'Perhatikan pernyataan berikut:\ni. satu\nii. dua\ne. lima\nu. enam';
    expect(uraiTeks(teks)).toEqual([{ jenis: 'teks', s: teks }]);
    const o = ekstrakJson('{"pokok": "Pilihan:\\na. x\\ne. y\\ni) z"}') as { pokok: string };
    expect(o.pokok).toBe('Pilihan:\na. x\ne. y\ni) z');
  });
  it('di dalam rumus, \\ne dan \\nu yang rusak tetap dipulihkan', () => {
    expect(uraiTeks('$a \ne b$ dan $\nu$').filter((g) => g.jenis === 'mat').map((g) => g.jenis === 'mat' && simpulKePolos(g.simpul))).toEqual(['a ≠ b', 'ν']);
  });
  it('garis miring di kalimat yang bukan perintah rumus', () => {
    expect(uraiTeks('Baris satu.\\nDiketahui x.')).toEqual([{ jenis: 'teks', s: 'Baris satu.\nDiketahui x.' }]);
  });
  it('teks dengan \\times yang rusak tampil sebagai ×', () => {
    const seg = uraiTeks('Koefisien pada P(x) \times Q(x) adalah ....');
    expect(seg.some((g) => g.jenis === 'mat' && simpulKePolos(g.simpul) === '×')).toBe(true);
  });
  it('JSON dengan LaTeX bergaris miring tunggal tetap terbaca', () => {
    const o = ekstrakJson('{"pertanyaan": "Nilai $\\sqrt{16} + \\left(2\\right) \\times \\frac{1}{2} \\neq \\\\pi$ adalah", "baris": "Satu\\nDua\\t3", "kutip": "\\"x\\""}') as Record<string, string>;
    expect(o.pertanyaan).toBe('Nilai $\\sqrt{16} + \\left(2\\right) \\times \\frac{1}{2} \\neq \\pi$ adalah');
    expect(o.baris).toBe('Satu\nDua\t3');
    expect(o.kutip).toBe('"x"');
  });
});

// Rumus yang lazim di soal SD sampai SMA (tests/korpus-rumus.txt, dipisah " | " dan baris baru).
// Tidak boleh ada perintah LaTeX yang tersisa sebagai teks.
const KORPUS = readFileSync('tests/korpus-rumus.txt', 'utf8').trim();

function mentah(daftar: Simpul[]): string[] {
  return daftar.flatMap((n): string[] => {
    if (n.t === 'teks') return n.mentah ? [n.s] : [];
    return Object.values(n)
      .filter(Array.isArray)
      .flatMap((v) => mentah((v as unknown[]).flat(2) as Simpul[]));
  });
}

describe('korpus rumus SD-SMA', () => {
  const butir = KORPUS.split(/\s\|\s|\n/);
  it('tidak ada perintah LaTeX yang tersisa sebagai teks', () => {
    for (const b of butir) {
      const seg = uraiTeks(b);
      expect(seg.every((g) => g.jenis === 'mat'), b).toBe(true);
      for (const g of seg) if (g.jenis === 'mat') expect(mentah(g.simpul), b).toEqual([]);
    }
  });
  it('Word: tidak ada nama perintah, garis miring, atau tempat isian kosong di persamaan', async () => {
    const xml = await xmlRun(butir.join(' '));
    const teks = [...xml.matchAll(/<m:t[^>]*>([^<]*)<\/m:t>/g)].map((m) => m[1]).join(' ');
    expect(teks).not.toMatch(/\\|\b(?:sum|int|vec|hat|bar|mathbb|binom|frac|sqrt|left|right|begin|end|over|choose|limits|big|text|mathrm|overline|color|hspace)\b/);
    expect(xml).not.toMatch(/<m:e\/>|<m:e><\/m:e>/);
  });
  it('layar (KaTeX): tidak ada perintah yang ditandai merah', () => {
    for (const b of [...butir, '$\\overarc{AB} \\mathbbm{R} \\mathup{d} \\textdegree$']) expect(teksKeHtml(b), b).not.toMatch(/katex-error|#cc0000/);
  });
  it.runIf(adaPdflatex())('LaTeX: semua rumus dan simbol Unicode terkompilasi pdflatex', () => {
    const isi = [...butir, 'Kalimat: ✓ ☐ ∠ABC π ≈ 3,14 ± √2 ∞ → ≤ ≥ ≠ × ÷ ° α Δ ∈ ∪ ⊂ ℝ', 'Rumus: $x ≤ 5$, $90°$, $α ≠ β$, $x² + y³$, $A ∩ B$']
      .map((b) => `${keLatex(b)}\\par`)
      .join('\n');
    const dir = mkdtempSync(join(tmpdir(), 'gensoal-rumus-'));
    const pembuka = readFileSync('src/ekspor/tex.ts', 'utf8').match(/\\\\usepackage\{amsmath,amssymb\}[\s\S]*?\\\\providecommand\{\\\\arc\}[^\n]*/)![0].replace(/\\\\/g, '\\');
    writeFileSync(join(dir, 'r.tex'), `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage{textcomp}\n${pembuka}\n\\begin{document}\n${isi}\n\\end{document}\n`);
    try {
      execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'r.tex'], { cwd: dir, stdio: 'pipe', timeout: 120000 });
    } catch {
      const log = readFileSync(join(dir, 'r.log'), 'utf8');
      throw new Error(log.split('\n').filter((l) => l.startsWith('!') || l.startsWith('l.')).slice(0, 6).join('\n'));
    }
  }, 180000);
  it('PDF: setiap rumus dapat ditata', () => {
    const doc = pdfUji();
    for (const b of butir) expect(tataParagraf(doc, b, 480, { ukuran: 12 }).every((baris) => baris.w > 0), b).toBe(true);
  });
});

function adaPdflatex(): boolean {
  try {
    execFileSync('pdflatex', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pdfUji(): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('L.ttf', readFileSync('public/fonts/LiberationSerif-Regular.ttf').toString('base64'));
  doc.addFont('L.ttf', FONT_PDF, 'normal');
  doc.addFileToVFS('LB.ttf', readFileSync('public/fonts/LiberationSerif-Bold.ttf').toString('base64'));
  doc.addFont('LB.ttf', FONT_PDF, 'bold');
  doc.addFileToVFS('S.ttf', readFileSync('public/fonts/GenSoalSimbol.ttf').toString('base64'));
  doc.addFont('S.ttf', FONT_SIMBOL, 'normal');
  return doc;
}

describe('glif PDF', () => {
  type FontJsPdf = { metadata: { cmap: { unicode: { codeMap: Record<string, number> } } } };
  const peta = (doc: jsPDF, nama: string) => new Set(Object.keys((doc as unknown as { getFont(n: string, g: string): FontJsPdf }).getFont(nama, 'normal').metadata.cmap.unicode.codeMap).map(Number));
  it('setiap simbol hasil pengurai ada di Liberation Serif atau GenSoal Simbol', () => {
    const doc = pdfUji();
    const huruf = peta(doc, FONT_PDF);
    const simbol = peta(doc, FONT_SIMBOL);
    for (const c of KARAKTER_SIMBOL) expect(simbol.has(c.codePointAt(0)!), c).toBe(true);
    const semua = [...Object.values(SIMBOL), ...Object.values(OPERATOR_BESAR), ...Object.values(HURUF_GANDA), ...Object.values(TIDAK), '∣', '°', '′'].join('');
    // amankan() mengganti glif yang tidak ada di kedua font (⌢ menjadi ◠).
    const hilang = [...new Set(amankan(semua))].filter((c) => c.trim() && !/[\u0300-\u036F]/.test(c) && !(KARAKTER_SIMBOL.has(c) ? simbol : huruf).has(c.codePointAt(0)!));
    expect(hilang).toEqual([]);
  });
});

describe('struktur rumus', () => {
  const satu = (latex: string) => uraiLatex(latex).filter((n) => !(n.t === 'teks' && !n.s.trim()));
  it('nama fungsi tegak, lim dengan batas di bawah', () => {
    expect(satu('\\sin x')[0]).toEqual({ t: 'teks', s: 'sin', gaya: 'fungsi' });
    const [lim] = satu('\\lim_{x \\to 0} x');
    expect(lim.t === 'batas' && simpulKePolos(lim.bawah!)).toBe('x → 0');
    const [log] = satu('\\log_2 8');
    expect(log.t === 'indeks' && log.basis[0]).toEqual({ t: 'teks', s: 'log', gaya: 'fungsi' });
  });
  it('operator besar membawa batas dan sukunya sampai relasi', () => {
    const [sum, ...sisa] = satu('\\sum_{i=1}^{n} i^2 = 5');
    expect(sum.t === 'besar' && [sum.op, simpulKePolos(sum.bawah!), simpulKePolos(sum.atas!), simpulKePolos(sum.isi).trim()]).toEqual(['∑', 'i=1', 'n', 'i^2']);
    expect(simpulKePolos(sisa).trim()).toBe('= 5');
  });
  it('binom, \\choose, dan \\over', () => {
    for (const l of ['\\binom{5}{2}', '{5 \\choose 2}']) {
      const [k] = satu(l);
      expect(k.t === 'kurung' && k.isi[0].t === 'pecahan' && k.isi[0].tanpaGaris).toBe(true);
    }
    expect(satu('{a \\over b}')[0].t).toBe('pecahan');
  });
  it('aksen, garis atas, kotak, dan \\overset', () => {
    expect(satu('\\vec{v}')[0]).toMatchObject({ t: 'hiasan', jenis: 'aksen', tanda: '\u20D7' });
    expect(satu('\\overline{AB}')[0]).toMatchObject({ t: 'hiasan', jenis: 'garis_atas' });
    expect(satu('\\boxed{5}')[0]).toMatchObject({ t: 'hiasan', jenis: 'kotak' });
    expect(satu('\\overset{\\frown}{AB}')[0]).toMatchObject({ t: 'batas', atas: [{ t: 'teks', s: '⌢' }] });
  });
  it('kurung \\left \\right, garis mutlak berpasangan, dan garis tegak tunggal', () => {
    expect(satu('\\left( \\frac{1}{2} \\right)')[0]).toMatchObject({ t: 'kurung', kiri: '(', kanan: ')' });
    expect(satu('\\left. x \\right|')[0]).toMatchObject({ t: 'kurung', kiri: '', kanan: '|' });
    expect(satu('|x - 3| < 5')[0]).toMatchObject({ t: 'kurung', kiri: '|', kanan: '|' });
    expect(simpulKePolos(uraiLatex('P(A|B)'))).toBe('P(A∣B)');
  });
  it('dasar pangkat: bilangan utuh, kurung, dan grup', () => {
    expect(satu('10^{-3}')[0]).toMatchObject({ t: 'pangkat', basis: [{ t: 'teks', s: '10' }] });
    expect(satu('(x+1)^2')[0]).toMatchObject({ t: 'pangkat', basis: [{ t: 'teks', s: '(x+1)' }] });
    expect(simpulKePolos(uraiLatex('60^\\circ'))).toBe('60°');
  });
  it('himpunan bilangan, \\not, dan spasi LaTeX', () => {
    expect(simpulKePolos(uraiLatex('\\mathbb{R} \\not= \\mathbb{Q}'))).toBe('ℝ ≠ ℚ');
    expect(simpulKePolos(uraiLatex('1\\,000'))).toBe('1 000');
  });
  it('$$...$$, \\[...\\], mata uang, dan escape di kalimat', () => {
    expect(uraiTeks('Rumus $$L = p \\times l$$ dan \\[x^2\\].').map((g) => g.jenis)).toEqual(['teks', 'mat', 'teks', 'mat', 'teks']);
    expect(uraiTeks('Harga $5 dan $10.')).toEqual([{ jenis: 'teks', s: 'Harga $5 dan $10.' }]);
    expect(uraiTeks('Diskon 50\\% saja\\\\baris baru')).toEqual([{ jenis: 'teks', s: 'Diskon 50% saja\nbaris baru' }]);
    expect(uraiTeks('Luas 2x^2 dan x_1').filter((g) => g.jenis === 'mat').map((g) => g.jenis === 'mat' && g.latex)).toEqual(['x^2', 'x_1']);
  });
  it('Word: setiap jenis simpul menjadi elemen Office Math', async () => {
    const xml = await xmlRun('$\\sin x + \\lim_{x\\to0} \\sum_{i=1}^n \\int_0^1 \\binom{n}{k} \\vec{v} \\overrightarrow{AB} \\overline{AB} \\boxed{5} \\left(\\frac12\\right) |x| \\mathbb{R} \\text{ cm}$');
    for (const tag of ['<m:sty m:val="p"/>', '<m:limLow>', '<m:chr m:val="∑"/>', '<m:limLoc m:val="undOvr"/>', '<m:chr m:val="∫"/>', '<m:type m:val="noBar"/>', '<m:acc>', '<m:groupChr>', '<m:pos m:val="top"/>', '<m:borderBox>', '<m:begChr m:val="|"/>', '<m:nor', 'ℝ']) {
      expect(xml, tag).toContain(tag);
    }
  });
});

describe('LaTeX dari simbol Unicode', () => {
  it('simbol di kalimat menjadi perintah mode matematika', () => {
    expect(escLatex('∠ABC ≈ π, ✓')).toBe('$\\angle$ABC $\\approx$ $\\pi$, $\\checkmark$');
    expect(escLatex('Suhu 30°C, 50% & #1')).toBe('Suhu 30\\textdegree{}C, 50\\% \\& \\#1');
  });
  it('simbol di dalam rumus diganti perintah', () => {
    expect(keLatex('$x ≤ 5$ dan $90°$ dan $x ∈ ℝ$')).toBe('$x \\le  5$ dan $90^{\\circ}$ dan $x \\in  \\mathbb{R}$');
  });
});
