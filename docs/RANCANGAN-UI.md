# Rancangan UI/UX GenSoal v0.5

Oct 25, 2026 · disusun dari rekap desain *A-Level Set Builder* (`docs/referensi/rekap-desain-a-level-set-builder.md`) atas permintaan pemilik.

Rekap itu berasal dari aplikasi lain: berbahasa Inggris, untuk pengguna yang terbiasa dengan alat kerja, dan memakai indigo, font sistem, serta teks 14 px. GenSoal dipakai guru kelas 1–12 yang belum tentu terbiasa dengan aplikasi. Karena itu **polanya diambil, gayanya tidak**. Setiap pola diperiksa terhadap patokan di bawah sebelum diambil.

## Keputusan pemilik (25 Oktober 2026)

Tiga hal dari v0.4 terasa merepotkan dan **dihapus**:

1. **Persetujuan guru.** Tidak ada tombol Setujui, "Setujui semua", penanda "Disetujui", atau gerbang unduh. Soal yang lolos pemeriksaan otomatis langsung siap diunduh.
2. **Penanda status per soal dan tabel istilah wajib.** "Jawaban sudah dicek" dan "Mohon cek dulu" tidak lagi tampil sebagai lencana, saringan, atau halaman tersendiri. Teks di layar cukup memakai bahasa sehari-hari yang singkat.
3. **Penunjuk "Langkah n dari 3"** dan satu warna per langkah. Alur cukup dipandu oleh tombol utama di setiap halaman: Buat soal, lalu Unduh.

Yang **tetap** ada, karena itu inti GenSoal dan tidak menambah langkah bagi guru:

- Kunci dihitung ulang sebelum soal tampil; soal yang gagal pemeriksaan tidak pernah sampai ke layar.
- Soal yang kuncinya tidak dapat dicek otomatis (mapel tanpa pemeriksa, uraian) diberi **satu kalimat** di kartunya: "Kunci tidak dicek otomatis. Baca sekali sebelum dipakai." Tidak ada lencana, tombol, atau penghalang. Kalimat ini satu-satunya sisa penanda status, dan dapat dihapus juga bila pemilik menghendaki.
- Data `status_mutu` dan `status_telaah` tetap disimpan apa adanya, sehingga skema Dexie tidak berubah dan cadangan lama tetap terbaca.

Penghapusan ini dikerjakan sebagai tahap pertama, **UI-00**, karena memangkas banyak kode yang jika tidak akan dirapikan di tahap-tahap berikutnya.

## Patokan

Pola dari rekap hanya diambil bila tidak melanggar salah satu butir berikut.

1. **Tiga isian wajib** di layar Buat: kelas, topik atau mapel, dan jumlah soal. Sisanya terisi otomatis.
2. **Tanpa langkah persetujuan:** dari Buat soal ke Unduh tidak ada tahap yang harus dilewati guru.
3. **Mudah dibaca:** teks minimal 16 px, judul halaman 30–36 px, Nunito Sans, kontras minimal 4,5 : 1, dan keterangan tidak hanya disampaikan lewat warna.
4. **Satu tombol utama berwarna pekat per layar.** Merah hanya untuk hapus dan batal.
5. **Bahasa sehari-hari** tanpa kata teknis atau bahasa Inggris di label utama.
6. **Bantuan tidak menempel di layar kerja**, dan aplikasi tidak membawa data kurikulum.
7. **Lokal dulu:** tanpa akun, tidak ada pekerjaan yang hilang, dan kunci API tidak keluar dari peramban.
8. **Penyederhanaan 25 Oktober** (`docs/PENYEDERHANAAN-UI.md`) tetap berlaku: lebih sedikit kartu dan tombol, aksi jarang dipakai dilipat.

## Pemetaan rekap ke GenSoal

Kolom **Keputusan** berisi salah satu dari: *Ambil* (dipakai apa adanya), *Sesuaikan* (polanya dipakai dengan aturan GenSoal), atau *Tidak diambil*.

