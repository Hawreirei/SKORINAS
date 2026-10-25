# Rancangan UI/UX GenSoal v0.5

Oct 25, 2026 · disusun dari rekap desain *A-Level Set Builder* (`docs/referensi/rekap-desain-a-level-set-builder.md`) atas permintaan pemilik.

Rekap itu berasal dari aplikasi lain: berbahasa Inggris, untuk pengguna yang terbiasa dengan alat kerja, dan memakai indigo, font sistem, serta teks 14 px. GenSoal dipakai guru kelas 1–12 yang belum tentu terbiasa dengan aplikasi, dengan aturan v0.4 yang sudah diputuskan (`docs/RANCANGAN.md`, bagian Rancangan Layar dan Arah visual). Karena itu **polanya diambil, gayanya tidak**. Setiap pola diperiksa terhadap tujuan awal GenSoal sebelum diambil.

## Tujuan awal yang menjadi patokan

Pola dari rekap hanya diambil bila tidak melanggar salah satu butir berikut.

1. **Tiga layar kerja berurutan:** Buat, Periksa, Unduh, dengan penunjuk "Langkah n dari 3" dan satu warna per langkah.
2. **Tiga isian wajib** di layar Buat: kelas, topik atau mapel, dan jumlah soal. Sisanya terisi otomatis.
3. **Istilah sehari-hari** dari tabel "Istilah di layar": Buat soal, Periksa, Unduh, Jawaban sudah dicek, Mohon cek dulu, Disetujui, Pengaturan tersimpan.
4. **Mudah dibaca:** teks minimal 16 px, judul halaman 30–36 px, Nunito Sans, kontras minimal 4,5 : 1, dan status tidak hanya disampaikan lewat warna.
5. **Satu tombol utama berwarna pekat per layar.** Merah hanya untuk hapus dan batal.
6. **Bantuan tidak menempel di layar kerja**, dan aplikasi tidak membawa data kurikulum.
7. **Lokal dulu:** tanpa akun, tidak ada pekerjaan yang hilang, dan kunci API tidak keluar dari peramban.
8. **Penyederhanaan 25 Oktober** (`docs/PENYEDERHANAAN-UI.md`) tetap berlaku: lebih sedikit kartu dan tombol, aksi jarang dipakai dilipat.

## Pemetaan rekap ke GenSoal

Kolom **Keputusan** berisi salah satu dari: *Ambil* (dipakai apa adanya), *Sesuaikan* (polanya dipakai dengan aturan GenSoal), atau *Tidak diambil*.

### Fondasi (rekap bagian 1–3)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| Token warna di `@theme`, netral slate, brand indigo | Token `--gs-*` dengan palet v0.4 (biru #2563EB, kuning ornamen) | **Sesuaikan:** struktur token tetap, palet v0.4 dipertahankan | UI-01 |
| Warna status semantik yang sama di semua halaman | Sebagian: `PENANDA_LABEL` untuk soal, `labelStatusPaket` untuk paket, warna ditulis ulang di tiap layar | **Ambil:** satu peta status pusat | UI-03 |
| Mode gelap tiga pilihan tanpa kedipan (skrip di `index.html`) | Tiga pilihan ada di Profil, tetapi tema baru dipasang setelah IndexedDB terbuka, sehingga layar sempat berkedip terang | **Ambil:** skrip anti-kedip, cermin tema di `localStorage`; sumber tetap profil | UI-01 |
| Tombol tema di kepala halaman | Tema di Profil dan kop | **Tidak diambil:** menambah elemen di kepala; jarang diubah | — |
| `@utility card`, `btn`, `btn-primary`, `btn-secondary`, `btn-danger` | Komponen `Kartu` dan `kelasTombol`, tetapi kelas kartu masih disalin mentah di Soal saya, Profil, dan Mohon cek dulu | **Ambil** sebagai utilitas `kartu`, `tombol-*`, `bidang` dengan nilai GenSoal | UI-01 |
| Tipografi `text-sm` dan hint `text-xs` | Minimal 16 px (aturan v0.4) | **Tidak diambil:** hierarki dibuat dengan tebal, warna, dan jarak, bukan ukuran di bawah 16 px | — |
| Font sistem | Nunito Sans | **Tidak diambil** | — |
| Ikon hanya karakter teks | SVG kecil sebaris (panah, centang, segitiga peringatan) | **Tidak diambil:** SVG lebih jelas untuk penanda status | — |
| `tabular-nums` untuk angka | Belum | **Ambil** | UI-01 |

