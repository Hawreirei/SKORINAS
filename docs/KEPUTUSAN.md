# Keputusan dan pertanyaan terbuka

Catatan ini melengkapi `docs/RANCANGAN.md` v0.3. Bagian "Keputusan saat membangun MVP" mencatat pilihan yang dibuat ketika rancangan belum rinci; bagian "Perlu diputuskan" menunggu keputusan pemilik produk.

## Perlu diputuskan (dari rancangan)

- [ ] Urutan mata pelajaran yang dibuka setelah Matematika (usul: IPAS, Bahasa Indonesia, Bahasa Inggris).
- [ ] Penyedia AI MVP. Kode sudah mendukung keenamnya; yang perlu diputuskan adalah mana yang diuji golden set dan ditampilkan lebih dulu.
- [ ] Harga dan bentuk lisensi sekali bayar, batas perangkat per kode (F-19, V1).
- [ ] Siapa kurator data kurikulum resmi dan bagaimana validasinya.
- [ ] Apakah PDF boleh berbeda tampilan dari hasil kompilasi LaTeX. MVP: PDF dibuat langsung di peramban dengan tata letak templat bawaan, bukan dikompilasi dari LaTeX.
- [ ] Apakah kurikulum madrasah (Kemenag) masuk lingkup awal.

## Perlu diverifikasi sebelum rilis

- [ ] **Teks CP Matematika fase A–C** di `data/sumber/cp.csv` ditulis dari ingatan atas Keputusan Kepala BSKAP 032/H/KR/2024 dan **belum dicocokkan** kata per kata dengan dokumen resmi; kolom sumber_dokumen menandai "halaman belum dicocokkan". Kriteria selesai S0 mensyaratkan pencocokan oleh kurator.
- [ ] **TP resmi** di `data/sumber/tp.csv` adalah contoh rumusan berstatus `draf`. Ubah ke `tervalidasi` hanya setelah ditelaah kurator.
- [ ] **Registri model** (`public/models/registri.json`): nama model mengikuti rancangan; ID tepat, harga, dan batas gratis harus diverifikasi. Semua harga masih `null` (biaya tampil "belum diketahui"). Belum ada model berlencana direkomendasikan karena golden set per model belum dijalankan: `GEMINI_API_KEY=… npm run uji-model -- --penyedia gemini --tulis`.
- [ ] **Akses peramban (CORS)** tiap penyedia diuji dengan kunci asli. Adaptor memanggil langsung dari peramban; penyedia yang menolak hanya dapat didukung lewat proxy V1 (F-27).
- [ ] **Video bantuan** belum direkam; `src/bantuan/daftar.ts` berisi `youtube_id: null` dan langkah teks tampil sebagai pengganti.

