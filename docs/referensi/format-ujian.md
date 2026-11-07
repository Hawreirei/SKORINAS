# Riset format ujian: TKA, TKAD, dan OSN (SD sampai SMA)

Disusun 7 November 2026 untuk fitur F-35 (format ujian di layar Buat). Katalog di kode: `src/ujian/index.ts`.

**Cara riset.** Dokumen resmi (Perkaban BSKAP, panduan Puspresnas) tidak dapat diunduh dari lingkungan pengembangan karena jaringannya dibatasi. Angka di bawah dikumpulkan dari berita dan artikel yang mengutip dokumen resmi, lalu dibandingkan antarsumber. Angka yang tidak sepakat antarsumber atau hanya dari satu sumber ditandai **perlu dicek**. Sebelum rilis, cocokkan dengan dokumen resmi tahun berjalan.

## 1. TKA (Tes Kemampuan Akademik)

Dasar: Permendikdasmen Nomor 9 Tahun 2025; Kepmendikdasmen 95/M/2025 (pedoman penyelenggaraan); kerangka asesmen Perkaban BSKAP 047/H/AN/2025 (SD/MI dan SMP/MTs) dan 045/H/AN/2025 (SMA/MA dan SMK/MAK). TKA tidak menentukan kelulusan; hasilnya dipakai antara lain untuk SPMB jalur prestasi dan seleksi masuk perguruan tinggi.

### Atribut bersama

| Atribut | Isi |
| --- | --- |
| Moda | Berbasis komputer |
| Bentuk soal | Pilihan ganda sederhana; pilihan ganda kompleks model MCMA (jawaban benar lebih dari satu); pilihan ganda kompleks model kategori (Benar/Salah, Sesuai/Tidak sesuai untuk tiap pernyataan) |
| Level kognitif | Tiga level: Pengetahuan dan Pemahaman (*knowing and understanding*), Aplikasi (*applying*), Penalaran (*reasoning*) |
| Penilaian | Proporsi jawaban benar dikonversi ke skala 0–100 (30 soal: 15 benar = 50); kategori capaian ditetapkan dengan *extended Angoff* |
| Gaya soal | Berbasis stimulus (teks, tabel, grafik, gambar); konteks personal, sosial budaya, saintifik |

### TKA SD/MI dan SMP/MTs (pelaksanaan April 2026)

| Atribut | SD/MI (kelas 6) | SMP/MTs (kelas 9) |
| --- | --- | --- |
| Mapel | Matematika; Bahasa Indonesia | Matematika; Bahasa Indonesia |
| Jumlah soal | 30 per mapel | 30 per mapel (15 di antaranya penguatan literasi atau numerasi) |
| Durasi | 75 menit per mapel (sumber awal menyebut 60 menit; **perlu dicek**) | 75 menit per mapel |
| Asal soal | Sekitar 70% pusat (21 soal) dan 30% daerah (9 soal), soal daerah bermuatan kelokalan | sama |
| Matematika | Elemen Bilangan, Aljabar, Geometri dan Pengukuran, Data dan Peluang | sama, dengan cakupan SMP |
| Bahasa Indonesia | Membaca: teks informasi dan teks sastra (fiksi); pemahaman tekstual, inferensial, evaluasi dan apresiasi | sama, teks lebih panjang |

Sebaran contoh untuk 30 soal yang dipakai GenSoal (dari contoh paket, bukan angka resmi): bentuk 19 PG, 5 PG kompleks, 6 kategori; level 6 Pengetahuan dan Pemahaman, 12 Aplikasi, 12 Penalaran.

### TKA SMA/MA dan SMK/MAK (pelaksanaan 26 Oktober–8 November 2026)

| Mapel | Jumlah soal | Durasi |
| --- | --- | --- |
| Bahasa Indonesia (wajib) | 30 | 75 menit |
| Matematika dan Numerasi (wajib) | 25 (2025: 30) | 75 menit |
| Bahasa Inggris (wajib) | 30 | 75 menit |
| Dua mapel pilihan | 25 per mapel | 60 menit per mapel |

Mapel pilihan akademik (19): Matematika Tingkat Lanjut, Bahasa Indonesia Tingkat Lanjut, Bahasa Inggris Tingkat Lanjut, Fisika, Kimia, Biologi, Ekonomi, Sosiologi, Geografi, Sejarah, Antropologi, PPKn, Bahasa Arab, Bahasa Jerman, Bahasa Prancis, Bahasa Jepang, Bahasa Korea, Bahasa Mandarin, Projek Kreatif dan Kewirausahaan (SMK). Sejak Mei 2026 ditambah 50 mapel keahlian vokasi SMK (total 69). Antropologi dan bahasa asing selain Jepang dan Jerman tidak muncul di hasil pencarian 2026: **perlu dicek**.

