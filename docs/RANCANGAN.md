# Rancangan Pengembangan Aplikasi GenSoal

Oct 17, 2026 · @Itman Arif Hariri

GenSoal adalah aplikasi web yang membuat soal dari data Kurikulum Merdeka yang tersimpan terstruktur, memverifikasi kuncinya, lalu menghasilkan dokumen asesmen siap pakai untuk kelas 1 sampai 12. Dokumen ini adalah cetak biru versi 0.3, dengan arsitektur lokal-dulu tanpa akun, kunci API milik guru, dan banyak penyedia AI; setiap bagian dapat Anda ubah dan akan menjadi acuan tunggal bagi pengembangan.

## Ringkasan dan Prinsip Desain

Enam prinsip berikut menjadi pegangan setiap keputusan teknis. Bila ada fitur atau solusi yang bertentangan dengannya, fitur itu ditunda atau dirancang ulang.

1. **Data kurikulum dulu, AI kemudian.** Soal dihasilkan dari CP, TP, dan indikator yang tersimpan sebagai data, tidak dari ingatan bebas model.
2. **Verifikasi sebelum tampil.** Soal yang kuncinya tidak lolos pemeriksaan otomatis tidak pernah sampai ke layar guru.
3. **Draf sampai disetujui guru.** Setiap soal melewati status draf, ditelaah, lalu disetujui. Tidak ada soal yang langsung final.
4. **Gambar dihitung, bukan ditebak.** Diagram yang menuntut presisi dibuat dari parameter soal, bukan digambar model gambar.
5. **Modular per mata pelajaran.** Setiap mata pelajaran punya paket sendiri (aturan verifikasi, templat gambar, gaya soal) yang dapat dibuka atau ditutup tanpa mengubah inti aplikasi.
6. **Lokal dulu.** Tanpa akun: soal dan kurikulum kustom tinggal di peramban guru, dokumen diunduh langsung dari perangkat, dan hanya permintaan ke model AI yang melewati server.

Satu prinsip tambahan mengikat seluruh fitur administrasi: dokumen turunan (kisi-kisi, kunci, rubrik, paket A/B, analisis) selalu dihitung dari data soal yang sama, tidak diketik ulang.

## Keputusan Awal dan Pertanyaan Terbuka

Versi 0.3 memilih arsitektur lokal-dulu: tanpa akun, data di peramban guru, ekspor langsung dari perangkat. Biaya AI ditanggung guru lewat kunci API sendiri dari banyak penyedia (beberapa memiliki tingkat gratis), sehingga server hampir tidak diperlukan. Pilihan ini memindahkan tiga tanggung jawab ke tempat lain: cadangan data (ke guru), biaya AI (ke guru), dan mutu model (ke registri dan golden set Anda). Semua baris adalah usulan; ubah yang tidak cocok.

| Topik | Usulan | Alasan |
| --- | --- | --- |
| Nama produk | GenSoal (sementara) | Cukup untuk kode dan dokumen; mudah diganti |
| Platform | Aplikasi web yang dapat dipasang (PWA), tanpa akun | Dibuka dari tautan; menyunting dan mengekspor tetap jalan tanpa internet |
| Antarmuka | React, Vite, TypeScript, Tailwind; dibangun sebagai situs statis | Tanpa server aplikasi; mudah dikerjakan agen AI |
| Penyimpanan data | IndexedDB di peramban (pustaka Dexie), dengan permintaan penyimpanan persisten | Soal dan kurikulum kustom tinggal di perangkat guru |
| Cadangan dan pindah perangkat | Ekspor dan impor berkas .gensoal (JSON) | Satu-satunya jalur pindah perangkat tanpa akun |
| Data kurikulum resmi | Berkas JSON berversi di repositori, dibangun dari CSV kurator dan dibundel ke aplikasi | Tanpa basis data server; pembaruan lewat rilis aplikasi |
| Hosting | Netlify: situs statis; proxy isi ulang opsional pada V1 | Satu layanan; deploy otomatis dari repositori |
| Akses model AI | Kunci API milik guru (BYOK), banyak penyedia: Gemini, OpenRouter, Groq, Mistral, OpenAI, Anthropic; panggilan langsung dari peramban lewat adaptor per penyedia | Biaya AI ditanggung guru; beberapa penyedia memiliki tingkat gratis |
| Pilihan model | Registri berlencana (direkomendasikan, stabil, pratinjau, usang) digabung dengan daftar model langsung dari penyedia | Daftar model sering berubah; kelayakan diuji dengan golden set |
| Verifikasi hitung | mathjs di peramban; SymPy lewat Pyodide pada V1 | Berjalan di perangkat guru, tanpa server |
| Rumus | KaTeX, pecahan bertumpuk | Sesuai preferensi tampilan matematika Anda |
| Gambar | Generator SVG berbasis templat; diubah ke PNG saat ekspor Word | Presisi; Word memerlukan gambar raster |
| Ekspor | Word (.docx) dan PDF dibuat langsung di peramban; LaTeX (.tex) sebagai berkas teks | Tanpa server; PDF tidak dikompilasi dari LaTeX |
| Templat PDF dan LaTeX bawaan | Font 14 pt, dua kolom untuk soal sederhana, kotak jawaban di bawah soal cerita | Mengikuti format lembar soal matematika yang Anda pakai |
| Bantuan | Video langkah pemakaian 1 sampai 3 menit, disematkan di layar terkait, dengan langkah teks di bawahnya | Hambatan terbesar adalah memasang kunci API; video dan teks mudah diperbarui |
| Bahasa | Antarmuka Indonesia; soal Indonesia, Inggris, atau dwibahasa | Sesuai kebutuhan sekolah bilingual |
| Monetisasi | Bayar sekali untuk aplikasi (kode lisensi, tanpa akun); biaya AI tidak di pihak Anda | Pendapatan sekali, sehingga biaya berulang tidak boleh ditanggung penjual |

