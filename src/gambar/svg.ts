import { TINTA, UKURAN_TEKS, WARNA_ISI, b, type Gambar, type Primitif } from './primitif';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const JANGKAR = { awal: 'start', tengah: 'middle', akhir: 'end' } as const;

function titikBusur(cx: number, cy: number, r: number, derajat: number): [number, number] {
  const rad = ((derajat - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function primitifKeSvg(p: Primitif, font: string): string {
  switch (p.t) {
    case 'garis': {
      const marker = p.panah === 'dua' ? ' marker-start="url(#panah-awal)" marker-end="url(#panah)"' : p.panah === 'akhir' ? ' marker-end="url(#panah)"' : '';
      return `<line x1="${b(p.x1)}" y1="${b(p.y1)}" x2="${b(p.x2)}" y2="${b(p.y2)}" stroke-width="${p.tebal ?? 1.2}"${p.putus ? ' stroke-dasharray="4 3"' : ''}${marker}/>`;
    }
    case 'kotak':
      return `<rect x="${b(p.x)}" y="${b(p.y)}" width="${b(p.w)}" height="${b(p.h)}" fill="${WARNA_ISI[p.isi ?? 'kosong']}" stroke-width="${p.tebal ?? 1.2}"/>`;
    case 'lingkaran':
      return `<circle cx="${b(p.cx)}" cy="${b(p.cy)}" r="${b(p.r)}" fill="${WARNA_ISI[p.isi ?? 'kosong']}" stroke-width="${p.tebal ?? 1.2}"/>`;
    case 'juring': {
      if (p.ke - p.dari >= 359.999) return `<circle cx="${b(p.cx)}" cy="${b(p.cy)}" r="${b(p.r)}" fill="${WARNA_ISI[p.isi ?? 'kosong']}" stroke-width="1.2"/>`;
      const [x1, y1] = titikBusur(p.cx, p.cy, p.r, p.dari);
      const [x2, y2] = titikBusur(p.cx, p.cy, p.r, p.ke);
      const besar = p.ke - p.dari > 180 ? 1 : 0;
      return `<path d="M${b(p.cx)} ${b(p.cy)} L${b(x1)} ${b(y1)} A${b(p.r)} ${b(p.r)} 0 ${besar} 1 ${b(x2)} ${b(y2)} Z" fill="${WARNA_ISI[p.isi ?? 'kosong']}" stroke-width="1.2"/>`;
    }
    case 'poligon':
      return `<polygon points="${p.titik.map(([x, y]) => `${b(x)},${b(y)}`).join(' ')}" fill="${WARNA_ISI[p.isi ?? 'kosong']}" stroke-width="${p.tebal ?? 1.2}"${p.putus ? ' stroke-dasharray="4 3"' : ''}/>`;
    case 'kurva':
      return `<path d="M${b(p.x1)} ${b(p.y1)} Q${b(p.cx)} ${b(p.cy)} ${b(p.x2)} ${b(p.y2)}" fill="none" stroke-width="1.2"${p.panah ? ' marker-end="url(#panah)"' : ''}/>`;
    case 'teks':
      return `<text x="${b(p.x)}" y="${b(p.y)}" font-size="${p.ukuran ?? UKURAN_TEKS}" font-family="${font}" text-anchor="${JANGKAR[p.jangkar ?? 'tengah']}" dominant-baseline="middle" fill="${TINTA}" stroke="none"${p.tebal ? ' font-weight="600"' : ''}>${esc(p.s)}</text>`;
    case 'pecahan': {
      const u = p.ukuran ?? UKURAN_TEKS;
      const w = Math.max(p.atas.length, p.bawah.length) * u * 0.62 + 4;
      return (
        `<g fill="${TINTA}" stroke="none" font-size="${u}" font-family="${font}" text-anchor="middle">` +
        `<text x="${b(p.x)}" y="${b(p.y - u * 0.3)}">${esc(p.atas)}</text>` +
        `<text x="${b(p.x)}" y="${b(p.y + u * 0.95)}">${esc(p.bawah)}</text></g>` +
        `<line x1="${b(p.x - w / 2)}" y1="${b(p.y)}" x2="${b(p.x + w / 2)}" y2="${b(p.y)}" stroke-width="1"/>`
      );
    }
  }
}

export interface OpsiSvg {
  font?: string;
  lebarTampil?: number;
}

/** SVG hitam putih dengan viewBox tetap; teks memakai font dokumen. */
export function keSvg(g: Gambar, opsi: OpsiSvg = {}): string {
  const font = opsi.font ?? "Inter Tight, Helvetica, Arial, sans-serif";
  const lebar = opsi.lebarTampil ?? g.lebar;
  const tinggi = (lebar / g.lebar) * g.tinggi;
  const defs =
    '<defs><marker id="panah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0b0c0e" stroke="none"/></marker>' +
    '<marker id="panah-awal" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M10 0L0 5L10 10z" fill="#0b0c0e" stroke="none"/></marker></defs>';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.lebar} ${g.tinggi}" width="${b(lebar)}" height="${b(tinggi)}" role="img" aria-label="${esc(g.alt)}">` +
    `<title>${esc(g.alt)}</title>${defs}<rect x="0" y="0" width="${g.lebar}" height="${g.tinggi}" fill="#ffffff" stroke="none"/>` +
    `<g fill="none" stroke="${TINTA}" stroke-linecap="round" stroke-linejoin="round">${g.primitif.map((p) => primitifKeSvg(p, font)).join('')}</g></svg>`
  );
}
