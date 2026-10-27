# Rancangan Pengembangan Aplikasi GenSoal

Oct 24, 2026 · @Itman Arif Hariri

GenSoal adalah aplikasi web yang membuat soal dari kelas, mata pelajaran, CP, dan TP yang diisi guru, memverifikasi kuncinya, lalu menghasilkan dokumen asesmen siap pakai untuk kelas 1 sampai 12. Dokumen ini adalah cetak biru versi 0.4, dengan arsitektur lokal-dulu tanpa akun, kunci API milik guru, dan banyak penyedia AI; setiap bagian dapat Anda ubah dan akan menjadi acuan tunggal bagi pengembangan.

> **Perubahan v0.4 (24 Oktober 2026).** Antarmuka berwarna dan terkelompok dengan 3 layar kerja (Buat, Periksa, Unduh), 3 isian wajib, istilah sehari-hari, satu penanda per soal, ekspor Word dan PDF memakai Times New Roman 12 dengan pakem penulisan soal tetap, dan aplikasi tidak lagi membawa data kurikulum. Rincian: bagian Arah Visual, Rancangan Layar, Pakem Penulisan Soal, dan Mesin Gambar dan Ekspor. Arsitektur, penyimpanan lokal, dan kunci API tidak berubah.

> **Perubahan v0.5 (25 Oktober 2026).** Atas keputusan pemilik: tidak ada lagi persetujuan guru (tombol Setujui, penanda "Disetujui", dan gerbang unduh), penanda status per soal ("Jawaban sudah dicek", "Mohon cek dulu"), tabel istilah wajib, dan penunjuk "Langkah n dari 3". Soal yang lolos pemeriksaan otomatis langsung siap diunduh; soal yang kuncinya tidak dapat dicek otomatis hanya diberi satu kalimat keterangan. Rancangan tampilan lanjutan ada di `docs/RANCANGAN-UI.md`.

## Ringkasan dan Prinsip Desain

Enam prinsip berikut menjadi pegangan setiap keputusan teknis. Bila ada fitur atau solusi yang bertentangan dengannya, fitur itu ditunda atau dirancang ulang.

1. **CP dan TP guru dulu, AI kemudian.** Soal dihasilkan dari kelas, mapel, CP, dan TP yang diisi guru, tidak dari ingatan bebas model. Aplikasi tidak membawa data kurikulum.
2. **Verifikasi sebelum tampil.** Soal yang kuncinya tidak lolos pemeriksaan otomatis tidak pernah sampai ke layar guru.
3. **Guru yang memutuskan, tanpa langkah persetujuan.** Soal yang lolos pemeriksaan langsung dapat diunduh (v0.5). Soal yang kuncinya tidak dapat dicek otomatis diberi keterangan singkat "Kunci tidak dicek otomatis" agar guru membacanya sekali sebelum dipakai; keterangan itu tidak menghalangi unduhan.
4. **Gambar dihitung, bukan ditebak.** Diagram yang menuntut presisi dibuat dari parameter soal, bukan digambar model gambar.
5. **Modular per mata pelajaran.** Setiap mata pelajaran punya paket sendiri (aturan verifikasi, templat gambar, gaya soal) yang dapat dibuka atau ditutup tanpa mengubah inti aplikasi.
6. **Lokal dulu.** Tanpa akun: soal dan pengaturan tersimpan tinggal di peramban guru, dokumen diunduh langsung dari perangkat, dan hanya permintaan ke model AI yang melewati server.

Satu prinsip tambahan mengikat seluruh fitur administrasi: dokumen turunan (kisi-kisi, kunci, rubrik, paket A/B, analisis) selalu dihitung dari data soal yang sama, tidak diketik ulang.

## Keputusan Awal dan Pertanyaan Terbuka

Sejak versi 0.3 GenSoal memilih arsitektur lokal-dulu: tanpa akun, data di peramban guru, ekspor langsung dari perangkat. Biaya AI ditanggung guru lewat kunci API sendiri dari banyak penyedia (beberapa memiliki tingkat gratis), sehingga server hampir tidak diperlukan. Pilihan ini memindahkan tiga tanggung jawab ke tempat lain: cadangan data (ke guru), biaya AI (ke guru), dan mutu model (ke registri dan golden set Anda). Semua baris adalah usulan; ubah yang tidak cocok.

| Topik | Usulan | Alasan |
| --- | --- | --- |
| Nama produk | GenSoal (sementara) | Cukup untuk kode dan dokumen; mudah diganti |
| Platform | Aplikasi web yang dapat dipasang (PWA), tanpa akun | Dibuka dari tautan; menyunting dan mengekspor tetap jalan tanpa internet |
| Antarmuka | React, Vite, TypeScript, Tailwind; dibangun sebagai situs statis | Tanpa server aplikasi; mudah dikerjakan agen AI |
| Penyimpanan data | IndexedDB di peramban (pustaka Dexie), dengan permintaan penyimpanan persisten | Soal dan pengaturan tersimpan tinggal di perangkat guru |
| Cadangan dan pindah perangkat | Ekspor dan impor berkas .gensoal (JSON) | Satu-satunya jalur pindah perangkat tanpa akun |
| Data kurikulum | Tidak dibawa aplikasi (v0.4). Guru mengisi kelas, mapel, CP, dan TP langsung di layar Buat | Data kurikulum resmi memerlukan kurator dan cepat usang; guru sudah memegang CP dan TP sekolahnya |
| Hosting | Netlify: situs statis; proxy isi ulang opsional pada V1 | Satu layanan; deploy otomatis dari repositori |
| Akses model AI | Kunci API milik guru (BYOK), banyak penyedia: Gemini, OpenRouter, Groq, Mistral, OpenAI, Anthropic; panggilan langsung dari peramban lewat adaptor per penyedia | Biaya AI ditanggung guru; beberapa penyedia memiliki tingkat gratis |
| Pilihan model | Registri berlencana (direkomendasikan, stabil, pratinjau, usang) digabung dengan daftar model langsung dari penyedia | Daftar model sering berubah; kelayakan diuji dengan golden set |
| Verifikasi hitung | mathjs di peramban; SymPy lewat Pyodide pada V1 | Berjalan di perangkat guru, tanpa server |
| Rumus | KaTeX, pecahan bertumpuk | Sesuai preferensi tampilan matematika Anda |
| Gambar | Generator SVG berbasis templat; diubah ke PNG saat ekspor Word | Presisi; Word memerlukan gambar raster |
| Ekspor | Word (.docx) dan PDF dibuat langsung di peramban; LaTeX (.tex) sebagai berkas teks | Tanpa server; PDF tidak dikompilasi dari LaTeX |
| Templat Word dan PDF | Times New Roman 12, pakem penulisan soal tetap (bagian Pakem Penulisan Soal); LaTeX tetap 14 pt dua kolom di menu lanjutan | Satu tampilan untuk semua berkas yang dibagikan ke siswa |
| Bantuan | Halaman Bantuan berisi video 1 sampai 3 menit dan langkah teks; tidak ada panel video atau tanda tanya di layar kerja (v0.4) | Layar kerja tetap bersih; langkah memasang kunci tetap ada di Pengaturan AI |
| Bahasa | Antarmuka Indonesia; soal Indonesia, Inggris, atau dwibahasa | Sesuai kebutuhan sekolah bilingual |
| Monetisasi | Bayar sekali untuk aplikasi (kode lisensi, tanpa akun); biaya AI tidak di pihak Anda | Pendapatan sekali, sehingga biaya berulang tidak boleh ditanggung penjual |