### Fondasi (rekap bagian 1–3)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| Token warna di `@theme`, netral slate, brand indigo | Token `--gs-*` dengan palet v0.4 (biru #2563EB, kuning ornamen) | **Sesuaikan:** struktur token tetap, palet v0.4 dipertahankan | UI-01 |
| Warna status semantik yang sama di semua halaman | Status paket dipetakan ulang di tiap layar | **Ambil:** satu peta status paket (biru sedang dibuat, kuning-oranye menunggu atau dijeda, merah perlu perhatian, hijau siap diunduh) | UI-03 |
| Mode gelap tiga pilihan tanpa kedipan (skrip di `index.html`) | Tiga pilihan ada di Profil, tetapi tema baru dipasang setelah IndexedDB terbuka, sehingga layar sempat berkedip terang | **Ambil:** cermin tema di `localStorage` dan berkas skrip kecil (CSP menolak skrip sebaris) | UI-01 |
| Tombol tema di kepala halaman | Tema di Profil dan kop | **Tidak diambil:** menambah elemen di kepala; jarang diubah | — |
| `@utility card`, `btn`, `btn-primary`, `btn-secondary`, `btn-danger` | Komponen `Kartu` dan `kelasTombol`, tetapi kelas kartu masih disalin mentah di beberapa layar | **Ambil** sebagai utilitas `kartu`, `tombol-*`, `bidang` dengan nilai GenSoal | UI-01 |
| Tipografi `text-sm` dan hint `text-xs` | Minimal 16 px | **Tidak diambil:** hierarki dibuat dengan tebal, warna, dan jarak | — |
| Font sistem | Nunito Sans | **Tidak diambil** | — |
| Ikon hanya karakter teks | SVG kecil sebaris | **Tidak diambil:** SVG lebih jelas | — |
| `tabular-nums` untuk angka | Belum | **Ambil** | UI-01 |

### Komponen (rekap bagian 4–5)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| `Field`: label, isian, hint; galat menggantikan hint | `Label` terpisah; galat Buat soal dikumpulkan di bawah formulir | **Ambil:** komponen `Bidang` dengan galat tepat di bawah isian | UI-02 |
| `Segmented` untuk 2–4 pilihan | Kartu radio (Unduh), chip (tema), dan select (cara benar-salah) bercampur | **Ambil:** komponen `Pilihan` (`role="radiogroup"`) | UI-02 |
| `Chips` multi-pilih | `Chip` ada | **Ambil** (dirapikan) | UI-02 |
| `Toggle` (kotak centang dengan hint) | Kotak centang ditulis langsung di tiap layar | **Ambil:** komponen `Sakelar` | UI-02 |
| `Section` lipat, status buka diingat | Tombol buatan sendiri dan `<details>` bercampur | **Ambil:** komponen `BagianLipat` | UI-02 |
| `Notice` empat nada | `Peringatan` (satu nada) dan `Kotak` | **Ambil:** komponen `Pemberitahuan` (info, awas, galat, berhasil) | UI-02 |
| Modal: fokus otomatis, kembali ke pemicu, Escape, tombol di kaki | `<dialog>` bawaan dengan `aria-label` saja | **Sesuaikan:** `aria-labelledby`, kaki tombol, varian konfirmasi | UI-05 |
| Menu "More ▾" atau "⋯" | `MenuLainnya` di kartu soal | **Ambil:** dirapikan, dipakai di halaman paket dan Soal saya | UI-05 |
| Konfirmasi aksi destruktif menyebut nama item dan akibatnya | `window.confirm`; setelah UI-00 tersisa 5 tempat | **Ambil:** dialog konfirmasi sendiri | UI-05 |
| Lencana status dari satu peta pusat | Status paket hanya titik dan teks | **Ambil** untuk status paket saja; tidak ada lencana per soal | UI-03 |
| Bilah kemajuan `role="progressbar"`, amber saat menunggu batas | `aria-hidden`, selalu biru | **Ambil** | UI-03 |
| Tab aktif di URL | Tab dan saringan tidak tersimpan di URL | **Ambil** untuk Soal saya (`?status=`, `?tab=sampah`) | UI-09 |
| Navigasi cepat Q1, Q2, … | Belum ada; paket 12–50 soal harus digulir | **Ambil** sebagai deret nomor soal di halaman paket; nomor soal yang kuncinya tidak dicek otomatis diberi titik kuning-oranye | UI-07 |

### Tata letak dan pola halaman (rekap bagian 6–7)

