// Uji ujung ke ujung alur utama dengan penyedia AI palsu (jaringan dicegat Playwright).
// Jalankan: npm run build && npx vite preview --port 4173 & node tests/e2e/alur-utama.cjs [folder-tangkapan]
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

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
  // Satu tombol utama terlihat tanpa menggulir di laptop (UI-04).
  const utamaTerlihat = async (pg, layar) => {
    await pg.evaluate(() => window.scrollTo(0, 0));
    const ada = await pg.evaluate(() =>
      [...document.querySelectorAll('.tombol-utama')].some((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
      }),
    );
    if (!ada) galat.push(`${layar}: tombol utama tidak terlihat tanpa menggulir`);
  };
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
  // Beranda: kartu Mulai cepat, tiga langkah, dan Soal terakhir yang masih kosong.
  if (!(await page.getByRole('form', { name: 'Mulai cepat' }).count())) galat.push('beranda tanpa kartu "Mulai cepat"');
  if (!(await page.getByRole('region', { name: 'Tiga langkah, soal siap dipakai' }).count())) galat.push('beranda tanpa "Tiga langkah"');
  if (!(await page.getByText('Belum ada soal.').count())) galat.push('beranda kosong tanpa ajakan membuat paket pertama');

  // Tanpa kunci AI: layar Buat tetap dapat diisi, tombol utama mengarah ke Pengaturan AI (UI-06).
  await page.goto(DASAR + '/soal/baru');
  await page.waitForSelector('text=Pasang kunci AI dulu agar GenSoal dapat membuat soal');
  await page.locator('aside').getByRole('button', { name: /Pasang kunci AI dulu/ }).click();
  await page.waitForURL(/\/pengaturan\/ai$/);

  // Pengaturan AI: tempel kunci, uji, pilih model
  await page.fill('#kunci', 'AIzaUJI-palsu-1234567890');
  await page.getByRole('button', { name: 'Simpan dan uji' }).click();
  await page.waitForSelector('text=Siap dipakai');
  await page.click('text=Pengaturan lanjutan');
  await page.selectOption('#model-cadangan', { index: 2 });
  await foto('02-pengaturan-ai');
  // Buat soal: tiga isian wajib, sisanya di Pengaturan lanjutan
  await page.goto(DASAR + '/soal/baru');
  await page.waitForSelector('h1:has-text("Buat soal")');
  await foto('03a-buat-soal-kosong');
  await utamaTerlihat(page, 'Buat soal');
  // Mulai cepat di beranda mengisi tiga isian wajib layar Buat.
  await page.goto(DASAR + '/');
  const cepat = page.getByRole('form', { name: 'Mulai cepat' });
  await cepat.getByLabel('Kelas').selectOption('4');
  await cepat.getByLabel('Mata pelajaran').fill('Matematika');
  await cepat.getByLabel('Jumlah soal').fill('12');
  await foto('01b-beranda-mulai-cepat', { fullPage: false });
  await cepat.getByRole('button', { name: /Lanjut isi CP dan TP/ }).click();
  await page.waitForURL(/\/soal\/baru$/);
  await page.waitForSelector('h1:has-text("Buat soal")');
  const isiCepat = await page.evaluate(() => ['#kelas', '#mapel', '#jumlah'].map((q) => document.querySelector(q).value));
  if (isiCepat.join('|') !== '4|Matematika|12') galat.push(`Mulai cepat tidak mengisi layar Buat: ${isiCepat.join('|')}`);
  await page.fill('#tp', 'Peserta didik dapat menjumlahkan dua pecahan berpenyebut sama.\nPeserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya.');
  // Panel Rencana menghitung permintaan sebelum tombol ditekan; isian tersimpan sebagai draf.
  await page.locator('aside[aria-label="Rencana"]').getByText('12–16').waitFor();
  await page.reload();
  await page.waitForSelector('h1:has-text("Buat soal")');
  const draf = await page.evaluate(() => ['#kelas', '#mapel', '#jumlah'].map((q) => document.querySelector(q).value));
  if (draf.join('|') !== '4|Matematika|12') galat.push(`draf layar Buat tidak pulih setelah muat ulang: ${draf.join('|')}`);
  await page.getByRole('button', { name: /Pengaturan lanjutan/ }).click();
  for (const b of ['Isian singkat', 'Benar-salah', 'Uraian']) await page.getByRole('button', { name: b, exact: true }).click();
  await page.getByLabel('Simpan pengaturan ini').check();
  await page.fill('#nama-preset', 'Matematika K4 · Pecahan');
  await page.fill('#judul', 'Penjumlahan pecahan');
  // Gulir ke atas agar kepala dan panel Rencana yang lengket tergambar di tempatnya pada tangkapan penuh.
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto('03-buat-soal');
  await page.getByRole('button', { name: /Buat 12 soal/ }).click();
  await page.waitForURL(/\/soal\/[0-9a-f-]+$/);
  await page.getByRole('link', { name: 'Unduh', exact: true }).waitFor();
  await page.waitForSelector('text=Melanjutkan otomatis dalam', { timeout: 30000 });
  await foto('04a-menunggu-batas');
  // Selama paket dibuat, menutup tab memunculkan peringatan (UI-07).
  const ingatkanTutup = () => page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  if (!(await ingatkanTutup())) galat.push('tidak ada peringatan beforeunload saat paket dibuat');
  // Bilah kemajuan dapat dibaca pembaca layar (UI-03).
  const bilah = page.getByRole('progressbar', { name: 'Kemajuan pembuatan soal' });
  if (!(await bilah.count()) || !/dari \d+ soal selesai/.test((await bilah.getAttribute('aria-valuetext')) ?? '')) galat.push('bilah kemajuan tanpa role progressbar atau aria-valuetext');
  await page.waitForSelector('text=Menjaga batas per menit', { timeout: 120000 });
  await foto('04b-menjaga-batas');
  await page.waitForFunction(() => !/Membuat soal|Sedang dibuat|Menunggu batas|Menjaga batas/.test(document.body.innerText), null, { timeout: 400000 });
  if (await page.locator('text=Dijeda').count()) throw new Error('Pembuatan terjeda padahal batas hanya per menit');
  await foto('04-periksa');
  await utamaTerlihat(page, 'halaman paket');
  if (await ingatkanTutup()) galat.push('peringatan beforeunload masih aktif setelah pembuatan selesai');
  // Hanya satu tombol utama berwarna pekat yang tampil.
  const jumlahUtama = (pg) => pg.evaluate(() => [...document.querySelectorAll('.tombol-utama')].filter((el) => el.getClientRects().length > 0).length);
  if ((await jumlahUtama(page)) !== 1) galat.push(`halaman paket laptop: ${await jumlahUtama(page)} tombol utama tampil`);
  // Nomor soal melompat ke kartunya tanpa tertutup kepala lengket.
  await page.locator('aside').getByRole('button', { name: /^Soal 9(,|$)/ }).click();
  await page.waitForFunction(() => {
    const el = document.querySelectorAll('article[id^="soal-"]')[8];
    const atas = el.getBoundingClientRect().top;
    const kepala = document.querySelector('header').getBoundingClientRect().bottom;
    return document.activeElement === el && atas >= kepala - 1 && atas < kepala + 60;
  }, null, { timeout: 5000 }).catch(() => galat.push('klik nomor soal 9 tidak melompat ke kartunya'));
  // Kepala lengket di laptop; soal yang dilompati tidak tertutup kepala (UI-04).
  const letak = await page.evaluate(async () => {
    const kepala = document.querySelector('header');
    const soal = document.querySelectorAll('article[id^="soal-"]')[6];
    soal.scrollIntoView();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { kepalaAtas: kepala.getBoundingClientRect().top, kepalaBawah: kepala.getBoundingClientRect().bottom, soalAtas: soal.getBoundingClientRect().top, gulir: window.scrollY };
  });
  if (letak.gulir < 500 || Math.abs(letak.kepalaAtas) > 1) galat.push(`kepala tidak lengket saat digulir: ${JSON.stringify(letak)}`);
  if (letak.soalAtas < letak.kepalaBawah) galat.push(`soal tertutup kepala lengket: ${JSON.stringify(letak)}`);
  const urlPeriksa = page.url();

  // Aksi jarang dipakai ada di menu Lainnya; Escape menutupnya.
  // Menu Lainnya di kepala halaman: ubah judul dan buat paket serupa (UI-07).
  // Menu kepala halaman ada sebelum menu kartu soal di urutan halaman.
  await page.getByRole('button', { name: 'Lainnya' }).first().click();
  await page.getByRole('menuitem', { name: 'Ubah judul…' }).waitFor();
  if (!(await page.getByRole('menuitem', { name: 'Buat paket serupa' }).count())) galat.push('menu kepala halaman tanpa "Buat paket serupa"');
  await page.keyboard.press('Escape');
  await page.locator('article[id^="soal-"]').first().getByRole('button', { name: 'Lainnya' }).click();
  await page.getByRole('menuitem', { name: 'Ganti soal' }).waitFor();
  if (!(await page.getByRole('menuitem', { name: 'Hapus soal' }).isVisible())) galat.push('menu Lainnya tidak memuat Hapus soal');
  await page.keyboard.press('Escape');
  if (await page.getByRole('menuitem').count()) galat.push('menu Lainnya tidak tertutup dengan Escape');

  // Hapus soal lewat menu Lainnya dan dialog konfirmasi, lalu pulihkan dari tong sampah (UI-05).
  const jumlahSoal = () => page.locator('article[id^="soal-"]').count();
  const sebelumHapus = await jumlahSoal();
  await page.locator('article[id^="soal-"]').last().getByRole('button', { name: 'Lainnya' }).click();
  await page.getByRole('menuitem', { name: 'Hapus soal…' }).click();
  const dialogHapus = page.getByRole('dialog', { name: /^Hapus soal \d+\?$/ });
  await dialogHapus.waitFor();
  if ((await page.evaluate(() => document.activeElement?.textContent)) !== 'Batal') galat.push('fokus awal konfirmasi bukan di tombol Batal');
  await foto('04c-konfirmasi-hapus', { fullPage: false });
  await dialogHapus.getByRole('button', { name: 'Hapus soal', exact: true }).click();
  await page.waitForFunction((n) => document.querySelectorAll('article[id^="soal-"]').length === n - 1, sebelumHapus);
  await page.goto(DASAR + '/soal?tab=sampah');
  await page.getByRole('button', { name: 'Pulihkan' }).first().click();
  // Tunggu pemulihan tersimpan sebelum pindah halaman.
  await page.getByText('Tong sampah kosong.').waitFor();
  await page.goto(urlPeriksa);
  await page.waitForFunction((n) => document.querySelectorAll('article[id^="soal-"]').length === n, sebelumHapus, { timeout: 15000 });

  // Ubah tanda jenis jawaban satu soal uraian. Tanpa persetujuan (v0.5): soal uraian hanya diberi
  // keterangan, tidak ada tombol Setujui atau penunjuk langkah, dan Unduh langsung aktif.
  const jenis = page.getByRole('radio', { name: /Penjelasan \(garis tulis\)/ });
  if (await jenis.count()) await jenis.first().check();
  if (!(await page.getByText('Kunci tidak dicek otomatis').count())) galat.push('soal uraian tanpa keterangan "Kunci tidak dicek otomatis"');
  if (await page.getByRole('button', { name: /Setujui/ }).count()) galat.push('tombol Setujui masih ada');
  if (/Mohon cek dulu|Disetujui|Langkah \d dari 3/.test(await page.locator('body').innerText())) galat.push('penanda status atau penunjuk langkah masih tampil');
  const tautanUnduh = page.getByRole('link', { name: 'Unduh', exact: true });
  if ((await tautanUnduh.getAttribute('aria-disabled')) === 'true') galat.push('Unduh tidak aktif padahal paket sudah selesai');
  await tautanUnduh.click();
  await page.waitForSelector('text=Unduh 3 berkas Word');
  await page.getByRole('link', { name: /Kembali ke soal/ }).waitFor();
  await foto('05-unduh');
  await utamaTerlihat(page, 'Unduh');
  const urlUnduh = page.url();
  for (const [fmt, label] of [['docx', 'Word'], ['pdf', 'PDF'], ['tex', 'LaTeX']]) {
    if (fmt === 'tex') {
      // LaTeX ada di Menu lanjutan (UI-08).
      await page.getByRole('button', { name: /Menu lanjutan/ }).click();
      await page.getByRole('button', { name: /Pilih format LaTeX/ }).click();
    }
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
    await page.getByText(/^3 berkas terunduh: /).waitFor({ timeout: 10000 }).catch(() => galat.push(`${fmt}: tanpa pemberitahuan berhasil yang menyebut nama berkas`));
    for (const u of berkas) {
      const nama = u.suggestedFilename();
      const akhiran = /Kunci-Jawaban/.test(nama) ? '-kunci' : /Kisi-kisi/.test(nama) ? '-kisi' : '';
      const tujuan = path.join(KELUAR, `soal${akhiran}.${fmt}`);
      await u.saveAs(tujuan);
      console.log(fmt, nama, fs.statSync(tujuan).size, 'bytes');
    }
  }

  // Format terakhir diingat saat layar Unduh dibuka lagi.
  await page.goto(urlPeriksa);
  await page.goto(urlUnduh);
  await page.waitForSelector('h1:has-text("Unduh")');
  if ((await page.getByRole('radio', { name: /LaTeX/ }).getAttribute('aria-checked')) !== 'true') galat.push('layar Unduh tidak mengingat format terakhir');

  // Cetak, beranda, ponsel
  await page.goto(page.url().replace('/ekspor', '/cetak'));
  await page.waitForSelector('text=Cetak atau simpan PDF');
  await foto('06-cetak');
  await page.goto(DASAR + '/');
  await page.waitForSelector('text=Penjumlahan pecahan');
  if (!(await page.getByText('Siap diunduh').count())) galat.push('beranda tanpa lencana "Siap diunduh"');
  await foto('07-beranda');
  if (await page.getByRole('region', { name: /^Penjumlahan pecahan$/ }).count()) galat.push('kartu "Belum selesai" tampil padahal paket sudah siap');
  await utamaTerlihat(page, 'Beranda');
  await page.goto(DASAR + '/soal');
  await page.waitForSelector('h1');
  await utamaTerlihat(page, 'Soal saya');
  // Soal saya (UI-09): saringan status di URL, menu ⋯, ubah judul, hapus lalu pulihkan dari tong sampah.
  await page.getByRole('radio', { name: /^Belum selesai/ }).click();
  await page.waitForURL(/status=belum/);
  await page.getByText('Semua paket sudah siap diunduh.').waitFor();
  if (await page.getByRole('link', { name: 'Penjumlahan pecahan' }).count()) galat.push('saringan "Belum selesai" menampilkan paket yang siap');
  await page.getByRole('radio', { name: /^Siap diunduh/ }).click();
  await page.getByRole('link', { name: 'Penjumlahan pecahan' }).waitFor();
  await foto('11-soal-saya');
  const menuPaket = () => page.getByRole('button', { name: /^Aksi paket / }).first();
  await menuPaket().click();
  await page.getByRole('menuitem', { name: 'Ubah judul…' }).click();
  await page.getByRole('textbox', { name: 'Judul paket' }).fill('Pecahan uji');
  await page.getByRole('dialog', { name: 'Ubah judul paket' }).getByRole('button', { name: 'Simpan' }).click();
  await page.getByRole('link', { name: 'Pecahan uji' }).waitFor();
  await menuPaket().click();
  await page.getByRole('menuitem', { name: 'Ubah judul…' }).click();
  await page.getByRole('textbox', { name: 'Judul paket' }).fill('Penjumlahan pecahan');
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'Penjumlahan pecahan' }).waitFor();
  await menuPaket().click();
  await page.getByRole('menuitem', { name: 'Hapus…' }).click();
  await page.getByRole('dialog', { name: /^Hapus paket "Penjumlahan pecahan"\?$/ }).getByRole('button', { name: 'Hapus paket' }).click();
  await page.getByRole('link', { name: 'Penjumlahan pecahan' }).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /^Tong sampah · 1$/ }).click();
  await page.waitForURL(/tab=sampah/);
  await page.getByRole('button', { name: 'Pulihkan' }).click();
  await page.getByText('Tong sampah kosong.').waitFor();
  await page.goto(DASAR + '/soal');
  await page.getByRole('link', { name: 'Penjumlahan pecahan' }).waitFor();
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
    if (n === '09b-periksa-ponsel') {
      if ((await jumlahUtama(hp)) !== 1) galat.push(`halaman paket ponsel: ${await jumlahUtama(hp)} tombol utama tampil`);
      const bawah = await hp.evaluate(() => {
        window.scrollTo(0, 1500);
        return document.querySelector('header').getBoundingClientRect().bottom;
      });
      if (bawah > 0) galat.push('kepala lengket di ponsel, seharusnya ikut tergulir');
    }
    lebar = Math.max(lebar, await hp.evaluate(() => document.documentElement.scrollWidth));
  }
  for (const [n, u] of [['13a-profil-ponsel', '/pengaturan'], ['13b-pengaturan-ai-ponsel', '/pengaturan/ai'], ['13c-cadangan-ponsel', '/cadangan']]) {
    await hp.goto(DASAR + u);
    await hp.waitForSelector('h1');
    await hp.screenshot({ path: path.join(KELUAR, `${n}.png`), fullPage: true });
    lebar = Math.max(lebar, await hp.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log('lebar halaman ponsel', lebar);

  // Audit aksesibilitas (UI-12): axe-core (WCAG 2.2 A/AA) di delapan layar, mode terang dan gelap.
  const periksaAxe = async (pg, layar) => {
    await pg.evaluate(AXE);
    const hasil = await pg.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'], resultTypes: ['violations'] }));
    for (const v of hasil.violations) galat.push(`axe ${layar}: ${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')}`);
    return hasil.violations.length;
  };
  const LAYAR = [
    ['beranda', DASAR + '/'],
    ['buat', DASAR + '/soal/baru'],
    ['paket', urlPeriksa],
    ['unduh', urlUnduh],
    ['soal-saya', DASAR + '/soal'],
    ['pengaturan-ai', DASAR + '/pengaturan/ai'],
    ['profil', DASAR + '/pengaturan'],
    ['cadangan', DASAR + '/cadangan'],
  ];
  const gelap = await ctx.newPage();
  await gelap.emulateMedia({ colorScheme: 'dark' });
  gelap.on('pageerror', (e) => galat.push(e.message));
  let pelanggaran = 0;
  for (const [nama, u] of LAYAR) {
    for (const [pg, tema] of [[page, 'terang'], [gelap, 'gelap']]) {
      await pg.goto(u);
      await pg.waitForSelector('h1');
      await pg.waitForLoadState('networkidle');
      if (tema === 'gelap' && !(await pg.evaluate(() => document.documentElement.classList.contains('dark')))) galat.push(`${nama}: mode gelap tidak aktif`);
      pelanggaran += await periksaAxe(pg, `${nama} ${tema}`);
      if (tema === 'gelap' && ['buat', 'paket', 'unduh'].includes(nama)) await pg.screenshot({ path: path.join(KELUAR, `14-${nama}-gelap.png`), fullPage: true });
    }
  }
  console.log('axe: layar diperiksa', LAYAR.length * 2, '· pelanggaran', pelanggaran);

  // Papan ketik (UI-12): setiap elemen yang difokus dengan Tab memperlihatkan cincin fokus,
  // tombol utama dapat dicapai, dan Unduh berjalan hanya dengan Enter.
  const fokusKini = (pg) =>
    pg.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const garis = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const bayang = cs.boxShadow !== 'none';
      const nama = (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.textContent || el.id || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 50);
      // Penanda unik per elemen agar putaran Tab kembali ke awal dapat dikenali.
      el.dataset.ujiFokus ??= String(Math.random());
      return { nama, terlihat: garis || bayang, utama: el.classList.contains('tombol-utama'), kunci: el.dataset.ujiFokus };
    });
  const telusuriTab = async (pg, layar, cariUtama) => {
    await pg.evaluate(() => {
      window.scrollTo(0, 0);
      document.activeElement?.blur();
    });
    const dilihat = new Set();
    let ketemu = null;
    for (let i = 0; i < 150; i++) {
      await pg.keyboard.press('Tab');
      const f = await fokusKini(pg);
      if (!f) continue;
      if (dilihat.has(f.kunci)) break;
      dilihat.add(f.kunci);
      if (!f.terlihat) galat.push(`${layar}: fokus tidak terlihat pada "${f.nama}"`);
      if (f.utama && cariUtama.test(f.nama)) {
        ketemu = f;
        break;
      }
    }
    if (!ketemu) galat.push(`${layar}: tombol utama ${cariUtama} tidak tercapai dengan Tab`);
    return dilihat.size;
  };
  await page.goto(DASAR + '/soal/baru');
  await page.waitForSelector('h1');
  const nBuat = await telusuriTab(page, 'buat (papan ketik)', /^Buat \d+ soal/);
  await page.goto(urlPeriksa);
  await page.waitForSelector('h1');
  const nPaket = await telusuriTab(page, 'paket (papan ketik)', /^Unduh/);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/ekspor$/);
  await page.waitForSelector('h1');
  const nUnduh = await telusuriTab(page, 'unduh (papan ketik)', /^Unduh/);
  const unduhan = [];
  const catat = (d) => unduhan.push(d.suggestedFilename());
  page.on('download', catat);
  await page.keyboard.press('Enter');
  await page.getByText(/terunduh/i).first().waitFor();
  page.off('download', catat);
  if (!unduhan.length) galat.push('unduh dengan Enter tidak menghasilkan berkas');
  console.log('papan ketik: elemen difokus', { buat: nBuat, paket: nPaket, unduh: nUnduh }, '· berkas lewat Enter', unduhan.length);

  // Halaman "Mohon cek dulu" dihapus; tautan lama diarahkan ke Soal saya.
  await page.goto(DASAR + '/telaah');
  await page.waitForURL(/\/soal$/);

  // Cadangan: unduh .gensoal
  await page.goto(DASAR + '/cadangan');
  const [cad] = await Promise.all([page.waitForEvent('download'), page.click('text=Unduh berkas .gensoal')]);
  await cad.saveAs(path.join(KELUAR, 'cadangan.gensoal'));
  const isi = JSON.parse(fs.readFileSync(path.join(KELUAR, 'cadangan.gensoal'), 'utf8'));
  console.log('cadangan soal', isi.data.soal.length, 'kunci_api ikut?', 'kunci_api' in isi.data, JSON.stringify(isi).includes('AIzaUJI'));
  await foto('10-cadangan');

  // Profil dan kop (UI-11): pratinjau kop mengikuti isian; simpan memberi umpan balik di samping tombol.
  await page.goto(DASAR + '/pengaturan');
  await page.waitForSelector('h1:has-text("Profil dan kop")');
  await page.fill('#sekolah', 'SD Negeri Uji');
  await page.fill('#identitas', 'Nama, Kelas, No. absen');
  if (!(await page.locator('figure').getByText('SD NEGERI UJI').count())) galat.push('pratinjau kop tidak mengikuti isian');
  await page.getByRole('button', { name: 'Simpan profil' }).click();
  await page.getByText('Profil tersimpan.').waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await foto('12-profil');
  await page.fill('#nama', 'Bu Uji');
  if (await page.getByText('Profil tersimpan.').count()) galat.push('"Profil tersimpan." tetap tampil setelah isian diubah');

  // Pengaturan AI (UI-11): hapus kunci di Zona berbahaya, kartu terakhir.
  await page.goto(DASAR + '/pengaturan/ai');
  await page.getByRole('heading', { name: 'Zona berbahaya' }).waitFor();
  await foto('02b-pengaturan-ai-siap');

  // Cadangan (UI-11): hapus semua data meminta konfirmasi; Batal tidak menghapus apa pun.
  await page.goto(DASAR + '/cadangan');
  const dlgHapus = page.getByRole('dialog', { name: 'Hapus semua data di perangkat ini?' });
  await page.getByRole('button', { name: 'Hapus semua data…' }).click();
  await dlgHapus.getByRole('button', { name: 'Batal' }).click();
  await dlgHapus.waitFor({ state: 'hidden' });
  if (!(await page.getByText(/^[1-9]\d* paket · \d+ soal$/).count())) galat.push('Batal di konfirmasi hapus semua data tetap menghapus data');
  await page.getByRole('button', { name: 'Hapus semua data…' }).click();
  await foto('10b-konfirmasi-hapus-semua', { fullPage: false });
  await dlgHapus.getByRole('button', { name: 'Hapus semua data' }).click();
  await page.getByText('0 paket · 0 soal').waitFor();
  await page.goto(DASAR + '/');
  await page.getByText('Belum ada soal.').waitFor();

  const padat = Math.max(...waktuKirim.map((t) => waktuKirim.filter((u) => u >= t && u < t + 60000).length));
  console.log('permintaan terbanyak dalam 60 detik:', padat, '(batas 5)');
  if (padat > 5) galat.push(`RPM terlampaui: ${padat}`);
  console.log('permintaan AI', panggil, '· termasuk satu 429 yang ditunggu:', jumlahGenerate === panggil + 1);
  console.log('galat halaman', galat.length ? galat : 'tidak ada');
  await browser.close();
  if (galat.length || lebar > 390) process.exit(1);
})();
