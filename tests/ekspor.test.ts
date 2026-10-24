import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buatDocx } from '../src/ekspor/docx';
import { bangunDokumen, penghalangEkspor } from '../src/ekspor/model';
import { buatTex } from '../src/ekspor/tex';
import { keLatex } from '../src/matematika/latex';
import { paketUji, profilUji, soalUji } from './bantu-soal';

const OPSI = { kop: true, kunci: true, kisi: true, pembahasan: true };
const PNG_KOSONG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

function adaPdflatex(): boolean {
  try {
    execFileSync('pdflatex', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('model dokumen', () => {
  const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, '0.3.0');
  it('mengelompokkan per bentuk dengan nomor berurutan', () => {
    expect(d.bagian.map((b) => b.bentuk)).toEqual(['pilihan_ganda', 'benar_salah', 'isian_singkat', 'uraian']);
    const nomor = d.bagian.flatMap((b) => b.butir.map((x) => x.nomor));
    expect(nomor).toEqual(nomor.map((_, i) => i + 1));
  });
  it('soal uraian mendapat kotak jawaban dan soal bergambar tidak dua kolom', () => {
    const semua = d.bagian.flatMap((b) => b.butir);
    expect(semua.filter((b) => b.soal.bentuk === 'uraian').every((b) => b.kotakJawaban)).toBe(true);
    expect(semua.filter((b) => b.gambar).every((b) => !b.sederhana)).toBe(true);
  });
  it('mencatat versi soal dan versi kurikulum', () => {
    expect(d.jejak).toMatch(/versi soal 1–1/);
    expect(d.jejak).toMatch(/Kurikulum Merdeka 2024\.1/);
    expect(d.jejak).toMatch(/bantuan AI/);
  });
  it('menghalangi ekspor soal perlu telaah yang belum ditelaah', () => {
    const soal = soalUji().map((s) => ({ ...s, status_telaah: 'draf' as const }));
    expect(penghalangEkspor(paketUji(), soal).length).toBe(soal.filter((s) => s.status_mutu === 'perlu_telaah').length);
    expect(penghalangEkspor(paketUji(), soalUji())).toEqual([]);
  });
});

describe('LaTeX', () => {
  it('pecahan polos menjadi \\frac dan karakter khusus di-escape', () => {
    expect(keLatex('Hasil 3/4 & 50% $\\frac{1}{2}$')).toBe('Hasil $\\frac{3}{4}$ \\& 50\\% $\\frac{1}{2}$');
  });
  it.runIf(adaPdflatex())('berkas .tex terkompilasi tanpa galat', () => {
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, '0.3.0');
    const tex = buatTex(d);
    const dir = mkdtempSync(join(tmpdir(), 'gensoal-'));
    writeFileSync(join(dir, 'soal.tex'), tex);
    try {
      execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'soal.tex'], { cwd: dir, stdio: 'pipe', timeout: 120000 });
    } catch (e) {
      const log = existsSync(join(dir, 'soal.log')) ? readFileSync(join(dir, 'soal.log'), 'utf8') : String(e);
      throw new Error(log.split('\n').filter((l) => l.startsWith('!') || l.startsWith('l.')).slice(0, 10).join('\n') || log.slice(-2000));
    }
    expect(existsSync(join(dir, 'soal.pdf'))).toBe(true);
    const log = readFileSync(join(dir, 'soal.log'), 'utf8');
    expect(log).not.toMatch(/^! /m);
  }, 180000);
});

describe('Word', () => {
  it('menghasilkan docx dengan pecahan Office Math dan gambar', async () => {
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, '0.3.0');
    let dipanggil = 0;
    const blob = await buatDocx(d, async () => {
      dipanggil++;
      return PNG_KOSONG;
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('<m:f>');
    expect(xml).toContain('Kunci Jawaban');
    expect(xml).toContain('Kisi-kisi');
    expect(dipanggil).toBe(soalUji().filter((s) => s.isi_json.gambar).length);
    expect(Object.keys(zip.files).some((f) => f.startsWith('word/media/'))).toBe(true);
  });
});

describe('PDF', () => {
  it('menghasilkan PDF berisi soal, kunci, dan kisi-kisi dengan font tertanam', async () => {
    const { buatPdf } = await import('../src/ekspor/pdf');
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, '0.3.0');
    let gambar = 0;
    const blob = await buatPdf(d, {
      fontBiasa: readFileSync('public/fonts/InterTight-Regular.ttf').toString('base64'),
      fontTebal: readFileSync('public/fonts/InterTight-SemiBold.ttf').toString('base64'),
      gambarSvg: async (doc, _svg, x, y, w, h) => {
        gambar++;
        doc.rect(x, y, w, h);
      },
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1')).toMatch(/FontFile2/);
    expect(gambar).toBe(soalUji().filter((s) => s.isi_json.gambar).length);
    if (process.env.PDF_KELUAR) writeFileSync(process.env.PDF_KELUAR, buf);
  }, 60000);
});
