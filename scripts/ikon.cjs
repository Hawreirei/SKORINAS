// Bangun ikon PWA (192 dan 512 px) dari logo SVG memakai Chromium Playwright. Jalankan sekali: node scripts/ikon.cjs
const { chromium } = require('playwright');
const svg = (u) => `<svg xmlns="http://www.w3.org/2000/svg" width="${u}" height="${u}" viewBox="0 0 26 26"><rect width="26" height="26" fill="#0b0c0e"/><g transform="translate(4.5 4.5) scale(0.654)" fill="none" stroke="#fff" stroke-width="1.5"><circle cx="13" cy="13" r="11"/><ellipse cx="13" cy="13" rx="11" ry="4.5" transform="rotate(-30 13 13)"/><circle cx="13" cy="13" r="1.6" fill="#fff"/></g></svg>`;
(async () => {
const b = await chromium.launch();
const p = await b.newPage();
for (const u of [192, 512]) {
  await p.setViewportSize({ width: u, height: u });
  await p.setContent(`<html><body style="margin:0">${svg(u)}</body></html>`);
  await p.screenshot({ path: `public/icon-${u}.png`, omitBackground: false });
}
await b.close();
})();