Bahasa Inggris wajib: membaca, sekitar CEFR B1 (Tingkat Lanjut sekitar B2); kompetensi sama dengan Bahasa Indonesia. Banyak opsi pilihan ganda SMA (GenSoal memakai 5, A–E): **perlu dicek**.

## 2. TKAD (Tes Kemampuan Akademik Daerah)

Tidak ada TKAD nasional. Istilah ini dipakai dinas pendidikan kabupaten/kota untuk tes kemampuan akademik yang mereka adakan sendiri, meniru TKA, misalnya:

- Kabupaten Tegal: TKAD SD 27–29 Oktober 2026, berbasis aplikasi, untuk memetakan kemampuan dan bersiap menghadapi TKA 2027.
- Kota Yogyakarta: Dindikpora menerbitkan sebaran nilai TKA dan TKAD SD/MI/Paket A sebagai acuan memilih SMP.

Selain itu, sekitar 30% soal TKA SD/SMP disusun pemerintah daerah dan wajib memuat unsur kelokalan. Karena format TKAD berbeda per daerah, GenSoal memakai atribut TKA SD/SMP dan menambah aturan kelokalan dengan nama daerah yang diisi guru.

## 3. OSN (Olimpiade Sains Nasional)

Penyelenggara: Pusat Prestasi Nasional (Puspresnas). Tahap: OSN-K (kabupaten/kota), OSN-P (provinsi), OSN nasional.

| Jenjang | Bidang |
| --- | --- |
| SD/MI (kelas 4–5) | Matematika, IPA, IPS (IPS baru sejak 2025) |
| SMP/MTs (kelas 7–8) | Matematika, IPA, IPS |
| SMA/MA (kelas 10–11) | Matematika, Fisika, Kimia, Biologi, Informatika/Komputer, Astronomi, Kebumian, Ekonomi, Geografi |

### SD

| Tahap · bidang | Soal | Bentuk | Durasi |
| --- | --- | --- | --- |
| OSN-K Matematika | 30 | Pilihan ganda | 60 menit |
| OSN-K IPA | 60 | Pilihan ganda | 60 menit |
| OSN-K IPS | 60 | Pilihan ganda | 60 menit |
| OSN-P Matematika (2026) | 20 | Isian singkat | 60 menit |
| OSN-P IPA (2026) | 20 | Isian singkat | 60 menit |
| OSN-P IPS (2026) | 40 + 12 | Pilihan ganda + isian singkat | 60 menit |

Angka OSN-K SD dari satu sumber (tirto, mengutip panduan 2025); sumber lain menyebut bentuk isian untuk OSN-K: **perlu dicek**. Ranah Matematika SD: bilangan, aritmetika, geometri, kombinatorik, serta statistika, data, dan pengukuran (masing-masing sekitar 20%).

### SMP (OSN-K 2026, panduan Puspresnas)

| Bidang | Soal | Bentuk | Durasi | Penilaian |
| --- | --- | --- | --- | --- |
| Matematika | 25 | Pilihan ganda, 4 opsi | 150 menit | Benar 4, salah atau kosong 0 (maks. 100) |
| IPA | 40 | Pilihan ganda | 90 menit | **perlu dicek** |
| IPS | 60 | Pilihan ganda | 90 menit | **perlu dicek** |

OSN-P dan nasional memakai isian singkat dan uraian; angka OSN-P SMP antarsumber tidak sepakat, jadi tidak dibuat format.

### SMA (OSN-K 2025–2026)

| Bidang | Soal | Bentuk | Durasi |
| --- | --- | --- | --- |
| Matematika | 20 (10 dasar + 10 lanjut) | Isian singkat, jawaban bilangan bulat | 150 menit |
| Fisika | 40 | Isian singkat | 120 menit |
| Kimia | 50 | Pilihan ganda (satu sumber: jawaban bisa lebih dari satu; **perlu dicek**) | 100 menit |
| Biologi | 50 | Benar-salah | 180 menit |
| Informatika | 30–50 | Campuran pilihan ganda, isian singkat, benar-salah | 150 menit |
| Astronomi | **perlu dicek** | **perlu dicek** (GenSoal: pilihan ganda) | 100 menit |
| Kebumian | **perlu dicek** | Pilihan ganda | 120 menit |
| Ekonomi | **perlu dicek** | Pilihan ganda | 60 menit |
| Geografi | **perlu dicek** (satu sumber: 100) | Pilihan ganda | 120 menit |