### Pertanyaan yang perlu Anda putuskan

- [ ] Urutan mata pelajaran yang dibuka pertama. Usul: Matematika, IPAS, Bahasa Indonesia, Bahasa Inggris, lalu rumpun lain.
- [ ] Penyedia AI yang didukung di MVP. Usul: Gemini dan OpenRouter (tingkat gratis tanpa kartu), ditambah satu berbayar (Anthropic atau OpenAI); Groq dan Mistral menyusul.
- [ ] Harga dan bentuk lisensi sekali bayar, serta batas jumlah perangkat per kode (usul: 2 sampai 3). Harga ditetapkan setelah biaya soal per model terukur.
- [ ] Siapa kurator data kurikulum resmi dan bagaimana validasinya, karena aplikasi tidak lagi memiliki antrean validator.
- [ ] Apakah PDF boleh berbeda tampilan dari hasil kompilasi LaTeX Anda, atau wajib dikompilasi dari LaTeX (itu memerlukan server kompilasi).
- [ ] Apakah kurikulum madrasah (Kemenag) masuk lingkup awal atau ditunda.

## Pengguna dan Peran

Tanpa akun, tidak ada peran yang ditegakkan oleh sistem: siapa pun yang membuka aplikasi di perangkatnya adalah pemilik datanya. Peran di bawah menjadi cara kerja dan kebutuhan fitur, bukan hak akses. Peran yang bergantung pada server ditunda sampai ada backend.

| Peran | Tugas utama | Cara kerja tanpa akun | Rilis |
| --- | --- | --- | --- |
| Guru | Membuat, menyunting, menyetujui, dan mengekspor soal | Semua data di peramban perangkatnya; pindah perangkat lewat berkas .gensoal | MVP |
| Kurator data | Menyusun dan memvalidasi data CP dan TP resmi | Bukan peran di aplikasi: bekerja di repositori (CSV ke JSON berversi), terbit lewat rilis | MVP |
| Pengembang | Merawat registri model dan golden set per model | Lewat repositori dan rilis aplikasi, bukan layar admin | MVP |
| Validator isi | Menelaah soal rumpun berisiko tinggi | Ditunda; pada MVP guru menelaah sendiri soal berstatus perlu\_telaah | V2 |
| Koordinator dan admin sekolah | Bank soal bersama, kop sekolah, kuota sekolah | Memerlukan server dan akun; ditunda | V2 |

## Lingkup Rilis

MVP dibatasi pada satu jalur lengkap: dari pemilihan TP sampai ekspor soal terverifikasi. Fitur ditandai dengan ID agar bisa dirujuk di tugas pengembangan.

