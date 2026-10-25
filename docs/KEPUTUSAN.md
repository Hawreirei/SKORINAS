# Keputusan dan pertanyaan terbuka

Catatan ini melengkapi `docs/RANCANGAN.md` v0.4. Bagian "Keputusan saat membangun MVP" mencatat pilihan yang dibuat ketika rancangan belum rinci; bagian "Perlu diputuskan" menunggu keputusan pemilik produk.

## Perlu diputuskan (dari rancangan)

- [ ] Urutan mata pelajaran yang dibuka setelah Matematika (usul: IPAS, Bahasa Indonesia, Bahasa Inggris).
- [ ] Penyedia AI MVP. Kode sudah mendukung keenamnya; yang perlu diputuskan adalah mana yang diuji golden set dan ditampilkan lebih dulu.
- [ ] Harga dan bentuk lisensi sekali bayar, batas perangkat per kode (F-19, V1).
- [x] Apakah PDF boleh berbeda tampilan dari hasil kompilasi LaTeX. Diputuskan v0.4: Word dan PDF mengikuti pakem penulisan soal (Times New Roman 12); .tex memakai templatnya sendiri di menu lanjutan.

## Perlu diverifikasi sebelum rilis

- [ ] **Lisensi font PDF.** PDF menanam Liberation Serif 2.1.5 (SIL OFL 1.1, metrik sama dengan Times New Roman; lisensi di `public/fonts/OFL-LiberationSerif.txt`), bukan Times New Roman yang berlisensi Monotype. Cek ulang sebelum rilis bahwa pengganti ini dapat diterima; Word tetap memakai nama font Times New Roman dari komputer guru.
- [ ] **Uji dengan 3 orang awam** (saran 8): catat titik berhenti mereka, lalu koreksi urutan dan istilah.
- [ ] **Registri model** (`public/models/registri.json`): nama model mengikuti rancangan; ID tepat, harga, dan batas gratis harus diverifikasi. Semua harga masih `null` (biaya tampil "belum diketahui"). Belum ada model berlencana direkomendasikan karena golden set per model belum dijalankan: `GEMINI_API_KEY=… npm run uji-model -- --penyedia gemini --tulis`.
- [ ] **Akses peramban (CORS)** tiap penyedia diuji dengan kunci asli. Adaptor memanggil langsung dari peramban; penyedia yang menolak hanya dapat didukung lewat proxy V1 (F-27).
- [ ] **Video bantuan** belum direkam; `src/bantuan/daftar.ts` berisi `youtube_id: null` dan langkah teks tampil sebagai pengganti di halaman Bantuan.

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
| Ekspor di Web Worker | Belum. Ekspor berjalan di utas utama dengan impor dinamis | svg2pdf dan kanvas SVG→PNG memerlukan DOM; 12 soal bergambar terunduh dalam sekitar satu detik pada uji Chromium. Pindahkan pembuatan docx ke worker bila pilot menunjukkan layar membeku |
| Ukuran font | Word dan PDF Times New Roman 12 pt (v0.4); LaTeX tetap 14 pt | Rancangan v0.4; .tex tidak memengaruhi Word dan PDF |
| Font PDF | Liberation Serif Regular, Bold, Italic ditanam (`public/fonts`, OFL) | Times New Roman berlisensi; Liberation Serif bermetrik sama. Glif yang tidak ada (∠, △, ∥, ∈, ⊥, ✓, dll.) diganti tulisan setara di `src/ekspor/pdf-tata.ts` |
| Batas biaya | Peringatan ditampilkan bila perkiraan biaya hari ini melewati angka yang diatur guru; generasi tidak dihentikan | "Peringatan pada angka yang diatur guru" |
| Pembuatan dari tab | Satu pengatur per tab; tab tertutup → pekerjaan dijeda dan dilanjutkan dari butir terakhir tersimpan | Rancangan alur generasi |
| Hosting uji coba | GitHub Pages lewat GitHub Actions di sub-jalur `/SKORINAS/` (`BASE_PATH`); semua jalur aset memakai `import.meta.env.BASE_URL`; tautan dalam dilayani `404.html` | Diminta pemilik sebelum Netlify. Pages tidak punya rewrite dan tidak dapat mengirim header |
| CSP di Pages | Disisipkan sebagai `<meta http-equiv>` saat build; `frame-ancestors` hanya berlaku lewat header Netlify | Kunci API di peramban perlu kebijakan yang ketat di hosting mana pun |
| Batas pemakaian penyedia (429) | Batas per menit: tunggu sesuai permintaan penyedia (RetryInfo, retry-after; maks. 2 menit, 8 kali berturut-turut) lalu lanjut sendiri. Kuota harian: pindah otomatis ke model cadangan (F-18, dimajukan dari V1); bila tidak ada, jeda dengan pesan berbahasa Indonesia dan jam pulihnya kuota Gemini. Pesan asli penyedia ada di "Rincian" | Kuota gratis Gemini kecil sehingga satu paket sering terhenti di tengah; uji coba guru tidak dapat menunggu V1 |
| Batas laju (RPM/RPD) | Setiap permintaan ke AI melewati pembatas laju: jendela geser 60 detik untuk RPM (atas waktu kirim, termasuk permintaan yang gagal), dan hitungan permintaan sejak awal hari kuota untuk RPD (Gemini: tengah malam waktu Pasifik). Angka bawaan di registri (Gemini 5/20 sesuai dasbor AI Studio pemilik; OpenRouter gratis 20/50; Groq 30/1000), dapat diubah guru per model di Pengaturan AI. RPD habis diperlakukan seperti kuota harian: pindah ke cadangan atau jeda | Menghindari galat 429 alih-alih hanya menanganinya; angka resmi berbeda per akun dan berubah, jadi guru dapat menyamakannya dengan dasbor |

