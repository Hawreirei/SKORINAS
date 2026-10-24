import { uraiTeks } from './teks';

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

export function escLatex(s: string): string {
  return s.replace(/[\\{}$&#%_^~²³°×÷−≤≥≠…“”]/g, (c) => KHUSUS[c] ?? c);
}

/** Teks soal ke LaTeX: kalimat di-escape, rumus diteruskan apa adanya, pecahan polos menjadi \frac. */
export function keLatex(teks: string): string {
  return uraiTeks(teks)
    .map((g) => (g.jenis === 'teks' ? escLatex(g.s).replace(/\n/g, '\\\\\n') : `$${g.latex}$`))
    .join('')
    .replace(/\.{3,4}/g, (m) => (m.length === 4 ? '\\ldots.' : '\\ldots{}'));
}
