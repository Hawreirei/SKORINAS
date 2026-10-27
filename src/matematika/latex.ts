import { RANGKAIAN_ARAB, pisahArab } from '../ekspor/arab';
import { HURUF_GANDA, OPERATOR_BESAR, SIMBOL, uraiTeks } from './teks';

const KHUSUS: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  _: '\\_',
  '^': '\\^{}',
  '~': '\\textasciitilde{}',
  '²': '\\textsuperscript{2}',
  '³': '\\textsuperscript{3}',
  '°': '\\textdegree{}',
  '×': '$\\times$',
  '÷': '$\\div$',
  '−': '$-$',
  '≤': '$\\le$',
  '≥': '$\\ge$',
  '≠': '$\\ne$',
  '…': '\\ldots{}',
  '“': '``',
  '”': "''",
};

/**
 * Karakter Unicode ke perintah LaTeX mode matematika. pdflatex tidak mengenal ≤, π, ∠, ✓, dan sejenisnya,
 * jadi simbol yang ditulis langsung (bukan sebagai perintah) diubah kembali. Diturunkan dari daftar simbol
 * pengurai agar keduanya selalu sejalan.
 */
const KE_PERINTAH: Record<string, string> = (() => {
  const peta: Record<string, string> = {};
  const tambah = (c: string, perintah: string) => {
    if (c.length === 1 && c > '\x7f' && !(c in peta)) peta[c] = perintah;
  };
  for (const [nama, c] of Object.entries(SIMBOL)) if (/^[a-zA-Z]+$/.test(nama)) tambah(c, `\\${nama}`);
  for (const [nama, c] of Object.entries(OPERATOR_BESAR)) tambah(c, `\\${nama}`);
  for (const [h, c] of Object.entries(HURUF_GANDA)) tambah(c, `\\mathbb{${h}}`);
  Object.assign(peta, {
    '°': '^{\\circ}', '²': '^{2}', '³': '^{3}', '¹': '^{1}', '½': '\\tfrac{1}{2}', '¼': '\\tfrac{1}{4}', '¾': '\\tfrac{3}{4}',
    '−': '-', '∣': '\\mid', '√': '\\surd', '☐': '\\square', ' ': '\\,', ' ': '\;', ' ': '\;', ' ': '\\enspace',
    ' ': '\\quad', ' ': '~', '​': '', 'ϵ': '\\epsilon', 'ε': '\\varepsilon', 'ϕ': '\\phi', 'φ': '\\varphi',
  });
  return peta;
})();

/** Teks biasa ke LaTeX: karakter khusus di-escape, simbol matematika Unicode menjadi $\perintah$, teks Arab menjadi \arab{...} (XeLaTeX, lihat tex.ts). */
export function escLatex(s: string): string {
  return pisahArab(s)
    .map((b) => (b.arab ? `\\arab{${b.s}}` : escLatin(b.s)))
    .join('');
}

function escLatin(s: string): string {
  return s.replace(/[\\{}$&#%_^~]|[^\x00-\xff]|[²³°×÷…“”½¼¾¹]/g, (c) => KHUSUS[c] ?? (KE_PERINTAH[c] ? `$${KE_PERINTAH[c]}$` : c));
}

/** Rumus ke LaTeX: simbol Unicode di dalam rumus diganti perintahnya; huruf lain dibungkus \text. */
function rumusLatex(latex: string): string {
  const arab: string[] = [];
  return latex
    .replace(RANGKAIAN_ARAB, (m) => `\u0000${arab.push(m) - 1}\u0000`)
    .replace(/[^\x00-\x7f]/g, (c) => (c in KE_PERINTAH ? `${KE_PERINTAH[c]}${/[a-zA-Z]$/.test(KE_PERINTAH[c]) ? ' ' : ''}` : `\\text{${c}}`))
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => `\\text{\\arab{${arab[Number(i)]}}}`);
}

/** Teks soal ke LaTeX: kalimat di-escape, rumus diteruskan (simbol Unicode diganti perintah), pecahan polos menjadi \frac. */
export function keLatex(teks: string): string {
  return uraiTeks(teks)
    .map((g) => (g.jenis === 'teks' ? escLatex(g.s).replace(/\n/g, '\\\\\n') : `$${rumusLatex(g.latex)}$`))
    .join('')
    .replace(/\.{3,4}/g, (m) => (m.length === 4 ? '\\ldots.' : '\\ldots{}'));
}