### Komponen (rekap bagian 4–5)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| `Field`: label, isian, hint; galat menggantikan hint | `Label` terpisah; galat Buat soal dikumpulkan di bawah formulir | **Ambil:** komponen `Bidang` dengan galat tepat di bawah isian | UI-02 |
| `Segmented` untuk 2–4 pilihan | Kartu radio besar (Unduh), chip (tema), dan select (cara benar-salah) bercampur | **Ambil:** komponen `Pilihan` (`role="radiogroup"`) | UI-02 |
| `Chips` multi-pilih | `Chip` ada | **Ambil** (sudah ada, dirapikan) | UI-02 |
| `Toggle` (kotak centang dengan hint) | Kotak centang ditulis langsung di tiap layar | **Ambil:** komponen `Sakelar` | UI-02 |
| `Section` lipat, status buka diingat | Pengaturan lanjutan memakai tombol buatan sendiri; bagian lain memakai `<details>` | **Ambil:** komponen `BagianLipat`; status buka diingat per perangkat | UI-02 |
| `Notice` empat nada (info, peringatan, galat, berhasil) | `Peringatan` (satu nada) dan `Kotak` | **Ambil:** komponen `Pemberitahuan` empat nada; galat memakai `role="alert"` | UI-02 |
| Modal: fokus otomatis, kembali ke pemicu, Escape, tombol di kaki | `<dialog>` bawaan (Escape dan fokus sudah ditangani peramban), `aria-label` saja | **Sesuaikan:** tambah `aria-labelledby`, kaki tombol, dan varian konfirmasi | UI-05 |
| Menu "More ▾" atau "⋯", butir bersyarat, butir berbahaya merah | `MenuLainnya` sudah ada di kartu soal | **Ambil:** dirapikan dan dipakai di Periksa dan Soal saya | UI-05 |
| Konfirmasi aksi destruktif menyebut nama item dan akibatnya | `window.confirm` di 7 tempat, sebagian tanpa nama item | **Ambil:** dialog konfirmasi sendiri | UI-05 |
| Lencana status dari satu peta pusat | Lencana penanda soal ada; status paket hanya titik dan teks | **Ambil** | UI-03 |
| Bilah kemajuan `role="progressbar"`, amber saat menunggu batas | Bilah kemajuan `aria-hidden`, selalu biru | **Ambil** | UI-03 |
| Tab dengan garis bawah, tab aktif di URL | Saringan dan tab berupa chip, tidak tersimpan di URL | **Sesuaikan:** tetap chip atau `Pilihan`, tetapi tersimpan di URL (`?saring=`, `?tab=`) | UI-07, UI-09 |
| Navigasi cepat Q1, Q2, … (item bermasalah berbatas amber) | Belum ada; paket 12–50 soal harus digulir | **Ambil** sebagai deret nomor soal di Periksa | UI-07 |