| ID | Fitur | Rilis |
| --- | --- | --- |
| F-01 | Profil lokal guru dan kop sekolah dasar (tanpa login) | MVP |
| F-02 | Katalog kurikulum: kurikulum, fase, mapel, elemen, CP, TP (data resmi baca saja untuk guru) | MVP |
| F-03 | Formulir Buat soal satu halaman: semua isian di satu tempat, dapat disimpan sebagai preset, lalu Generate | MVP |
| F-04 | Pengaturan komposisi kesukaran (tiga penggeser, sisa terbesar) | MVP |
| F-05 | Bentuk soal: pilihan ganda, isian singkat, benar-salah, uraian | MVP |
| F-06 | Pembuatan soal oleh AI dengan keluaran JSON terstruktur lewat adaptor penyedia | MVP |
| F-07 | Verifikasi otomatis (hitung ulang, kaidah butir, duplikasi) dan status mutu | MVP |
| F-08 | Gambar terprogram untuk Matematika SD (garis bilangan, pecahan, bangun datar, diagram batang, jam) | MVP |
| F-09 | Editor soal: sunting, kunci, ganti, buat ulang per butir | MVP |
| F-10 | Kisi-kisi, kunci, dan pembahasan otomatis | MVP |
| F-11 | Unduh langsung Word (.docx) dan PDF lengkap dari peramban, plus LaTeX (.tex) | MVP |
| F-12 | Cadangan dan pemulihan: ekspor dan impor berkas .gensoal, pengingat cadangan, penyimpanan persisten | MVP |
| F-13 | Telaah mandiri: daftar soal perlu\_telaah yang harus dicek guru sebelum ekspor | MVP |
| F-14 | Pengaturan AI: kunci API milik guru, banyak penyedia, uji kunci, peringatan biaya dan privasi per penyedia | MVP |
| F-15 | CP dan TP ditulis langsung di formulir atau diambil dari data resmi, lalu tersimpan di preset; editor kurikulum kustom penuh (pohon, versi) menyusul di V1 | MVP |
| F-16 | Registri model: daftar model per penyedia dengan lencana (direkomendasikan, stabil, pratinjau, usang) dan daftar model langsung dari penyedia | MVP |
| F-17 | Bantuan di aplikasi: video langkah pemakaian dan langkah teks pada layar terkait | MVP |
| F-18 | Cadangan otomatis antarmodel saat batas penyedia tercapai | V1 |
| F-19 | Lisensi sekali bayar: kode lisensi, validasi, batas perangkat, kirim ulang kode | V1 |
| F-20 | Bank soal: simpan, cari, pakai ulang | V1 |
| F-21 | Paket A/B/C dengan pengacakan soal dan opsi | V1 |
| F-22 | Bentuk soal tambahan: pilihan ganda kompleks, menjodohkan, soal bertumpu stimulus | V1 |
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
| F-35 | Paket kurikulum resmi tambahan: Cambridge, Edexcel, madrasah (guru sudah dapat membuatnya sendiri lewat F-15) | V2 |

## Alur Pengguna

Alur utama berjalan dari formulir sampai ekspor, dengan verifikasi otomatis di tengahnya sehingga soal bermasalah tidak pernah tampil di layar guru.

&#91;embedded content: alur pembuatan soal · 6 langkah, 1 keputusan\]

Soal yang gagal verifikasi dibuat ulang otomatis (maksimal tiga kali) dan hanya soal yang lolos yang mengurangi batas harian. Soal berstatus perlu\_telaah baru dapat diekspor setelah guru menandainya telah ditelaah.

### Alur pendukung

- Kurator data: impor CSV CP dan TP ke repositori, cocokkan dengan dokumen resmi, jalankan skrip pembangun JSON, lalu rilis versi aplikasi.
- Telaah mandiri: buka daftar perlu\_telaah, baca soal beserta kunci dan sumbernya, tandai telah ditelaah atau buang.
- Cadangan: ekspor berkas .gensoal secara berkala, atau impor untuk memulihkan dan memindah perangkat.
- Mengganti satu butir: pilih butir, buat ulang dengan kategori yang sama, bandingkan dengan versi lama, lalu terima atau kembalikan.

## Rancangan Layar

Tujuh layar membentuk MVP. Wizard adalah layar terpenting: semua keputusan komposisi soal dibuat di sana, sehingga aturannya ditulis rinci.

| Layar | Rute | Elemen utama | Aksi |
| --- | --- | --- | --- |
| Beranda | / | Soal terbaru, daftar preset, tombol Buat Soal, status kunci API, pengingat cadangan | Buka soal, pakai preset, mulai buat soal |
| Buat soal | /soal/baru | Satu halaman berisi semua isian: preset, kurikulum dan kelas, mapel, CP dan TP, komposisi, opsi; bilah bawah dengan Simpan sebagai preset dan Generate | Isi, simpan preset, Generate |
| Peninjauan | /soal/\[id\] | Daftar soal dengan gambar, kunci, pembahasan, label TP, level kognitif, lencana status mutu | Sunting, kunci, ganti, buat ulang, setujui, tandai ditelaah |
| Ekspor | /soal/\[id\]/ekspor | Format Word, PDF, atau LaTeX; templat kop; opsi sertakan kunci dan kisi-kisi; pratinjau halaman | Unduh langsung |
| Profil dan pengaturan | /pengaturan | Nama sekolah, logo, templat identitas siswa, mode gelap | Simpan |
| Pengaturan AI | /pengaturan/ai | Pilih penyedia, tempel kunci, uji kunci, daftar model berlencana, hasil golden set per model, peringatan biaya dan privasi, tombol Tonton caranya | Simpan kunci, uji, pilih model utama dan cadangan |
| Cadangan | /cadangan | Ukuran data, tanggal cadangan terakhir, status penyimpanan persisten, daftar preset | Ekspor .gensoal, impor, hapus semua data |

### Aturan formulir dan preset

