# Rancangan penyederhanaan tampilan (25 Oktober 2026)

> **Catatan v0.5.** Bagian tentang tombol Setujui, penanda status, saringan "Mohon cek dulu", dan penunjuk "Langkah n dari 3" di bawah ini sudah digantikan keputusan pemilik pada `docs/RANCANGAN-UI.md`: semuanya dihapus (tahap UI-00, issue #14).

Permintaan pemilik: "beberapa tampilan sekarang malah jadi terlalu repot; buat lebih sederhana dan tetap mudah dinavigasi." Dokumen ini mencatat masalah yang ditemukan, prinsip perbaikan, dan perubahan per layar. Alur Buat, Periksa, Unduh, istilah di layar, palet warna, dan data tidak berubah.

## Temuan pada tampilan v0.4

Diukur dari tangkapan layar uji e2e (paket 12 soal, 4 bentuk soal).

| Layar | Masalah | Akibat |
| --- | --- | --- |
| Periksa | Setiap soal membawa 6 tombol (Hapus, Sunting, Ganti soal, Buat ulang, Setujui, Catatan pemeriksaan) dan pembahasan selalu terbuka | Halaman 6.700 px di laptop dan 9.700 px di ponsel; mata tidak tahu tombol mana yang penting |
| Periksa (ponsel) | Kartu "Status paket" dan tombol "Lanjut ke Unduh" berada di bawah soal terakhir | Guru harus menggulir seluruh paket untuk pindah ke langkah 3 |
| Periksa | Tiga saringan (Semua, Mohon cek dulu, Belum disetujui); "Belum disetujui" ikut menghitung soal yang sudah dicek padahal soal itu boleh diunduh | Membingungkan: terkesan semua soal harus disetujui |
| Buat | Empat kartu bernomor (00–04) dengan pita warna berganti, judul di kolom kiri, isian di kanan; tiga isian wajib tersebar di dua kartu | Formulir pendek terasa panjang; tiga isian wajib tidak terlihat sebagai satu kesatuan |
| Buat | Komposisi kesukaran memakai enam tombol tambah-kurang; bilah bawah memuat kotak centang, kolom nama, "Simpan saja", Batal, dan tombol utama sekaligus | Bilah bawah padat dan memotong isian di ponsel |
| Buat | Kotak perkiraan permintaan AI selalu tampil | Informasi teknis tampil meski tidak ada masalah |
| Unduh | Format berupa dua kartu besar; daftar berkas memuat tiga tombol "Unduh ini saja" di samping tombol utama | Empat tombol unduh dalam satu layar |
| Pengaturan AI | Ketiga langkah, batas RPM/RPD, model cadangan, biaya, dan privasi tetap terbentang setelah kunci berfungsi | Guru yang sudah siap tetap melihat formulir panjang setiap membuka layar |
| Cadangan | Lima kartu setara, termasuk daftar pengaturan tersimpan tanpa aksi dan zona hapus semua data | Aksi utama (unduh cadangan) tidak menonjol |
| Kepala | "Tersimpan di perangkat ini" tampil di kepala dan di kaki halaman | Pengulangan |

## Prinsip perbaikan

1. **Satu aksi utama terlihat, sisanya satu ketukan lagi.** Aksi yang jarang dipakai masuk menu "Lainnya" atau bagian lipat, tidak dihapus.
2. **Tampilkan yang perlu diputuskan guru.** Soal "Mohon cek dulu" terbuka lengkap; soal yang sudah dicek cukup soal, opsi, dan kunci, dengan pembahasan dilipat.
3. **Langkah berikutnya selalu terjangkau.** Di ponsel, Periksa memakai bilah bawah tetap berisi ringkasan dan "Lanjut ke Unduh".
4. **Lebih sedikit kartu, tanpa nomor kelompok.** Kartu dipakai untuk mengelompokkan, bukan menghias. Pita warna dipertahankan sebagai penanda status (soal, peringatan) dan penanda langkah.
5. **Informasi teknis hanya saat relevan.** Kuota dan batas AI tampil sebagai satu baris; kotak peringatan baru muncul bila kuota tidak cukup.

## Perubahan per layar

### Kerangka

- Kepala: hapus tulisan "Tersimpan di perangkat ini" (tetap di kaki halaman). Penanda "Membuat soal" tetap.
- Penunjuk langkah tetap "Langkah n dari 3" dengan tiga warna.
- Nomor kelompok kuning (00–04) tidak dipakai lagi di layar mana pun.

### Langkah 1 · Buat

Dari empat kartu menjadi dua kartu dan satu bagian lipat:

1. **Pengaturan tersimpan** (bila ada): satu baris pilihan di atas formulir, bukan kartu.
2. **Kartu "Soal yang dibuat"**: Kelas, Topik atau mapel, dan Jumlah soal dalam satu baris (bertumpuk di ponsel). Di bawahnya satu baris keterangan cek otomatis dan perkiraan waktu; kotak peringatan hanya bila sisa kuota kurang.
3. **Kartu "CP dan TP (boleh kosong)"**: label di atas isian, tanpa kolom kiri.
4. **Pengaturan lanjutan** (tertutup): komposisi memakai tiga pilihan cepat (Bawaan 30/50/20, Lebih mudah 50/40/10, Lebih sulit 20/50/30) dan "Atur sendiri" yang membuka tombol tambah-kurang lama; bentuk soal, bahasa, gaya, gambar, teks materi, judul paket; lalu "Simpan sebagai pengaturan tersimpan" (kotak centang dan nama) pindah ke sini dari bilah bawah.
5. **Bilah bawah**: ringkasan pendek ("Kelas 4 · Matematika · 12 soal"), Batal, dan "Buat 12 soal".

### Langkah 2 · Periksa

- **Kartu soal**: kepala berisi nomor, bentuk dan kesukaran, serta penanda. Tombol: **Setujui** (atau Batalkan persetujuan), **Sunting**, dan **Lainnya** (Ganti soal, Buat ulang, Hapus). Pembahasan, rubrik, dan catatan pemeriksaan disatukan dalam "Pembahasan dan catatan" yang tertutup untuk soal "Jawaban sudah dicek" dan "Disetujui", terbuka untuk "Mohon cek dulu".
- **Kunci pilihan ganda**: lencana "Kunci: X" diganti tanda "✓ Kunci" pada opsi yang sudah disorot hijau. Opsi pendek tetap dua kolom di ponsel.
- **Saringan**: "Semua" dan "Mohon cek dulu" (ditambah "Ditolak otomatis" bila ada). "Belum disetujui" dihapus.
- **Status paket**: tiga angka ringkas, satu tombol utama "Lanjut ke Unduh", tautan "Setujui semua yang sudah dicek" dan "Buat paket serupa"; biaya AI satu baris kecil.
- **Ponsel dan tablet**: kartu status samping tidak tampil; ringkasan pindah ke bilah bawah tetap ("2 mohon cek dulu" yang menyaring daftar, dan "Lanjut ke Unduh").

### Langkah 3 · Unduh

- Format: dua tombol bersebelahan **Word** dan **PDF** (tetap grup radio). LaTeX tetap di Menu lanjutan.
- Berkas: tiga kotak centang (Lembar soal dengan Kop, Kunci jawaban dengan Pembahasan, Kisi-kisi) tanpa tombol per baris.
- Satu tombol utama "Unduh n berkas Word/PDF". Unduhan satu berkas pindah ke panel pratinjau: "Unduh {berkas yang dipratinjau} saja", sehingga cadangan bila peramban menolak unduhan beruntun tetap ada.

### Pengaturan AI

- Bila sudah siap: kartu ringkas "Siap dipakai · penyedia · model" dengan pilihan model, lalu tombol "Ganti penyedia atau kunci" yang membuka tiga langkah.
- Bila belum siap: tiga langkah seperti sekarang, tanpa nomor kuning.
- Batas pemakaian (RPM/RPD) dan model cadangan pindah ke "Pengaturan lanjutan", bersama batas harian, biaya, dan daftar semua model. Biaya dan privasi penyedia menjadi satu catatan kecil di bawah kunci.

### Cadangan

- Satu kartu utama: ringkasan data (ukuran, cadangan terakhir, penyimpanan persisten) dalam satu baris, lalu tombol utama "Unduh berkas .gensoal" dan tombol garis "Pulihkan dari berkas".
- Daftar pengaturan tersimpan dan "Hapus semua data" masuk bagian lipat di bawah.

### Soal saya

- Baris paket: Unduh dan Hapus menjadi tautan teks kecil; tautan "Semua soal Mohon cek dulu" hanya tampil bila ada soalnya.

## Yang tidak berubah

Rute, istilah di layar, palet, ukuran teks minimal 16 px, alur generasi, gerbang unduh "Mohon cek dulu", format berkas, dan skema data.

## Hasil

`npm test`, `npm run typecheck`, dan `npm run e2e` lulus. Uji e2e kini juga membuka menu Lainnya. Tinggi halaman dari tangkapan e2e yang sama (paket 12 soal):

| Layar | Sebelum | Sesudah |
| --- | --- | --- |
| Periksa, ponsel 390 px | 9.737 px | 5.919 px, "Lanjut ke Unduh" selalu terlihat di bilah bawah |
| Periksa, laptop | 6.693 px | 6.048 px |
| Buat, laptop (Pengaturan lanjutan terbuka) | 2.491 px | 2.157 px |
| Buat, ponsel | 2.296 px | 1.743 px |
| Unduh, laptop | 1.420 px | 1.148 px |
| Unduh, ponsel | 2.334 px | 1.899 px |
| Pengaturan AI, laptop (lanjutan terbuka) | 2.781 px | 1.592 px |
| Cadangan, laptop | 1.467 px | 1.000 px |

Ikut diperbaiki: sesaat setelah soal terakhir selesai, layar Periksa dapat sempat menampilkan "Dijeda" beserta tombol Lanjutkan, karena status paket di IndexedDB belum terbaca ulang. Keadaan itu kini tampil sebagai "Menyimpan".
