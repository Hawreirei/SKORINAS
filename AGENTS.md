# Aturan kerja agen AI — GenSoal

1. Baca `docs/RANCANGAN.md` sebelum mengerjakan tugas; kerjakan hanya fitur dengan ID yang diminta (F-xx).
2. Setiap perubahan skema IndexedDB lewat nomor versi Dexie baru dengan fungsi migrasi (`src/db/skema.ts`); jangan mengubah versi lama.
3. Jangan menaruh rahasia di kode atau repositori; semua melalui variabel lingkungan (lihat `scripts/uji-model.ts`).
4. Setiap pemeriksa dan templat gambar wajib punya uji unit dan sedikitnya lima kasus golden (`tests/gambar.test.ts`, `data/golden/`).
5. Fitur dianggap selesai bila: `npm test` lulus, `npm run typecheck` tanpa galat, layar diperiksa di lebar ponsel (390 px) dan laptop (`npm run e2e`), dan kriteria selesai sprint terpenuhi.
6. Bila rancangan ambigu atau bertentangan, berhenti dan catat pertanyaan di `docs/KEPUTUSAN.md`, jangan menebak.
7. Data kurikulum tidak pernah ditulis di kode; selalu dari JSON di `public/kurikulum` (dibangun dari `data/sumber/*.csv` dengan `npm run kurikulum`) atau dari IndexedDB untuk data kustom.

## Peta modul

| Folder | Isi |
| --- | --- |
| `src/app/` | Layar dan rute |
| `src/db/` | Skema Dexie, profil, cadangan .gensoal, tong sampah |
| `src/kurikulum/` | Pemuat JSON resmi, pemeriksa kualitas TP |
| `src/ai/` | Adaptor per penyedia, registri model, biaya |
| `src/generasi/` | Komposisi, rencana butir, prompt, pengatur generasi, operasi per butir |
| `src/verifikasi/` | Skema isi_json, pemeriksa hitung (mathjs), kaidah butir, kemiripan, sebaran kunci |
| `src/paket/` | Paket mata pelajaran (aturan penulisan, contoh, templat, pemeriksa) |
| `src/gambar/` | Primitif, SVG, TikZ, sepuluh templat Matematika SD |
| `src/matematika/` | Pengurai teks bercampur LaTeX dan serialisasi LaTeX |
| `src/ekspor/` | Model dokumen, Word (docx), PDF (jsPDF + svg2pdf), LaTeX |
| `src/bantuan/` | Daftar video dan langkah teks |
| `src/komponen/` | Elemen antarmuka bersama |
