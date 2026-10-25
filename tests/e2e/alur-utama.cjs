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
let jumlahGenerate = 0;
const waktuKirim = [];
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
    jenis_uraian: i % 2 ? 'penjelasan' : 'hitungan',
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
    // Permintaan ke-4: batas per menit gaya Gemini; aplikasi harus menunggu lalu lanjut sendiri.
    jumlahGenerate++;
    waktuKirim.push(Date.now());
    if (jumlahGenerate === 4)
      return route.fulfill({
        status: 429,
        json: { error: { code: 429, message: 'You exceeded your current quota. Please retry in 2s.', status: 'RESOURCE_EXHAUSTED', details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] }, { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '2s' }] } },
      });
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

  // Buat soal: tiga isian wajib, sisanya di Pengaturan lanjutan
  await page.goto(DASAR + '/soal/baru');
  await page.waitForSelector('text=Langkah 1 dari 3');
  await foto('03a-buat-soal-kosong');
  await page.selectOption('#kelas', '4');
  await page.fill('#mapel', 'Matematika');
  await page.fill('#tp', 'Peserta didik dapat menjumlahkan dua pecahan berpenyebut sama.\nPeserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya.');
  await page.fill('#jumlah', '12');
  await page.getByRole('button', { name: /Pengaturan lanjutan/ }).click();
  for (const b of ['Isian singkat', 'Benar-salah', 'Uraian']) await page.getByRole('button', { name: b, exact: true }).click();
  await page.getByLabel('Simpan pengaturan ini').check();
  await page.fill('[aria-label="Nama pengaturan tersimpan"]', 'Matematika K4 · Pecahan');
  await page.fill('#judul', 'Penjumlahan pecahan');
  await foto('03-buat-soal');
  await page.getByRole('button', { name: /Buat 12 soal/ }).click();
  await page.waitForURL(/\/soal\/[0-9a-f-]+$/);
  await page.waitForSelector('text=Lanjut ke Unduh');
  await page.waitForSelector('text=Langkah 2 dari 3');
  await page.waitForSelector('text=Melanjutkan otomatis dalam', { timeout: 30000 });
  await foto('04a-menunggu-batas');
  await page.waitForSelector('text=Menjaga batas per menit', { timeout: 120000 });
  await foto('04b-menjaga-batas');
  await page.waitForFunction(() => !/Membuat soal|Menunggu batas|Menjaga batas/.test(document.body.innerText), null, { timeout: 400000 });
  if (await page.locator('text=Dijeda').count()) throw new Error('Pembuatan terjeda padahal batas hanya per menit');
  await foto('04-periksa');
  const urlPeriksa = page.url();

  // Aksi jarang dipakai ada di menu Lainnya; Escape menutupnya.
  await page.getByRole('button', { name: 'Lainnya' }).first().click();
  await page.getByRole('menuitem', { name: 'Ganti soal' }).waitFor();
  if (!(await page.getByRole('menuitem', { name: 'Hapus soal' }).isVisible())) galat.push('menu Lainnya tidak memuat Hapus soal');
  await page.keyboard.press('Escape');
  if (await page.getByRole('menuitem').count()) galat.push('menu Lainnya tidak tertutup dengan Escape');

  // Ubah tanda jenis jawaban satu soal uraian, lalu setujui soal "Mohon cek dulu"
  const jenis = page.getByRole('radio', { name: /Penjelasan \(garis tulis\)/ });
  if (await jenis.count()) await jenis.first().check();
  await page.getByRole('button', { name: /^Mohon cek dulu ·/ }).click();
  const setujui = page.getByRole('button', { name: 'Setujui', exact: true });
  for (let n = await setujui.count(); n > 0; n = await setujui.count()) {
    await setujui.first().click();
    await page.waitForFunction((sisa) => [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Setujui').length < sisa, n);
  }
  await page.getByRole('button', { name: /^Semua ·/ }).click();
  await page.click('text=Lanjut ke Unduh');
  await page.waitForSelector('text=Unduh 3 berkas Word');
  await page.waitForSelector('text=Langkah 3 dari 3');
  await foto('05-unduh');
  const urlUnduh = page.url();
  for (const [fmt, label] of [['docx', 'Word'], ['pdf', 'PDF'], ['tex', 'LaTeX']]) {
    if (fmt === 'tex') await page.click('text=Menu lanjutan');
    await page.getByRole('radio', { name: new RegExp(label) }).click();
    // Lembar soal, kunci jawaban, dan kisi-kisi diunduh sebagai tiga berkas terpisah.
    const berkas = [];
    const dengar = (d) => berkas.push(d);
    page.on('download', dengar);
    await page.getByRole('button', { name: new RegExp(`^Unduh 3 berkas ${label}`) }).click();
    const batas = Date.now() + 30000;
    while (berkas.length < 3 && Date.now() < batas) await page.waitForTimeout(200);
    page.off('download', dengar);
    if (berkas.length !== 3) galat.push(`${fmt}: ${berkas.length} berkas terunduh, seharusnya 3`);
    for (const u of berkas) {
      const nama = u.suggestedFilename();
      const akhiran = /Kunci-Jawaban/.test(nama) ? '-kunci' : /Kisi-kisi/.test(nama) ? '-kisi' : '';
      const tujuan = path.join(KELUAR, `soal${akhiran}.${fmt}`);
      await u.saveAs(tujuan);
      console.log(fmt, nama, fs.statSync(tujuan).size, 'bytes');
    }
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
  let lebar = await hp.evaluate(() => document.documentElement.scrollWidth);
  for (const [n, u] of [['09b-periksa-ponsel', urlPeriksa], ['09c-unduh-ponsel', urlUnduh]]) {
    await hp.goto(u);
    await hp.waitForSelector('h1');
    await hp.screenshot({ path: path.join(KELUAR, `${n}.png`), fullPage: true });
    lebar = Math.max(lebar, await hp.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log('lebar halaman ponsel', lebar);

  // Cadangan: unduh .gensoal
  await page.goto(DASAR + '/cadangan');
  const [cad] = await Promise.all([page.waitForEvent('download'), page.click('text=Unduh berkas .gensoal')]);
  await cad.saveAs(path.join(KELUAR, 'cadangan.gensoal'));
  const isi = JSON.parse(fs.readFileSync(path.join(KELUAR, 'cadangan.gensoal'), 'utf8'));
  console.log('cadangan soal', isi.data.soal.length, 'kunci_api ikut?', 'kunci_api' in isi.data, JSON.stringify(isi).includes('AIzaUJI'));
  await foto('10-cadangan');

  const padat = Math.max(...waktuKirim.map((t) => waktuKirim.filter((u) => u >= t && u < t + 60000).length));
  console.log('permintaan terbanyak dalam 60 detik:', padat, '(batas 5)');
  if (padat > 5) galat.push(`RPM terlampaui: ${padat}`);
  console.log('permintaan AI', panggil, '· termasuk satu 429 yang ditunggu:', jumlahGenerate === panggil + 1);
  console.log('galat halaman', galat.length ? galat : 'tidak ada');
  await browser.close();
  if (galat.length || lebar > 390) process.exit(1);
})();