### Tata letak dan pola halaman (rekap bagian 6–7)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| Kepala lengket `h-14`, semi-transparan | Kepala tidak lengket; penunjuk langkah di bawahnya | **Sesuaikan:** kepala lengket hanya di layar lebar (≥ 1024 px). Di ponsel tidak, karena Buat dan Periksa sudah punya bilah bawah tetap | UI-04 |
| `PageHeader`: judul dan subjudul satu kalimat di kiri, aksi utama di kanan | `KepalaHalaman` tanpa tempat aksi; aksi utama tersebar | **Ambil:** prop `aksi` pada `KepalaHalaman` | UI-04 |
| Kaki berisi keterangan privasi | Sudah ada ("Data tinggal di peramban ini · tanpa akun") | Sudah sesuai | — |
| Form panjang: kartu *Essentials*, *More options*, bar *preset*, sidebar *Plan* sticky berisi biaya, waktu, jumlah permintaan, galat, dan satu tombol utama | Dua kartu (inti dan CP/TP), Pengaturan lanjutan, satu pilihan pengaturan tersimpan, bilah bawah. Perkiraan waktu dan kuota hanya satu baris teks | **Sesuaikan:** panel **Rencana** lengket di kanan pada layar lebar, menjadi bilah bawah di ponsel | UI-06 |
| Draf formulir tersimpan otomatis | Isian hilang bila halaman dimuat ulang | **Ambil:** draf disimpan per perangkat (`localStorage`, tanpa mengubah skema Dexie) | UI-06 |
| Gate: tanpa kunci API, pengguna langsung dialihkan ke pengaturan | Galat baru muncul setelah menekan Buat soal | **Sesuaikan:** tidak dialihkan paksa. Pemberitahuan di atas formulir, dan tombol utama berbunyi "Pasang kunci AI dulu" yang membuka Pengaturan AI. Formulir tetap bisa diisi dan tersimpan sebagai draf | UI-06 |
| Halaman detail: satu aksi utama tetap terlihat, sisanya di menu More; banner amber "N item perlu dicek" dengan aksi massal | Aksi utama di kartu samping (laptop) dan bilah bawah (ponsel); "Setujui semua yang sudah dicek" berupa tautan | **Ambil:** aksi utama di kepala halaman, banner amber "N soal mohon cek dulu" | UI-07 |
| Peringatan `beforeunload` saat proses berjalan | Belum. Pekerjaan dilanjutkan dari butir terakhir tersimpan, tetapi guru tidak diberi tahu | **Ambil** | UI-07 |
| Dashboard: tiga kartu statistik, daftar 5 terbaru, kartu "How it works" tiga langkah dengan ✓ hijau | Satu tombol besar Buat soal, kartu pengingat kunci, daftar soal terakhir | **Sesuaikan:** kartu statistik **tidak diambil**, karena rancangan v0.4 sengaja mengeluarkan ringkasan dari beranda. Yang diambil hanya kartu **Langkah awal** tiga langkah dengan ✓, yang hilang setelah ketiganya selesai | UI-10 |
| Daftar: pencarian, filter segmented (All / Unfinished / Complete), menu ⋯ per baris | Pencarian dan tab Paket/Tong sampah; tautan Unduh dan Hapus per baris | **Ambil:** saringan Semua, Sedang dibuat, Mohon cek dulu, Siap diunduh; menu ⋯ per baris | UI-09 |
| Settings per kartu dengan **Danger zone** di bawah | Cadangan: hapus semua data dilipat; Profil dan Pengaturan AI belum seragam | **Ambil** untuk Pengaturan AI, Profil dan kop, Cadangan | UI-11 |
| Tampilan `.paper`: selalu hitam di atas putih, font serif | Pratinjau Unduh dan tampilan cetak sudah putih dengan Times New Roman | **Ambil** sebagai utilitas `kertas` agar satu sumber | UI-08 |

### Prinsip, copy, dan aksesibilitas (rekap bagian 8–10)

| Pola rekap | Keputusan | Tahap |
| --- | --- | --- |
| Progressive disclosure | Sudah dipakai sejak penyederhanaan 25 Oktober; diseragamkan lewat `BagianLipat` dan menu Lainnya | UI-02, UI-05 |
| Satu aksi utama per layar | Sudah aturan v0.4; diperiksa ulang di setiap layar | UI-12 |
| Transparansi sebelum aksi (biaya, waktu, permintaan) | Panel Rencana di layar Buat | UI-06 |
| Tidak ada pekerjaan yang hilang | Draf Buat, `beforeunload`, Jeda tetap menyimpan | UI-06, UI-07 |
| Label status manusiawi | Peta status pusat memakai istilah di layar | UI-03 |
| Empty state dengan tautan ke aksinya | Diperiksa di Beranda, Soal saya, Mohon cek dulu, tong sampah | UI-09, UI-12 |
| Umpan balik inline setelah aksi | `Pemberitahuan` berhasil di dekat tombol (mis. "Profil tersimpan."), selain pesan melayang | UI-02, UI-11 |
| Copy: kata kerja singkat; tombol pembuka dialog diberi "…"; label berubah saat proses; hint menjelaskan akibat | **Ambil**, dalam bahasa Indonesia dan dengan istilah di layar | UI-12 |
| Skip link, `aria-*`, fokus terlihat, status tidak hanya warna | Sebagian besar sudah ada; diaudit di semua layar, termasuk mode gelap | UI-12 |