### Pertanyaan yang perlu Anda putuskan

- [ ] Urutan mata pelajaran yang dibuka pertama. Usul: Matematika, IPAS, Bahasa Indonesia, Bahasa Inggris, lalu rumpun lain.
- [ ] Penyedia AI yang didukung di MVP. Usul: Gemini dan OpenRouter (tingkat gratis tanpa kartu), ditambah satu berbayar (Anthropic atau OpenAI); Groq dan Mistral menyusul.
- [ ] Harga dan bentuk lisensi sekali bayar, serta batas jumlah perangkat per kode (usul: 2 sampai 3). Harga ditetapkan setelah biaya soal per model terukur.
- [ ] Apakah PDF boleh berbeda tampilan dari hasil kompilasi LaTeX Anda, atau wajib dikompilasi dari LaTeX (itu memerlukan server kompilasi).

## Pengguna dan Peran

Tanpa akun, tidak ada peran yang ditegakkan oleh sistem: siapa pun yang membuka aplikasi di perangkatnya adalah pemilik datanya. Peran di bawah menjadi cara kerja dan kebutuhan fitur, bukan hak akses. Peran yang bergantung pada server ditunda sampai ada backend.

| Peran | Tugas utama | Cara kerja tanpa akun | Rilis |
| --- | --- | --- | --- |
| Guru | Membuat, menyunting, menyetujui, dan mengekspor soal | Semua data di peramban perangkatnya; pindah perangkat lewat berkas .gensoal | MVP |
| Pengembang | Merawat registri model dan golden set per model | Lewat repositori dan rilis aplikasi, bukan layar admin | MVP |
| Validator isi | Menelaah soal rumpun berisiko tinggi | Ditunda; pada MVP guru membaca sendiri soal yang kuncinya tidak dicek otomatis | V2 |
| Koordinator dan admin sekolah | Bank soal bersama, kop sekolah, kuota sekolah | Memerlukan server dan akun; ditunda | V2 |

## Lingkup Rilis

MVP dibatasi pada satu jalur lengkap: dari isian kelas, mapel, CP, dan TP sampai unduhan soal yang kuncinya sudah dicek. Fitur ditandai dengan ID agar bisa dirujuk di tugas pengembangan.

| ID | Fitur | Rilis |
| --- | --- | --- |
| F-01 | Profil lokal guru dan kop sekolah dasar (tanpa login) | MVP |
| F-02 | ~~Katalog kurikulum resmi~~ dihapus pada v0.4: guru mengisi kelas, mapel, CP, dan TP sendiri | Dihapus |
| F-03 | Layar Buat: 3 isian wajib (kelas, topik atau mapel, jumlah soal), Pengaturan lanjutan tertutup, Pengaturan tersimpan (preset), tombol Buat soal | MVP |
| F-04 | Pengaturan komposisi kesukaran (tiga penggeser, sisa terbesar); di Pengaturan lanjutan guru juga dapat mengatur jumlah per bentuk soal, jumlah per level kognitif C1–C6, jumlah soal per TP, banyak opsi pilihan ganda (4 atau 5), dan skor per bentuk dengan pedoman penskoran | MVP |
| F-05 | Bentuk soal: pilihan ganda, pilihan ganda kompleks, benar-salah, menjodohkan (tarik garis), isian singkat, uraian | MVP |
| F-06 | Pembuatan soal oleh AI dengan keluaran JSON terstruktur lewat adaptor penyedia | MVP |
| F-07 | Verifikasi otomatis (hitung ulang, kaidah butir, duplikasi) dan status mutu | MVP |
| F-08 | Gambar terprogram untuk Matematika SD (garis bilangan, pecahan, bangun datar, diagram batang, jam) | MVP |
| F-09 | Editor soal: sunting, kunci, ganti, buat ulang per butir | MVP |
| F-10 | Kisi-kisi, kunci, dan pembahasan otomatis | MVP |
| F-11 | Unduh langsung Word (.docx) dan PDF (Times New Roman 12, pakem penulisan soal) dari peramban; LaTeX (.tex) di menu lanjutan | MVP |
| F-12 | Cadangan dan pemulihan: ekspor dan impor berkas .gensoal, pengingat cadangan, penyimpanan persisten | MVP |
| F-13 | ~~Periksa: penanda per soal, tombol Setujui, dan gerbang unduh~~ dihapus pada v0.5: soal yang lolos langsung siap diunduh; soal tanpa cek otomatis hanya diberi keterangan | Dihapus |
| F-14 | Pengaturan AI: kunci API milik guru, banyak penyedia, uji kunci, peringatan biaya dan privasi per penyedia | MVP |
| F-15 | CP dan TP ditulis langsung di layar Buat (dua kolom teks) dan tersimpan di Pengaturan tersimpan; tidak ada editor kurikulum | MVP |
| F-16 | Registri model: daftar model per penyedia dengan lencana (direkomendasikan, stabil, pratinjau, usang) dan daftar model langsung dari penyedia | MVP |
| F-17 | Bantuan: halaman video dan langkah teks; tidak ditempel di layar kerja (v0.4) | MVP |
| F-18 | Cadangan otomatis antarmodel saat batas penyedia tercapai | V1 |
| F-19 | Lisensi sekali bayar: kode lisensi, validasi, batas perangkat, kirim ulang kode | V1 |
| F-20 | Bank soal: simpan, cari, pakai ulang | V1 |
| F-21 | Paket A/B/C dengan pengacakan soal dan opsi | V1 |
| F-22 | Bentuk soal tambahan: soal bertumpu stimulus (pilihan ganda kompleks dan menjodohkan sudah masuk F-05) | V1 |
| F-23 | Ilustrasi AI dan unggah gambar | V1 |
| F-24 | Verifikasi SymPy lewat Pyodide dan paket mapel IPA | V1 |
| F-25 | Berbagi bank soal lewat berkas .gensoal; bank bersama per sekolah menunggu server | V1 |
| F-26 | Ekspor xlsx dan format LMS (Google Forms, QTI) | V1 |
| F-27 | Proxy isi ulang opsional untuk guru yang tidak mengurus kunci sendiri | V1 |
| F-30 | Analisis hasil ujian: ketuntasan per TP, kesukaran, daya pembeda | V2 |
| F-31 | Remedial dan pengayaan otomatis | V2 |
| F-32 | Ujian daring dengan penilaian otomatis | V2 |
| F-33 | Perangkat ajar: ATP, modul ajar, LKPD | V2 |
| F-34 | Nilai dan deskripsi rapor | V2 |

## Alur Pengguna

Alur utama berjalan dari formulir sampai ekspor, dengan verifikasi otomatis di tengahnya sehingga soal bermasalah tidak pernah tampil di layar guru.

&#91;embedded content: alur pembuatan soal · 6 langkah, 1 keputusan\]

Soal yang gagal verifikasi dibuat ulang otomatis (maksimal tiga kali) dan hanya soal yang lolos yang mengurangi batas harian. Soal yang tampil langsung dapat diunduh (v0.5).

### Alur pendukung

- Membaca soal tanpa cek otomatis: soal bertanda "Kunci tidak dicek otomatis" dibaca guru di halaman paket, lalu dipakai, disunting, atau dihapus. Tidak ada langkah persetujuan.
- Cadangan: ekspor berkas .gensoal secara berkala, atau impor untuk memulihkan dan memindah perangkat.
- Mengganti satu butir: pilih butir, buat ulang dengan kategori yang sama, bandingkan dengan versi lama, lalu terima atau kembalikan.