| Pola rekap | Keadaan GenSoal sekarang | Keputusan | Tahap |
| --- | --- | --- | --- |
| Kepala lengket `h-14`, semi-transparan | Kepala tidak lengket; penunjuk langkah di bawahnya | **Sesuaikan:** penunjuk langkah dihapus (UI-00); kepala lengket hanya di layar ≥ 1024 px | UI-04 |
| `PageHeader`: judul dan subjudul di kiri, aksi utama di kanan | `KepalaHalaman` tanpa tempat aksi | **Ambil:** prop `aksi` dan `kembali` (tautan kembali) | UI-04 |
| Kaki berisi keterangan privasi | Sudah ada | Sudah sesuai | — |
| Form panjang: *Essentials*, *More options*, bar *preset*, sidebar *Plan* | Dua kartu, Pengaturan lanjutan, satu pilihan pengaturan tersimpan, bilah bawah | **Sesuaikan:** panel **Rencana** lengket di kanan pada layar lebar, bilah bawah di ponsel | UI-06 |
| Draf formulir tersimpan otomatis | Isian hilang bila halaman dimuat ulang | **Ambil** (`localStorage`, tanpa mengubah skema Dexie) | UI-06 |
| Gate: tanpa kunci API, dialihkan ke pengaturan | Galat baru muncul setelah menekan Buat soal | **Sesuaikan:** tidak dialihkan paksa; pemberitahuan dan tombol "Pasang kunci AI dulu" | UI-06 |
| Halaman detail: satu aksi utama tetap terlihat, sisanya di menu More; banner "N item perlu dicek" | Aksi utama di kartu samping dan bilah bawah | **Sesuaikan:** tombol **Unduh** di kepala halaman paket, menu Lainnya. Banner "perlu dicek" **tidak diambil** (tidak ada persetujuan) | UI-07 |
| Peringatan `beforeunload` saat proses berjalan | Belum | **Ambil** | UI-07 |
| Dashboard: tiga kartu statistik, daftar terbaru, kartu "How it works" | Tombol besar Buat soal, kartu pengingat kunci, daftar soal terakhir | **Sesuaikan:** kartu statistik **tidak diambil**; yang diambil kartu **Langkah awal** (Pasang kunci AI, Buat soal, Unduh) yang hilang setelah selesai | UI-10 |
| Daftar: pencarian, filter segmented, menu ⋯ per baris | Pencarian, tab Paket/Tong sampah, tautan Unduh dan Hapus | **Ambil:** saringan Semua · Belum selesai · Siap diunduh; menu ⋯ per baris | UI-09 |
| Settings per kartu dengan **Danger zone** di bawah | Belum seragam | **Ambil** untuk Pengaturan AI, Profil dan kop, Cadangan | UI-11 |
| Tampilan `.paper` selalu hitam di atas putih | Pratinjau Unduh dan tampilan cetak sudah putih | **Ambil** sebagai utilitas `kertas` | UI-01, UI-08 |

### Prinsip, copy, dan aksesibilitas (rekap bagian 8–10)

| Pola rekap | Keputusan | Tahap |
| --- | --- | --- |
| Progressive disclosure | Diseragamkan lewat `BagianLipat` dan menu Lainnya | UI-02, UI-05 |
| Satu aksi utama per layar | Diperiksa ulang di setiap layar | UI-12 |
| Transparansi sebelum aksi (biaya, waktu, permintaan) | Panel Rencana di layar Buat | UI-06 |
| Tidak ada pekerjaan yang hilang | Draf Buat, `beforeunload`, Jeda tetap menyimpan | UI-06, UI-07 |
| Label status manusiawi | Hanya untuk status paket (Sedang dibuat, Dijeda, Siap diunduh, …) | UI-03 |
| Empty state dengan tautan ke aksinya | Beranda, Soal saya, tong sampah | UI-09, UI-12 |
| Umpan balik inline setelah aksi | `Pemberitahuan` berhasil di dekat tombol | UI-02, UI-11 |
| Copy: kata kerja singkat, "…" untuk pembuka dialog, label berubah saat proses, hint menjelaskan akibat | **Ambil**, dalam bahasa Indonesia sehari-hari | UI-12 |
| Skip link, `aria-*`, fokus terlihat | Diaudit di semua layar, termasuk mode gelap | UI-12 |

## Tahap kerja