1. **Preset.** Di bagian atas, guru memilih preset tersimpan (mengisi semua isian sekaligus) atau mulai dari kosong. Setelah memilih preset, guru tinggal menekan Generate atau mengubah isian seperlunya.
2. **Kurikulum, kelas, dan mapel.** Kurikulum resmi (awal: Kurikulum Merdeka) atau kustom; kelas 1 sampai 12; fase terisi otomatis. Mapel menentukan rumpun dan pemeriksa jawaban.
3. **CP dan TP.** Guru mengetik langsung (satu TP satu baris; CP boleh dikosongkan), atau menekan Ambil dari kurikulum resmi untuk memilih dengan kotak centang. Pemeriksa kualitas TP memberi saran tanpa memblokir. Minimal satu TP.
4. **Komposisi.** Jumlah soal (5 sampai 50) dan tiga persentase kesukaran yang saling terkunci pada total 100%. Tabel jumlah per kategori diperbarui langsung.
5. **Opsi.** Bentuk soal, bahasa soal, gaya soal (biasa, numerasi, literasi, HOTS), soal bergambar, dan teks materi tempel (opsional, maksimal 3.000 kata).
6. **Simpan dan Generate.** Bilah bawah memuat kotak Simpan sebagai preset (dengan nama) dan tombol Generate. Preset menyimpan semua isian kecuali judul paket; pembuatan soal dimulai langsung dan mengarahkan ke Peninjauan.

Pembuatan soal berjalan dari peramban butir demi butir, dan setiap butir yang lolos langsung disimpan di IndexedDB. Bila tab tertutup di tengah jalan, guru melanjutkan dari butir terakhir yang tersimpan.

### Bantuan di dalam aplikasi

Hambatan terbesar bagi guru bukan membuat soal, tetapi memasang kunci API. Karena itu bantuan ditempatkan di layar yang bermasalah, bukan hanya di halaman bantuan: tombol Tonton caranya pada Pengaturan AI, formulir Buat soal, dan layar Cadangan.

- Memasang kunci API: buat akun penyedia, buat kunci dengan batas pengeluaran, tempel di GenSoal, lalu tekan uji kunci.
- Membuat soal pertama: enam langkah wizard sampai unduh Word atau PDF.
- Menulis kurikulum sendiri: CP dan TP kustom.
- Cadangan dan pindah perangkat: ekspor dan impor berkas .gensoal.

Aturan: satu tugas per video, 1 sampai 3 menit, dengan teks terjemahan dan langkah teks di bawahnya agar mudah diperbarui saat tampilan berubah. Video disematkan dari daftar putar tidak terdaftar; aplikasi tetap berjalan tanpa internet, hanya videonya yang tidak. Video kunci API direkam paling akhir karena situs penyedia sering berubah.

## Kurikulum Kustom

Guru dapat menulis sendiri elemen, CP, TP, dan indikator untuk setiap fase, sehingga GenSoal berlaku untuk kurikulum sekolah, muatan lokal, atau kurikulum lain di luar data resmi, tanpa menunggu kurator. Fitur ini ditandai F-15 dan masuk MVP karena mengubah model data; menambahkannya belakangan akan memaksa migrasi besar.

### Dua jenis sumber kurikulum

| Jenis | Penulis | Dapat dilihat oleh | Penanda pada soal dan dokumen |
| --- | --- | --- | --- |
| Resmi | Kurator, dari dokumen keputusan | Semua guru | Nomor keputusan dan versi |
| Kustom | Guru | Pemilik, di perangkatnya; dibagikan lewat berkas .gensoal | Nama kurikulum kustom dan versi TP |

### Cara guru mengisi

1. Di formulir Buat soal, guru memilih kelas dan mapel, lalu memilih rumpun mapel (Matematika, IPA, Bahasa, IPS, dan seterusnya), sebab rumpun menentukan pemeriksa jawaban.
2. Pada bagian CP dan TP, guru mengetik CP (opsional) dan TP satu per baris, atau mengambilnya dari kurikulum resmi lalu menyuntingnya.
3. Guru menyimpan seluruh isian sebagai preset agar pembuatan soal berikutnya tinggal memilih preset lalu Generate.

Tiga jalan untuk mengisinya:

- **Ketik manual** langsung di formulir Buat soal: CP dan TP, satu TP satu baris. Editor pohon lengkap menyusul di V1.
- **Salin dari resmi lalu sunting.** Baris hasil salinan menyimpan rujukan ke induknya (`induk_id`), sehingga guru dapat melihat apa yang diubah.
- **Tempel teks atau unggah CSV.** Sistem mengusulkan pembagian menjadi elemen dan TP sebagai draf; guru menyetujui atau menyunting satu per satu, dan tidak ada yang tersimpan sebelum disetujui.

### Pemeriksa kualitas TP

Soal hanya sebaik TP yang menjadi dasarnya: rumusan samar menghasilkan soal samar. Karena itu editor memberi saran saat guru menulis TP, tanpa memblokir penyimpanan. Pemeriksa menilai empat hal: ada kata kerja yang dapat diamati, satu kompetensi per TP, lingkup materi jelas, dan tingkat kognitif dapat ditentukan.

| Rumusan TP | Penilaian | Alasan |
| --- | --- | --- |
| Siswa memahami pecahan. | Lemah | Kata kerja tidak dapat diamati; lingkup tidak jelas |
| Siswa dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya. | Baik | Perilaku dapat diamati; lingkup jelas; kira-kira level C3 |