Penilaian Matematika: soal dasar benar 2, salah atau kosong 0; soal lanjut benar 4, kosong 0, salah −1. Bidang lain: **perlu dicek**.

## 4. Pemetaan ke GenSoal

| Atribut ujian | Di GenSoal |
| --- | --- |
| PG sederhana | `pilihan_ganda` |
| PG kompleks MCMA | `pilihan_ganda_kompleks` |
| PG kompleks kategori (satu stimulus, beberapa pernyataan B/S) | `benar_salah` (satu pernyataan per soal); bentuk kategori sejati belum ada, lihat `docs/KEPUTUSAN.md` |
| Level TKA | Pengetahuan dan Pemahaman = C1–C2, Aplikasi = C3, Penalaran = C4–C6; disebut di prompt, kisi-kisi tetap C1–C6 |
| Level OSN | C3–C6 (2:3:3:2); OSN-K SMA Matematika C3–C6 rata (dasar dan lanjut) |
| Lebih dari 50 soal | Dibatasi 50 per paket (batas layar Buat); layar menyarankan dua paket |
| Jumlah soal tidak pasti | 30 |
| Skor | Hanya bila aturannya seragam (OSN-K SMP Matematika: 4 per soal) |

## 5. Cakupan materi (F-38)

Dipakai di `src/ujian/cakupan.ts` bila guru mengosongkan CP dan TP. Dokumen resmi Perkaban BSKAP 045 dan 047/H/AN/2025 tetap tidak dapat diunduh dari lingkungan pengembangan (semua situs, termasuk blog yang menyalinnya, ditolak jaringan), jadi daftar disusun dari sumber berikut dengan tingkat kepastian berbeda.

| Mapel dan jenjang | Isi di katalog | Kepastian |
| --- | --- | --- |
| Matematika SMP | Bilangan (Bilangan Real: 6 butir), Aljabar (Persamaan dan Pertidaksamaan Linear, Bentuk Aljabar, Fungsi, Barisan dan Deret), Geometri dan Pengukuran (Objek Geometri, Transformasi Geometri, Pengukuran), Data dan Peluang (Data, Peluang); 21 butir | Tinggi: kata per kata dari kerangka asesmen hlm. 21–25 (salinan di skill TKA pemilik), dikonfirmasi ringkasan tirto, detik, dan situs madrasah |
| Matematika SD | Bilangan (cacah, faktor dan kelipatan, rasional: pecahan, desimal, persen, perbandingan), Geometri dan Pengukuran (objek geometri: bangun datar, kubus dan balok, pandangan depan/atas/samping, sudut; pengukuran: satuan, keliling dan luas, volume), Data (tabel, piktogram, diagram batang, rata-rata) | Sedang: tiga elemen dan butir utama sepakat di Pakar TKA, Pintarly, BIC, Kompas, Akurat, Bimbel PLC; batas bilangan dan jenis diagram belum terverifikasi; peluang tidak ada di SD |
| Matematika SMA (wajib) | Lima elemen resmi: Bilangan, Aljabar, Geometri dan Pengukuran, Trigonometri, Data dan Peluang; butir (eksponen dan logaritma, SPLTV, program linear, fungsi, barisan dan deret, transformasi, perbandingan trigonometri, statistika, pencacahan dan peluang) | Elemen tinggi (detik, CNN, aimasukptn); butir sedang (antarsumber berbeda; vektor dan kejadian majemuk tidak disebut) |
| Bahasa Indonesia SD, SMP, SMA | Teks informasi (tunggal; SMP dan SMA juga jamak) dan teks fiksi; jenis teks rinci (deskripsi, laporan, prosedur, berita, pengumuman, eksplanasi, eksposisi, opini, infografis; dongeng, fabel, cerita rakyat, cerpen, puisi, drama, hikayat) | Teks informasi dan fiksi, kompetensi, dan ciri teks (SD: kalimat 3–7 kata pola SPOK, tokoh datar, alur maju, sudut pandang orang pertama; SMP: 200–250 kata, tokoh bulat, alur campuran, sudut pandang orang ketiga; SMA: 250–300 kata) tinggi. Jenis teks rinci adalah usulan dari jenis teks Kurikulum Merdeka, tidak disebut sumber |
| Bahasa Inggris SMA | Descriptive, recount, narrative, procedure, analytical exposition (resmi menurut ringkasan), ditambah report, teks fungsional, dan puisi pendek (usulan); B1 (Tingkat Lanjut B2) | Sedang |
| OSN | Ranah per bidang dari pedoman (Matematika SD lima ranah masing-masing sekitar 20%; SMP dan SMA aljabar, geometri, kombinatorika, teori bilangan; IPA dan IPS empat ranah) | Sedang |

