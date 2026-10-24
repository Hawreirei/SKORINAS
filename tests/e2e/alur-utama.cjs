// Uji ujung ke ujung alur utama dengan penyedia AI palsu (jaringan dicegat Playwright).
// Jalankan: npm run build && npx vite preview --port 4173 & node tests/e2e/alur-utama.cjs [folder-tangkapan]
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const DASAR = process.env.DASAR ?? 'http://localhost:4173';
const KELUAR = process.argv[2] ?? 'e2e-hasil';
fs.mkdirSync(KELUAR, { recursive: true });

const NAMA = ['Ani', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko', 'Kirana', 'Lukas', 'Maya', 'Nanda'];
const BENDA = ['pita', 'tali', 'kue', 'roti', 'kertas', 'kain', 'pizza', 'semangka', 'cokelat', 'kayu', 'pipa', 'kabel'];

let panggil = 0;
function butirPalsu(bentuk) {
  panggil++;
  const i = panggil;
  const d = [4, 5, 6, 8, 10, 12][i % 6];
  const a = 1 + (i % (d - 2));
  const b = 1;
  const nama = NAMA[i % NAMA.length];
  const benda = BENDA[i % BENDA.length];
  const sum = `${a + b}/${d}`;
  const meta = { tp: 'x', indikator: 'Disajikan soal cerita pecahan, peserta didik dapat menjumlahkan dua pecahan berpenyebut sama.', level: 'C3', kesukaran: 'sedang' };
  if (bentuk === 'pilihan_ganda') {
    const gambar = i % 3 === 0 ? { templat: 'pecahan_batang', parameter: { penyebut: d, diarsir: a + b } } : null;
    return {
      bentuk,
      pokok: gambar
        ? `Perhatikan gambar ${benda} milik ${nama} nomor ${i}. Bagian yang diarsir menunjukkan pecahan ....`
        : `${nama} memiliki $\\frac{${a}}{${d}}$ meter ${benda}. Ia membeli lagi $\\frac{${b}}{${d}}$ meter di toko ke-${i}. Panjang ${benda} ${nama} sekarang adalah ....`,
      opsi: { A: `$\\frac{${a + b}}{${d}}$`, B: `$\\frac{${a + b}}{${2 * d}}$`, C: `$\\frac{${a * b + 1}}{${d + 1}}$`, D: `$\\frac{${a + b + 1}}{${d}}$` },
      kunci: 'A',
      pembahasan: [`Penyebut sama, jumlahkan pembilang: ${a} + ${b} = ${a + b}.`, `Jadi hasilnya $\\frac{${a + b}}{${d}}$.`],
      verifikasi: gambar ? { tipe: 'ekspresi', ekspresi: 'pecahan', nilai: sum } : { tipe: 'ekspresi', ekspresi: `${a}/${d} + ${b}/${d}`, nilai: sum },
      gambar,
      meta,
    };
  }
  if (bentuk === 'benar_salah') {
    return { bentuk, pokok: `$\\frac{${a}}{${d}} + \\frac{${b}}{${d}} = \\frac{${a + b}}{${2 * d}}$ (soal ${i}).`, kunci: 'S', pembahasan: [`Hasil yang benar $\\frac{${a + b}}{${d}}$.`], verifikasi: { tipe: 'ekspresi', ekspresi: `${a}/${d} + ${b}/${d}`, nilai: `${a + b}/${2 * d}` }, gambar: null, meta };
  }
  if (bentuk === 'isian_singkat') {
    return { bentuk, pokok: `${nama} memotong ${benda} nomor ${i}. Hasil dari $\\frac{${a}}{${d}} + \\frac{${b}}{${d}}$ adalah ....`, kunci: `$\\frac{${a + b}}{${d}}$`, pembahasan: ['Jumlahkan pembilang.'], verifikasi: { tipe: 'ekspresi', ekspresi: `${a}/${d} + ${b}/${d}`, nilai: sum }, gambar: null, meta };
  }
  return {
    bentuk,
    pokok: `${nama} berkata $\\frac{${a}}{${d}} + \\frac{${b}}{${d}} = \\frac{${a + b}}{${2 * d}}$ karena pembilang dan penyebut dijumlahkan (kasus ${i}). Nilailah pendapat ${nama} dan jelaskan alasanmu.`,
    kunci: `Pendapat ${nama} salah. Penyebut tetap ${d}, sehingga hasilnya $\\frac{${a + b}}{${d}}$.`,
    rubrik: ['Menyatakan pendapat salah (1)', 'Menjelaskan penyebut tetap (2)', `Menghitung $\\frac{${a + b}}{${d}}$ (1)`],
    pembahasan: ['Pecahan berpenyebut sama dijumlahkan pembilangnya saja.'],
    verifikasi: { tipe: 'ekspresi', ekspresi: `${a}/${d} + ${b}/${d}`, nilai: sum },
    gambar: null,
    meta,
  };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const galat = [];
  page.on('pageerror', (e) => galat.push(e.message));
  // Di GitHub Pages, tautan dalam disajikan lewat 404.html (status 404) lalu dirender aplikasi; itu bukan galat.
  page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && galat.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && r.request().resourceType() !== 'document' && !r.url().includes('googleapis') && galat.push(`${r.status()} ${r.url()}`));

  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/models?')) return route.fulfill({ json: { models: [{ name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash', supportedGenerationMethods: ['generateContent'] }] } });
    const body = JSON.parse(route.request().postData() ?? '{}');
    const teks = body.contents[0].parts[0].text;
    const bentuk = teks.match(/\("(pilihan_ganda|benar_salah|isian_singkat|uraian)"\)/)[1];
    await new Promise((r) => setTimeout(r, 60));
    return route.fulfill({ json: { candidates: [{ content: { parts: [{ text: JSON.stringify(butirPalsu(bentuk)) }] } }], usageMetadata: { promptTokenCount: 1800, candidatesTokenCount: 400 } } });
  });

  const foto = (n, opsi = {}) => page.screenshot({ path: path.join(KELUAR, `${n}.png`), fullPage: true, ...opsi });

  await page.goto(DASAR + '/');
  await page.waitForSelector('h1');
  await foto('01-beranda-kosong');

  // Pengaturan AI: tempel kunci, uji, pilih model
  await page.goto(DASAR + '/pengaturan/ai');
  await page.fill('#kunci', 'AIzaUJI-palsu-1234567890');
  await page.getByRole('button', { name: 'Simpan dan uji' }).click();
  await page.waitForSelector('text=Siap dipakai');
  await page.click('text=Pengaturan lanjutan');
  await page.selectOption('#model-cadangan', { index: 2 });
  await foto('02-pengaturan-ai');

  // Buat soal
  await page.goto(DASAR + '/soal/baru');
  await page.selectOption('#kelas', '4');
  await page.click('text=Ambil dari kurikulum resmi');
  await page.waitForSelector('text=Masukkan ke formulir');
  const kotak = page.locator('dialog input[type=checkbox]:not(:checked)');
  await kotak.nth(1).check();
  await kotak.nth(1).check();
  await page.click('text=Masukkan ke formulir');
  for (const b of ['Isian singkat', 'Benar-salah', 'Uraian']) await page.getByRole('button', { name: b }).click();
  for (let k = 0; k < 2; k++) await page.getByRole('button', { name: 'Tambah jumlah soal' }).click();
  await page.getByLabel('Simpan sebagai preset').check();
  await page.fill('[aria-label="Nama preset"]', 'Matematika K4 · Pecahan');
  await page.fill('#judul', 'Penjumlahan pecahan');
  await foto('03-buat-soal');
  await page.getByRole('button', { name: /Generate 12 soal/ }).click();
  await page.waitForURL(/\/soal\/[0-9a-f-]+$/);
  await page.waitForSelector('text=Lanjut ke ekspor');
  await page.waitForFunction(() => !document.body.innerText.includes('Membuat butir'), null, { timeout: 60000 });
  await foto('04-peninjauan');

  // Telaah soal uraian lalu ekspor
  const telaah = page.getByRole('button', { name: 'Tandai sudah ditelaah' });
  for (let n = await telaah.count(); n > 0; n = await telaah.count()) {
    await telaah.first().click();
    await page.waitForFunction((sisa) => document.querySelectorAll('button').length && [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Tandai sudah ditelaah').length < sisa, n);
  }
  await page.click('text=Lanjut ke ekspor');
  await page.waitForSelector('text=Unduh Word');
  await foto('05-ekspor');
  for (const [fmt, label] of [['docx', 'Word'], ['pdf', 'PDF'], ['tex', 'LaTeX']]) {
    await page.getByRole('radio', { name: new RegExp(label) }).click();
    const [unduh] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: new RegExp(`^Unduh ${label}`) }).click()]);
    const tujuan = path.join(KELUAR, `soal.${fmt}`);
    await unduh.saveAs(tujuan);
    console.log(fmt, fs.statSync(tujuan).size, 'bytes');
  }

  // Cetak, beranda, ponsel
  await page.goto(page.url().replace('/ekspor', '/cetak'));
  await page.waitForSelector('text=Cetak atau simpan PDF');
  await foto('06-cetak');
  await page.goto(DASAR + '/');
  await page.waitForSelector('text=Penjumlahan pecahan');
  await foto('07-beranda');
  const hp = await ctx.newPage();
  await hp.setViewportSize({ width: 390, height: 844 });
  await hp.goto(DASAR + '/');
  await hp.waitForSelector('h1');
  await hp.screenshot({ path: path.join(KELUAR, '08-beranda-ponsel.png'), fullPage: true });
  await hp.goto(DASAR + '/soal/baru');
  await hp.waitForSelector('h1');
  await hp.screenshot({ path: path.join(KELUAR, '09-buat-ponsel.png'), fullPage: true });
  const lebar = await hp.evaluate(() => document.documentElement.scrollWidth);
  console.log('lebar halaman ponsel', lebar);

  // Cadangan: unduh .gensoal
  await page.goto(DASAR + '/cadangan');
  const [cad] = await Promise.all([page.waitForEvent('download'), page.click('text=Unduh berkas .gensoal')]);
  await cad.saveAs(path.join(KELUAR, 'cadangan.gensoal'));
  const isi = JSON.parse(fs.readFileSync(path.join(KELUAR, 'cadangan.gensoal'), 'utf8'));
  console.log('cadangan soal', isi.data.soal.length, 'kunci_api ikut?', 'kunci_api' in isi.data, JSON.stringify(isi).includes('AIzaUJI'));
  await foto('10-cadangan');

  console.log('permintaan AI', panggil);
  console.log('galat halaman', galat.length ? galat : 'tidak ada');
  await browser.close();
  if (galat.length || lebar > 390) process.exit(1);
})();
