import katex from 'katex';
import { memo, useMemo } from 'react';
import { uraiTeks } from '../matematika/teks';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

// Perintah yang dikenali pengurai rumus (Word, PDF) tetapi tidak ada di KaTeX.
const MAKRO: Record<string, string> = {
  '\\overarc': '\\overset{\\frown}{#1}',
  '\\arc': '\\overset{\\frown}{#1}',
  '\\wideparen': '\\overset{\\frown}{#1}',
  '\\mathbbm': '\\mathbb{#1}',
  '\\mathup': '\\mathrm{#1}',
  '\\textdegree': '{^\\circ}',
};

export function teksKeHtml(teks: string): string {
  return uraiTeks(teks)
    .map((g) => (g.jenis === 'teks' ? esc(g.s) : katex.renderToString(g.latex, { throwOnError: false, strict: 'ignore', output: 'html', trust: false, macros: { ...MAKRO } })))
    .join('');
}

/** Teks soal dengan rumus KaTeX; pecahan polos tampil bertumpuk. */
export const TeksSoal = memo(function TeksSoal({ teks, as: Tag = 'span', className = '' }: { teks: string; as?: 'span' | 'p' | 'div'; className?: string }) {
  const html = useMemo(() => teksKeHtml(teks), [teks]);
  return <Tag className={`teks-soal ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** SVG gambar soal. SVG dibangkitkan kode kita sendiri dengan teks yang sudah di-escape. */
export function GambarSvg({ svg, className = '', maks = 520 }: { svg: string; className?: string; maks?: number }) {
  return <div className={`gambar-soal rounded-[2px] bg-white p-2 ${className}`} style={{ maxWidth: maks }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
