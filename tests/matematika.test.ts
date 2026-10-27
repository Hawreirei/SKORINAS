import { describe, expect, it } from 'vitest';
import { pulihkanLatex, simpulKePolos, uraiLatex, uraiTeks } from '../src/matematika/teks';
import { teksKeRun } from '../src/ekspor/docx';
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
    const arr = uraiLatex('\\left(\\begin{array}{cc} 1 & 0 \\\\ 0 & 1 \\end{array}\\right)').find((s) => s.t === 'matriks');
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
