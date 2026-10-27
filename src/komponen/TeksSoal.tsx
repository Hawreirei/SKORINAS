import katex from 'katex';
import { memo, useMemo } from 'react';
import { dominanArab, pisahArab } from '../ekspor/arab';
import { uraiTeks } from '../matematika/teks';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Teks biasa: bagian Arab diberi bahasa dan arah sendiri agar tampil lebih besar dan berurutan benar. */
function escTeks(s: string): string {
  return pisahArab(s)
    .map((b) => (b.arab ? `<span class="teks-arab" lang="ar" dir="rtl">${esc(b.s)}</span>` : esc(b.s)))
    .join('');
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

/**
 * Teks soal ke HTML per baris. Baris yang dominan Arab di dalam teks berbahasa lain (mis. ayat) menjadi blok rata kanan;
 * arah teks yang seluruhnya Arab diatur dir="auto" pada pembungkus.
 */
export function teksKeHtml(teks: string): string {
  const baris: { html: string; mentah: string }[] = [{ html: '', mentah: '' }];
  for (const g of uraiTeks(teks)) {
    if (g.jenis === 'mat') {
      baris[baris.length - 1].html += katex.renderToString(g.latex, { throwOnError: false, strict: 'ignore', output: 'html', trust: false, macros: { ...MAKRO } });
      continue;
    }
    g.s.split('\n').forEach((bagian, i) => {
      if (i) baris.push({ html: '', mentah: '' });
      baris[baris.length - 1].html += escTeks(bagian);
      baris[baris.length - 1].mentah += bagian;
    });
  }
  const blok = baris.length > 1 && !dominanArab(teks) ? baris.map((b) => dominanArab(b.mentah)) : baris.map(() => false);
  return baris
    .map((b, i) => (blok[i] ? `<span class="baris-arab" dir="rtl">${b.html}</span>` : b.html + (i < baris.length - 1 && !blok[i + 1] ? '<br>' : '')))
    .join('');
}

/** Teks soal dengan rumus KaTeX; pecahan polos tampil bertumpuk. */
export const TeksSoal = memo(function TeksSoal({ teks, as: Tag = 'span', className = '' }: { teks: string; as?: 'span' | 'p' | 'div'; className?: string }) {
  const html = useMemo(() => teksKeHtml(teks), [teks]);
  return <Tag className={`teks-soal ${className}`} dir="auto" dangerouslySetInnerHTML={{ __html: html }} />;
});

/** SVG gambar soal. SVG dibangkitkan kode kita sendiri dengan teks yang sudah di-escape. */
export function GambarSvg({ svg, className = '', maks = 520 }: { svg: string; className?: string; maks?: number }) {
  return <div className={`gambar-soal rounded-[2px] bg-white p-2 ${className}`} style={{ maxWidth: maks }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
