# Keputusan dan pertanyaan terbuka

Catatan ini melengkapi `docs/RANCANGAN.md` v0.4. Bagian "Keputusan saat membangun MVP" mencatat pilihan yang dibuat ketika rancangan belum rinci; bagian "Perlu diputuskan" menunggu keputusan pemilik produk.

## Perlu diputuskan (dari rancangan)

- [x] **Format ujian: cakupan materi.** Diputuskan pemilik (7 November 2026, F-39): soal TKA terasa seragam, jadi cakupan kerangka asesmen TKA dan ranah OSN dibawa di `src/ujian/cakupan.ts`. Cakupan ini bukan CP atau TP sekolah: hanya dipakai bila guru mengosongkan CP dan TP, dan TP guru selalu didahulukan. AGENTS.md butir 7 tetap berlaku untuk CP dan TP.
- [x] **Bentuk "pilihan ganda kompleks kategori" (TKA).** Dibuat pada F-40 sebagai bentuk sendiri (`pilihan_ganda_kategori`): satu stimulus, 3–6 pernyataan, dua kategori, satu nomor dan satu tabel.

- [ ] Urutan mata pelajaran yang dibuka setelah Matematika (usul: IPAS, Bahasa Indonesia, Bahasa Inggris).
- [ ] Penyedia AI MVP. Kode sudah mendukung keenamnya; yang perlu diputuskan adalah mana yang diuji golden set dan ditampilkan lebih dulu.
- [ ] Harga dan bentuk lisensi sekali bayar, batas perangkat per kode (F-19, V1).
- [x] Apakah PDF boleh berbeda tampilan dari hasil kompilasi LaTeX. Diputuskan v0.4: Word dan PDF mengikuti pakem penulisan soal (Times New Roman 12); .tex memakai templatnya sendiri di menu lanjutan.

## Perlu diverifikasi sebelum rilis

- [ ] **Angka format ujian (F-35).** Dokumen resmi (Perkaban BSKAP 045 dan 047/H/AN/2025, panduan OSN Puspresnas) tidak dapat diunduh dari lingkungan pengembangan; angka di `src/ujian/index.ts` dari berita yang mengutipnya. Butir bertanda **perlu dicek** di `docs/referensi/format-ujian.md` (durasi TKA SD, banyak opsi TKA SMA, daftar mapel pilihan, OSN-K SD, jumlah soal OSN-K SMA Astronomi/Kebumian/Ekonomi/Geografi/Informatika, penilaian OSN) dicocokkan dengan dokumen resmi tahun berjalan.

- [ ] **Lisensi font PDF.** PDF menanam Liberation Serif 2.1.5 (SIL OFL 1.1, metrik sama dengan Times New Roman; lisensi di `public/fonts/OFL-LiberationSerif.txt`), bukan Times New Roman yang berlisensi Monotype. Cek ulang sebelum rilis bahwa pengganti ini dapat diterima; Word tetap memakai nama font Times New Roman dari komputer guru.
- [ ] **Uji dengan 3 orang awam** (saran 8): catat titik berhenti mereka, lalu koreksi urutan dan istilah. Siap dijalankan: tahap UI-00 sampai UI-12 rancangan UI v0.5 selesai.
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

