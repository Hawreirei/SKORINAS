// Uji pembaruan otomatis PWA dengan dua hasil build (bukan bagian dari npm run e2e karena butuh dua build):
//   npm run build && cp -r dist /tmp/v1
//   (ubah satu teks di beranda, mis. label "Kelas 1–12 · tanpa akun" menjadi "VERSI-DUA") npm run build && cp -r dist /tmp/v2
//   node tests/e2e/pembaruan.cjs /tmp/v1 /tmp/v2 VERSI-DUA
// Memeriksa: (1) aplikasi yang dibuka lagi memasang versi baru sendiri; (2) versi baru yang ditemukan saat aplikasi
// sudah lama terbuka dipasang ketika guru pindah layar.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const [V1, V2, PENANDA] = process.argv.slice(2);
if (!V1 || !V2 || !PENANDA) throw new Error('Pakai: node tests/e2e/pembaruan.cjs <dist-v1> <dist-v2> <teks-penanda-v2>');
const JENIS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.png': 'image/png' };
let aktif = V1;
const server = http
  .createServer((req, res) => {
    let f = path.join(aktif, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(aktif, 'index.html');
    res.writeHead(200, { 'content-type': JENIS[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  })
  .listen(4390);
const URL = 'http://localhost:4390/';

async function terpasangV1(b) {
  const p = await (await b.newContext()).newPage();
  await p.goto(URL);
  await p.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  await p.waitForSelector('h1');
  return p;
}
const adaPenanda = (p) => p.evaluate((t) => document.body.innerText.includes(t), PENANDA);

(async () => {
  const b = await chromium.launch();
  const galat = [];

  // 1. Dibuka lagi: versi lama dari cache, lalu versi baru terpasang tanpa menekan apa pun.
  aktif = V1;
  let p = await terpasangV1(b);
  aktif = V2;
  await p.reload();
  await p.waitForFunction((t) => document.body.innerText.includes(t), PENANDA, { timeout: 30000 }).catch(() => galat.push('versi baru tidak terpasang sendiri saat aplikasi dibuka lagi'));

  // 2. Sudah lama terbuka: pemberitahuan tampil, versi baru terpasang saat pindah layar.
  aktif = V1;
  p = await terpasangV1(b);
  await p.waitForTimeout(21000);
  aktif = V2;
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await p.getByText('Versi baru GenSoal dipasang otomatis saat Anda pindah layar.').waitFor({ timeout: 20000 }).catch(() => galat.push('pemberitahuan versi baru tidak tampil'));
  if (await adaPenanda(p)) galat.push('halaman dimuat ulang sendiri padahal guru sedang di layar yang sama');
  await p.getByRole('navigation', { name: 'Utama' }).getByRole('link', { name: 'Soal saya' }).click();
  await p.waitForFunction(() => location.pathname === '/soal' && !document.body.innerText.includes('Versi baru GenSoal'), null, { timeout: 20000 }).catch(() => {});
  await p.goto(URL);
  await p.waitForSelector('h1');
  if (!(await adaPenanda(p))) galat.push('versi baru tidak terpasang setelah pindah layar');

  console.log('pembaruan otomatis:', galat.length ? galat : 'lolos');
  await b.close();
  server.close();
  if (galat.length) process.exit(1);
})();