## Keputusan saat membangun MVP

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Kunci API | Disimpan di toko IndexedDB terpisah `kunci_api`, bukan kolom `profil.kunci_api_lokal` | Pengecualian dari cadangan menjadi struktural: toko itu tidak ada di daftar ekspor |
| isi_json | Satu objek lengkap (pokok, opsi, kunci, rubrik, pembahasan, verifikasi, gambar, meta); tidak dipecah ke kunci_json dan pembahasan_json | Satu sumber untuk layar, verifikasi, dan ekspor |
| Rumus di teks soal | LaTeX sebaris `$…$`; pecahan polos `3/4` di luar rumus otomatis menjadi pecahan bertumpuk | Satu pohon sintaks untuk KaTeX, Office Math, PDF, dan LaTeX |
| Tipe verifikasi | `ekspresi`, `perbandingan`, `urutan`, `tidak_ada` | Mencakup soal hitung, tanda perbandingan, mengurutkan; sisanya perlu telaah |
| Gambar dan kunci | Ekspresi verifikasi boleh memakai variabel yang dihitung dari parameter gambar (mis. `pecahan`, `luas`, `nilai[2]`) | Gambar dan kunci dari parameter yang sama, sesuai prinsip 4 |
| Teks alternatif gambar | Selalu dihitung dari parameter, bukan dari tulisan model | Alt tidak dapat berbeda dari gambar |
| Gagal tiga kali | Butir dicatat `ditolak` (tidak tampil, ada di saringan "Ditolak otomatis"), lalu satu putaran pengganti tiga percobaan; bila tetap gagal, slot berstatus gagal dan guru dapat mencoba lagi | Rancangan menyebut "ditolak dan digantikan" tanpa batas; batas mencegah putaran tanpa akhir |
| Sebaran kunci PG | Setelah lolos, kunci dipindah ke huruf yang paling jarang dipakai dalam paket (menukar dua opsi); dilewati bila pembahasan menyebut huruf opsi | Kaidah "kunci tersebar merata" tanpa membuat ulang soal |
| Kaidah butir | Pelanggaran keras (opsi kembar, "semua benar", terlalu mirip ≥ 80%) membuat butir dibuat ulang; panjang opsi dan keterbacaan hanya catatan | Catatan gaya tidak layak menghabiskan kuota |
| Ganti butir vs Buat ulang | Ganti: butir baru dengan kategori sama. Buat ulang: butir lama dikirim bersama catatan perubahan dari guru. Keduanya dibandingkan lalu diterima atau dikembalikan | Rancangan memisahkan keduanya tanpa rincian |
| Kunci (lock) per butir | Butir terkunci tidak dapat disunting, diganti, atau dihapus | Tafsiran "kunci" pada daftar aksi F-09 |
| Suntingan guru | Diperiksa ulang dengan pemeriksa yang sama; bila hitung membuktikan kunci salah, tidak dapat disimpan. Guru dapat mengubah verifikasi menjadi "tidak dapat dihitung" agar soal menjadi perlu telaah | Prinsip 2 tetap berlaku pada suntingan |
| Bentuk soal | Beberapa bentuk boleh dipilih; bentuk dibagi bergiliran dalam tiap kategori kesukaran; urutan dokumen PG, B-S, isian, uraian | Rancangan menyebut kuota "per bentuk" tanpa rincian |
| Mapel resmi yang belum dibuka | Tampil nonaktif di formulir; guru diarahkan ke "Kustom saya" | Gerbang pembukaan mapel |
| Ekspor di Web Worker | Belum. Ekspor berjalan di utas utama dengan impor dinamis | svg2pdf dan kanvas SVG→PNG memerlukan DOM; 12 soal bergambar terunduh dalam sekitar satu detik pada uji Chromium. Pindahkan pembuatan docx ke worker bila pilot menunjukkan layar membeku |
| Ukuran font | PDF dan LaTeX 14 pt; Word 12 pt | Templat bawaan rancangan untuk PDF/LaTeX; Word mudah disunting guru |
| Font PDF | Inter Tight TTF ditanam (`public/fonts`, OFL) | Font sama dengan antarmuka; mencakup ×, ÷, ≤, ≥, ≠, π, □ |
| Batas biaya | Peringatan ditampilkan bila perkiraan biaya hari ini melewati angka yang diatur guru; generasi tidak dihentikan | "Peringatan pada angka yang diatur guru" |
| Pembuatan dari tab | Satu pengatur per tab; tab tertutup → pekerjaan dijeda dan dilanjutkan dari butir terakhir tersimpan | Rancangan alur generasi |
| Hosting uji coba | GitHub Pages lewat GitHub Actions di sub-jalur `/SKORINAS/` (`BASE_PATH`); semua jalur aset memakai `import.meta.env.BASE_URL`; tautan dalam dilayani `404.html` | Diminta pemilik sebelum Netlify. Pages tidak punya rewrite dan tidak dapat mengirim header |
| CSP di Pages | Disisipkan sebagai `<meta http-equiv>` saat build; `frame-ancestors` hanya berlaku lewat header Netlify | Kunci API di peramban perlu kebijakan yang ketat di hosting mana pun |
