import type { jsPDF } from 'jspdf';
import type { PaketSoal, Profil, Soal } from '../db/tipe';
import { bangunDokumen, namaBerkas, type OpsiEkspor } from './model';

export type FormatEkspor = 'docx' | 'pdf' | 'tex';

export const VERSI_APLIKASI = __VERSI_APLIKASI__;

/** SVG ke PNG dengan kanvas; ukuran dalam piksel 300 dpi. */
export function svgKePng(svg: string, lebarPx: number, tinggiPx: number): Promise<Uint8Array> {
  return new Promise((selesai, gagal) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const kanvas = document.createElement('canvas');
      kanvas.width = lebarPx;
      kanvas.height = tinggiPx;
      const ctx = kanvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, lebarPx, tinggiPx);
      ctx.drawImage(img, 0, 0, lebarPx, tinggiPx);
      URL.revokeObjectURL(url);
      kanvas.toBlob(async (b) => {
        if (!b) return gagal(new Error('Gagal mengubah gambar ke PNG.'));
        selesai(new Uint8Array(await b.arrayBuffer()));
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      gagal(new Error('Gambar SVG tidak dapat dibaca.'));
    };
    img.src = url;
  });
}

async function gambarSvgPdf(doc: jsPDF, svg: string, x: number, y: number, w: number, h: number): Promise<void> {
  const { svg2pdf } = await import('svg2pdf.js');
  const wadah = document.createElement('div');
  wadah.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden';
  wadah.innerHTML = svg;
  document.body.appendChild(wadah);
  try {
    await svg2pdf(wadah.querySelector('svg')!, doc, { x, y, width: w, height: h });
  } finally {
    wadah.remove();
  }
}

let fontCache: Promise<{ fontBiasa: string; fontTebal: string; fontMiring: string }> | null = null;

async function keBase64(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Font PDF tidak dapat dimuat.');
  const bytes = new Uint8Array(await r.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function muatFont() {
  const f = (nama: string) => keBase64(`${import.meta.env.BASE_URL}fonts/LiberationSerif-${nama}.ttf`);
  fontCache ??= Promise.all([f('Regular'), f('Bold'), f('Italic')])
    .then(([fontBiasa, fontTebal, fontMiring]) => ({ fontBiasa, fontTebal, fontMiring }))
    .catch((e) => {
      fontCache = null;
      throw e;
    });
  return fontCache;
}

export function unduhBlob(blob: Blob, nama: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Buat dan unduh berkas langsung di perangkat. Tidak ada yang diunggah ke server. */
export async function ekspor(format: FormatEkspor, paket: PaketSoal, soal: Soal[], profil: Profil, opsi: OpsiEkspor): Promise<{ nama: string; ukuran: number; ms: number }> {
  const mulai = performance.now();
  const d = bangunDokumen(paket, soal, profil, opsi, VERSI_APLIKASI);
  let blob: Blob;
  if (format === 'tex') {
    const { buatTex } = await import('./tex');
    blob = new Blob([buatTex(d)], { type: 'application/x-tex;charset=utf-8' });
  } else if (format === 'docx') {
    const { buatDocx } = await import('./docx');
    blob = await buatDocx(d, svgKePng);
  } else {
    const { buatPdf } = await import('./pdf');
    const font = await muatFont();
    blob = await buatPdf(d, { ...font, gambarSvg: gambarSvgPdf });
  }
  const nama = namaBerkas(paket, format);
  unduhBlob(blob, nama);
  return { nama, ukuran: blob.size, ms: performance.now() - mulai };
}