## Rancangan Layar

Pekerjaan guru berjalan dari layar Buat ke halaman paket soal, lalu ke Unduh. Sejak v0.5 tidak ada penunjuk "Langkah n dari 3": halaman paket menaruh tombol Unduh di kepala halaman, dan layar Unduh punya tautan kembali ke paketnya.

| Layar | Rute | Elemen utama | Aksi |
| --- | --- | --- | --- |
| Beranda | / | Ajakan "Buat soal" dan "Buka soal saya"; kartu Mulai cepat (kelas, mapel, jumlah soal) yang mengisi layar Buat; tiga langkah Buat · Periksa · Unduh; lima paket terakhir dengan lencana status dan satu aksi (Unduh atau Lanjutkan); kartu Belum selesai untuk paket terbaru yang belum siap; Pintasan (kunci API, cadangan, semua soal) | Mulai buat soal, lanjutkan paket, unduh, buka soal |
| Buat soal | /soal/baru | Pengaturan tersimpan (satu pilihan); Kelas, mapel, dan jumlah soal; CP dan TP; Pengaturan lanjutan (tertutup); panel Rencana (permintaan AI, waktu, kuota, biaya); draf otomatis | Buat soal (atau "Pasang kunci AI dulu"), simpan pengaturan, Batal |
| Paket soal | /soal/\[id\] | Kepala dengan tombol Unduh dan menu Lainnya; kemajuan pembuatan dengan lencana status dan bilah; daftar soal dengan gambar, kunci, pembahasan; keterangan "Kunci tidak dicek otomatis" bila perlu; tanda jenis jawaban uraian; navigasi nomor soal | Unduh, sunting, ganti soal, buat ulang, hapus (konfirmasi, dapat dipulihkan) |
| Unduh | /soal/\[id\]/ekspor | Pilih Word atau PDF; berkas yang diunduh (lembar soal dengan atau tanpa kop, kunci jawaban dengan atau tanpa pembahasan, kisi-kisi), masing-masing berkas terpisah; pratinjau tiap berkas; menu lanjutan berisi .tex dan tampilan cetak | Unduh semua berkas terpilih, atau satu berkas saja |
| Soal saya | /soal | Saringan Semua · Belum selesai · Siap diunduh (di URL), pencarian, menu ⋯ per paket; tong sampah di `?tab=sampah` | Buka, unduh, buat paket serupa, ubah judul, hapus, pulihkan |
| Pengaturan AI | /pengaturan/ai | "Siap dipakai" bila kunci berfungsi, atau tiga langkah: pilih penyedia, tempel kunci, pilih model; Pengaturan lanjutan (model cadangan, batas pemakaian, batas harian); Zona berbahaya | Simpan dan uji kunci, pilih model utama dan cadangan, hapus kunci |
| Cadangan | /cadangan | Data di perangkat ini (ukuran, cadangan terakhir, penyimpanan persisten); pengaturan tersimpan; Zona berbahaya | Unduh dan impor .gensoal, hapus pengaturan tersimpan, hapus semua data (konfirmasi) |
| Profil dan kop | /pengaturan | Guru dan sekolah; kop lembar soal dengan pratinjau; logo; identitas siswa; tema (Ikuti sistem · Terang · Gelap) | Simpan profil |

Menu atas berisi Beranda, Buat soal, Soal saya, Pengaturan AI, dan Cadangan. Profil dan kop serta Bantuan ada di kaki halaman dan menu ponsel. Ringkasan, cadangan, dan daftar sekaligus tidak lagi tampil di beranda.

### Aturan layar Buat

1. **Tiga isian wajib:** kelas, topik atau mata pelajaran, dan jumlah soal (5 sampai 50). Sisanya terisi otomatis.
2. **Pengaturan tersimpan** (dahulu preset) dipilih di bagian atas dan mengisi semua isian sekaligus; hanya tampil bila sudah ada.
3. **CP dan TP** berupa dua kolom teks; satu TP satu baris; jumlah soal dibagi ke tiap TP. Boleh dikosongkan: tanpa TP soal dibuat dari CP, tanpa keduanya dari topik atau mapel. Pemeriksa kualitas TP memberi saran tanpa memblokir.
4. **Pengaturan lanjutan** tertutup secara bawaan: komposisi mudah/sedang/sulit (bawaan 30/50/20, saling terkunci pada 100%), bentuk soal, cara menjawab benar-salah (centang kotak atau lingkari B/S), bahasa, gaya, soal bergambar, teks materi tempel, dan judul paket.
5. **Panel Rencana** (samping kanan di laptop, bilah bawah dengan "Rincian" di ponsel): ringkasan isian, perkiraan permintaan AI, waktu, sisa kuota, dan biaya, isian yang masih kurang, tombol Batal (merah), dan tombol utama "Buat n soal" (atau "Pasang kunci AI dulu" bila belum ada kunci). "Simpan pengaturan ini" (dengan nama) ada di akhir Pengaturan lanjutan. Isian tersimpan otomatis sebagai draf. Pembuatan dimulai langsung dan mengarah ke halaman paket soal.

Mapel diketik guru; rumpun mapel (penentu pemeriksa jawaban) ditebak dari namanya. Mapel yang belum punya pemeriksa otomatis menghasilkan soal berketerangan "Kunci tidak dicek otomatis".

Pembuatan soal berjalan dari peramban butir demi butir, dan setiap butir yang lolos langsung disimpan di IndexedDB. Bila tab tertutup di tengah jalan, guru melanjutkan dari butir terakhir yang tersimpan.

### Aturan halaman paket soal

- Tidak ada penanda status per soal dan tidak ada tombol Setujui (v0.5). Soal dengan status mutu `perlu_telaah` hanya diberi satu kalimat "Kunci tidak dicek otomatis" tanpa menghalangi unduhan. Kolom `status_mutu` dan `status_telaah` tetap disimpan apa adanya.
- Per soal terlihat tombol Sunting; aksi lain (ganti, buat ulang, hapus) di menu Lainnya. Tombol Unduh di kepala halaman, dan di ponsel juga di bilah bawah tetap.
- Setiap soal uraian membawa tanda jenis jawaban (penjelasan atau hitungan). AI mengisinya saat membuat soal, dan guru dapat mengubahnya di sini.

### Bahasa di layar

Pakai bahasa Indonesia sehari-hari yang singkat; tidak ada daftar istilah wajib (v0.5). Kata teknis atau bahasa Inggris (generate, preset, ekspor, token, RPM) tidak dipakai di label utama, hanya di petunjuk atau Pengaturan lanjutan bila perlu. Golden set dan registri model tidak tampil di layar guru.

### Arah visual

Terang dan ramah: latar abu kebiruan lembut, kartu putih, dan sedikit warna yang bermakna. Gaya hitam-putih, orbit, garis tipis, dan label huruf besar berjarak lebar ditinggalkan.