TP yang lolos pemeriksa mendapat lencana "siap dipakai". Lencana ini berbeda dari "tervalidasi", yang hanya diberikan kurator kepada data resmi.

### Dampak pada pembuatan dan verifikasi soal

- Alur generasi sama persis; hanya sumber konteksnya yang berbeda (penyimpanan yang sama, entri berlingkup pribadi).
- Verifikasi hitung tetap berlaku karena memeriksa soal, bukan TP. Rumpun yang dipilih guru menentukan pemeriksa; bila rumpun tidak dipilih, soal berstatus `perlu_telaah`.
- Gerbang pembukaan mata pelajaran tidak berlaku untuk kurikulum kustom, karena guru bertanggung jawab atas isi kurikulumnya. Soal dari kurikulum kustom tidak pernah berlabel "divalidasi validator" karena MVP tidak memiliki validator.
- Kisi-kisi dan berkas ekspor mencantumkan nama kurikulum kustom dan label "kurikulum kustom", bukan nomor keputusan.

### Perubahan data

- Penyimpanan kurikulum, mata pelajaran, elemen, CP, TP, dan indikator memiliki kolom cakupan (resmi atau pribadi), induk\_id, dan versi; mata pelajaran kustom juga menyimpan rumpun pilihan guru. Data resmi dimuat dari JSON bundel dan tidak diubah; data kustom disimpan di IndexedDB.
- Mengubah TP kustom membuat versi baru. Soal lama menunjuk versi TP yang dipakainya, sehingga kisi-kisi lama tidak berubah diam-diam.
- Tidak ada pemisahan akses antarpengguna karena data tidak meninggalkan perangkat; kurikulum kustom ikut dalam berkas .gensoal bila guru mengekspornya.
- Batas wajar (usul awal: 500 TP) dan pembatasan laju pada pemeriksa kualitas, untuk menjaga ukuran penyimpanan dan biaya.

## Model Data

Data dibagi dua kelompok. Data kurikulum resmi berupa berkas JSON berversi yang dibundel ke aplikasi dan dibaca saja. Data milik guru (kurikulum kustom, soal, pengaturan) disimpan di IndexedDB lewat Dexie. Semua rekaman memakai kunci UUID, `dibuat_pada`, dan `diubah_pada`. Kolom pada tabel di bawah menjadi bentuk objek dan indeks; relasi dijaga oleh kode, bukan oleh basis data.

| Penyimpanan | Kolom utama | Catatan |
| --- | --- | --- |
| kurikulum (JSON resmi) | id, nama, versi, dasar\_hukum, berlaku\_dari, aktif | Berkas di public/kurikulum; soal menunjuk versi yang dipakai |
| fase (JSON resmi) | id, kurikulum\_id, kode (A sampai F), kelas\_dari, kelas\_sampai | Pemetaan fase ke kelas |
| mata\_pelajaran | id, kurikulum\_id, fase\_id, nama, rumpun, paket\_aktif | rumpun menentukan strategi verifikasi; paket\_aktif diatur di JSON |
| elemen | id, mapel\_id, nama, urutan | Contoh: Bilangan, Aljabar |
| capaian\_pembelajaran | id, elemen\_id, teks, sumber\_dokumen | sumber\_dokumen = nomor keputusan dan halaman |
| tujuan\_pembelajaran | id, cp\_id, kode, rumusan, kelas, lingkup\_materi | Resmi: dikurasi dengan status\_validasi; kustom: ditulis guru |
| indikator | id, tp\_id, rumusan, level\_kognitif (C1 sampai C6) | Dasar kisi-kisi |
| profil | id, nama, sekolah, kop\_json, logo\_blob, kunci\_api\_lokal | Satu rekaman per perangkat; kunci API sendiri tidak pernah ikut diekspor |
| paket\_soal | id, judul, parameter\_json, status | Satu permintaan = satu paket soal; parameter\_json = isi formulir yang sama dengan preset |
| soal | id, paket\_id, tp\_id, indikator\_id, bentuk, level\_kognitif, kesukaran\_rancangan, isi\_json, kunci\_json, pembahasan\_json, status\_mutu, status\_telaah, versi | isi\_json mengikuti skema di bagian Mesin AI |
| soal\_gambar | id, soal\_id, jalur, templat, parameter\_json, svg | jalur: terprogram, ilustrasi, unggahan |
| pekerjaan\_generasi | id, paket\_id, status, percobaan, galat, mulai, selesai | Kemajuan generasi agar dapat dilanjutkan setelah tab ditutup |
| pemakaian\_ai | id, tanggal, model, token\_masuk, token\_keluar, perkiraan\_biaya | Dasar batas harian di sisi klien; batas yang mengikat ada di proxy |
| log\_soal | id, soal\_id, aksi, sebelum\_json, sesudah\_json | Jejak suntingan; dapat dipangkas |