## Penerapan rancangan perubahan v0.4 (24 Oktober 2026)

Bagian rancangan perubahan, pembaruan 24 Oktober, dan kanvas desain v0.4 tidak selalu sejalan. Pilihan di bawah dibuat agar pekerjaan dapat berjalan; baris bertanda **Perlu dikonfirmasi** menunggu keputusan pemilik produk.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Letak navigasi | Menu atas (Beranda, Buat soal, Soal saya, Pengaturan AI, Cadangan) di atas garis kuning; tidak ada kolom navigasi biru tua di kiri. **Perlu dikonfirmasi** | Pembaruan 24 Oktober: "Menu atas dan tata letak mengikuti versi yang disukai" (kanvas). Ini bertentangan dengan aturan "Kolom 1 navigasi di kiri" dan "Cadangan dan Pengaturan AI pindah ke menu di pojok"; pembaruan terbaru yang dipakai |
| Warna | Putih, biru #2563EB, kuning #FACC15 sebagai ornamen; merah hanya untuk hapus dan batal; hijau dan kuning-oranye hanya untuk penanda status dan langkah (dengan kata dan ikon) | Pembaruan 24 Oktober dan tabel palet |
| Kanvas vs dokumen | Dari kanvas diambil tata letak, kartu berpita, nomor kelompok kuning, penunjuk langkah. Dari dokumen diambil istilah baru, penghapusan orbit dan label huruf besar berjarak lebar, font Nunito Sans, golden set tidak tampil, bantuan tidak di layar kerja | Kanvas masih memakai istilah lama (Generate, Peninjauan, Ekspor, Terverifikasi), orbit, dan tombol "Tonton caranya" yang secara tegas dihapus dokumen |
| Maksimal 3 kartu per layar | Layar Buat memakai 4 kartu (Pengaturan tersimpan hanya tampil bila sudah ada) seperti kanvas. **Perlu dikonfirmasi** | Kanvas dan pembaruan 24 Oktober menyebut 5 kelompok; aturan 3 kartu tidak dapat dipenuhi bersamaan |
| Isian wajib dan TP | Wajib: kelas, topik atau mapel, jumlah soal. CP dan TP boleh kosong: tanpa TP soal dibuat dari CP; tanpa keduanya dari "Materi {mapel} kelas {n}" | "3 isian wajib" sekaligus "soal dibuat dari kelas, mapel, CP, dan TP yang diisi" |
| Rumpun mapel | Ditebak dari nama mapel (`rumpunDariMapel` di `src/paket/index.ts`); mapel tak dikenal → soal "Mohon cek dulu" | Pilihan rumpun tidak lagi ada di layar; rumpun tetap menentukan pemeriksa |
| Fase | Dihitung dari kelas (`src/kurikulum/fase.ts`) hanya untuk prompt dan batas keterbacaan | Bukan data CP/TP; fase tidak tampil di layar Buat |
| Penghapusan data kurikulum | `public/kurikulum`, `data/sumber`, skrip `npm run kurikulum`, layar Kurikulum, pemilih TP resmi, dan toko `tp_kustom` dihapus. Dexie versi 2 menghapus `tp_kustom` dan menambah `cara_bs` pada preset dan paket; cadangan lama tetap dapat diimpor (toko `tp_kustom` dilewati) | Pembaruan 24 Oktober; TP yang dipakai sudah tersalin di paket dan soal |
| Satu penanda per soal | Disetujui > Mohon cek dulu > Jawaban sudah dicek, dihitung dari status mutu dan status telaah yang tetap terpisah. Tombol Setujui ada di semua soal; unduhan hanya dihalangi soal "Mohon cek dulu" yang belum disetujui. Ada "Setujui semua yang sudah dicek" | Dokumen: satu penanda dan satu tombol Setujui |
| Kunci (lock) per butir | Tombol Kunci tidak ditampilkan lagi; soal lama yang terkunci menampilkan "Buka kunci" | Kanvas tidak memuatnya; layar disederhanakan |
| Penunjuk langkah | "Langkah n dari 3" dengan Buat (biru), Periksa (kuning-oranye), Unduh (hijau) di layar Buat, Periksa, Unduh | Dokumen bagian Alur dan palet |
| Ukuran teks | Teks dan label minimal 16 px; judul halaman 30–36 px; judul kartu 20–22 px. Pratinjau lembar soal di layar Unduh memakai ukuran kecil karena miniatur halaman | Dokumen menyebut "judul 24 px"; judul halaman dibuat sedikit lebih besar agar hierarki terbaca |
| Pakem: opsi PG | 2 kolom bila opsi terpanjang ≤ 30 huruf, selain itu 1 kolom | "2 kolom bila pendek, 1 kolom bila panjang" |
| Pakem: isian | Kotak bila kunci berupa bilangan (termasuk pecahan dan satuan pendek) atau soal cerita (> 25 kata); selain itu titik-titik | Pakem isian dan aturan umum 4 |
| Pakem: garis uraian | Jumlah garis = jumlah skor rubrik dalam kurung, dibatasi 2–6 | "Jumlah garis mengikuti bobot (2 sampai 6)"; bobot belum punya kolom sendiri |
| Pakem: jenis uraian | AI mengisi `jenis_uraian`; bila kosong ditebak dari verifikasi (tidak dapat dihitung → penjelasan). Guru mengubahnya di layar Periksa tanpa mengubah status soal | Aturan umum 6 |
| Pakem: benar-salah | Cara menjawab (centang kotak atau lingkari B/S) dipilih per paket di Pengaturan lanjutan, bawaan centang | Pakem dan kanvas "Pilihan di pengaturan lanjutan" |
| Ukuran 12 pt | Semua isi, tabel, kunci, pembahasan, dan kisi-kisi 12 pt. Jejak berkas dan nomor halaman PDF 9–10 pt | Jejak dan nomor halaman bukan isi soal |
| Rumus di Word | Office Math memakai font rumus Word (Cambria Math) pada ukuran 12 pt | Office Math tidak mengikuti font gaya dokumen |
| Tampilan cetak | Mengikuti pakem dan font yang sama dengan Word/PDF, 12 pt, tepi 2 cm | Cadangan bila PDF gagal |
| Bantuan | Halaman /bantuan tetap ada (kaki halaman dan menu ponsel); langkah memasang kunci tetap sebagai bagian lipat di Pengaturan AI | Saran 7: dihapus dari layar kerja; video "tetap boleh dibuat" |
| Mode gelap | Tetap tersedia dengan palet setara | Pengaturan profil yang sudah ada |
| Jumlah soal | Diketik langsung (5–50), tanpa tombol tambah-kurang; angka di luar batas diberi pesan dan dirapikan saat kolom ditinggalkan | Permintaan pemilik (25 Oktober): tombol terlalu rumit |
| Berkas terpisah | Lembar soal, kunci jawaban, dan kisi-kisi menjadi tiga berkas terpisah dengan akhiran nama `-Kunci-Jawaban` dan `-Kisi-kisi`; pembahasan ikut berkas kunci. Satu tombol mengunduh semua berkas terpilih berurutan, dan tiap berkas punya tombol "Unduh ini saja" bila peramban menolak unduhan beruntun | Permintaan pemilik (25 Oktober) |
| Baris jejak berkas | Baris "GenSoal versi · versi soal · … · dibuat dengan bantuan AI · tanggal" dihapus dari Word, PDF, .tex, tampilan cetak, dan properti berkas | Permintaan pemilik (25 Oktober); mengubah butir "Transparansi" rancangan |