Porsi elemen selain SMP Matematika adalah usulan (lihat `docs/KEPUTUSAN.md`, F-38).

## Sumber

- detik.com, 3 bentuk soal di TKA SMA/SMK: https://www.detik.com/edu/sekolah/d-8019585/3-bentuk-soal-di-tka-sma-smk-ketahui-juga-daftar-mapel-pilihannya
- tirto.id, jenis soal TKA 2025: https://tirto.id/jenis-soal-tes-tka-2025-jenjang-sd-smp-sma-smk-hg6K
- pojoksatu.id, aturan TKA 2026 SMA: https://pojoksatu.id/edugov/aturan-tes-kemampuan-akademik-tka-2026-sma-berubah-jumlah-soal-matematika-dikurangi-sehari-hari-satu-mapel-wajib
- aksel.co.id, jadwal TKA SMA 2026: https://aksel.co.id/jadwal-tka-sma-2026-lengkap-tanggal-mapel-per-hari-dan-tahapannya
- medcom.id, TKA SD-SMP 2026 jadwal dan waktu: https://www.medcom.id/pendidikan/news-pendidikan/xkEd8Z7b-tka-sd-smp-2026-ini-jadwal-harian-dan-waktu-pengerjaan-masing-masing-soal
- medcom.id, TKA SMP 2026 jumlah soal: https://www.medcom.id/pendidikan/news-pendidikan/VNn7QO7b-tka-smp-2026-digelar-besok-siswa-wajib-tahu-jumlah-soal-dan-jadwal-sesi-lengkapnya
- jpnn.com, penilaian TKA SD-SMP: https://m.jpnn.com/amp/news/mengapa-pengumuman-nilai-tka-sd-smp-perlu-waktu-lama
- BBPMP Jatim, soal TKA SD-SMP mengandung unsur kelokalan: https://bbpmpjatim.kemendikdasmen.go.id/main/tka-jenjang-sd-dan-smp-akan-dilaksanakan-pada-april-2026-soal-soalnya-harus-mengandung-unsur-kelokalan/
- detik.com, kerangka asesmen TKA SD dan SMP: https://news.detik.com/berita/d-8040165/kerangka-asesmen-tka-2025-sd-dan-smp-isi-dan-link-unduh
- ruangguru.com, pedoman TKA SD dan SMP: https://www.ruangguru.com/blog/pedoman-tka-sd-dan-smp-sederajat
- pintarly.id, kisi-kisi TKA SMA 2026: https://www.pintarly.id/artikel/kisi-kisi-tka-sma-2026
- pakartka.com, kisi-kisi TKA Matematika SMA: https://pakartka.com/tka/sma/matematika
- pojoksatu.id, TKA SMA Bahasa Inggris: https://pojoksatu.id/edugov/tka-sma-2026-bahasa-inggris-wajib-materi-kisi-kisi-dan-download-pdf-contoh-soal
- jatimtimes.com, 69 mapel pilihan TKA 2026: https://jatimtimes.com/amp/baca/3331344507/20260529/160300/privacy
- radartegal.disway.id, TKAD SD Kabupaten Tegal 2026: https://radartegal.disway.id/lokal/read/730533/tkad-sd-kabupaten-tegal-2026-uji-kemampuan-siswa-lewat-asesmen-digital-hadapi-tka-nasional
- joglonews.com, nilai TKAD SD Yogyakarta: https://joglonews.com/2026/06/03/nilai-tkad-sd-2026-resmi-dirilis-jadi-acuan-penting-memilih-smp-di-yogyakarta/
- tirto.id, mekanisme OSN-K SD: https://tirto.id/jadwal-mekanisme-olimpiade-osn-k-sd-tingkat-kab-kota-hcLT
- detik.com, jadwal dan jumlah soal OSN SD 2025: https://www.detik.com/edu/sekolah/d-7841507/jadwal-osn-sd-2025-dan-jumlah-soal-kini-ada-olimpiade-ips
- tirto.id, OSN SD provinsi 2026: https://tirto.id/rundown-osn-sd-tingkat-provinsi-2026-durasi-dan-daftar-materi-hzdz
- tirto.id, OSN SMP kabupaten 2026: https://tirto.id/rundown-pelaksanaan-osn-smp-tingkat-kabupaten-2026-durasi-dan-materi-hxys
- math.id, penilaian OSN-K SD dan SMP 2026: https://www.math.id/pengumuman-osn-k-sd-dan-smp-2026-cek-hasil-aturan-lolos-dan-mekanisme-penilaiannya/
- Puspresnas, adendum panduan OSN SMP 2026: https://pusatprestasinasional.kemendikdasmen.go.id/uploads/lampiran/Adendum%20Panduan%20OSN%20SMP%20Sederajat%202026%20ii.pdf
- tirto.id, OSN SMA kabupaten 2026: https://tirto.id/rundown-osn-sma-2026-tingkat-kabupaten-durasi-dan-tata-tertib-hxXp
- tirto.id, mekanisme OSN-K Matematika SMA 2025: https://tirto.id/mekanisme-osn-k-bidang-matematika-sma-smk-2025-dan-kisi-kisinya-haTb
- tirto.id, ketentuan OSN-K Fisika SMA 2025: https://tirto.id/ketentuan-osn-k-bidang-fisika-sma-smk-dan-kisi-kisinya-haWV
- pasla.jambiprov.go.id, cabang dan bentuk soal OSN SMA 2026: https://pasla.jambiprov.go.id/osn-sma-2026-cabang-lomba-dan-syarat-peserta/
- medcom.id, kisi-kisi OSN Geografi SMA 2026: https://www.medcom.id/pendidikan/news-pendidikan/akWm19LN-kisi-kisi-soal-osn-geografi-sma-2026-materi-bentuk-tes-dan-jadwal-seleksi
- detik.com, materi TKA SD dan SMP: https://www.detik.com/edu/detikpedia/d-8391094/soal-tka-matematika-tentang-apa-cek-bocoran-materi-yang-diujikan-bagi-sd-dan-smp
- detik.com, kisi-kisi materi TKA SD 2026: https://www.detik.com/edu/sekolah/d-8314151/kisi-kisi-materi-tka-sd-2026-plus-contoh-soalnya-ortu-bisa-dampingi-anak-belajar
- Bimbel PLC, kisi-kisi TKA Matematika SD 2026: https://www.plcpekanbaru.com/artikel/detail/1486/kisikisi-resmi-tka-matematika-sd-tahun-2026-ini-materi-yang-wajib-dipelajari/
- Akurat, kisi-kisi TKA SD, SMP, SMA 2026: https://www.akurat.co/pendidikan/899723/kisi-kisi-tka-sd-smp-dan-sma-terbaru-2026-lengkap-dengan-jadwal-pelaksanaan
- BIC, materi TKA SD: https://bic.id/artikel/hal-penting-materi-tka-sd-contoh-soalnya/
- tirto.id, kisi-kisi TKA SMP: https://tirto.id/daftar-mata-pelajaran-tka-smp-dan-kisi-kisi-materinya-hnqx
- MTs Muslimin, kerangka asesmen TKA SMP Matematika: https://www.mtssmusliminbjp.sch.id/2026/02/kerangka-asesmen-tka-smp-mts-sederajat-matematika.html
- tirto.id, kisi-kisi TKA SMP Bahasa Indonesia: https://tirto.id/kisi-kisi-materi-tka-smp-2026-bahasa-indonesia-contoh-soal-hpx1
- Zenius, kisi-kisi TKA Bahasa Indonesia SMP: https://www.zenius.net/blog/contoh-soal-tka-bahasa-indonesia-smp/
- Zenius, kisi-kisi TKA Bahasa Indonesia SD: https://www.zenius.net/blog/contoh-soal-tka-bahasa-indonesia-sd/
- detik.com, kisi-kisi TKA Matematika SMA 2026: https://www.detik.com/edu/detikpedia/d-8694941/kisi-kisi-tka-matematika-sma-2026-dan-contoh-soal-yang-perlu-dipelajari
- CNN Indonesia, kisi-kisi mapel wajib TKA SMA 2026: https://www.cnnindonesia.com/edukasi/20261019164135-569-1417162/kisi-kisi-mapel-wajib-tka-sma-smk-2026-siswa-kelas-12-bersiap
- aimasukptn.com, cakupan materi TKA 2026: https://aimasukptn.com/kisi-kisi-tka-2026
- Zenius, kisi-kisi TKA Bahasa Inggris SMA: https://www.zenius.net/blog/kisi-kisi-dan-contoh-soal-bahasa-inggris-tka/
- Cerebrum, kisi-kisi TKA SMA 2026: https://cerebrum.id/kisi-kisi-tka-sma-2026-resmi-pusmendik-cek-materi-wajib-dan-mata-pelajaran-pilihan/