Setiap tahap menjadi satu issue di GitHub (sub-issue dari #1) dan satu PR. UI-00 dikerjakan pertama. Tahap fondasi (UI-01 sampai UI-05) tidak mengubah alur guru, hanya menyiapkan bahan bersama. Tahap layar (UI-06 sampai UI-11) boleh dikerjakan dalam urutan apa pun setelah fondasinya selesai. UI-12 terakhir.

| ID | Issue | Tahap | Bergantung pada | Fitur terkait |
| --- | --- | --- | --- | --- |
| UI-00 | #14 | Hapus persetujuan guru, penanda status per soal, halaman "Mohon cek dulu", dan penunjuk langkah | — | F-07, F-13 |
| UI-01 | #2 | Fondasi tampilan: token, utilitas kartu/tombol/bidang/kertas, angka tabular, tema tanpa kedipan | — | F-01 |
| UI-02 | #3 | Komponen formulir dan pemberitahuan: `Bidang`, `Pilihan`, `Sakelar`, `BagianLipat`, `Pemberitahuan` | UI-01 | F-03 |
| UI-03 | #4 | Peta status paket, lencana status paket, bilah kemajuan yang terbaca pembaca layar | UI-00, UI-01 | F-07 |
| UI-04 | #5 | Kerangka halaman: kepala lengket di layar lebar, `KepalaHalaman` dengan aksi dan tautan kembali | UI-00, UI-01 | — |
| UI-05 | #6 | Dialog, menu Lainnya, dan dialog konfirmasi pengganti `window.confirm` | UI-00, UI-01 | F-09, F-12 |
| UI-06 | #7 | Layar Buat: inti, Pengaturan lanjutan, panel Rencana, draf otomatis, gerbang kunci AI | UI-02, UI-04 | F-03, F-04, F-14 |
| UI-07 | #8 | Halaman paket soal: tombol Unduh di kepala, navigasi nomor soal, kemajuan, peringatan saat menutup tab | UI-03, UI-04, UI-05 | F-09 |
| UI-08 | #9 | Layar Unduh: `Pilihan` format, `Sakelar` berkas, utilitas kertas, pilihan diingat | UI-02, UI-04 | F-10, F-11 |
| UI-09 | #10 | Soal saya: saringan status, menu ⋯ per baris, tab di URL | UI-03, UI-05 | F-12 |
| UI-10 | #11 | Beranda: kartu Langkah awal | UI-03 | F-14 |
| UI-11 | #12 | Pengaturan AI, Profil dan kop, Cadangan: kartu per bagian, Zona berbahaya, umpan balik inline | UI-02, UI-05 | F-01, F-12, F-14 |
| UI-12 | #13 | Copy dan aksesibilitas: audit semua layar, mode gelap, uji e2e akhir | UI-00 sampai UI-11 | — |

## Kriteria selesai yang berlaku untuk setiap tahap

Mengikuti `AGENTS.md` butir 5, ditambah syarat berikut.

- `npm test` lulus dan `npm run typecheck` tanpa galat.
- `npm run e2e` lulus. Tangkapan laptop dan ponsel 390 px diperiksa, tanpa geser mendatar.
- Tidak ada teks di bawah 16 px, dan kontras teks minimal 4,5 : 1 di mode terang maupun gelap.
- Tidak muncul kembali tombol Setujui, lencana status per soal, atau penunjuk langkah.
- Perubahan yang menyimpang dari `docs/RANCANGAN.md` dicatat di `docs/KEPUTUSAN.md`.

## Yang sengaja tidak diambil

- Warna indigo, font sistem, dan teks 14 px atau 12 px. Bertentangan dengan Arah visual.
- Tombol tema di kepala halaman. Menambah elemen di kepala untuk pengaturan yang jarang diubah.
- Kartu statistik di beranda. Beranda tetap berisi satu tombol besar dan daftar soal terakhir.
- Banner "N item perlu dicek" dan perbaikan massal. Tidak ada langkah persetujuan lagi.
- Pengalihan paksa ke Pengaturan AI. Guru awam bisa bingung kenapa layar berpindah sendiri; pemberitahuan dan tombol yang jelas lebih ramah, dan isian tidak hilang.
- Ikon berupa karakter teks. Ikon SVG yang sudah ada lebih jelas.