### Aturan data

- Kolom status\_mutu bernilai: terverifikasi\_hitung, terverifikasi\_aturan, perlu\_telaah, ditolak.
- Kolom status\_telaah bernilai: draf, ditelaah\_guru, ditolak. Status divalidasi oleh validator ditunda sampai ada server.
- Soal menyimpan kurikulum\_id dan tp\_id; mengubah rumusan TP membuat versi baru TP, tidak menimpa yang lama.
- Tanpa Row Level Security: seluruh data tinggal di perangkat. Konsekuensinya, kehilangan data peramban berarti kehilangan soal, sehingga cadangan .gensoal dan permintaan penyimpanan persisten (navigator.storage.persist) menjadi bagian MVP.
- Hapus bersifat lunak (dihapus\_pada) untuk soal dan paket, dengan tong sampah yang dikosongkan setelah 30 hari.
- Setiap perubahan skema IndexedDB lewat nomor versi Dexie baru dengan fungsi migrasi. Preset disimpan di toko preset: id, nama, parameter\_json (kurikulum, kelas, mapel, CP, TP, komposisi, bentuk, opsi), terakhir\_dipakai.

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

Kolom `verifikasi` diisi model sebagai instruksi pemeriksaan yang dijalankan kode. Pemeriksa menghitung ulang `ekspresi`, membandingkannya dengan `nilai`, lalu dengan opsi yang ditandai kunci. Bila ada selisih, soal gagal.

### Pemeriksa menurut rumpun

| Rumpun | Pemeriksa | Status bila lolos | Rilis |
| --- | --- | --- | --- |
| Matematika | Hitung ulang ekspresi dengan mathjs di peramban; gambar dibangkitkan dari parameter yang sama | terverifikasi\_hitung | MVP |
| IPA kuantitatif | Hitung ulang rumus dan satuan; SymPy lewat Pyodide di peramban | terverifikasi\_hitung | V1 |
| Bahasa | Aturan kebahasaan dan keterbacaan; penilai model kedua memeriksa kunci terhadap teks stimulus | terverifikasi\_aturan | V1 |
| IPS, Pancasila, Agama | Penambatan pada bahan rujukan terkurasi dengan kutipan sumber; telaah guru wajib | perlu\_telaah | V1 |
| Seni, PJOK, Informatika | Rubrik kinerja; eksekusi kode untuk soal pemrograman | terverifikasi\_aturan | V1 |

Soal berstatus `perlu_telaah` tidak dapat diekspor sebelum guru menyetujuinya dan, untuk rumpun risiko tinggi, mencentang bahwa kutipan sumber sudah diperiksa.

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
| Word (.docx) | docx-js dari model soal; rumus dalam subset LaTeX menjadi Office Math asli, sisanya gambar PNG | Kop sekolah, nomor soal, gambar, kisi-kisi, kunci di halaman terpisah; dapat disunting di Word |
| PDF | pdfmake atau jsPDF; rumus dari MathJax menjadi SVG vektor lewat svg2pdf.js, gambar soal tetap vektor, font ditanam | Satu klik unduh, lengkap dengan kop, gambar, kunci, dan kisi-kisi; tata letak mengikuti templat bawaan, bukan hasil kompilasi LaTeX |
| LaTeX (.tex) | Templat .tex dari model soal; gambar diterjemahkan ke TikZ | Berkas teks untuk dikompilasi sendiri (Overleaf atau TeX lokal); font 14 pt, dua kolom untuk soal sederhana, kotak jawaban di bawah soal cerita |
| Cetak | Tampilan cetak peramban sebagai cadangan bila PDF gagal | Pratinjau halaman sama dengan hasil cetak |
| xlsx (V1) | Kisi-kisi dan rekap | Satu lembar per dokumen |
| LMS (V1) | Google Forms dan QTI | Hanya bentuk yang dapat dinilai otomatis |

Pecahan di semua format ditampilkan sebagai pecahan bertumpuk (KaTeX di layar, \\frac di LaTeX, Office Math di Word, SVG vektor di PDF), bukan a/b. Setiap ekspor mencatat versi soal dan versi kurikulum di berkas agar dapat ditelusuri. Gambar SVG diubah ke PNG 300 dpi untuk Word. Pembuatan berkas besar berjalan di Web Worker agar layar tidak membeku. Syarat penerimaan: satu paket 25 soal dengan rumus dan gambar terunduh sebagai Word dan PDF dalam waktu di bawah 10 detik di laptop sekolah biasa.

## Arsitektur Teknis dan API

Satu aplikasi web statis (PWA) yang berjalan sepenuhnya di peramban. Tidak ada basis data, akun, atau penyimpanan soal di server. Model AI dipanggil langsung dari peramban memakai kunci milik guru lewat adaptor per penyedia. Mesin verifikasi sengaja berada di kode sendiri, terpisah dari model AI, agar kunci dihitung ulang oleh pihak yang tidak ikut membuat soal.