1. Menu atas di atas garis kuning, jelas berbeda dari area kerja.
2. Setiap kelompok isian berada dalam satu kartu putih dengan pita berwarna di atasnya. Nomor kelompok berlatar kuning tidak dipakai lagi (penyederhanaan 25 Oktober, `docs/PENYEDERHANAAN-UI.md`).
3. Jarak antarkartu 24 px, jarak di dalam kartu 16 px.
4. Satu tombol utama berwarna pekat per layar; tombol lain berupa garis tepi. Merah hanya untuk hapus dan batal; aksi yang menghapus data ada di kartu Zona berbahaya paling bawah dan selalu meminta konfirmasi.
5. Teks minimal 16 px, judul halaman 30 sampai 36 px, font Nunito Sans. Angka memakai lebar sejajar (tabular).
6. Status paket memakai satu peta: biru sedang dibuat, kuning-oranye menunggu atau dijeda, merah perlu perhatian, hijau siap diunduh.
7. Mode gelap tersedia (Profil dan kop → Tampilan) dan mengikuti sistem secara bawaan, tanpa kedipan saat dibuka.

| Peran | Warna | Kode |
| --- | --- | --- |
| Latar halaman | Abu kebiruan lembut | #F5F7FA |
| Kartu | Putih, garis tepi abu | #FFFFFF, #D7DEE8 |
| Warna utama: tombol, tautan, sedang dibuat | Biru | #2563EB (mode gelap: teks dan tautan #6AA8FB, tombol berisi #2563EB) |
| Ornamen | Kuning | #FACC15 |
| Peringatan: kuota hampir habis, dijeda, kunci tidak dicek otomatis | Kuning-oranye | #B45309 pada #FEF3C7 |
| Berhasil: siap diunduh, tersimpan | Hijau | #15803D pada #DCFCE7 |
| Judul | Biru tua | #1E3A5F |
| Teks utama | Abu tua | #1F2937 |
| Teks pendukung | Abu sedang | #4B5563 |
| Hapus, batal, galat | Merah | #B91C1C |

Semua pasangan teks dan latar berkontras setidaknya 4,5 banding 1 di mode terang dan gelap; diuji otomatis dari token (`tests/kontras.test.ts`) dan dengan axe-core di delapan layar (`npm run e2e`). Warna tidak berdiri sendiri: setiap status juga memakai kata dan ikon. Semua elemen dapat dicapai dengan papan ketik dan memperlihatkan cincin fokus.

### Bantuan

Bantuan ada di halaman Bantuan (kaki halaman dan menu ponsel), bukan di layar kerja: tidak ada panel video atau tanda tanya di layar Buat, paket soal, Unduh, Pengaturan AI, dan Cadangan. Langkah memasang kunci tetap tersedia sebagai bagian lipat di Pengaturan AI.

Aturan video: satu tugas per video, 1 sampai 3 menit, dengan teks terjemahan dan langkah teks di bawahnya. Video disematkan dari daftar putar tidak terdaftar; aplikasi tetap berjalan tanpa internet, hanya videonya yang tidak.

## CP dan TP dari Guru

Aplikasi tidak membawa data kurikulum dan tidak memiliki fitur menulis kurikulum sendiri (v0.4). Guru mengisi kelas, mapel, CP, dan TP langsung di layar Buat, lalu dapat menyimpannya sebagai Pengaturan tersimpan.

- Soal dibuat langsung dari kelas, mapel, CP, dan TP yang diisi. Jumlah soal dibagi merata ke tiap TP.
- Fase dihitung dari kelas (pemetaan fase Kurikulum Merdeka) hanya untuk konteks prompt dan batas keterbacaan.
- Rumpun mapel ditebak dari nama mapel dan menentukan pemeriksa; bila tidak dikenali, soal berketerangan "Kunci tidak dicek otomatis".
- TP yang dipakai disalin utuh ke paket dan soal, sehingga kisi-kisi lama tidak berubah diam-diam.
- Kisi-kisi dan jejak berkas mencatat kelas, mapel, CP, dan TP yang dipakai.

Dihapus pada v0.4: pilihan kurikulum, tombol "Ambil dari kurikulum resmi", menu Kurikulum, berkas JSON kurikulum (`public/kurikulum`, `data/sumber`), dan toko TP kustom di basis data.

### Pemeriksa kualitas TP

Soal hanya sebaik TP yang menjadi dasarnya: rumusan samar menghasilkan soal samar. Karena itu layar Buat memberi saran saat guru menulis TP, tanpa memblokir. Pemeriksa menilai empat hal: ada kata kerja yang dapat diamati, satu kompetensi per TP, lingkup materi jelas, dan tingkat kognitif dapat ditentukan.

| Rumusan TP | Penilaian | Alasan |
| --- | --- | --- |
| Siswa memahami pecahan. | Lemah | Kata kerja tidak dapat diamati; lingkup tidak jelas |
| Siswa dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya. | Baik | Perilaku dapat diamati; lingkup jelas; kira-kira level C3 |

## Model Data

Semua data milik guru (pengaturan tersimpan, paket, soal, profil) disimpan di IndexedDB lewat Dexie; aplikasi tidak membawa data kurikulum (v0.4). Semua rekaman memakai kunci UUID, `dibuat_pada`, dan `diubah_pada`. Kolom pada tabel di bawah menjadi bentuk objek dan indeks; relasi dijaga oleh kode, bukan oleh basis data.

| Penyimpanan | Kolom utama | Catatan |
| --- | --- | --- |
| profil | id, nama, sekolah, kop\_json, logo\_blob, kunci\_api\_lokal | Satu rekaman per perangkat; kunci API sendiri tidak pernah ikut diekspor |
| paket\_soal | id, judul, parameter\_json, status | Satu permintaan = satu paket soal; parameter\_json = isi layar Buat (kelas, fase, mapel, rumpun, CP, TP, komposisi, bentuk, opsi, cara\_bs), sama dengan pengaturan tersimpan |
| soal | id, paket\_id, tp\_id, tp (salinan TP), indikator\_id, bentuk, level\_kognitif, kesukaran\_rancangan, isi\_json, kunci\_json, pembahasan\_json, status\_mutu, status\_telaah, versi | isi\_json mengikuti skema di bagian Mesin AI |
| soal\_gambar | id, soal\_id, jalur, templat, parameter\_json, svg | jalur: terprogram, ilustrasi, unggahan |
| pekerjaan\_generasi | id, paket\_id, status, percobaan, galat, mulai, selesai | Kemajuan generasi agar dapat dilanjutkan setelah tab ditutup |
| pemakaian\_ai | id, tanggal, model, token\_masuk, token\_keluar, perkiraan\_biaya | Dasar batas harian di sisi klien; batas yang mengikat ada di proxy |
| log\_soal | id, soal\_id, aksi, sebelum\_json, sesudah\_json | Jejak suntingan; dapat dipangkas |

### Aturan data

- Kolom status\_mutu bernilai: terverifikasi\_hitung, terverifikasi\_aturan, perlu\_telaah, ditolak.
- Kolom status\_telaah bernilai: draf, ditelaah\_guru, ditolak. Status divalidasi oleh validator ditunda sampai ada server.
- Soal menyimpan salinan TP yang dipakainya, sehingga mengubah TP di pengaturan tersimpan tidak mengubah soal lama.
- Sejak v0.5 layar hanya memakai status\_mutu: perlu\_telaah menampilkan keterangan "Kunci tidak dicek otomatis". status\_telaah tetap disimpan agar data dan cadangan lama terbaca, tetapi tidak dipakai di layar atau gerbang unduh.
- Soal uraian menyimpan `jenis_uraian` (penjelasan atau hitungan) di isi\_json.
- Tanpa Row Level Security: seluruh data tinggal di perangkat. Konsekuensinya, kehilangan data peramban berarti kehilangan soal, sehingga cadangan .gensoal dan permintaan penyimpanan persisten (navigator.storage.persist) menjadi bagian MVP.
- Hapus bersifat lunak (dihapus\_pada) untuk soal dan paket, dengan tong sampah yang dikosongkan setelah 30 hari.
- Setiap perubahan skema IndexedDB lewat nomor versi Dexie baru dengan fungsi migrasi. Pengaturan tersimpan (toko preset): id, nama, parameter\_json, terakhir\_dipakai. Versi 2 skema menghapus toko tp\_kustom. Versi 3 menambah isian parameter jumlah\_bentuk, sebaran\_level, jumlah\_tp, opsi\_pg, dan skor\_bentuk (null berarti perilaku bawaan).

