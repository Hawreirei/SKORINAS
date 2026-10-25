import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buatDocx } from '../src/ekspor/docx';
import { bangunDokumen, berkasDipilih, jawabanAngka, jumlahGaris, namaBerkas, type JenisBerkas } from '../src/ekspor/model';
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
  const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI);
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
  it('lembar soal, kunci jawaban, dan kisi-kisi menjadi berkas terpisah', () => {
    expect(berkasDipilih(OPSI)).toEqual(['soal', 'kunci', 'kisi']);
    expect(berkasDipilih({ ...OPSI, kunci: false, kisi: false })).toEqual(['soal']);
    expect(namaBerkas(paketUji(), 'docx')).toBe('Matematika-K4-Pecahan-bangun-datar.docx');
    expect(namaBerkas(paketUji(), 'docx', 'kunci')).toBe('Matematika-K4-Pecahan-bangun-datar-Kunci-Jawaban.docx');
    expect(namaBerkas(paketUji(), 'pdf', 'kisi')).toBe('Matematika-K4-Pecahan-bangun-datar-Kisi-kisi.pdf');
    expect(d.kurikulumLabel).toBe('CP dan TP dari guru');
  });
  it('mengikuti pakem: petunjuk per bagian dan tempat jawaban per bentuk', () => {
    const [pg, bs, isian, uraian] = d.bagian;
    expect(pg.judul).toBe('A. Pilihan Ganda');
    expect(pg.petunjuk).toMatch(/tanda silang \(X\) pada huruf A, B, C, atau D/);
    expect(bs.petunjuk).toMatch(/centang/);
    expect(isian.butir.every((b) => b.tempat.jenis === 'titik' || b.tempat.jenis === 'kotak')).toBe(true);
    for (const b of uraian.butir) {
      const t = b.tempat;
      expect(t.jenis === 'garis' || t.jenis === 'hitungan').toBe(true);
      if (t.jenis === 'garis') {
        expect(t.jumlah).toBeGreaterThanOrEqual(2);
        expect(t.jumlah).toBeLessThanOrEqual(6);
      }
    }
    const lingkari = bangunDokumen({ ...paketUji(), parameter_json: { ...paketUji().parameter_json, cara_bs: 'lingkari' } }, soalUji(), profilUji(), OPSI);
    expect(lingkari.bagian[1].petunjuk).toMatch(/Lingkarilah B/);
  });
  it('isian berjawaban angka mendapat kotak, uraian dibedakan penjelasan dan hitungan', () => {
    expect(jawabanAngka('3/4')).toBe(true);
    expect(jawabanAngka('$\\frac{7}{8}$')).toBe(true);
    expect(jawabanAngka('12 cm')).toBe(true);
    expect(jawabanAngka('persegi panjang')).toBe(false);
    expect(jumlahGaris(['Menyatakan (1)', 'Menjelaskan (2)', 'Menghitung (1)'])).toBe(4);
    expect(jumlahGaris(['a (5)', 'b (5)'])).toBe(6);
    expect(jumlahGaris([])).toBe(2);
    const s = soalUji().find((x) => x.bentuk === 'uraian')!;
    const penjelasan = { ...s, isi_json: { ...s.isi_json, jenis_uraian: 'penjelasan' as const } };
    const hitungan = { ...s, id: 'u2', urutan: 99, isi_json: { ...s.isi_json, jenis_uraian: 'hitungan' as const } };
    const dd = bangunDokumen(paketUji(), [penjelasan, hitungan], profilUji(), OPSI);
    expect(dd.bagian[0].butir.map((b) => b.tempat.jenis)).toEqual(['garis', 'hitungan']);
    expect(dd.bagian[0].petunjuk).toMatch(/penjelasan dijawab pada garis/);
  });
  it('soal yang kuncinya tidak dicek otomatis ikut diunduh tanpa persetujuan (v0.5)', () => {
    const asal = soalUji();
    const soal = asal.map((s, i) => ({ ...s, status_mutu: i === 0 ? ('perlu_telaah' as const) : s.status_mutu, status_telaah: i === 1 ? ('ditelaah_guru' as const) : ('draf' as const) }));
    const kisi = bangunDokumen(paketUji(), soal, profilUji(), OPSI, 'kisi').kisi;
    expect(kisi.length).toBe(asal.length);
    expect(kisi.some((k) => /ditelaah guru/.test(k.status))).toBe(false);
  });
});