## Tahap kerja

Setiap tahap menjadi satu issue di GitHub dan satu PR. Tahap fondasi (UI-01 sampai UI-05) tidak mengubah alur guru, hanya menyiapkan bahan bersama. Tahap layar (UI-06 sampai UI-11) boleh dikerjakan dalam urutan apa pun setelah fondasinya selesai. UI-12 terakhir.

| ID | Tahap | Bergantung pada | Fitur terkait |
| --- | --- | --- | --- |
| UI-01 | Fondasi tampilan: token, utilitas kartu/tombol/bidang/kertas, angka tabular, tema tanpa kedipan | — | F-01 |
| UI-02 | Komponen formulir dan pemberitahuan: `Bidang`, `Pilihan`, `Sakelar`, `BagianLipat`, `Pemberitahuan` | UI-01 | F-03 |
| UI-03 | Peta status pusat, lencana status paket, bilah kemajuan yang dapat dibaca pembaca layar | UI-01 | F-07, F-13 |
| UI-04 | Kerangka halaman: kepala lengket di layar lebar, `KepalaHalaman` dengan aksi utama | UI-01 | — |
| UI-05 | Dialog, menu Lainnya, dan dialog konfirmasi pengganti `window.confirm` | UI-01 | F-09, F-12 |
| UI-06 | Layar Buat: inti, Pengaturan lanjutan, panel Rencana, draf otomatis, gerbang kunci AI | UI-02, UI-04 | F-03, F-04, F-14 |
| UI-07 | Layar Periksa: aksi utama di kepala, banner Mohon cek dulu, navigasi nomor soal, saringan di URL, peringatan saat menutup tab | UI-03, UI-04, UI-05 | F-09, F-13 |
| UI-08 | Layar Unduh: `Pilihan` format, `Sakelar` berkas, utilitas kertas, pilihan diingat | UI-02 | F-10, F-11 |
| UI-09 | Soal saya: saringan status, menu ⋯ per baris, tab di URL | UI-03, UI-05 | F-12 |
| UI-10 | Beranda: kartu Langkah awal | UI-03 | F-14 |
| UI-11 | Pengaturan AI, Profil dan kop, Cadangan: kartu per bagian, Zona berbahaya, umpan balik inline | UI-02, UI-05 | F-01, F-12, F-14 |
| UI-12 | Copy dan aksesibilitas: audit semua layar, mode gelap, uji e2e akhir | UI-01 sampai UI-11 | — |

## Kriteria selesai yang berlaku untuk setiap tahap

Mengikuti `AGENTS.md` butir 5, ditambah tiga syarat berikut.

- `npm test` lulus dan `npm run typecheck` tanpa galat.
- `npm run e2e` lulus. Tangkapan laptop dan ponsel 390 px diperiksa, tanpa geser mendatar.
- Tidak ada teks di bawah 16 px, dan kontras teks minimal 4,5 : 1 di mode terang maupun gelap.
- Istilah di layar mengikuti tabel rancangan.
- Perubahan yang menyimpang dari `docs/RANCANGAN.md` dicatat di `docs/KEPUTUSAN.md`.

## Yang sengaja tidak diambil

- Warna indigo, font sistem, dan teks 14 px atau 12 px. Bertentangan dengan Arah visual v0.4.
- Tombol tema di kepala halaman. Menambah elemen di kepala untuk pengaturan yang jarang diubah.
- Kartu statistik di beranda. Rancangan v0.4 mengeluarkan ringkasan dari beranda supaya beranda hanya berisi satu tombol besar dan daftar soal terakhir.
- Pengalihan paksa ke Pengaturan AI. Guru awam bisa bingung kenapa layar berpindah sendiri. Pemberitahuan dan tombol yang jelas lebih ramah, dan isian tidak hilang.
- Ikon berupa karakter teks. Ikon SVG yang sudah ada lebih jelas dan konsisten di semua peramban.