## Mesin AI dan Verifikasi

Mesin AI memperlakukan model sebagai pembuat draf yang harus lolos pemeriksaan, bukan sumber kebenaran. Pembuat dan pemeriksa dipisahkan: pemeriksaan hitung dilakukan kode, bukan model yang sama.

### Alur satu pekerjaan generasi

1. **Hitung kuota per kategori.** Jumlah soal mudah, sedang, dan sulit per bentuk dihitung dengan metode sisa terbesar (di bawah).
2. **Bagi ke TP.** Soal disebar merata ke TP terpilih; tiap soal mendapat satu indikator dan level kognitif sesuai kategorinya (mudah C1 dan C2, sedang C3 dan C4, sulit C5 dan C6).
3. **Susun konteks.** Untuk tiap soal diambil CP, TP, indikator, aturan penulisan bentuk soal, dan contoh soal acuan paket mapel.
4. **Generasi terstruktur.** Model diminta menghasilkan satu objek JSON sesuai skema; keluaran di luar skema ditolak otomatis.
5. **Verifikasi.** Pemeriksa untuk rumpun mapel dijalankan (tabel di bawah). Gagal berarti soal dibuat ulang, maksimal 3 percobaan, lalu soal ditandai `ditolak` dan digantikan.
6. **Pemeriksaan kaidah.** Panjang opsi seimbang, kunci tersebar merata, tidak ada "semua benar" berlebihan, keterbacaan sesuai fase, kemiripan dengan soal lain dalam paket di bawah ambang.
7. **Gambar.** Bila soal menuntut gambar, mesin gambar dipanggil dengan parameter dari soal (bagian berikutnya).
8. **Simpan dan beri status.** Status mutu ditetapkan dari hasil verifikasi, lalu paket ditandai siap.

### Komposisi kesukaran

Biarkan n jumlah soal dan p\_k persentase kategori k. Jumlah dasar adalah lantai dari n × p\_k / 100; sisa soal dibagikan satu per satu kepada kategori dengan sisa pecahan terbesar. Hasilnya selalu berjumlah n. Contoh: 25 soal, komposisi 30:50:20, jumlah mentah 7,5; 12,5; 5 menjadi 8, 12, 5: dasar 7, 12, 5 berjumlah 24, satu soal sisa diberikan kepada kategori dengan sisa pecahan terbesar, dan bila seri (0,5 pada mudah dan sedang) kategori yang lebih mudah didahulukan.

```latex
n_k = \lfloor n p_k / 100 \rfloor + \delta_k, \qquad \sum_k \delta_k = n - \sum_k \lfloor n p_k / 100 \rfloor
```

### Skema soal (isi\_json)

```json
{
  "bentuk": "pilihan_ganda",
  "pokok": "Hasil dari 3/4 + 1/8 adalah ...",
  "opsi": {"A": "7/8", "B": "4/12", "C": "1", "D": "3/8"},
  "kunci": "A",
  "pembahasan": ["Samakan penyebut: 3/4 = 6/8", "6/8 + 1/8 = 7/8"],
  "verifikasi": {"tipe": "ekspresi", "ekspresi": "3/4 + 1/8", "nilai": "7/8"},
  "gambar": null,
  "meta": {"tp": "...", "level": "C3", "kesukaran": "sedang"}
}
```

Soal uraian juga membawa `rubrik` dan `jenis_uraian` (`penjelasan` atau `hitungan`); bila model tidak mengisinya, jenis ditebak dari verifikasi dan guru dapat mengubahnya di layar Periksa.

Kolom `verifikasi` diisi model sebagai instruksi pemeriksaan yang dijalankan kode. Pemeriksa menghitung ulang `ekspresi`, membandingkannya dengan `nilai`, lalu dengan opsi yang ditandai kunci. Bila ada selisih, soal gagal.

### Pemeriksa menurut rumpun

| Rumpun | Pemeriksa | Status bila lolos | Rilis |
| --- | --- | --- | --- |
| Matematika | Hitung ulang ekspresi dengan mathjs di peramban; gambar dibangkitkan dari parameter yang sama | terverifikasi\_hitung | MVP |
| IPA kuantitatif | Hitung ulang rumus dan satuan; SymPy lewat Pyodide di peramban | terverifikasi\_hitung | V1 |
| Bahasa | Aturan kebahasaan dan keterbacaan; penilai model kedua memeriksa kunci terhadap teks stimulus | terverifikasi\_aturan | V1 |
| IPS, Pancasila, Agama | Penambatan pada bahan rujukan terkurasi dengan kutipan sumber; telaah guru wajib | perlu\_telaah | V1 |
| Seni, PJOK, Informatika | Rubrik kinerja; eksekusi kode untuk soal pemrograman | terverifikasi\_aturan | V1 |

Soal berstatus `perlu_telaah` dapat diunduh tanpa persetujuan (v0.5); di layar ia diberi keterangan "Kunci tidak dicek otomatis", dan untuk rumpun risiko tinggi keterangan itu meminta guru membaca kutipan sumber.

### Kontrak instruksi ke model

- Keluaran hanya JSON sesuai skema; tidak ada teks lain.
- Dilarang menyalin soal atau teks dari buku, ujian, atau situs; stimulus harus asli atau berasal dari materi yang ditempel guru.
- Konteks lokal bebas stereotip; nama dan tempat bervariasi.
- Angka dan satuan konsisten antara pokok, opsi, dan pembahasan.
- Pengecoh harus mewakili kesalahan konsep yang nyata, bukan asal berbeda.

### Penyedia AI dan registri model

Aplikasi tidak terikat pada satu model. Setiap penyedia memiliki satu adaptor dengan tiga fungsi yang sama: kirim prompt dengan keluaran terstruktur, daftar model yang dapat dipakai kunci tersebut, dan hitung biaya dari token. Guru menempel kunci sendiri; kunci disimpan hanya di peramban dan tidak ikut berkas cadangan. Daftar di bawah adalah titik awal per 24 Oktober 2026 dan harus diverifikasi ulang sebelum rilis, karena nama model, harga, dan batas gratis berubah cepat.