describe('LaTeX', () => {
  it('pecahan polos menjadi \\frac dan karakter khusus di-escape', () => {
    expect(keLatex('Hasil 3/4 & 50% $\\frac{1}{2}$')).toBe('Hasil $\\frac{3}{4}$ \\& 50\\% $\\frac{1}{2}$');
  });
  it('tiap berkas .tex hanya memuat bagiannya sendiri, tanpa baris jejak', () => {
    const [soal, kunci, kisi] = (['soal', 'kunci', 'kisi'] as JenisBerkas[]).map((b) => buatTex(bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, b)));
    expect(soal).toContain('Pilihan Ganda');
    expect(soal).not.toContain('KUNCI JAWABAN');
    expect(soal).not.toContain('KISI-KISI');
    expect(kunci).toContain('KUNCI JAWABAN');
    expect(kunci).toContain('Pembahasan');
    expect(kunci).not.toContain('Pilihan Ganda');
    expect(kisi).toContain('KISI-KISI');
    expect(kisi).not.toContain('KUNCI JAWABAN');
    for (const x of [soal, kunci, kisi]) expect(x).not.toMatch(/GenSoal \d|versi soal|bantuan AI/);
  });
  it.runIf(adaPdflatex())('berkas .tex terkompilasi tanpa galat', () => {
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI);
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
  const xmlBerkas = async (b: JenisBerkas) => {
    const blob = await buatDocx(bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, b), async () => PNG_KOSONG);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    return { xml: await zip.file('word/document.xml')!.async('string'), inti: await zip.file('docProps/core.xml')!.async('string') };
  };
  it('kunci jawaban dan kisi-kisi berada di berkas terpisah dari lembar soal, tanpa baris jejak', async () => {
    const [soal, kunci, kisi] = await Promise.all((['soal', 'kunci', 'kisi'] as JenisBerkas[]).map(xmlBerkas));
    expect(soal.xml).toContain('Pilihan Ganda');
    expect(soal.xml).not.toContain('KUNCI JAWABAN');
    expect(soal.xml).not.toContain('KISI-KISI');
    expect(kunci.xml).toContain('KUNCI JAWABAN');
    expect(kunci.xml).toContain('PEMBAHASAN');
    expect(kunci.xml).not.toContain('Pilihan Ganda');
    expect(kunci.xml).not.toContain('KISI-KISI');
    expect(kisi.xml).toContain('KISI-KISI');
    expect(kisi.xml).not.toContain('KUNCI JAWABAN');
    for (const x of [soal, kunci, kisi]) expect(x.xml + x.inti).not.toMatch(/GenSoal \d|versi soal|bantuan AI/);
  });
  it('menghasilkan docx dengan pecahan Office Math dan gambar', async () => {
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI);
    let dipanggil = 0;
    const blob = await buatDocx(d, async () => {
      dipanggil++;
      return PNG_KOSONG;
    });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('<m:f>');
    // Benar-salah sebagai tabel dengan kolom Benar dan Salah.
    expect(xml).toMatch(/Pernyataan[\s\S]*Benar[\s\S]*Salah/);
    // Font dan ukuran diatur di gaya dokumen, bukan per paragraf.
    const gaya = await zip.file('word/styles.xml')!.async('string');
    expect(gaya).toContain('Times New Roman');
    expect(gaya).toMatch(/<w:sz w:val="24"\/>/);
    expect(xml).not.toContain('w:rFonts');
    expect(dipanggil).toBe(soalUji().filter((s) => s.isi_json.gambar).length);
    expect(Object.keys(zip.files).some((f) => f.startsWith('word/media/'))).toBe(true);
  });
});

describe('PDF', () => {
  it('menghasilkan PDF berisi soal, kunci, dan kisi-kisi dengan font tertanam', async () => {
    const { buatPdf } = await import('../src/ekspor/pdf');
    const d = bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI);
    let gambar = 0;
    const blob = await buatPdf(d, {
      fontBiasa: readFileSync('public/fonts/LiberationSerif-Regular.ttf').toString('base64'),
      fontTebal: readFileSync('public/fonts/LiberationSerif-Bold.ttf').toString('base64'),
      fontMiring: readFileSync('public/fonts/LiberationSerif-Italic.ttf').toString('base64'),
      gambarSvg: async (doc, _svg, x, y, w, h) => {
        gambar++;
        doc.rect(x, y, w, h);
      },
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1')).toMatch(/FontFile2/);
    expect(buf.toString('latin1')).toMatch(/LiberationSerif/);
    expect(buf.toString('latin1')).not.toMatch(/Keywords|versi soal/);
    expect(gambar).toBe(soalUji().filter((s) => s.isi_json.gambar).length);
    if (process.env.PDF_KELUAR) writeFileSync(process.env.PDF_KELUAR, buf);
  }, 60000);
  it('kunci jawaban dan kisi-kisi menjadi PDF tersendiri tanpa gambar soal', async () => {
    const { buatPdf } = await import('../src/ekspor/pdf');
    for (const b of ['kunci', 'kisi'] as JenisBerkas[]) {
      let gambar = 0;
      const blob = await buatPdf(bangunDokumen(paketUji(), soalUji(), profilUji(), OPSI, b), {
        fontBiasa: readFileSync('public/fonts/LiberationSerif-Regular.ttf').toString('base64'),
        fontTebal: readFileSync('public/fonts/LiberationSerif-Bold.ttf').toString('base64'),
        fontMiring: readFileSync('public/fonts/LiberationSerif-Italic.ttf').toString('base64'),
        gambarSvg: async () => {
          gambar++;
        },
      });
      const buf = Buffer.from(await blob.arrayBuffer());
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(gambar).toBe(0);
      if (process.env.PDF_KELUAR) writeFileSync(process.env.PDF_KELUAR.replace(/\.pdf$/, `-${b}.pdf`), buf);
    }
  }, 60000);
});
