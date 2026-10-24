import { b, type Gambar, type Isi, type Primitif } from './primitif';

const ISI_TIKZ: Record<Isi, string> = {
  kosong: '',
  arsir: 'fill=black!22',
  abu: 'fill=black!10',
  hitam: 'fill=black',
  putih: 'fill=white',
};

function escTeks(s: string): string {
  return s.replace(/\\/g, '\\textbackslash{}').replace(/([#$%&_{}])/g, '\\$1').replace(/\^/g, '\\^{}').replace(/~/g, '\\~{}');
}

function opsi(...daftar: (string | false | undefined)[]): string {
  const isi = daftar.filter(Boolean).join(', ');
  return isi ? `[${isi}]` : '';
}

const JANGKAR = { awal: 'anchor=west', tengah: '', akhir: 'anchor=east' } as const;

function primitifKeTikz(p: Primitif): string {
  switch (p.t) {
    case 'garis':
      return `\\draw${opsi(p.putus && 'dashed', p.panah === 'akhir' && '-{Stealth}', p.panah === 'dua' && '{Stealth}-{Stealth}', (p.tebal ?? 0) > 1.5 && 'thick')} (${b(p.x1)},${b(p.y1)}) -- (${b(p.x2)},${b(p.y2)});`;
    case 'kotak':
      return `\\draw${opsi(ISI_TIKZ[p.isi ?? 'kosong'])} (${b(p.x)},${b(p.y)}) rectangle (${b(p.x + p.w)},${b(p.y + p.h)});`;
    case 'lingkaran':
      return `\\draw${opsi(ISI_TIKZ[p.isi ?? 'kosong'])} (${b(p.cx)},${b(p.cy)}) circle (${b(p.r)});`;
    case 'juring': {
      if (p.ke - p.dari >= 359.999) return `\\draw${opsi(ISI_TIKZ[p.isi ?? 'kosong'])} (${b(p.cx)},${b(p.cy)}) circle (${b(p.r)});`;
      // Sumbu y TikZ dibalik (y=-1pt), jadi sudut searah jarum jam dari atas = 90 - derajat dalam koordinat TikZ terbalik.
      const a1 = -(90 - p.dari);
      const a2 = -(90 - p.ke);
      return `\\draw${opsi(ISI_TIKZ[p.isi ?? 'kosong'])} (${b(p.cx)},${b(p.cy)}) -- ++(${b(a1)}:${b(p.r)}) arc[start angle=${b(a1)}, end angle=${b(a2)}, radius=${b(p.r)}] -- cycle;`;
    }
    case 'poligon':
      return `\\draw${opsi(ISI_TIKZ[p.isi ?? 'kosong'], p.putus && 'dashed')} ${p.titik.map(([x, y]) => `(${b(x)},${b(y)})`).join(' -- ')} -- cycle;`;
    case 'kurva':
      return `\\draw${opsi(p.panah && '-{Stealth}')} (${b(p.x1)},${b(p.y1)}) .. controls (${b(p.cx)},${b(p.cy)}) .. (${b(p.x2)},${b(p.y2)});`;
    case 'teks':
      return `\\node${opsi(JANGKAR[p.jangkar ?? 'tengah'], 'inner sep=1pt')} at (${b(p.x)},${b(p.y)}) {\\fontsize{${b((p.ukuran ?? 13) * 0.75)}}{${b((p.ukuran ?? 13) * 0.9)}}\\selectfont ${p.tebal ? '\\bfseries ' : ''}${escTeks(p.s)}};`;
    case 'pecahan':
      return `\\node[inner sep=1pt] at (${b(p.x)},${b(p.y)}) {$\\tfrac{${escTeks(p.atas)}}{${escTeks(p.bawah)}}$};`;
  }
}

/**
 * TikZ dari primitif yang sama dengan SVG. Satuan gambar dipetakan ke pt dengan skala,
 * sumbu y dibalik agar koordinat sama dengan SVG.
 */
export function keTikz(g: Gambar, lebarCm = 9): string {
  const skala = (lebarCm * 28.4528) / g.lebar; // pt per satuan
  return [
    `% ${g.alt.replace(/\n/g, ' ')}`,
    `\\begin{tikzpicture}[x=${b(skala)}pt, y=-${b(skala)}pt, line width=0.6pt, line cap=round, line join=round]`,
    ...g.primitif.map((p) => '  ' + primitifKeTikz(p)),
    '\\end{tikzpicture}',
  ].join('\n');
}
