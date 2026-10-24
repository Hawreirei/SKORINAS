# GenSoal

Aplikasi web (PWA) yang membuat soal dari CP dan TP Kurikulum Merdeka, menghitung ulang kuncinya dengan kode, lalu menghasilkan lembar soal Word, PDF, dan LaTeX — untuk kelas 1 sampai 12. Tanpa akun: semua data tinggal di peramban guru, dan model AI dipanggil langsung dengan kunci API milik guru.

Rancangan lengkap: [`docs/RANCANGAN.md`](docs/RANCANGAN.md) · Keputusan dan pertanyaan terbuka: [`docs/KEPUTUSAN.md`](docs/KEPUTUSAN.md) · Aturan agen: [`AGENTS.md`](AGENTS.md)

## Menjalankan

```bash
npm install
npm run dev          # pengembangan
npm test             # uji unit, golden set, ekspor (kompilasi .tex bila pdflatex terpasang)
npm run typecheck
npm run build        # bangun JSON kurikulum dari CSV, cek tipe, bundel PWA ke dist/
npx vite preview --port 4173 & npm run e2e   # alur ujung ke ujung dengan penyedia AI palsu
```

Deploy:

- **GitHub Pages** (uji coba): `.github/workflows/pages.yml` menjalankan uji, membangun dengan `BASE_PATH=/SKORINAS/`, menyalin `index.html` ke `404.html` agar tautan dalam berfungsi, lalu menerbitkan ke `https://hawreirei.github.io/SKORINAS/`. Sekali saja: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
- **Netlify**: `netlify.toml` (situs statis `dist/`, SPA redirect, header Content-Security-Policy).

Kebijakan keamanan konten juga disisipkan sebagai `<meta>` saat build, karena GitHub Pages tidak dapat mengirim header.

## Status MVP

| ID | Fitur | Status |
| --- | --- | --- |
| F-01 | Profil lokal dan kop sekolah | Selesai |
| F-02 | Katalog kurikulum resmi (baca saja) | Selesai; CP/TP Matematika fase A–C masih draf, lihat KEPUTUSAN |
| F-03 | Formulir Buat soal satu halaman dan preset | Selesai |
| F-04 | Komposisi tiga kategori, sisa terbesar | Selesai; diuji untuk semua n 5–50 dan semua kelipatan 5 |
| F-05 | PG, isian singkat, benar-salah, uraian | Selesai |
| F-06 | Generasi JSON terstruktur lewat adaptor | Selesai: Gemini, OpenRouter, Groq, Mistral, OpenAI, Anthropic |
| F-07 | Verifikasi hitung, kaidah butir, duplikasi, status mutu | Selesai (Matematika); rumpun lain berstatus perlu telaah |
| F-08 | Sepuluh templat gambar terprogram | Selesai; SVG di layar/PDF, PNG 300 dpi di Word, TikZ di LaTeX |
| F-09 | Sunting, kunci, ganti, buat ulang per butir | Selesai |
| F-10 | Kisi-kisi, kunci, pembahasan otomatis | Selesai |
| F-11 | Unduh Word, PDF, LaTeX dari peramban | Selesai; tampilan cetak sebagai cadangan |
| F-12 | Cadangan .gensoal, pengingat, penyimpanan persisten | Selesai |
| F-13 | Telaah mandiri, gerbang ekspor | Selesai |
| F-14 | Kunci API milik guru, uji kunci, peringatan biaya dan privasi | Selesai |
| F-15 | CP dan TP ditulis di formulir, TP kustom berversi | Selesai |
| F-16 | Registri model berlencana + daftar langsung penyedia | Selesai; golden set per model belum dijalankan dengan kunci asli |
| F-17 | Bantuan di layar terkait | Selesai; video belum direkam, langkah teks tampil |

## Struktur

Lihat peta modul di [`AGENTS.md`](AGENTS.md). Data kurator ada di `data/sumber/*.csv` (dibangun ke `public/kurikulum` oleh `npm run kurikulum`), golden set di `data/golden/`, registri model di `public/models/registri.json` (diperbarui oleh `npm run uji-model -- --tulis`).