&#91;embedded content: arsitektur · 4 lapis, 1 layanan eksternal\]

Antarmuka membaca dan menulis IndexedDB secara langsung. Pekerjaan generasi diatur oleh peramban per butir: tiap butir dikirim ke penyedia yang dipilih guru, hasilnya diverifikasi di perangkat, lalu disimpan sebelum butir berikutnya, sehingga dapat dilanjutkan setelah tab ditutup. Kunci API guru tersimpan lokal dan tidak pernah melewati server kita. Server hanya muncul pada V1: validasi lisensi sekali bayar, dan proxy isi ulang opsional bagi guru yang tidak mau mengurus kunci.

### Daftar API MVP

| Endpoint | Fungsi | Rilis |
| --- | --- | --- |
| GET /kurikulum/\*.json | Berkas kurikulum resmi berversi (statis, di-cache oleh PWA) | MVP |
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

- Data di perangkat. Soal dan kurikulum kustom tidak dikirim ke server kami; hanya konteks satu butir (CP, TP, teks materi yang ditempel guru) dikirim ke penyedia AI pilihan guru. Peringatkan guru untuk tidak menempel data siswa.
- Kunci API guru. Disimpan hanya di IndexedDB, tidak ikut berkas cadangan, dan dikirim hanya ke penyedia yang bersangkutan. Anjurkan guru membuat kunci khusus GenSoal dengan batas pengeluaran.
- Pengerasan peramban. Kebijakan keamanan konten yang ketat, tanpa skrip pihak ketiga yang tidak perlu, karena kunci di peramban dapat dicuri oleh skrip berbahaya.
- Peringatan per penyedia. Layar Pengaturan AI menyatakan bila tingkat gratis penyedia mencatat atau melatih dari prompt.
- Tampilan biaya. Biaya per soal dan total sesi dihitung dari token dan harga di registri, dengan peringatan pada angka yang diatur guru.
- Hak cipta. Instruksi model melarang menyalin; pemeriksa kemiripan membandingkan soal dengan soal lain di paket yang sama; teks yang ditempel guru dianggap tanggung jawab guru.
- Transparansi. Setiap soal membawa label dibuat dengan bantuan AI beserta status mutunya, termasuk pada berkas ekspor.
- Data pribadi. Tanpa akun dan tanpa data siswa, MVP berada jauh dari cakupan UU Nomor 27 Tahun 2022; V1 hanya menyimpan email pembeli untuk lisensi, dan V2 (data siswa) menambah pemisahan identitas dari hasil, retensi data, dan persetujuan sekolah.
- Ketahanan data. Cadangan tidak otomatis: aplikasi meminta penyimpanan persisten, mengingatkan cadangan .gensoal mingguan, dan memperingatkan sebelum guru menghapus data situs. Versi kurikulum resmi tidak pernah dihapus dari bundel.

## Struktur Repositori dan Cara Kerja dengan Agen AI

Agar pengembangan oleh agen AI tetap terarah, repositori berisi dokumen rancangan ini dan aturan kerja yang dibaca agen di awal setiap sesi. Modul dipisah menurut tanggung jawab sehingga satu tugas hampir selalu menyentuh satu folder.