| Penyedia | Contoh model | Tingkat gratis | Catatan |
| --- | --- | --- | --- |
| Google Gemini | Gemini 3.8 Flash (utama), 3.5 Flash, 3.5 Flash-Lite, 2.5 Flash, Gemma 4 | Ya, tanpa kartu kredit; batas harian kecil | Prompt tingkat gratis dapat dipakai untuk perbaikan produk di luar EEA, Swiss, dan Inggris |
| OpenRouter | openrouter/free, google/gemma-4-31b-it:free, nvidia/nemotron-3-super-120b-a12b:free | Ya, sekitar 20 permintaan per menit dan 50 per hari | Satu kunci untuk banyak model; penyedia gratis dapat mencatat prompt |
| Groq | openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b | Ya, sekitar 30 per menit dan 1.000 per hari | Sangat cepat; model berganti sewaktu-waktu |
| Mistral | Mistral Medium 3.5, Small 4, Large 3 | Ya, kredit bulanan terbatas | Mode gratis dapat dipakai melatih model kecuali dinonaktifkan |
| OpenAI | gpt-6.1-sol, gpt-6-luna, gpt-6-astra | Tidak | Berbayar per token |
| Anthropic | claude-fable-5-1, claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5 | Tidak | Berbayar per token; panggilan dari peramban memerlukan header khusus |

#### Menjaga daftar tetap terbaru dan stabil

- Daftar model langsung: setelah kunci ditempel, aplikasi memanggil endpoint daftar model penyedia sehingga hanya model yang benar-benar dapat dipakai yang tampil.
- Registri bawaan: berkas JSON di repositori berisi label, tingkat harga (gratis, murah, premium), dan status model (direkomendasikan, stabil, pratinjau, usang). Pratinjau diberi peringatan, usang disembunyikan.
- Lencana kelayakan: sebuah model baru mendapat status direkomendasikan hanya bila lolos golden set (kunci benar diloloskan, kunci salah ditolak, JSON sesuai skema) pada mapel yang dibuka.
- Cadangan antarmodel: bila model mencapai batas penyedia, aplikasi menawarkan model lain yang kuncinya sudah dimiliki guru (F-18).
- Pembaruan registri: dikerjakan lewat rilis aplikasi; setiap rilis memeriksa model usang dan menandai model baru sebagai pratinjau sampai diuji.

#### Risiko yang diterima

- Mutu: model gratis dan kecil lebih sering menghasilkan soal yang kurang sesuai TP. Verifikasi hitung menangkap kesalahan hitung, bukan kesesuaian TP, sehingga layar pilih model menampilkan hasil golden set per model.
- Privasi: tingkat gratis tertentu mencatat atau melatih dari prompt. Aplikasi menampilkan peringatan per penyedia dan tidak pernah mengirim data siswa.
- Akses peramban (CORS): tiap penyedia diuji lebih dulu; penyedia yang tidak dapat dipanggil langsung hanya didukung lewat proxy opsional (F-27).
- Batas gratis: kecil dan berubah; aplikasi menampilkan sisa kuota dari respons penyedia dan tidak menjanjikan angka tertentu.

## Mesin Gambar dan Ekspor

Gambar soal dibuat dari templat bergaya fungsi: parameter masuk, SVG keluar. Parameter yang sama dipakai untuk menghitung jawaban, sehingga gambar dan kunci tidak mungkin berbeda.

### Pustaka templat MVP (Matematika SD)

| Templat | Parameter | Dipakai untuk |
| --- | --- | --- |
| garis\_bilangan | min, maks, langkah, titik\[\], lompatan\[\] | Bilangan bulat, pecahan, penjumlahan pada garis |
| pecahan\_batang | penyebut, diarsir, jumlah\_batang | Pecahan, perbandingan, kesetaraan |
| pecahan\_lingkaran | penyebut, diarsir | Pecahan dasar |
| bangun\_datar | jenis, sisi\[\], sudut\[\], label\[\] | Keliling, luas, sifat bangun |
| grid\_luas | baris, kolom, sel\_diarsir\[\] | Luas dengan petak satuan |
| diagram\_batang | kategori\[\], nilai\[\], skala, judul | Data dan statistik sederhana |
| piktogram | kategori\[\], jumlah\[\], nilai\_per\_ikon | Data kelas rendah |
| jam\_analog | jam, menit | Waktu |
| blok\_nilai\_tempat | ratusan, puluhan, satuan | Nilai tempat |
| penggaris | mulai, panjang\_objek, satuan | Pengukuran panjang |

Aturan templat: ukuran dasar tetap (viewBox seragam), hitam putih yang terbaca saat dicetak, teks pada gambar memakai font yang sama dengan dokumen, dan setiap gambar memiliki teks alternatif. Ilustrasi AI dan unggahan gambar baru masuk pada V1 dan selalu berlabel "perlu ditinjau".

### Layanan ekspor

| Format | Cara (di peramban) | Catatan |
| --- | --- | --- |
| Word (.docx) | docx-js dari model soal; rumus dalam subset LaTeX menjadi Office Math asli, gambar PNG | Times New Roman 12 diatur pada gaya dokumen (bukan per paragraf); pakem penulisan soal; kunci, pembahasan, kisi-kisi di halaman terpisah |
| PDF | jsPDF dengan penata huruf sendiri (pecahan bertumpuk), gambar soal vektor lewat svg2pdf.js | Liberation Serif 12 pt ditanam (metrik sama dengan Times New Roman; Times New Roman berlisensi dan tidak boleh disebarkan bersama aplikasi), simbol matematika dari GenSoal Simbol (potongan DejaVu Sans), huruf Arab dari GenSoal Arab (potongan Amiri) dengan penyambung huruf sendiri; pakem penulisan soal |
| LaTeX (.tex), menu lanjutan | Templat .tex dari model soal; gambar diterjemahkan ke TikZ | Berkas teks untuk dikompilasi sendiri; templat sendiri (14 pt, dua kolom untuk soal sederhana) yang tidak memengaruhi Word dan PDF |
| Cetak, menu lanjutan | Tampilan cetak peramban sebagai cadangan bila PDF gagal | Pakem dan font yang sama dengan Word dan PDF |
| xlsx (V1) | Kisi-kisi dan rekap | Satu lembar per dokumen |
| LMS (V1) | Google Forms dan QTI | Hanya bentuk yang dapat dinilai otomatis |

Pecahan di semua format ditampilkan sebagai pecahan bertumpuk (KaTeX di layar, \\frac di LaTeX, Office Math di Word, SVG vektor di PDF), bukan a/b. Lembar soal, kunci jawaban (pembahasan ikut di dalamnya bila dipilih), dan kisi-kisi selalu diunduh sebagai berkas terpisah. Kisi-kisi mencatat kelas, mapel, CP, dan TP yang dipakai; baris jejak versi aplikasi dan versi soal tidak dicetak di berkas maupun disimpan di properti berkas (permintaan pemilik, 25 Oktober 2026). Gambar SVG diubah ke PNG 300 dpi untuk Word. Pembuatan berkas besar berjalan di Web Worker agar layar tidak membeku. Syarat penerimaan: satu paket 25 soal dengan rumus dan gambar terunduh sebagai Word dan PDF dalam waktu di bawah 10 detik di laptop sekolah biasa.

### Pakem penulisan soal (Word dan PDF)

Semua keluaran memakai satu pakem tetap.

| Bentuk soal | Tampilan | Tempat jawaban |
| --- | --- | --- |
| Pilihan ganda | Opsi A sampai D (E untuk kelas 10 ke atas); 2 kolom bila pendek, 1 kolom bila panjang | Siswa menyilang huruf |
| Benar-salah | Tabel 4 kolom: No, Pernyataan, Benar, Salah | Siswa mencentang kotak; pilihan lain (Pengaturan lanjutan): tabel No, Pernyataan, Jawaban dengan B dan S untuk dilingkari |
| Isian singkat | Kalimat soal diikuti "Jawaban : ...." | Titik-titik; kotak bila jawabannya angka atau soalnya soal cerita |
| Uraian penjelasan | Soal yang meminta alasan atau pernyataan | Garis tulis, jumlah garis mengikuti bobot rubrik (2 sampai 6) |
| Uraian hitungan | Soal yang meminta perhitungan | Kotak "Cara pengerjaan" dan di bawahnya kotak "Jawaban akhir" |