## UI-02 Komponen formulir dan pemberitahuan (issue #3)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Letak dan nama | `src/komponen/Formulir.tsx`: `Bidang` (dengan `IsianTeks`, `IsianAngka`, `IsianPanjang`, `PilihanDaftar`), `Pilihan`, `PilihanBanyak`, `Sakelar`, `BagianLipat`, `Pemberitahuan` | Satu tempat untuk pola formulir; layar disusun ulang di UI-06, UI-08, UI-11 |
| `IsianAngka` | Teks dengan `inputMode="numeric"`, bukan `type="number"` | Sama dengan kotak jumlah soal: guru dapat menghapus lalu mengetik ulang tanpa angka dipaksa |
| Warna `Pemberitahuan` | Satu pasangan token teks/latar per nada (`WARNA_NADA`) untuk mode terang dan gelap; info memakai `--gs-head` di atas `--gs-main-soft`. Kontras diuji dari token asli `src/index.css`: terang info 9,43, awas 4,51, galat 5,30, berhasil 4,57; gelap 7,71, 8,30, 5,85, 8,24 | Satu sumber, diuji otomatis |
| `Peringatan` | Menjadi pembungkus `Pemberitahuan nada="awas"` (mendapat ikon segitiga) | Layar lama tetap jalan tanpa diubah |
| Status `BagianLipat` | Disimpan di `localStorage` `gensoal:lipat:<kunci>` bila prop `ingat` diisi | Kenyamanan per perangkat; tidak mengubah skema Dexie |
| Uji komponen | `tests/*.test.tsx` dengan lingkungan jsdom per berkas, `react-dom/client` dan `act` dari React 19, tanpa pustaka tambahan | Pola Vitest diperluas ke `.tsx` di `vite.config.ts` |
| Temuan untuk UI-12 | Teks putih di atas biru utama mode gelap (#3b82f6) berkontras 3,68 : 1, di bawah 4,5. Berlaku untuk semua tombol utama dan chip aktif di mode gelap, sudah ada sebelum UI-02 | Selesai di UI-12: token `--gs-main-fill` (#2563eb, 5,17 : 1) untuk latar berisi teks putih |

## UI-03 Peta status paket (issue #4)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Peta pusat | `src/app/status.ts`: Sedang dibuat, Menunggu batas penyedia, Dijeda, Perlu perhatian, Siap diunduh. Warna dari nada `Pemberitahuan` (info, awas, awas, galat, berhasil), jadi kontrasnya ikut teruji | Satu tempat untuk label dan warna; layar hanya memakai `LencanaStatus`, `BilahKemajuan`, dan `pitaStatus` |
| "Menjaga batas per menit" | Tetap **Sedang dibuat** (biru), bukan Menunggu | Jeda itu diatur GenSoal sendiri dan bagian normal pembuatan; **Menunggu batas penyedia** hanya saat penyedia menolak karena batas |
| Perlu perhatian | Paket dijeda karena galat kunci, model, jaringan, atau server, atau paket selesai dengan soal yang gagal dibuat. Jeda karena kuota, batas, tab ditutup, atau jeda manual tetap **Dijeda** | Galat di IndexedDB hanya berupa pesan; jenisnya dibaca dari pesan (semua pesan kuota dan batas memuat "kuota" atau "batas"), dan jenis dari pengatur di tab yang sama didahulukan. Data tersimpan tidak diubah |
| Ringkasan paket | `RingkasanPaket` ikut membawa jumlah slot gagal dan galat terakhir dari `pekerjaan_generasi`; jumlah soal pindah ke baris keterangan ("5 dari 12 soal", "12 soal · 2 gagal dibuat") | Lencana cukup berisi status |
| Pembaca layar | Bilah kemajuan `role="progressbar"` dengan `aria-valuetext` "n dari m soal selesai"; lencana dan rincian kemajuan dalam `aria-live="polite"`. Hitung mundur tidak lagi `role="status"` | Hitung mundur yang diumumkan tiap detik terlalu bising |

## UI-04 Kerangka halaman (issue #5)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Kepala lengket | Hanya di layar ≥ 1024 px (`lg:sticky`), latar kartu 90% dengan blur. Di ponsel ikut tergulir | Layar Buat dan halaman paket sudah memakai bilah bawah tetap di ponsel; dua bilah tetap memakan layar sempit |
| Tinggi kepala | Diukur dengan `ResizeObserver` di `Kepala` dan dicatat sebagai `--tinggi-kepala`; dipakai `scroll-padding-top` (lompatan ke `#soal-…`) dan `top` kartu samping halaman paket | Tidak bergantung pada angka tetap bila huruf atau isi kepala berubah |
| `KepalaHalaman` | Prop `kembali`, `label`, `judul`, `subjudul`, `aksi` (kanan di layar lebar, di bawah judul di ponsel), `besar` (beranda), dan `children` untuk isi tambahan. Semua halaman memakainya, termasuk halaman paket, Unduh, beranda, Bantuan, dan 404 | Satu pola kepala |
| Label di atas judul | Dihapus bila hanya mengulang nama menu ("Pengaturan", "Bantuan"); dipertahankan bila informatif ("Kelas 4 · Matematika", "Kelas 1–12 · tanpa akun") | Mengurangi pengulangan |
| Tautan kembali Unduh | "← Kembali ke soal"; judul paket ada di subjudul | Lebih jelas bagi guru daripada hanya judul paket |
| Tombol menu ponsel | Ikon dengan teks "Menu" / "Tutup", `aria-controls` ke menu | Mudah dikenali guru |

## UI-05 Dialog, menu Lainnya, dan konfirmasi (issue #6)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| `Dialog` | `<dialog>` bawaan dengan judul lewat `aria-labelledby`, `ukuran` sempit/sedang/lebar (480/720/1100 px), slot `kaki` untuk tombol rata kanan, fokus kembali ke pemicu, dan fokus awal ke elemen `data-fokus-awal`. Buka/tutup membaca atribut `open` | Escape dan jebakan fokus tetap dari peramban; atribut `open` juga berlaku di jsdom untuk uji |
| `MenuLainnya` | Butir `false`/`null` dilewati; fokus ke butir pertama saat dibuka; panah atas/bawah, Home, End; Escape menutup dan mengembalikan fokus ke tombol; Tab dan klik di luar menutup. Varian `ikon` ("⋯") tetap bernama lewat `aria-label` | Pola menu yang dapat dipakai dengan papan ketik; varian ⋯ untuk baris Soal saya (UI-09) |
| Konfirmasi | `PenyediaKonfirmasi` di `App` dan `useKonfirmasi()` yang mengembalikan `Promise<boolean>`. Fokus awal di Batal (garis biru); tombol aksi merah garis untuk hapus/ganti data. Kelima `window.confirm` diganti; judulnya menyebut item ("Hapus soal 12?", 'Hapus paket "…"?', 'Hapus pengaturan tersimpan "…"?', "Hapus kunci Google Gemini?", "Ganti semua data dengan isi cadangan?") dan pesannya menyebut akibat | Teks berbahasa Indonesia yang konsisten, tidak bergantung pada bahasa peramban |
| Elipsis | Tombol yang membuka dialog diberi "…": Sunting…, Ganti soal…, Buat ulang dengan catatan…, Hapus soal…, Hapus…, Hapus pengaturan ini…, Hapus kunci … dari perangkat ini…, Ganti semua data… | Guru tahu akan ada langkah berikutnya sebelum data berubah |

## UI-06 Layar Buat (issue #7)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Panel Rencana | Kolom kanan lengket di layar ≥ 1024 px; di ponsel bilah bawah dengan ringkasan, tombol "Rincian" yang membuka isi panel, Batal, dan tombol utama. Isinya: kelas · mapel · n soal, pembagian kesukaran, bentuk soal, permintaan AI (n sampai ±1,3n), perkiraan waktu dari batas per menit, sisa kuota hari ini, perkiraan biaya, keterangan cek otomatis, dan daftar yang masih kurang | Guru melihat akibat isiannya sebelum menekan Buat soal |
| Perkiraan biaya | Rata-rata token per permintaan dari 200 catatan pemakaian terakhir di perangkat (bawaan 2.000 masuk / 600 keluar bila belum ada) dikalikan harga model di registri; tidak ditampilkan bila harga belum diketahui, "gratis" untuk model gratis tanpa harga. Peringatan merah bila biaya hari ini ditambah perkiraan maksimum paket melewati batas peringatan biaya | Registri belum memuat token per soal; riwayat perangkat paling dekat dengan pemakaian guru |
| Galat per isian | Kelas, mapel, jumlah soal, dan nama pengaturan tersimpan menampilkan galat tepat di bawah isian setelah ditinggalkan atau setelah tombol ditekan; fokus pindah ke isian pertama yang belum sah | Pola `Bidang` (UI-02) |
| Gerbang kunci AI | Tanpa kunci yang terpasang untuk penyedia utama, `Pemberitahuan` di atas formulir dan tombol utama berbunyi "Pasang kunci AI dulu" yang membuka Pengaturan AI. Tidak ada pengalihan paksa | Isian tidak hilang (draf) |
| Draf | `localStorage` `gensoal:draf-buat`: isian, judul, pengaturan tersimpan terpilih, dan pilihan simpan; dihapus setelah paket dibuat atau lewat "Kosongkan isian". `?ulang=` dan `?preset=` didahulukan | Tanpa versi Dexie baru; kenyamanan per perangkat |
| Komponen | Kesukaran (Bawaan, Lebih mudah, Lebih sulit, Atur sendiri) dan cara menjawab benar-salah memakai `Pilihan`; bentuk soal `PilihanBanyak`; Pengaturan lanjutan `BagianLipat` dengan status buka diingat; simpan pengaturan `Sakelar`. Petunjuk menjelaskan akibat (mis. "Lebih sulit: … pembuatan bisa lebih lama") | Komponen UI-02 |

## UI-07 Halaman paket soal (issue #8)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Satu tombol utama | Laptop: **Unduh** di kepala halaman, kartu samping tanpa tombol utama. Ponsel: Unduh di bilah bawah tetap, tombol di kepala disembunyikan. Menu Lainnya kepala halaman (Ubah judul…, Buat paket serupa) tampil di semua lebar dan terbuka ke bawah | Tepat satu tombol pekat di setiap lebar layar (diuji e2e) |
| Navigasi nomor soal | Laptop: kisi lima kolom di kartu samping yang lengket ("Lompat ke soal"), dengan biaya AI di bawahnya. Ponsel: baris yang dapat digeser di atas daftar. Nomor soal yang kuncinya tidak dicek otomatis bertitik kuning-oranye dan berlabel "Soal n, kunci tidak dicek otomatis". Klik menggulir halus (atau langsung bila pengguna memilih gerak dikurangi) dan memindah fokus ke kartu soal | Kartu samping sudah lengket di laptop; deret di atas daftar akan ikut tergulir |
| Ubah judul | Dari menu Lainnya; formulir di bawah judul dengan Simpan dan Batal | Tautan "Ubah judul" di samping judul dihapus agar kepala halaman bersih |
| Jeda | "Jeda dan simpan", berubah menjadi "Menjeda…" sampai pengatur berhenti | Menjelaskan bahwa soal yang sudah jadi tetap tersimpan |
| Peringatan menutup tab | `beforeunload` hanya selama paket ini sedang dibuat di tab ini | Tab tertutup menjeda pembuatan; peringatan mencegah jeda tanpa sengaja |

## UI-08 Layar Unduh (issue #9)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Format | `Pilihan` Word · Bisa disunting / PDF · Siap cetak. LaTeX dipilih dari Menu lanjutan ("Pilih format LaTeX (.tex)") lalu ikut tampil sebagai opsi ketiga | LaTeX jarang dipakai guru; tetap mudah dikembalikan ke Word/PDF |
| Berkas | Baris ringkas: "Lembar soal (selalu)" dengan sakelar "dengan kop sekolah", "Kunci jawaban" dengan "dengan pembahasan" (petunjuk: menambah sekitar n halaman), dan "Kisi-kisi". Sub-pilihan di samping induknya pada layar lebar | Versi pertama dengan petunjuk di setiap sakelar mendorong tombol Unduh ke bawah layar laptop (tertangkap pemeriksaan e2e); hanya petunjuk yang menjelaskan akibat yang dipertahankan |
| Diingat | Format dan pilihan berkas di `localStorage` `gensoal:pilihan-unduh` | Unduhan berikutnya cukup satu ketukan |
| Umpan balik | `Pemberitahuan` berhasil di bawah tombol: "3 berkas terunduh: …"; pesan melayang hanya menyebut jumlah. Kop tanpa nama sekolah: `Pemberitahuan` info dengan tautan ke profil | Nama berkas tetap terlihat setelah pesan melayang hilang |
| Pratinjau | Tab berkas memakai `Pilihan`; lembar memakai utilitas `kertas` | Komponen bersama |

## UI-09 Soal saya (issue #10)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Saringan | `Pilihan` Semua · Belum selesai · Siap diunduh dengan jumlah, tersimpan di URL (`?status=belum`, `?status=siap`). "Belum selesai" = semua status selain Siap diunduh (sedang dibuat, menunggu, dijeda, perlu perhatian) | Tautan dapat dibagikan dan bertahan setelah muat ulang |
| Tong sampah | Tampilan tersendiri di `?tab=sampah` (judul "Tong sampah", tautan kembali), dibuka dari tautan "Tong sampah · n" di bawah daftar | Tab paket/tong sampah tidak lagi bersaing dengan saringan status |
| Baris paket | Judul tebal (seluruh baris membuka paket), keterangan "Kelas · mapel · tanggal · jumlah", `LencanaStatus`, dan menu ⋯ (Buka, Unduh, Buat paket serupa, Ubah judul…, Hapus…) | Tautan Unduh dan Hapus per baris diganti satu menu |
| Ubah judul | Dialog sempit dengan isian "Judul paket"; Enter atau Simpan menyimpan | Komponen UI-05 |
| Empty state | "Belum ada paket soal. Buat paket pertama" (tautan), "Tidak ada paket yang cocok dengan pencarian" dengan "Hapus pencarian", dan pesan per saringan | Prinsip rekap: empty state menunjukkan aksi berikutnya |

## UI-10 Beranda (issue #11)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Kartu Langkah awal | Tiga langkah bernomor: Pasang kunci AI, Buat soal pertama, Unduh soal. Langkah berikutnya diberi `aria-current="step"`, bingkai biru, dan satu tautan aksi; langkah selesai bertanda ✓ "Selesai" | Menggantikan kartu "Sebelum mulai"; guru baru melihat urutan kerja tanpa penunjuk "Langkah n dari 3" di layar kerja (v0.5) |
| Kapan selesai | Kunci: ada kunci berstatus berfungsi. Soal: ada paket (termasuk di tong sampah). Unduh: tanda per perangkat `gensoal:sudah-unduh` di `localStorage` yang ditulis setelah unduhan berhasil | Tidak menambah tabel atau versi Dexie |
| Menghilang | Kartu tidak tampil setelah ketiga langkah selesai atau setelah "Sembunyikan" (`gensoal:langkah-awal-tersembunyi`) | Beranda guru lama tetap ringkas |
| Soal terakhir | Tetap lima paket terbaru; empty state menautkan ke Buat soal | Tidak berubah |

## Beranda baru (26 Oktober, tata letak dari guru)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Tata letak | Dua kolom di layar lebar: kiri label "Kelas 1–12 · tanpa akun", judul besar bergaris kuning, tombol Buat soal dan Buka soal saya, tiga butir centang; kanan kartu biru Mulai cepat. Di bawahnya Tiga langkah, lalu Soal terakhir di samping Belum selesai dan Pintasan. Satu kolom di ponsel | Mengikuti rancangan beranda yang diberikan guru (`Beranda.pdf`); permintaan terbaru mengalahkan UI-10 |
| Mulai cepat | Kelas, mata pelajaran, dan jumlah soal ditimpakan ke draf layar Buat (`gensoal:draf-buat`), lalu "Lanjut isi CP dan TP" membuka `/soal/baru`. Hanya nilai yang terisi dan sah yang ditimpakan; isian lain di draf tetap | Tidak menambah parameter URL atau versi Dexie; layar Buat tetap memeriksa isian wajib |
| Kartu Langkah awal | Dihapus beserta `src/app/langkah-awal.ts` dan tanda `gensoal:sudah-unduh`. Pengingat kunci tetap ada di layar Buat ("Pasang kunci AI dulu") dan di Pintasan | Tidak ada di rancangan baru. "Tiga langkah" hanya penjelasan statis, bukan penunjuk kemajuan "Langkah n dari 3" |
| Baris Soal terakhir | Ikon berkas (biru bila siap, kuning bila belum), judul sebagai tautan ke paket, `LencanaStatus`, dan satu aksi: Unduh (garis) bila siap, Lanjutkan (berisi) bila belum | Seluruh baris tidak lagi satu tautan karena berisi tombol aksi |
| Belum selesai | Paket terbaru yang belum siap (di luar tong sampah) dengan bilah kemajuan "n dari N soal sudah dibuat" dan tombol "Lanjutkan membuat" (atau "Lihat kemajuan" saat sedang dibuat). Tidak tampil bila semua paket siap | Guru langsung melanjutkan pekerjaan yang tertunda |
| Tombol berisi | Beranda kini punya lebih dari satu tombol berisi (Buat soal, Lanjut isi CP dan TP, Lanjutkan, Lanjutkan membuat) | Mengikuti rancangan dari guru; pengecualian aturan "satu tombol utama per layar" khusus beranda |
| `KepalaHalaman` | Prop `besar` dihapus; beranda memakai kepala sendiri | Hanya beranda yang memakainya |

## Pengaturan lanjutan rinci dan bentuk soal baru (26 Oktober, permintaan guru)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Lingkup | Atas permintaan guru: bentuk pilihan ganda kompleks dan menjodohkan (tarik garis), jumlah per bentuk, sebaran level C1–C6, jumlah soal per TP, banyak opsi pilihan ganda, skor per bentuk, dan tata letak Pengaturan lanjutan yang lebih rapi. Soal bertumpu stimulus tetap di F-22 | Guru memilih butir ini dari daftar usulan |
| Skema | Dexie versi 3 melengkapi `parameter_json` preset dan paket dengan `jumlah_bentuk`, `sebaran_level`, `jumlah_tp`, `opsi_pg`, `skor_bentuk` bernilai null. Null berarti perilaku lama, sehingga paket lama tidak berubah. Cadangan lama dilengkapi saat diimpor | Aturan perubahan skema lewat versi baru |
| Rencana butir | Bila guru mengatur jumlah per bentuk, per level, atau per TP, kuota itu dipakai persis dan disebar selang-seling (`sebarKuota`) agar setiap bentuk mendapat campuran level dan TP. Tanpa pengaturan, rencana sama persis dengan sebelumnya (ada ujinya). Jumlah yang tidak sama dengan jumlah soal ditolak sebelum Buat ditekan | Tidak ada tebakan: total selalu terlihat ("Total 25 dari 30 soal, kurang 5") dengan tombol "Bagi rata" dan "Jadikan jumlah soal N" |
| Level C1–C6 | Sakelar "Atur per level kognitif" menggantikan tingkat kesukaran; C1–C2 dihitung mudah, C3–C4 sedang, C5–C6 sulit. Nilai awalnya diambil dari persen kesukaran saat ini | Sama dengan pemetaan level yang sudah dipakai rencana bawaan |
| Pilihan ganda kompleks | Sedikitnya dua opsi benar dan satu opsi salah; kunci disimpan "A,C". Diverifikasi dengan `ekspresi` (opsi bilangan yang bernilai sama dengan hasil) atau `per_opsi` (satu pernyataan per opsi). Opsi benar boleh bernilai sama (6/8 dan 12/16), hanya teks kembar yang ditolak. Di berkas: tata letak opsi seperti pilihan ganda dengan petunjuk "pilih semua jawaban yang benar" | Pola soal AKM dan kebiasaan sekolah |
| Menjodohkan | Satu soal berisi 3–6 butir kolom kiri (bernomor) dan kolom kanan (berhuruf) dengan 0–2 pengecoh; kunci "1-B, 2-A, 3-C". Diverifikasi dengan `pasangan` (nilai tiap butir kiri dan kanan; pasangan harus sama dan tunggal). Di berkas: dua kolom dengan titik di ujung, ruang tengah untuk menarik garis. Satu soal menjodohkan dihitung satu nomor dan satu skor | Paling sederhana untuk slot rencana dan skor per soal |
| Kemiripan | Pembanding kemiripan antarsoal menjodohkan memakai pokok ditambah kolom kiri, karena perintahnya sering sama | Mencegah penolakan palsu |
| Banyak opsi | "Otomatis" (4, atau 5 untuk kelas 10–12) seperti sebelumnya, atau 4/5 tetap. Bila diatur, soal dari AI dengan banyak opsi berbeda dibuat ulang; suntingan guru hanya diberi catatan | Guru tetap boleh menyunting sesukanya |
| Skor | Skor per soal per bentuk tercetak di akhir petunjuk tiap bagian ("Skor setiap soal 2.") dan berkas kunci jawaban mendapat tabel Pedoman penskoran (jumlah soal, skor per soal, skor maksimal, jumlah) serta rumus nilai. Skor uraian juga dikirim ke AI agar jumlah skor rubrik sama. Skor bawaan saat dinyalakan: PG 1, PG kompleks 2, B-S 1, menjodohkan 3, isian 2, uraian 5 | Panel Rencana menampilkan skor maksimal |
| Tata letak | Mengikuti contoh dari guru: satu tombol lebar "Tampilkan/Sembunyikan opsi lanjutan" (daftar isinya di kanan), lalu enam kartu lipat tertutup berjudul dan berketerangan dengan tanda + / −: Bentuk soal (jenis, jumlah per bentuk, banyak opsi, skor), Kesukaran dan TP, Gambar, Gaya dan bahasa, Teks materi, Judul dan simpan. Buka/tutup tiap kartu diingat per perangkat. Kartu berisi isian yang salah diberi tanda "Perlu diperbaiki" dan terbuka sendiri saat Buat ditekan. Setiap jumlah diatur dengan baris − angka + yang angkanya juga dapat diketik. Kelompok "Kunci dan pembahasan" serta "AI dan biaya" dari contoh tidak dibuat karena belum ada pengaturannya di layar Buat (pembahasan diatur di layar Unduh, AI dan biaya di Pengaturan AI) | Formulir panjang lebih mudah dipindai; tidak menambah pengaturan yang belum dirancang |
| Golden set | `data/golden/matematika-bentuk-baru.json`: 6 butir pilihan ganda kompleks dan 5 menjodohkan yang benar, 10 butir salah; setiap butir benar juga dimutasi menjadi varian salah-kunci | Aturan pemeriksa: uji unit dan sedikitnya lima kasus golden |

## UI-11 Pengaturan AI, Profil dan kop, Cadangan (issue #12)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Susunan | Ketiga layar memakai kartu per bagian (`KartuBagian`, judul h2) dan diakhiri kartu **Zona berbahaya** berjudul merah (`ZonaBerbahaya`, `BarisBahaya`) | Satu pola; aksi yang menghapus data selalu di tempat yang sama |
| Hapus semua data | Tombol "Hapus semua data…" membuka dialog konfirmasi yang menyebut jumlah paket dan soal. Isian "Ketik HAPUS" dihapus | Rancangan UI meminta `DialogKonfirmasi`; Batal menjadi fokus awal sehingga Enter tidak menghapus. Selain IndexedDB, simpanan `gensoal:*` di `localStorage` (draf, pilihan unduh, Langkah awal) ikut dikosongkan |
| Profil dan kop | Kartu Guru dan sekolah, Kop lembar soal (dengan pratinjau `kertas` yang memakai komponen kop yang sama dengan pratinjau Unduh, `KopLembar`), tombol Simpan profil dengan `Pemberitahuan` berhasil "Profil tersimpan." di sampingnya, dan kartu Tampilan dengan `Pilihan` Ikuti sistem · Terang · Gelap | Umpan balik di tempat; pesan hilang lagi saat isian diubah sehingga tidak menyesatkan. Galat logo tampil di bawah isiannya, bukan pesan melayang |
| Pengaturan AI | "Siap dipakai", "Kunci berfungsi · n model tersedia", galat uji kunci, dan "Belum siap" memakai `Pemberitahuan`. Pengaturan lanjutan memakai `BagianLipat` (status buka diingat). Isian angka tersimpan langsung selama sah; teks tetap milik isian sehingga dapat dikosongkan lalu diketik ulang, dengan petunjuk akibat (mis. "Pembuatan dijeda setelah sebanyak ini soal lolos dalam sehari") | Sebelumnya mengosongkan batas harian langsung menjadi 1 |
| Cadangan | Kartu Data di perangkat ini (ringkasan, unduh, pulihkan), kartu Pengaturan tersimpan dengan tombol Hapus… per baris (konfirmasi), lalu Zona berbahaya | Pengaturan tersimpan kini dapat dihapus tanpa membuka layar Buat |

## UI-12 Copy dan aksesibilitas (issue #13)

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Biru di mode gelap | Token dipisah: `--gs-main` untuk teks, tautan, garis, dan fokus (gelap #6aa8fb, 6,68 : 1 di kartu), `--gs-main-fill` untuk latar berisi teks putih (#2563eb di kedua mode, 5,17 : 1; disorot #1d4ed8). Kelas Tailwind `bg-utama-isi` | Audit menemukan #3b82f6 tidak hanya gagal dengan teks putih (3,68) tetapi juga sebagai teks tautan di kartu gelap (4,43) |
| Temuan kontras lain | Tombol garis disorot: latar `--gs-soft`, bukan biru lembut (4,24 di mode terang). Langkah aktif di Langkah awal: latar `bg-lembut`. Pesan melayang: teks warna latar di atas `--gs-head` (sebelumnya putih di biru muda pada mode gelap). Keterangan opsi terpilih `Pilihan` dan penyedia terpilih: tanpa `opacity-90` (ditemukan axe) | Semua pasangan teks dan latar minimal 4,5 : 1 |
| Uji kontras | `tests/kontras.test.ts`: delapan token teks di empat permukaan dan pasangan khusus (tombol utama, disorot, pesan melayang, galat), mode terang dan gelap, dihitung dari `src/index.css`. Penghitung bersama di `tests/bantu-kontras.ts` | Perubahan token berikutnya langsung tertangkap |
| axe-core | `axe-core` sebagai devDependency; `npm run e2e` menjalankan aturan WCAG 2.2 A/AA di delapan layar (Beranda, Buat, paket, Unduh, Soal saya, Pengaturan AI, Profil, Cadangan), mode terang dan gelap. Disuntikkan lewat `page.evaluate`, sehingga CSP `script-src 'self'` tidak perlu dilonggarkan | Hasil akhir: 0 pelanggaran di 16 pemeriksaan |
| Papan ketik | E2E menelusuri Buat, paket, dan Unduh hanya dengan Tab: setiap elemen yang difokus harus memperlihatkan garis atau bayangan fokus, tombol utama harus tercapai, lalu Enter membuka Unduh dan mengunduh berkas. Butir menu Lainnya kini bergaris fokus di sisi dalam (sebelumnya hanya latar yang nyaris tak terlihat). Fokus isian: bayangan biru 35% menggantikan biru lembut yang tak terlihat di mode gelap | Kriteria "seluruh alur bisa diselesaikan dengan papan ketik" |
| Teks kecil | Pratinjau kop di Profil kini 16 px. Pengecualian yang disengaja: miniatur halaman A4 di pratinjau Unduh (8,5–10 px) karena berupa gambar halaman; tampilan cetak ukuran penuh tersedia di Menu lanjutan | Teks layar minimal 16 px |
| Copy | Tidak ditemukan lagi Setujui, Disetujui, Mohon cek dulu, "Langkah n dari 3", atau kata generate/preset/ekspor di label. RPM dan RPD hanya di Pengaturan lanjutan dengan petunjuk akibat. Label proses: "Menyiapkan…", "Menjeda…", "Membuat berkas…", "Menguji…" | Aturan "Bahasa di layar" |
| Mode gelap di e2e | Tangkapan `14-buat-gelap`, `14-paket-gelap`, `14-unduh-gelap` lewat `emulateMedia({ colorScheme: 'dark' })` dengan tema Ikuti sistem | Mode gelap diperiksa setiap kali e2e dijalankan |

## Format ujian TKA, TKAD, OSN (F-35, 7 November 2026)

Permintaan pemilik: format untuk membuat soal TKA, TKAD, dan OSN tingkat SD sampai SMA setelah meriset atribut ujiannya. Riset: `docs/referensi/format-ujian.md`.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Letak | Satu pilihan "Format ujian (boleh kosong)" di kartu Soal yang dibuat, dikelompokkan TKA · TKAD · OSN, dengan kotak keterangan ujian asli di bawahnya. Bukan pengaturan tersimpan: guru tetap dapat menyimpan isian hasil format sebagai pengaturan tersimpan | Tidak menambah langkah; kata "preset" tidak dipakai di layar |
| Data | Parameter paket mendapat isian `ujian` (`{ id, daerah }` atau null) lewat Dexie versi 4; atribut format dibaca dari katalog `src/ujian/` saat dipakai, sehingga perbaikan angka di rilis berikut ikut berlaku untuk prompt. Id yang tidak dikenal diabaikan | Satu sumber atribut; cadangan lama tetap terbaca |
| Isian yang diisi | Kelas, mapel, jumlah soal, jumlah per bentuk, jumlah per level, banyak opsi, skor, gaya, bahasa, gambar. CP dan TP tidak disentuh | AGENTS.md butir 7 |
| Jumlah soal | Jumlah asli ujian, dibatasi 5–50 (batas layar Buat); 30 bila jumlah resmi belum pasti. Ujian > 50 soal (OSN-K SD IPA/IPS, OSN-K SMP IPS, OSN-P SD IPS) disarankan dibuat dua paket | Batas 50 dipertahankan (uji komposisi S1) |
| Ubah jumlah soal | Saat format dipakai, jumlah per bentuk dan per level dibagi ulang menurut porsinya (sisa terbesar). Selama isian belum diubah guru, pembagian memakai porsi format agar pembulatan tidak bergeser | Tanpa ini mengubah jumlah soal langsung memunculkan galat "jumlah per bentuk harus sama" |
| Level TKA | Tiga level resmi dipetakan: Pengetahuan dan Pemahaman = C1–C2, Aplikasi = C3, Penalaran = C4–C6; sebaran 6/12/12 untuk 30 soal (contoh paket). Prompt menyebut level TKA butir. Kisi-kisi tetap menulis C1–C6: kolom Level di Word dan PDF terlalu sempit (sekitar 1 cm) untuk nama level TKA; menampilkannya perlu tata kolom kisi-kisi baru (tindak lanjut) | Rencana butir dan kesukaran tetap memakai C1–C6 |
| Level OSN | C3–C6 dengan porsi 2:3:3:2; OSN-K SMA Matematika rata (soal dasar dan lanjut) | Olimpiade tidak menguji hafalan |
| Bentuk | PG → pilihan ganda; PG kompleks MCMA → pilihan ganda kompleks; PG kompleks kategori → benar-salah (lihat Perlu diputuskan); OSN pilihan jamak → pilihan ganda; isian → isian singkat | Bentuk yang sudah ada |
| TKAD | Meniru TKA SD/SMP dan menambah aturan kelokalan dengan nama daerah dari isian Daerah (kosong: konteks Nusantara umum) | Tidak ada TKAD nasional; format berbeda per dinas. 30% soal TKA SD/SMP disusun daerah dengan unsur kelokalan |
| Mapel pilihan TKA SMA | Mapel dikosongkan dan 19 mapel pilihan akademik muncul sebagai saran isian | Guru memilih mapel ujinya sendiri |
| Rumpun | "Astronomi" dan "Kebumian" kini dikenali sebagai rumpun IPA | Mapel OSN SMA; sebelumnya tidak dikenali |
| Uji | `tests/ujian.test.ts`: setiap format dapat langsung direncanakan untuk semua jumlah 5–50, angka kunci (TKA SD 19/5/6 dan 6/12/12, OSN-K SMP 25 PG skor 4), prompt TKA/TKAD/OSN, migrasi versi 4, dan cadangan. E2E memilih format TKAD di ponsel dan OSN-K SMP di laptop | AGENTS.md butir 5 |
| E2E tidak stabil | `npm run e2e` di lingkungan pengembangan gagal tidak menentu di dua langkah lama: "Mulai cepat tidak mengisi layar Buat" (kadang `#kelas` belum ada) dan, di layar Unduh, penelusuran Tab tidak mencapai tombol Unduh sehingga Enter jatuh ke tautan kaki "Profil dan kop". Langkah Mulai cepat juga gagal pada kode sebelum F-35 (dua dari dua run); layar Unduh tidak diubah F-35. Langkah format ujian, lebar ponsel 390 px, dan axe (0 pelanggaran di 16 pemeriksaan) lolos di setiap run | Diselesaikan pada F-40 (penyebab di uji, lihat F-40) |

## Opsi lanjutan v2 (F-36, 7 November 2026)

Permintaan pemilik: opsi lanjutan ditulis ulang agar lebih umum dan rinci, dan hal yang sebelumnya hanya bisa dipilih dari daftar dapat diatur sendiri.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Susunan | Sembilan kartu lipat: Susunan soal, Kesukaran/level/TP, Rincian tiap bentuk, Skor dan waktu, Gaya/bahasa/konteks, Aturan tambahan untuk AI, Gambar, Teks materi, Judul dan simpan. Komponen `src/app/OpsiLanjutanBuat.tsx`; logika isian di `src/app/isian-buat.ts` agar dapat diuji | Layar Buat tetap satu halaman; kartu tertutup secara bawaan sehingga tiga isian wajib tetap menonjol |
| Susunan per baris | Baris `{ bentuk, level, tp, jumlah }`; `tp` null berarti bergiliran. Bila dinyalakan, menggantikan jumlah per bentuk, per level, per TP, dan persen kesukaran; diisi awal dari rencana yang sedang berlaku. Butir diurutkan per bentuk lalu dari mudah ke sulit seperti sebelumnya | Bentuk paling umum: setiap pengaturan lama adalah kasus khusus susunan per baris |
| Persen kesukaran | "Atur sendiri" kini berupa tiga angka yang dapat diketik (atau ±1), harus berjumlah 100%; sebelumnya hanya ±5% yang saling menggeser | Permintaan "tidak hanya memilih yang sudah ada" |
| Banyak opsi | 3, 4, atau 5. Tiga opsi hanya sah bila guru memilihnya; tanpa pengaturan tetap 4 atau 5 | Kaidah lama tidak berubah untuk paket lama |
| Rincian tiap bentuk | Banyak jawaban benar PG kompleks (2–4, tidak boleh ≥ banyak opsi), menjodohkan 3–6 butir kiri dan 0–2 pengecoh (batas skema), jenis jawaban isian, jenis uraian. Dikirim ke AI dan diperiksa `periksaPengaturan` (butir yang melanggar dibuat ulang); jenis uraian langsung diterapkan. Suntingan guru tidak diperiksa terhadap rincian ini | Prinsip 2: soal yang tidak sesuai tidak sampai ke layar. Golden set `data/golden/pengaturan-bentuk.json` (10 patuh, 8 melanggar) |
| Skor salah | Per bentuk, bilangan yang dikurangkan untuk jawaban salah; kosong selalu 0. Hanya berlaku bila skor per soal dicantumkan. Tercetak di petunjuk bagian ("Skor setiap soal 4; jawaban salah dikurangi 1.") dan sebagai catatan di bawah pedoman penskoran | Kebutuhan OSN. Skor per level (soal dasar/lanjut OSN-K SMA Matematika) belum: perlu skor per butir |
| Waktu | `durasi_menit`, tercetak satu baris di bawah judul lembar soal (Word, PDF, LaTeX, cetak). Format ujian mengisinya dengan durasi ujian asli | Atribut ujian yang sebelumnya tidak punya tempat |
| Campuran gaya | `jumlah_gaya` (berjumlah n) disebar selang-seling ke butir; slot menyimpan `gaya`. `gaya` paket diisi gaya pertama yang dipakai agar kode lama tetap bekerja. Ganti dan buat ulang soal memakai gaya slotnya | TKA SMP: sebagian soal literasi, sebagian numerasi |
| Bahasa lain | `bahasa` = 'lain' dengan nama bahasa yang diketik. Soal ditulis dalam bahasa itu; judul bagian dan petunjuk berkas tetap berbahasa Indonesia, angka memakai kebiasaan Indonesia | Label berkas berbahasa lain perlu terjemahan yang belum ada |
| Konteks dan aturan tambahan | Konteks satu baris; aturan tambahan satu per baris (maks. 40 aturan, 500 huruf per aturan dikirim). Format ujian kini menyalin aturannya ke sini (dapat disunting, ikut paket dan pengaturan tersimpan) sehingga paket lama tidak berubah bila katalog diperbaiki; prompt format ujian hanya menambah nama format, level TKA, dan kelokalan | Menjawab temuan: aturan format sebelumnya tersembunyi dan tidak tersalin ke paket |
| Data | Dexie versi 5; semua isian baru null atau kosong berarti perilaku lama. Paket versi 4 bertanda format ujian mendapat salinan aturan formatnya saat migrasi; cadangan lama dilengkapi saat dipulihkan | AGENTS.md butir 2 |
| Uji | `tests/opsi-lanjutan.test.ts` (susunan per baris, campuran gaya, prompt, pemeriksa dan golden, tiga opsi, isian ↔ parameter, ekspor waktu dan skor salah, migrasi versi 5). E2E membuka kartu baru, menyalakan susunan per baris, mengatur pasangan dan waktu, menulis aturan tambahan, dan memeriksa "Waktu: 60 menit" di pratinjau Unduh | AGENTS.md butir 4 dan 5 |
| E2E | Seluruh alur dengan langkah baru lolos (axe 0 pelanggaran di 16 pemeriksaan, lebar ponsel 390 px); `npm run e2e` tetap gagal tidak menentu di langkah lama "Mulai cepat" (lihat F-35) | Diselesaikan pada F-40 (penyebab di uji, lihat F-40) |

## Percepatan pembuatan soal (F-37, 7 November 2026)

Permintaan pemilik: pembuatan soal terasa sangat lama; percepat sebisa mungkin dengan tetap mempertahankan batas per menit dan per hari. Penyebab yang ditemukan: butir dikerjakan satu per satu sehingga waktu tunggu jawaban model tidak terpakai, model Gemini 3 berpikir panjang secara bawaan, dan permintaan yang macet tidak punya batas waktu.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Serentak | `banyakSerentak(rpm)`: tanpa batas per menit yang diketahui 3 butir, batas < 3 per menit 1 butir, < 10 per menit 2 butir, selebihnya 3 (`MAKS_SERENTAK`). Pekerja mengambil slot dari antrean; tiap butir disimpan begitu lolos | Batas per menit tetap dijaga pembatas laju; serentak hanya mengisi waktu tunggu jawaban. Gemini gratis (5 per menit) dengan jawaban 15–30 detik sebelumnya hanya memakai 2–4 permintaan per menit |
| Batas per hari | `PembatasLaju.izin` memesan satu jatah sebelum mengirim dan mengembalikan fungsi lepas; jatah dipesan ikut dihitung bersama catatan pemakaian. `buatButir` melepas jatah setelah percobaan tercatat (atau tidak akan tercatat); pengirim melepasnya sendiri setelah 60 detik bila tidak ada yang melepas. Jeda saat menunggu jendela per menit juga melepas jatah | Tanpa pemesanan, beberapa butir yang memeriksa kuota bersamaan dapat melewati batas harian. Uji `tests/percepatan.test.ts` gagal bila pemesanan dimatikan |
| Batas harian GenSoal | Butir yang sedang dikerjakan ikut dihitung sebelum mengambil slot baru | Batas soal per hari guru tidak terlewati walau serentak |
| Model cadangan | Pindah ke cadangan hanya sekali; butir lain yang terkena kuota harian model lama langsung memakai cadangan. Soal mencatat model yang benar-benar membuatnya | Tanpa ini butir kedua menganggap cadangan juga habis |
| Kemiripan dan sebaran kunci | Konteks paket (soal lain, sebaran kunci) dibaca ulang tiap percobaan. Penyimpanan berurutan memeriksa ulang kemiripan terhadap soal yang tersimpan selama butir dibuat (terlalu mirip: ditolak lalu diganti seperti biasa) dan memindah kunci bila hurufnya bukan lagi yang paling jarang | Butir serentak tidak saling melihat sebelum tersimpan. Catatan: butir yang ditolak di tahap ini sudah tercatat lolos di pemakaian AI (sangat jarang terjadi) |
| Penalaran singkat | Registri mendapat isian `penalaran: "rendah"` untuk Gemini 3.8 Flash, 3.5 Flash, 2.5 Flash, dan GPT-OSS 120B/20B (Groq). Gemini 3 ke atas: `thinkingLevel: "low"`; Gemini 2.5: `thinkingBudget: 1024`; ala OpenAI: `reasoning_effort: "low"`. Bila penyedia menolak isian itu (400), model dicatat dan percobaan berikutnya (lewat pembatas laju) dikirim tanpa isian | Jawaban lebih cepat. Flash-Lite, Gemma, dan model yang tidak di registri tidak diubah. **Perlu dikonfirmasi** dengan golden set (`npm run uji-model`) bahwa mutu kunci tidak turun; bila turun, hapus isian `penalaran` di registri |
| Batas waktu | `ambil()` membatalkan permintaan setelah 2 menit dan melempar galat `server` (dicoba ulang, bukan dijeda) | Permintaan macet sebelumnya menahan pembuatan sampai guru menekan Jeda |
| Kemajuan di layar | `slotAktif` kini nomor kemajuan (soal selesai + 1), bukan nomor butir yang sedang dikerjakan | Dengan butir serentak, nomor butir terkecil dapat tertahan dan membingungkan |
| Tidak diubah | Angka batas per menit dan per hari di registri, jumlah percobaan (3 + 1 putaran pengganti), jeda aman 1,5 detik | Permintaan pemilik: batas dipertahankan; mengurangi percobaan menambah slot gagal |

## Beberapa butir dalam satu permintaan (F-38, 8 November 2026)

Permintaan pemilik: satu kunci API tidak sanggup membuat satu paket 30 soal dalam sehari; guru perlu beberapa paket. Penyebab: satu permintaan hanya menghasilkan satu butir, sehingga 30 soal memakan sedikitnya 30 permintaan (ditambah percobaan ulang), sedangkan Gemini gratis di registri dibatasi 20 permintaan per hari.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Kelompok | Pengatur mengambil sampai *n* slot berbentuk sama dari antrean dan memintanya dalam satu permintaan (`susunPesanKelompok`, `SISTEM_KELOMPOK`, keluaran `{"butir": [...]}` dengan `nomor`). Konteks bersama (CP, aturan penulisan, skema, aturan verifikasi, materi, soal lain) dikirim sekali; tiap butir punya baris sendiri: bentuk, kesukaran, level (dan level TKA), gaya, TP, alasan penolakan sebelumnya | 30 soal dengan 10 butir per permintaan = 3–4 permintaan. Uji: 20 permintaan menghasilkan 4 paket lengkap 30 soal dengan sekitar 7% butir ditolak |
| Banyak butir per permintaan | Registri `butir_per_permintaan`: Gemini Flash dan Flash-Lite 10, Gemma 5, Groq 3 (batas token per menit tingkat gratis kecil); model lain 5 (`BUTIR_PER_PERMINTAAN_BAWAAN`), paling banyak 10. Jawaban terpotong (finishReason MAX_TOKENS, finish_reason length, stop_reason max_tokens) atau tidak terbaca sama sekali: kelompok berikutnya untuk model itu dibuat separuhnya. Anthropic: batas keluaran 4096 + 2500 token per butir (paling banyak 32.000) | Angka belum diukur dengan kunci asli: **perlu dikonfirmasi** lewat `npm run uji-model`. Penyesuaian sendiri mencegah paket macet bila angka terlalu besar |
| Pemeriksaan | Tiap butir divalidasi skema, diverifikasi, dan diperiksa kaidahnya sendiri; butir yang sudah lolos dalam jawaban yang sama ikut dibandingkan kemiripannya. Butir yang hilang dari jawaban dianggap satu percobaan gagal. Cocokkan menurut `nomor`, lalu menurut urutan; larik di tingkat teratas juga diterima | Prinsip 2 tidak berubah: soal bermasalah tidak sampai ke layar guru |
| Percobaan ulang | Tetap 3 percobaan lalu satu putaran pengganti (3 percobaan) per slot. Butir yang perlu dicoba lagi dimasukkan ke depan antrean, sehingga ikut permintaan berikutnya bersama butir baru dan tidak memakan permintaan sendiri | Penolakan tidak lagi berarti satu permintaan tambahan per butir |
| Pemakaian dan batas harian | Satu catatan `pemakaian_ai` per permintaan dengan isian baru `jumlah_lolos` (tanpa indeks, jadi tanpa versi Dexie baru); catatan lama dihitung 1 bila lolos (`soalLolos`). Batas harian GenSoal menghitung jumlah soal lolos; kelompok terakhir dipotong agar batas itu tidak terlewati. Biaya permintaan dibagi rata ke butirnya | Batas per hari penyedia tetap menghitung permintaan; batas GenSoal tetap menghitung soal |
| Panel Rencana | Permintaan = soal ÷ butir per permintaan (maks.: ×1,3 lalu dibagi); peringatan kuota membandingkan sisa kuota dengan permintaan, bukan jumlah soal. Baris baru "Cukup untuk sekitar *n* paket seperti ini" (sisa kuota ÷ perkiraan terbanyak). Angka tunggal bila perkiraan terkecil dan terbesar sama | Guru langsung melihat berapa paket yang masih dapat dibuat hari ini |
| Tidak diubah | Ganti soal dan buat ulang per butir (`operasi.ts`) tetap satu butir per permintaan dengan prompt lama; batas per menit dan per hari; uji pengatur lama dijalankan dengan `perPermintaan: 1` | Guru membandingkan satu kandidat; uji lama tetap menguji logika per butir |

## Perbaikan pemeriksa setelah uji model (F-38, 8 November 2026)

Uji model pertama dengan kunci asli (`gemini-3.5-flash`; `gemini-3.8-flash` sedang dibalas 502/503 oleh Google) memberi 100% lolos pada 1 butir per permintaan, tetapi hanya 50–65% pada 5–10 butir per permintaan. Penolakan hampir semuanya bukan soal yang salah, melainkan bentuk yang belum dikenali pemeriksa atau tipe verifikasi yang keliru.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Satuan LaTeX | `angkaDariTeks` membaca `\text{ cm}^2`, `\mathrm{kg}`, `\,`, `m^{3}`, dan koma desimal `2{,}5`. Pangkat dianggap bagian satuan hanya bila menempel pada huruf, jadi `2^3` tetap 8 | Penolakan terbanyak: "Opsi kunci B ("$112\text{ cm}^2$") bukan bilangan" padahal soalnya benar |
| Pilihan ganda per_opsi | Pilihan ganda biasa boleh memakai `per_opsi`: tepat satu pernyataan benar dan itu milik kunci (`periksaPgPerOpsi`). Penyeimbang kunci ikut menukar pernyataan. Layar sunting menawarkan "Pernyataan per opsi" untuk pilihan ganda | Soal "pecahan yang lebih besar dari 3/5", opsi berupa kalimat perbandingan, atau opsi berupa pernyataan "4/7 < 5/8" tidak dapat dinyatakan dengan ekspresi tunggal |
| Aturan verifikasi di prompt | Dipakai mode satu butir dan kelompok: perbandingan untuk pilihan ganda HANYA bila opsinya tanda; opsi bilangan memakai ekspresi (`max`/`min`) atau per_opsi; ekspresi berisi < atau > dengan nilai "true" tidak sah; benar-salah: "nilai" adalah angka yang disebut pernyataan; isian berjawaban kata atau nama memakai tidak_ada; opsi boleh bersatuan | Kesalahan tipe yang terlihat di uji model |
| Golden set | `data/golden/matematika-satuan.json`: 9 butir benar dan 9 butir salah dari pola uji model; empat butir benar ditolak pemeriksa sebelum perbaikan | AGENTS.md butir 4 |
| uji-model | `--kelompok n`; mode kelompok memakai kesukaran yang sama dengan mode satu butir; varian salah-kunci isian bertanda perbandingan diganti tanda lain (sama dengan golden test); `RINCI=isi` mencetak soal yang ditolak dan varian salah-kunci yang lolos | Hasil sebelumnya tidak sebanding, dan satu "varian lolos" ternyata varian yang sama dengan aslinya |
| Hasil | Setelah perbaikan: `gemini-3.5-flash`, 20 butir, 10 per permintaan: JSON sah 100%, lolos pemeriksa 100%, salah-kunci ditolak 100% (sebelumnya 60–65% lolos). `gemini-3.8-flash` **perlu diuji ulang** setelah Google tidak sibuk | Sampel kecil; jalankan lagi dengan `--butir 30 --kelompok 10` sebelum menandai model direkomendasikan |

## Soal format ujian bervariasi dan berstimulus (F-39, 7 November 2026)

Permintaan pemilik: soal TKA cenderung sama dan kurang variatif; riset cakupan materinya, pastikan ada stimulus cerita, dan buat format ujian menghasilkan soal yang sangat baik. Riset cakupan: `docs/referensi/format-ujian.md`, bagian 5.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Penyebab seragam | Tanpa TP guru, semua butir paket dikirim dengan TP yang sama ("Materi Matematika kelas 6") dan tanpa arahan tema, tokoh, atau bentuk stimulus yang berbeda; model lalu mengulang topik dan pola cerita | Temuan dari prompt butir |
| Cakupan sebagai TP | Bila CP dan TP kosong dan format punya cakupan, `keParameter` memilih butir cakupan per elemen sesuai porsi (sisa terbesar) dari titik mulai acak, lalu menyimpannya sebagai TP paket bersumber `ujian` dengan jumlah per TP. Rencana butir, kisi-kisi (kolom TP), dan label "Cakupan materi …" memakai mekanisme TP yang sudah ada. Buat paket serupa dan pengaturan tersimpan tidak mengembalikan TP `ujian` ke isian, sehingga paket berikutnya memilih campuran baru | Satu mekanisme; tidak ada isian baru di layar |
| Porsi elemen | SMP Matematika 7/8/8/7 (contoh paket 30 soal); SD Matematika 5/3/2, SMA Matematika 4/7/5/3/6, bahasa 1:1 teks informasi dan fiksi, OSN rata: usulan, tidak ada angka resmi di sumber | Dapat dikoreksi di katalog tanpa mengubah data paket lama |
| Stimulus wajib | Isian parameter `wajib_stimulus` (Dexie versi 6). Format TKA dan TKAD menyalakannya, OSN tidak; guru dapat mengubahnya di kartu Gaya, bahasa, dan konteks untuk paket apa pun. Prompt meminta stimulus asli berisi semua data untuk menjawab, pertanyaan di akhir, tanpa label "Stimulus:" | Ciri utama soal TKA: berbasis stimulus |
| Pemeriksa stimulus | `periksaStimulus`: sedikitnya dua kalimat dan batas kata per jenjang (bukan bahasa SD 25, SMP 30, SMA 35; bahasa SD 50, SMP 100, SMA 130). Batas lebih rendah dari sasaran prompt (mis. bahasa SMP 180–250 kata) agar soal yang wajar tidak terus dibuat ulang. Menjodohkan dikecualikan. Golden set `data/golden/stimulus.json` (6 lolos, 6 ditolak) | Prinsip 2: soal tanpa stimulus tidak sampai ke layar |
| Variasi per butir | Slot pekerjaan menyimpan `variasi` { tema, stimulus, tokoh } yang ditetapkan saat paket dibuat: tema bergiliran personal, sosial budaya, saintifik (34 tema), 48 nama tokoh dari berbagai daerah, dan bentuk stimulus bergiliran (cerita, daftar data, percakapan, brosur, jadwal, pengamatan); diacak per paket. Ganti dan buat ulang soal memakai variasi slotnya. Konteks dari guru didahulukan atas tema; TKAD memakai nama tokoh khas daerahnya | Variasi tidak bergantung pada urutan butir serentak (F-37) |
| Kompetensi membaca | Format Bahasa Indonesia dan Inggris: Pengetahuan dan Pemahaman → pemahaman tekstual, Aplikasi → pemahaman inferensial, Penalaran → evaluasi dan apresiasi; jenis teks dari cakupan (TP), bukan dari kompetensi | Level dan kompetensi tidak pernah bertentangan |
| Keterbacaan | Paket berstimulus wajib dianggap literasi oleh kaidah keterbacaan (batas kata per kalimat × 1,5; hanya catatan) | Cerita lebih panjang kalimatnya |
| Belum | PG kompleks kategori TKA (satu stimulus, beberapa pernyataan dalam satu nomor) dan satu stimulus untuk beberapa soal masih belum ada; benar-salah berstimulus menulis stimulus lalu satu pernyataan | Bentuk baru, fitur terpisah |
| E2E | Satu run lolos penuh; run lain gagal tidak menentu di langkah lama (penelusuran Tab di layar Unduh), lihat F-35 | Diselesaikan pada F-40 (penyebab di uji, lihat F-40) |

## Pengaturan mendalam dan bentuk TKA lengkap (F-40, 7 November 2026)

Permintaan pemilik: tambahkan yang belum tercakup (PG kompleks kategori, satu bacaan untuk beberapa soal, skor per soal yang berbeda) dan buat pengaturan lebih mendalam serta dapat diatur seluruhnya.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| PG kompleks kategori | Bentuk `pilihan_ganda_kategori`: `pokok` berisi stimulus dan perintah, `pernyataan` 3–6 butir, `kategori` dua label (bawaan Benar/Salah), kunci baku "B-S-B" (B = kategori pertama, S = kedua; membaca juga label, Y/T, 1/2). Verifikasi `per_pernyataan` menghitung tiap pernyataan (benar = kategori pertama); kategori bukan benar/salah (mis. Fakta/Opini) memakai `tidak_ada` dan menjadi "kunci tidak dicek otomatis". Kaidah: pernyataan kembar ditolak, satu kategori saja hanya catatan. Berkas: tabel No, Pernyataan, dua kolom kategori (Word, PDF, LaTeX, cetak); kunci "1. Benar; 2. Salah; …". Golden `data/golden/kategori.json` (5 benar, 5 salah, ditambah setiap kunci dibalik satu per satu) | Bentuk resmi TKA; sebelumnya diganti benar-salah satu pernyataan |
| Format TKA | Porsi bentuk 19 PG, 5 PG kompleks, 6 PG kompleks kategori; format Bahasa TKA dan TKAD memakai bacaan bersama 3 soal | Mendekati paket TKA |
| Bacaan bersama | `soal_per_bacaan` (2–5). Saat paket dibuat, slot berurutan dalam satu bentuk dikelompokkan; sisa satu soal bergabung ke kelompok sebelumnya; benar-salah (satu tabel per bagian) dan menjodohkan tidak dikelompokkan. Anggota memakai TP dan variasi ketua. Bacaan dibuat sekali per kelompok dengan permintaan AI tersendiri (`src/generasi/bacaan.ts`, sedikitnya 1,5 × batas stimulus), dicegah ganda saat butir serentak, disimpan di `pekerjaan_generasi.bacaan`, lalu disalin ke `isi_json.stimulus` tiap anggota. Prompt anggota memuat bacaan dan meminta pokok berisi pertanyaan saja dengan aspek berbeda. Berkas mencetak bacaan sekali: "Bacalah teks berikut untuk menjawab soal nomor a–b." Menyunting bacaan di satu soal mengubah semua soal kelompoknya | Seperti TKA; hemat token karena bacaan tidak ditulis ulang tiap soal |
| Skor per kesukaran | `skor_kesukaran` {mudah, sedang, sulit} × {benar, salah} menggantikan skor per bentuk. Skor tiap soal tercetak di akhir pokoknya ("(2 poin)"; tidak pada tabel benar-salah), petunjuk bagian menyebut "Skor tiap soal tertera di akhir soal.", pedoman penskoran per tingkat dengan catatan pengurangan, dan rubrik uraian mengikuti skor tingkatnya | OSN-K SMA Matematika: soal dasar 2, lanjut 4, salah −1 |
| Cakupan materi | Kartu tampil bila format ujian dipakai tanpa CP dan TP: centang butir dan atur porsi elemen (`cakupan_pilih`); elemen tanpa butir atau berporsi 0 dilewati. Tanpa butir dicentang atau porsi nol semua: galat | Guru memilih materi ujian sendiri |
| Variasi dan panjang | `variasi_sendiri` (tema, tokoh, bentuk stimulus; kosong = bawaan) dan `panjang_stimulus` (sasaran persis; pemeriksa 70% dari minimal) | Bawaan tetap ada; guru dapat menggantinya |
| Lembar soal | `urutan_bentuk` (urutan rencana butir dan bagian berkas; bentuk yang tidak disebut menyusul), `petunjuk_bagian` per bentuk (kosong = bawaan), `gaya_pembahasan` (singkat, langkah demi langkah, Diketahui–Ditanya–Dijawab) | Pakem tetap sebagai bawaan |
| Data | Dexie versi 7; semua isian baru null berarti perilaku lama | AGENTS.md butir 2 |
| E2E tidak stabil | Penyebabnya di uji, bukan aplikasi: judul beranda ("Buat soal yang kuncinya sudah dicek") juga cocok dengan `h1:has-text("Buat soal")`, dan layar Buat serta Unduh dimuat belakangan, sehingga uji membaca isian atau menekan Tab sebelum layar tujuan tampil. Uji kini menunggu isian layar Buat terisi dan tombol Unduh tampil. Tiga run berturut-turut lolos penuh | Kriteria AGENTS.md butir 5 |
| Belum | Bacaan bersama lintas bentuk (pakem mencetak per bagian bentuk); skor per butir yang diketik satu per satu | Perlu tata letak berkas per bacaan |

## Audit format ujian (F-41, 8 November 2026)

Laporan pemilik: paket TKA SD Matematika hanya berisi soal desimal dan pecahan; CP, TP, dan materi TKA resmi seolah tidak masuk. Diminta memeriksa semua format.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Penyebab | (1) Cakupan materi, stimulus, dan variasi (F-39, F-40) belum digabung ke main, jadi aplikasi yang terpasang mengirim TP kosong. (2) Sejak F-38 paket dibuat lewat `susunPesanKelompok`, yang belum membawa fitur itu. (3) Empat dari lima contoh acuan Matematika bertopik pecahan, dan aturan pengecoh hanya menyebut kesalahan pecahan, sehingga model menganggap soal Matematika = soal pecahan | Temuan audit kode |
| Prompt kelompok | Membawa TP tiap butir dengan perintah "setiap butir mengukur TP pada barisnya sendiri", aturan stimulus wajib sekali, tema/bentuk stimulus/tokoh per butir di daftar butir, bacaan bersama sekali per kelompok (Bacaan A, B, …) dengan butir "pokok hanya pertanyaan", kompetensi membaca per butir (format bahasa TKA/TKAD), skor uraian per kesukaran, dan gaya pembahasan | Kelompok dan satu butir kini setara |
| Contoh acuan | Matematika: 13 contoh beragam topik (bilangan cacah, KPK, pecahan, luas gabungan, volume, waktu, rata-rata, data, uang) termasuk PG kompleks kategori dan uraian; dipilih bergiliran menurut nomor butir. Judul bagian menegaskan topik mengikuti TP. Uji memastikan setiap contoh yang dapat dihitung lolos pemeriksa | Contoh tidak lagi menarik semua soal ke satu topik |
| Cakupan baru | TKA SMA mapel pilihan (18 nama mapel di daftar saran, dicocokkan dengan nama yang diisi guru), OSN-K SMA Fisika, Kimia, Biologi, Informatika, Astronomi, Kebumian, Ekonomi, Geografi; IPA dan IPS OSN-K SMP dipisah dari SD. TKA SD Matematika ditambah penaksiran, satuan volume, tabel frekuensi. Rincian dan tingkat kepastian: `docs/referensi/format-ujian.md` bagian 5 | Sebelumnya format itu tanpa cakupan, sehingga tanpa TP soal dibuat dari nama mapel saja |
| Tampil di layar | Kartu CP dan TP menampilkan "Materi yang dipakai" per elemen dengan banyak soal dan butirnya bila CP dan TP kosong; mapel pilihan tanpa nama yang dikenal mendapat ajakan memilih dari daftar atau mengisi TP | Guru melihat bahwa materi ujian sudah masuk sebelum membuat paket |
| Bacaan bersama | TP tiap kelompok bacaan bergiliran atas semua TP paket (TP dengan soal terbanyak lebih dulu), bukan TP soal pertama kelompok | Format bahasa SD sebelumnya hanya memakai 5 dari 9 jenis teks |
| Tidak diubah | Cakupan tetap bukan CP/TP sekolah dan hanya dipakai bila CP dan TP kosong (AGENTS.md butir 7, keputusan F-39); porsi selain Matematika SMP tetap usulan | **Perlu dikonfirmasi** dengan Perkaban BSKAP 045 dan 047/H/AN/2025 bila dokumennya dapat dibuka |

## Penyesuaian dengan dokumen resmi TKA (F-41, 9 November 2026)

Pemilik mengunggah Permendikdasmen 9/2025 (TKA), Permendikdasmen 9/2026 (perubahan aturan AN), dan Kepmendikdasmen 56/2026 (Pedoman Penyelenggaraan TKA dan AN). Rangkuman per pasal: `docs/referensi/format-ujian.md` bagian 6.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Durasi TKA SMA | Bahasa Indonesia 60, Matematika 70, Bahasa Inggris 50, mapel pilihan 50 menit (sebelumnya 75, 75, 75, 60) | Kepmen 56/2026 Bab VIII. SD/SMP tetap 75 menit (sama dengan pedoman) |
| Jumlah soal | Tidak diubah (30/25/30/25 dari berita) | Pedoman tidak menyebut jumlah soal; **perlu dikonfirmasi** dengan kerangka asesmen |
| Penilaian | SD/SMP 0–100, SMA 200–800, kategori Baik/Memadai/Kurang, predikat istimewa 95 dan 725 | Bab X |
| Elemen Matematika SD | Aturan prompt SD kini Bilangan, Geometri dan Pengukuran, Data; sebelumnya SD memakai kalimat SMP (Aljabar, Data dan Peluang) | Kesalahan yang ditemukan saat mencocokkan dokumen; cakupan SD sudah benar sejak F-39 |
| Numerasi dan literasi AN | Matematika (semua jenjang) memuat aturan soal numerasi AN; Bahasa Indonesia memuat aturan literasi membaca AN | Permendikdasmen 9/2026 Pasal 9A, Kepmen 56/2026 Bab IV D |
| Rambu penulisan | Semua format TKA dan TKAD: bebas SARA dan bias, tanpa nama tokoh yang masih hidup, tanpa merek, produk komersial, atau instansi; fakta benar | Bab V (rambu penulis soal daerah); wajar untuk semua soal setara TKA |
| Mapel pilihan | Nama resmi (Matematika Lanjutan, PPKn/Pendidikan Pancasila, Produk/Projek Kreatif dan Kewirausahaan, …) dan Teori Kompetensi Kejuruan (SMK) ditambahkan; yang terakhir tanpa cakupan, layar meminta TP sesuai program keahlian | Bab IV A |
| TKAD | Keterangan diganti: soal daerah adalah bagian instrumen TKA SD/SMP, ditulis kabupaten/kota bersama provinsi dengan kisi-kisi pusat. Aturan kelokalan tetap ada (dari berita, tidak disebut pedoman) | Bab IV–V |

## Rincian dari halaman TKA pusmendik (F-41, 9 November 2026)

Pemilik meminta semua materi dari https://pusmendik.kemendikdasmen.go.id/tka/ masuk. Host itu ditolak jaringan sesi pengembangan (proxy menolak koneksi), jadi isi halaman diambil lewat mesin pencari yang dibatasi ke domain pusmendik. Yang terambil dan dipakai:

| Topik | Keputusan | Sumber |
| --- | --- | --- |
| Panjang teks Bahasa Indonesia | SD 150–200 kata, SMP 200–250 kata (kecuali puisi); SMA tetap 250–300. Batas pemeriksa SD 90, SMP 120, SMA 140 kata. Golden S-04 (bacaan SD 83 kata) kini ditolak (T-07) | Halaman TKA SD dan SMP Bahasa Indonesia (kerangka 047/H/AN/2025) |
| Subkompetensi membaca | Tekstual, inferensial, evaluasi dan apresiasi diperinci sesuai tabel halaman SMP | Halaman TKA SMP Bahasa Indonesia |
| Geometri dan pengukuran SD | Bangun datar segitiga, segiempat, segi banyak; bangun ruang kubus, balok, gabungannya; visualisasi spasial; panjang, berat, volume, waktu dengan satuan baku | Halaman TKA SD Matematika |
| Data SD | Tabel frekuensi dan diagram batang; piktogram tidak disebut halaman (tetap ada sebagai satu butir) | Halaman TKA SD Matematika |
| Bahasa Inggris lanjutan | Exposition dan discussion bertopik teknologi dan isu faktual, 300–400 kata | Halaman mapel pilihan |
| Produk/Projek Kreatif dan Kewirausahaan | Produksi, pemasaran, distribusi, pengelolaan usaha (desain produk, perencanaan produksi, proposal usaha, laporan keuangan, HaKI); di SMK pilihan pertama wajib mapel ini | Halaman mapel pilihan |
| Biologi | Ditambah bakteri; konteks kesehatan, lingkungan, pertanian, sosial budaya | Halaman mapel pilihan Biologi |
| Belum | Daftar lengkap butir per elemen untuk semua mapel ada di PDF kerangka asesmen (Perkaban BSKAP 045 dan 047/H/AN/2025) di situs pusmendik, yang belum dapat dibuka. **Perlu**: pemilik mengunggah PDF itu, atau host pusmendik diizinkan di lingkungan sesi | — |

## Kerangka asesmen TKA resmi dari situs pusmendik (F-41, 9 November 2026)

Pemilik meminta semua materi di https://pusmendik.kemendikdasmen.go.id/tka/ masuk. Host pusmendik (dan cacerts.digicert.com, karena server pusmendik tidak mengirim sertifikat perantara DigiCert) ditambahkan ke lingkungan sesi atas persetujuan pemilik. Semua 76 halaman kerangka diambil dan diurai (scripts/kerangka-tka/README.md).

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Data | `src/ujian/data/kerangka-tka.json` (matriks asesmen: elemen, sub-elemen, butir, kompetensi, batasan; 76 mapel) dan `kerangka-ringkas.json` (nama, definisi, muatan, kompetensi membaca). Yang pertama hanya dimuat layar Buat; yang kedua dipakai prompt | Isi resmi lengkap tanpa membebani semua layar |
| Cakupan TKA/TKAD | Daftar buatan sendiri untuk Matematika, mapel pilihan, dan bahasa diganti matriks resmi: tiap butir sub-elemen menjadi satu butir cakupan, batasan resmi ikut di rumusan TP (dipotong di batas kata). Butir kembar dari tabel resmi dibuang | Permintaan pemilik: semua materi resmi masuk |
| Porsi | Matematika tetap usulan (SD 5/3/2, SMP 7/8/8/7, SMA 4/7/5/3/6) karena halaman resmi tidak menyebut porsi; mapel lain sebanding banyak butir per elemen | Setiap butir resmi berpeluang sama |
| Mapel pilihan | 19 mapel umum ditambah 50 program keahlian SMK ("SMK - Kuliner", dst., Teori Kompetensi Kejuruan) dari kerangka pusmendik; nama dicocokkan tanpa peka huruf besar, awalan "SMK - ", atau nama lama | Kepmen 56/2026 nomor 20 per program keahlian |
| Bahasa | Cakupan = jenis teks atau topik dari bagian Muatan resmi (BI SD/SMP/SMA, BI dan BIng Tingkat Lanjut, BIng wajib, Arab, Jepang, Jerman, Korea, Mandarin, Prancis). Kompetensi membaca per butir: kompetensi ke-1/2/3 matriks resmi menurut level TKA, subkompetensi bergiliran menurut nomor butir | Semua subkompetensi resmi terpakai; level dan kompetensi tetap cocok |
| Prompt | Definisi dan muatan resmi mapel ikut di bagian format ujian (TKA dan TKAD) | Model mendapat konteks resmi mapel, terutama mapel SMK |
| Panjang teks | Bila guru tidak mengatur: BIng 200–350, BI Lanjut 300–350, BIng Lanjut 300–400 kata; Arab, Jepang, Jerman, Korea, Mandarin, Prancis 10–100 kata menurut muatan masing-masing | Teks bahasa asing TKA jauh lebih pendek dari bawaan jenjang SMA |
| Tambalan | Halaman resmi Matematika SMA terpotong setelah "Aturan" (Peluang tidak tampil): ditambah "Aturan pencacahan" dan sub-elemen Peluang (kejadian tunggal, majemuk). Matematika Tingkat Lanjut: baris Limit berlabel Trigonometri diganti elemen Kalkulus (sesuai Muatan); turunan dan integral tidak ada di halaman. Kimia tanpa tabel matriks: elemen dari teks Muatan. Bahasa Inggris Tingkat Lanjut tanpa matriks kompetensi: memakai matriks Bahasa Inggris wajib | Baris tambalan bertanda `tambalan: true`; **perlu dikonfirmasi** bila halaman resmi diperbaiki |
| OSN | Tidak berubah (bukan kerangka TKA) | — |