```text
gensoal/
├─ AGENTS.md                 # aturan kerja agen AI
├─ docs/
│  ├─ RANCANGAN.md           # dokumen ini
│  └─ KEPUTUSAN.md           # pertanyaan terbuka dan keputusan
├─ data/
│  ├─ sumber/                # CSV CP dan TP dari kurator
│  └─ golden/                # soal acuan per mapel dan fase
├─ scripts/
│  ├─ bangun-kurikulum.ts    # CSV ke JSON berversi
│  └─ uji-model.ts           # jalankan golden set per model, tulis hasil ke registri
├─ public/
│  ├─ kurikulum/             # JSON kurikulum resmi (dibundel, baca saja)
│  └─ models/registri.json   # penyedia, model, lencana, hasil golden set
├─ src/
│  ├─ app/                   # layar dan rute
│  ├─ db/                    # skema Dexie, migrasi, cadangan .gensoal
│  ├─ kurikulum/             # pemuat JSON resmi dan editor kustom
│  ├─ ai/                    # adaptor per penyedia: gemini, openrouter, groq, mistral, openai, anthropic
│  ├─ generasi/              # komposisi, konteks, pengatur butir, cadangan antarmodel
│  ├─ verifikasi/            # pemeriksa per rumpun (mathjs, Pyodide)
│  ├─ gambar/                # templat SVG
│  ├─ ekspor/                # docx, pdf, tex (Web Worker)
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
7. Data kurikulum tidak pernah ditulis di kode; selalu dari JSON di public/kurikulum atau dari IndexedDB untuk data kustom.

## Rencana Sprint

MVP dikerjakan dalam tujuh sprint dua mingguan, sekitar 14 minggu bila Anda bekerja paruh waktu dengan bantuan agen AI. Perkiraan waktu tergantung jam kerja Anda yang tersedia dan harus dikoreksi setelah Sprint 1. Setiap sprint berakhir pada kriteria selesai yang dapat diuji; tidak lanjut bila belum terpenuhi.

| Sprint | Fokus | Fitur | Kriteria selesai |
| --- | --- | --- | --- |
| S0 | Fondasi proyek dan data | F-01, F-02 | Repositori, deploy Netlify, dan PWA dasar berjalan; skrip CSV ke JSON jadi; skema Dexie siap; CP dan TP Matematika fase A sampai C masuk JSON dan dicocokkan dengan dokumen resmi |
| S1 | Formulir, komposisi, dan preset | F-03, F-04, F-15 | Uji unit komposisi lulus untuk semua n dari 5 sampai 50 dan semua kombinasi persentase kelipatan 5; jumlah selalu sama dengan n; guru dapat menulis CP dan TP langsung di formulir, menyimpannya sebagai preset, dan membuat soal dari preset dengan satu klik |
| S2 | Generasi dan verifikasi | F-05, F-06, F-07 | 100 soal acuan: semua kunci benar lolos; 100% soal yang sengaja diberi kunci salah ditolak; soal ditolak diganti otomatis; golden set dijalankan pada tiap model di registri |
| S3 | Gambar terprogram | F-08 | Sepuluh templat, masing-masing dengan lima kasus uji; gambar dan kunci selalu konsisten; tercetak jelas hitam putih |
| S4 | Peninjauan, telaah mandiri, pengaturan AI | F-09, F-13, F-14, F-16, F-17 | Guru dapat menyunting dan mengganti butir; soal perlu telaah tidak dapat diekspor sebelum disetujui; kunci API tersimpan lokal dan lolos uji kunci pada sedikitnya dua penyedia; biaya tercatat per soal; bantuan video terpasang |
| S5 | Ekspor, dokumen turunan, dan cadangan | F-10, F-11, F-12 | docx terbuka di Word dan PDF terunduh langsung lengkap dengan rumus, gambar, kop, kisi-kisi, dan kunci; .tex terkompilasi tanpa galat; pecahan bertumpuk; impor .gensoal memulihkan semua data |
| S6 | Pilot internal | Semua F MVP | Anda dan tiga guru membuat soal untuk ujian nyata; daftar perbaikan prioritas terkumpul; tidak ada soal salah kunci lolos |

### Setelah MVP

- **V1 (sekitar 6 sprint):** lisensi sekali bayar, cadangan antarmodel, proxy isi ulang opsional, bank soal dan paket A/B/C, paket mapel IPAS dan Bahasa Indonesia, layanan SymPy, ilustrasi AI, bank bersama per sekolah (memerlukan server dan akun), ekspor xlsx dan LMS. Setiap mapel baru dibuka hanya setelah lolos gerbang mutu pada bagian berikutnya.
- **V2:** analisis hasil, remedial dan pengayaan, ujian daring, perangkat ajar, dan kurikulum tambahan, disusun ulang berdasarkan data pilot.

## Pengujian dan Gerbang Mutu

Kepercayaan guru adalah risiko terbesar, jadi mutu diukur dengan data, bukan kesan. Tiga lapis pengujian dipakai: uji kode, set soal acuan (golden set), dan telaah manusia.

- **Uji kode.** Komposisi, pemeriksa, templat gambar, dan ekspor memiliki uji unit otomatis yang berjalan setiap perubahan.
- **Golden set.** Per mapel dan fase disiapkan soal dengan kunci yang diketahui benar, ditambah soal salah-kunci yang sengaja dibuat; pemeriksa harus meloloskan semua yang benar dan menolak semua yang salah. Golden set juga dijalankan per model AI untuk memberi lencana direkomendasikan.
- **Telaah manusia.** Anda dan guru penguji menilai sampel soal hasil generasi dengan lembar penilaian: kesesuaian TP, kebenaran kunci, kaidah butir, kewajaran konteks.

### Gerbang pembukaan mata pelajaran

Sebuah paket mapel untuk satu fase baru boleh dibuka bagi pengguna bila seluruh syarat berikut terpenuhi.

- [ ] Data CP dan TP fase itu telah dicocokkan dengan dokumen resmi dan ditandai tervalidasi.
- [ ] Golden set lulus 100% pada pemeriksa mapel itu.
- [ ] Sampel sedikitnya 200 soal hasil generasi telah ditelaah guru penguji, dengan kunci salah atau tidak sesuai TP di bawah 1% untuk rumpun terverifikasi hitung, dan di bawah 5% untuk rumpun lain sebelum telaah guru.
- [ ] Paket mapel memiliki aturan penulisan, contoh acuan, dan templat gambar yang sesuai.
- [ ] Paket dibuka lewat bendera paket\_aktif di JSON pada rilis aplikasi, tercatat di riwayat commit.

Angka ambang di atas adalah usulan awal dan akan dikalibrasi setelah pilot.