Aturan umum:

1. Setiap bagian berjudul huruf (A, B, C, D) dan memuat satu kalimat petunjuk cara menjawab.
2. Times New Roman 12, nomor rata kiri, pecahan bertumpuk.
3. Soal dan tempat jawabnya tidak boleh terpisah antar-halaman.
4. Soal cerita selalu diikuti kotak jawab tepat di bawahnya.
5. Gambar diletakkan di bawah teks soal dan tidak melebihi lebar kolom.
6. Setiap soal uraian membawa tanda jenis jawaban (penjelasan atau hitungan). AI mengisinya saat membuat soal, dan guru dapat mengubahnya di layar Periksa.
7. Kepala lembar: nama sekolah di kiri, mapel dan kelas di kanan, garis bawah, baris identitas siswa (Nama, Kelas, No. absen), lalu judul paket di tengah.

## Arsitektur Teknis dan API

Satu aplikasi web statis (PWA) yang berjalan sepenuhnya di peramban. Tidak ada basis data, akun, atau penyimpanan soal di server. Model AI dipanggil langsung dari peramban memakai kunci milik guru lewat adaptor per penyedia. Mesin verifikasi sengaja berada di kode sendiri, terpisah dari model AI, agar kunci dihitung ulang oleh pihak yang tidak ikut membuat soal.

&#91;embedded content: arsitektur · 4 lapis, 1 layanan eksternal\]

Antarmuka membaca dan menulis IndexedDB secara langsung. Pekerjaan generasi diatur oleh peramban per butir: tiap butir dikirim ke penyedia yang dipilih guru, hasilnya diverifikasi di perangkat, lalu disimpan sebelum butir berikutnya, sehingga dapat dilanjutkan setelah tab ditutup. Kunci API guru tersimpan lokal dan tidak pernah melewati server kita. Server hanya muncul pada V1: validasi lisensi sekali bayar, dan proxy isi ulang opsional bagi guru yang tidak mau mengurus kunci.

### Daftar API MVP

| Endpoint | Fungsi | Rilis |
| --- | --- | --- |
| GET /models/registri.json | Registri model: penyedia, label, status, hasil golden set (statis) | MVP |
| POST /api/lisensi/validasi | Validasi kode lisensi, catat perangkat, kembalikan token | V1 |
| POST /api/lisensi/kirim-ulang | Kirim ulang kode ke email pembeli | V1 |
| POST /api/webhook/pembayaran | Terima notifikasi pembayaran, buat dan kirim kode lisensi | V1 |
| POST /api/proxy/generate | Proxy isi ulang opsional ke penyedia AI, dengan kuota per kode | V1 |

## Model Bisnis dan Lisensi

Aplikasi dijual sekali bayar, sedangkan biaya AI ditanggung guru lewat kunci API sendiri. Dengan begitu pendapatan sekali tidak bertabrakan dengan biaya yang berulang. Lisensi memakai kode, bukan akun.

1. Guru membayar sekali (QRIS atau transfer lewat penyedia pembayaran).
2. Fungsi webhook membuat kode lisensi dan mengirimkannya ke email pembeli.
3. Guru menempelkan kode di aplikasi; fungsi validasi memberi token ke perangkat itu.
4. Satu kode dibatasi pada 2 sampai 3 perangkat. Pindah perangkat: masukkan kode lagi dan impor cadangan .gensoal.
5. Halaman kirim ulang kode memakai email pembeli, karena tanpa akun kode tidak dapat dipulihkan dengan cara lain.

Penegasan: ekspor berjalan di peramban sehingga tidak dapat dikunci rapat. Yang dikunci hanya aktivasi aplikasi, dan itu cukup untuk uji harga awal. Server hanya menyimpan tabel kecil berisi kode, email, dan jumlah perangkat; tidak ada soal dan tidak ada kunci API.

Harga ditetapkan setelah biaya per soal terukur pada sprint generasi: biaya per soal lolos (termasuk soal yang gagal dan diulang) menentukan berapa kuota nyata yang dapat dijanjikan, dan tarif gerbang pembayaran dihitung terpisah. Sebelum angka itu ada, harga hanyalah tebakan. Pada fase awal lisensi dapat ditunda; pilot cukup memakai aplikasi gratis.

## Keamanan, Kuota, Privasi, dan Hak Cipta

MVP tidak menyimpan data siswa dan tidak memiliki akun atau server data, sehingga risiko berpindah ke perangkat guru dan ke kunci API yang mereka tempel. Aturan berikut dibangun sejak awal karena memperbaikinya belakangan mahal.

- Data di perangkat. Soal dan pengaturan tersimpan tidak dikirim ke server kami; hanya konteks satu butir (CP, TP, teks materi yang ditempel guru) dikirim ke penyedia AI pilihan guru. Peringatkan guru untuk tidak menempel data siswa.
- Kunci API guru. Disimpan hanya di IndexedDB, tidak ikut berkas cadangan, dan dikirim hanya ke penyedia yang bersangkutan. Anjurkan guru membuat kunci khusus GenSoal dengan batas pengeluaran.
- Pengerasan peramban. Kebijakan keamanan konten yang ketat, tanpa skrip pihak ketiga yang tidak perlu, karena kunci di peramban dapat dicuri oleh skrip berbahaya.
- Peringatan per penyedia. Layar Pengaturan AI menyatakan bila tingkat gratis penyedia mencatat atau melatih dari prompt.
- Tampilan biaya. Biaya per soal dan total sesi dihitung dari token dan harga di registri, dengan peringatan pada angka yang diatur guru.
- Hak cipta. Instruksi model melarang menyalin; pemeriksa kemiripan membandingkan soal dengan soal lain di paket yang sama; teks yang ditempel guru dianggap tanggung jawab guru.
- Transparansi. Setiap soal membawa label dibuat dengan bantuan AI beserta status mutunya di layar Periksa. Berkas unduhan tidak memuat baris jejak (keputusan pemilik, 25 Oktober 2026).
- Data pribadi. Tanpa akun dan tanpa data siswa, MVP berada jauh dari cakupan UU Nomor 27 Tahun 2022; V1 hanya menyimpan email pembeli untuk lisensi, dan V2 (data siswa) menambah pemisahan identitas dari hasil, retensi data, dan persetujuan sekolah.
- Ketahanan data. Cadangan tidak otomatis: aplikasi meminta penyimpanan persisten, mengingatkan cadangan .gensoal mingguan, dan memperingatkan sebelum guru menghapus data situs.

## Struktur Repositori dan Cara Kerja dengan Agen AI

Agar pengembangan oleh agen AI tetap terarah, repositori berisi dokumen rancangan ini dan aturan kerja yang dibaca agen di awal setiap sesi. Modul dipisah menurut tanggung jawab sehingga satu tugas hampir selalu menyentuh satu folder.