## Penyederhanaan tampilan (25 Oktober 2026)

Permintaan pemilik: beberapa tampilan terlalu repot. Rancangan lengkap, temuan, dan alasan per layar ada di `docs/PENYEDERHANAAN-UI.md`. Baris di bawah mengubah sebagian "Arah visual" dan "Aturan layar" rancangan v0.4.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Nomor kelompok kuning | Tidak dipakai lagi (dahulu 00–04 di Buat dan Pengaturan AI). Pita warna kartu tetap; Pengaturan AI memakai "1. 2. 3." biasa | Hiasan tanpa fungsi navigasi; layar Buat kini hanya dua kartu |
| Layar Buat | Kelas, mapel, dan jumlah soal satu kartu; CP dan TP satu kartu; Pengaturan tersimpan berupa satu pilihan di atas formulir; "Simpan pengaturan ini" pindah ke Pengaturan lanjutan; bilah bawah hanya ringkasan, Batal, dan Buat | Tiga isian wajib terlihat sebagai satu kesatuan; bilah bawah tidak lagi padat |
| Komposisi kesukaran | Pilihan cepat Bawaan 30/50/20, Lebih mudah 50/40/10, Lebih sulit 20/50/30, dan "Atur sendiri" (tombol tambah-kurang lama) | Kebanyakan guru memakai bawaan; tetap dapat diatur per 5% |
| Kartu soal di Periksa | Terlihat: Setujui, Sunting, dan menu Lainnya (Ganti soal, Buat ulang dengan catatan, Hapus soal). Pembahasan, rubrik, dan catatan pemeriksaan dilipat untuk soal yang sudah dicek, terbuka untuk "Mohon cek dulu". Lencana "Kunci: X" pilihan ganda diganti tanda "✓ Kunci" pada opsi | Enam tombol per soal membuat halaman 9.700 px di ponsel |
| Saringan Periksa | "Semua" dan "Mohon cek dulu" (hanya bila ada), ditambah "Ditolak otomatis" bila ada. "Belum disetujui" dihapus | Soal yang sudah dicek boleh diunduh tanpa disetujui; saringan itu menyesatkan |
| Periksa di ponsel | Kartu Status paket diganti bilah bawah tetap berisi ringkasan dan "Lanjut ke Unduh" | Langkah berikutnya tidak lagi di ujung halaman |
| Layar Unduh | Format Word/PDF dua tombol bersebelahan; berkas tiga kotak centang; "Unduh ini saja" menjadi satu tombol di panel pratinjau untuk berkas yang sedang dipratinjau | Empat tombol unduh menjadi dua; cadangan unduhan satu berkas tetap ada |
| Pengaturan AI | Bila kunci sudah berfungsi: kartu "Siap dipakai" dengan pilihan model dan tombol "Ganti penyedia atau kunci". Model cadangan dan batas RPM/RPD pindah ke Pengaturan lanjutan | Guru yang sudah siap tidak perlu melihat tiga langkah lagi |
| Cadangan | Satu kartu: ringkasan data, "Unduh berkas .gensoal" (utama) dan "Pulihkan dari berkas". Daftar pengaturan tersimpan dan Hapus semua data dilipat | Aksi utama menonjol; aksi berbahaya tidak sejajar dengan aksi sehari-hari |
| Kepala | "Tersimpan di perangkat ini" hanya di kaki halaman | Pengulangan |

