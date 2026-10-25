/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import paket from './package.json' with { type: 'json' };

// GitHub Pages menyajikan situs di sub-jalur (/SKORINAS/); Netlify dan pengembangan memakai '/'.
const base = process.env.BASE_PATH ?? '/';

// Kebijakan keamanan konten sebagai meta, untuk hosting yang tidak dapat mengirim header (GitHub Pages).
// Header di netlify.toml tetap berlaku di Netlify. frame-ancestors hanya berlaku lewat header.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://openrouter.ai https://api.groq.com https://api.mistral.ai https://api.openai.com https://api.anthropic.com",
  'frame-src https://www.youtube-nocookie.com',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function metaCsp(): Plugin {
  return {
    name: 'gensoal-meta-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
  };
}

export default defineConfig({
  base,
  define: { __VERSI_APLIKASI__: JSON.stringify(paket.version) },
  plugins: [
    react(),
    tailwindcss(),
    metaCsp(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'fonts/*.ttf'],
      manifest: {
        name: 'GenSoal',
        short_name: 'GenSoal',
        description: 'Soal dari CP dan TP Anda yang kuncinya dihitung ulang, siap diunduh sebagai Word atau PDF.',
        lang: 'id',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f5f7fa',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2500,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
});
