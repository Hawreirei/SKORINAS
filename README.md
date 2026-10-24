# GenSoal

Aplikasi web (PWA) yang membuat soal dari kelas, mapel, CP, dan TP yang diisi guru, menghitung ulang kuncinya dengan kode, lalu menghasilkan lembar soal Word dan PDF (Times New Roman 12) — untuk kelas 1 sampai 12. Tiga layar kerja: Buat, Periksa, Unduh. Tanpa akun: semua data tinggal di peramban guru, dan model AI dipanggil langsung dengan kunci API milik guru.

Rancangan lengkap: [`docs/RANCANGAN.md`](docs/RANCANGAN.md) · Keputusan dan pertanyaan terbuka: [`docs/KEPUTUSAN.md`](docs/KEPUTUSAN.md) · Aturan agen: [`AGENTS.md`](AGENTS.md)

## Menjalankan

```bash
npm install
npm run dev          # pengembangan
npm test             # uji unit, golden set, ekspor (kompilasi .tex bila pdflatex terpasang)
npm run typecheck
npm run build        # cek tipe, bundel PWA ke dist/
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
| F-02 | Katalog kurikulum resmi | Dihapus pada v0.4: guru mengisi kelas, mapel, CP, dan TP |
| F-03 | Layar Buat: 3 isian wajib, Pengaturan lanjutan, Pengaturan tersimpan | Selesai (v0.4) |
| F-04 | Komposisi tiga kategori, sisa terbesar | Selesai; diuji untuk semua n 5–50 dan semua kelipatan 5 |
| F-05 | PG, isian singkat, benar-salah, uraian | Selesai |
| F-06 | Generasi JSON terstruktur lewat adaptor | Selesai: Gemini, OpenRouter, Groq, Mistral, OpenAI, Anthropic |
| F-07 | Verifikasi hitung, kaidah butir, duplikasi, status mutu | Selesai (Matematika); rumpun lain bertanda "Mohon cek dulu" |
| F-08 | Sepuluh templat gambar terprogram | Selesai; SVG di layar/PDF, PNG 300 dpi di Word, TikZ di LaTeX |
| F-09 | Sunting, kunci, ganti, buat ulang per butir | Selesai |
| F-10 | Kisi-kisi, kunci, pembahasan otomatis | Selesai |
| F-11 | Unduh Word dan PDF (Times New Roman 12, pakem penulisan soal); LaTeX di menu lanjutan | Selesai (v0.4); tampilan cetak sebagai cadangan |
| F-12 | Cadangan .gensoal, pengingat, penyimpanan persisten | Selesai |
| F-13 | Periksa: satu penanda per soal, Setujui, gerbang unduh | Selesai (v0.4) |
| F-14 | Kunci API milik guru, uji kunci, peringatan biaya dan privasi | Selesai |
| F-15 | CP dan TP ditulis di layar Buat | Selesai (v0.4) |
| F-16 | Registri model berlencana + daftar langsung penyedia | Selesai; golden set per model belum dijalankan dengan kunci asli |
| F-17 | Halaman Bantuan (tidak di layar kerja) | Selesai; video belum direkam, langkah teks tampil |

## Struktur

Lihat peta modul di [`AGENTS.md`](AGENTS.md). Golden set ada di `data/golden/`, font PDF (Liberation Serif, OFL) di `public/fonts/`, registri model di `public/models/registri.json` (diperbarui oleh `npm run uji-model -- --tulis`).