```text
gensoal/
├─ AGENTS.md                 # aturan kerja agen AI
├─ docs/
│  ├─ RANCANGAN.md           # dokumen ini
│  └─ KEPUTUSAN.md           # pertanyaan terbuka dan keputusan
├─ data/
│  └─ golden/                # soal acuan per mapel dan fase
├─ scripts/
│  └─ uji-model.ts           # jalankan golden set per model, tulis hasil ke registri
├─ public/
│  └─ models/registri.json   # penyedia, model, lencana, hasil golden set
├─ src/
│  ├─ app/                   # layar dan rute
│  ├─ db/                    # skema Dexie, migrasi, cadangan .gensoal
│  ├─ kurikulum/             # pemetaan kelas ke fase, pemeriksa kualitas TP
│  ├─ ai/                    # adaptor per penyedia: gemini, openrouter, groq, mistral, openai, anthropic
│  ├─ generasi/              # komposisi, konteks, pengatur butir, cadangan antarmodel
│  ├─ verifikasi/            # pemeriksa per rumpun (mathjs, Pyodide)
│  ├─ gambar/                # templat SVG
│  ├─ ekspor/                # docx, pdf (Times New Roman 12), tex
│  ├─ bantuan/               # daftar video dan langkah teks
│  └─ komponen/              # elemen antarmuka bersama
├─ netlify/
│  └─ functions/             # V1: lisensi, webhook pembayaran, proxy opsional
└─ tests/                    # unit dan golden
```

### Isi AGENTS.md

1. Baca `docs/RANCANGAN.md` sebelum mengerjakan tugas; kerjakan hanya fitur dengan ID yang diminta.
2. Setiap perubahan skema IndexedDB lewat nomor versi Dexie baru dengan fungsi migrasi; jangan mengubah versi lama.
3. Jangan menaruh rahasia di kode atau repositori; semua melalui variabel lingkungan.
4. Setiap pemeriksa dan templat gambar wajib punya uji unit dan sedikitnya lima kasus golden.
5. Fitur dianggap selesai bila: uji lulus, tidak ada galat tipe, layar diperiksa di lebar ponsel dan laptop, dan kriteria selesai sprint terpenuhi.
6. Bila rancangan ambigu atau bertentangan, berhenti dan catat pertanyaan di `docs/KEPUTUSAN.md`, jangan menebak.
7. Aplikasi tidak membawa data kurikulum (v0.4): kelas, mapel, CP, dan TP selalu dari isian guru; jangan menulis CP atau TP di kode.

## Rencana Sprint

MVP dikerjakan dalam tujuh sprint dua mingguan, sekitar 14 minggu bila Anda bekerja paruh waktu dengan bantuan agen AI. Perkiraan waktu tergantung jam kerja Anda yang tersedia dan harus dikoreksi setelah Sprint 1. Setiap sprint berakhir pada kriteria selesai yang dapat diuji; tidak lanjut bila belum terpenuhi.

| Sprint | Fokus | Fitur | Kriteria selesai |
| --- | --- | --- | --- |
| S0 | Fondasi proyek | F-01 | Repositori, deploy, dan PWA dasar berjalan; skema Dexie siap |
| S1 | Formulir, komposisi, dan preset | F-03, F-04, F-15 | Uji unit komposisi lulus untuk semua n dari 5 sampai 50 dan semua kombinasi persentase kelipatan 5; jumlah selalu sama dengan n; guru dapat menulis CP dan TP langsung di layar Buat, menyimpannya sebagai pengaturan tersimpan, dan membuat soal dengan satu klik |
| S2 | Generasi dan verifikasi | F-05, F-06, F-07 | 100 soal acuan: semua kunci benar lolos; 100% soal yang sengaja diberi kunci salah ditolak; soal ditolak diganti otomatis; golden set dijalankan pada tiap model di registri |
| S3 | Gambar terprogram | F-08 | Sepuluh templat, masing-masing dengan lima kasus uji; gambar dan kunci selalu konsisten; tercetak jelas hitam putih |
| S4 | Periksa, pengaturan AI | F-09, F-13, F-14, F-16, F-17 | Guru dapat menyunting dan mengganti soal; soal tanpa cek otomatis diberi keterangan (gerbang unduh dihapus pada v0.5); kunci API tersimpan lokal dan lolos uji kunci pada sedikitnya dua penyedia; biaya tercatat per soal; halaman bantuan terpasang |
| S5 | Unduh, dokumen turunan, dan cadangan | F-10, F-11, F-12 | docx terbuka di Word dan PDF terunduh langsung dengan Times New Roman 12 mengikuti pakem penulisan soal, lengkap dengan rumus, gambar, kop, kisi-kisi, dan kunci; .tex terkompilasi tanpa galat; pecahan bertumpuk; impor .gensoal memulihkan semua data |
| S6 | Pilot internal | Semua F MVP | Anda dan tiga guru (termasuk uji dengan 3 orang awam: catat titik berhenti mereka) membuat soal untuk ujian nyata; daftar perbaikan prioritas terkumpul; tidak ada soal salah kunci lolos |

### Setelah MVP

- **V1 (sekitar 6 sprint):** lisensi sekali bayar, cadangan antarmodel, proxy isi ulang opsional, bank soal dan paket A/B/C, paket mapel IPAS dan Bahasa Indonesia, layanan SymPy, ilustrasi AI, bank bersama per sekolah (memerlukan server dan akun), ekspor xlsx dan LMS. Setiap mapel baru dibuka hanya setelah lolos gerbang mutu pada bagian berikutnya.
- **V2:** analisis hasil, remedial dan pengayaan, ujian daring, perangkat ajar, dan kurikulum tambahan, disusun ulang berdasarkan data pilot.

## Pengujian dan Gerbang Mutu

Kepercayaan guru adalah risiko terbesar, jadi mutu diukur dengan data, bukan kesan. Tiga lapis pengujian dipakai: uji kode, set soal acuan (golden set), dan telaah manusia.

- **Uji kode.** Komposisi, pemeriksa, templat gambar, dan ekspor memiliki uji unit otomatis yang berjalan setiap perubahan.
- **Golden set.** Per mapel dan fase disiapkan soal dengan kunci yang diketahui benar, ditambah soal salah-kunci yang sengaja dibuat; pemeriksa harus meloloskan semua yang benar dan menolak semua yang salah. Golden set juga dijalankan per model AI untuk memberi lencana direkomendasikan.
- **Telaah manusia.** Anda dan guru penguji menilai sampel soal hasil generasi dengan lembar penilaian: kesesuaian TP, kebenaran kunci, kaidah butir, kewajaran konteks.

### Gerbang pembukaan mata pelajaran

Pemeriksa otomatis untuk satu rumpun mapel boleh diaktifkan (sehingga soalnya tidak lagi berketerangan "Kunci tidak dicek otomatis") bila seluruh syarat berikut terpenuhi. Sebelum itu soal rumpun tersebut tetap berketerangan demikian.

- [ ] Golden set lulus 100% pada pemeriksa mapel itu.
- [ ] Sampel sedikitnya 200 soal hasil generasi telah ditelaah guru penguji, dengan kunci salah atau tidak sesuai TP di bawah 1% untuk rumpun terverifikasi hitung, dan di bawah 5% untuk rumpun lain sebelum telaah guru.
- [ ] Paket mapel memiliki aturan penulisan, contoh acuan, dan templat gambar yang sesuai.
- [ ] Pemeriksa diaktifkan di `src/paket/` pada rilis aplikasi, tercatat di riwayat commit.

Angka ambang di atas adalah usulan awal dan akan dikalibrasi setelah pilot.