## Rancangan UI/UX v0.5 (25 Oktober 2026)

Rancangan dan tahap kerja ada di `docs/RANCANGAN-UI.md` (issue induk #1).

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Persetujuan guru | Dihapus: tombol Setujui, "Setujui semua yang sudah dicek", penanda "Disetujui", dan gerbang unduh (F-13). Soal yang lolos pemeriksaan langsung siap diunduh | Keputusan pemilik: langkah persetujuan terasa merepotkan |
| Penanda status per soal | "Jawaban sudah dicek" dan "Mohon cek dulu" tidak tampil lagi sebagai lencana, saringan, atau halaman `/telaah`. Soal `perlu_telaah` hanya diberi satu kalimat "Kunci tidak dicek otomatis. Baca sekali sebelum dipakai." | Keputusan pemilik. Kalimat itu dipertahankan agar guru tetap tahu soal mana yang kuncinya tidak dihitung ulang, tanpa menambah langkah |
| Tabel istilah wajib | Diganti aturan singkat "Bahasa di layar": bahasa sehari-hari, tanpa kata teknis atau bahasa Inggris di label utama. `AGENTS.md` butir 8 disesuaikan | Keputusan pemilik |
| Penunjuk "Langkah n dari 3" | Dihapus bersama warna per langkah. Halaman paket menaruh tombol Unduh di kepala; layar Unduh punya tautan kembali | Keputusan pemilik |
| Data status | `status_mutu` dan `status_telaah` tetap disimpan; tidak ada versi Dexie baru | Cadangan lama tetap terbaca; status mutu masih dipakai untuk kalimat keterangan dan kisi-kisi |

## UI-01 Fondasi tampilan (issue #2)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Utilitas bersama | `kartu`, `pita-*`, `tombol`, `tombol-utama/garis/hantu/bahaya`, `bidang`, dan `kertas` di `src/index.css` (`@utility`), memakai token v0.4. `Kartu` dan `kelasTombol` memakai utilitas ini | Satu sumber gaya; tahap berikutnya tidak menyalin kelas mentah |
| Warna pita kartu | Diatur lewat variabel `--pita` (kelas `pita-utama`, `pita-kuning`, …), bukan `border-t-4 border-t-*` | Urutan kelas Tailwind tidak dapat menimpa tebal pita |
| `bidang` sebagai utilitas | Dahulu CSS biasa di luar lapisan Tailwind, sehingga kelas tambahan seperti `font-extrabold text-judul` pada kotak jumlah soal tidak pernah berlaku. Kini berlaku: angka jumlah soal tampil tebal dan biru tua sesuai kelas yang sudah tertulis | Perilaku yang dimaksud kode; satu-satunya perubahan tampilan yang terlihat di tangkapan e2e |
| Tema tanpa kedipan | `public/tema.js` dimuat tanpa `defer` di `<head>` lewat `%BASE_URL%tema.js`, membaca cermin `localStorage` `gensoal:tema`. Cermin ditulis `terapkanTema()` (dipanggil saat aplikasi dibuka, saat tema diubah, setelah pulihkan cadangan, dan setelah hapus semua data). Profil di IndexedDB tetap sumber utama; bila cermin kosong atau `localStorage` ditolak, perilaku lama berlaku | Skrip sebaris ditolak CSP `script-src 'self'`; berkas terpisah tidak memerlukan pelonggaran CSP |
| Angka tabular | `tabular-nums` pada isian angka (lewat `bidang`), jumlah dan komposisi soal, biaya, kuota, hitungan tab, dan ringkasan cadangan | Angka tidak bergeser saat berubah |
