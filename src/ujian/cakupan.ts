/**
 * Cakupan materi format ujian (F-39): elemen → sub-elemen → butir, dengan porsi per elemen.
 *
 * Keputusan pemilik (7 November 2026): cakupan kerangka asesmen TKA dan ranah OSN boleh dibawa aplikasi agar soal
 * format ujian tersebar ke seluruh materi, bukan berulang di satu topik. Ini bukan CP atau TP sekolah: cakupan
 * hanya dipakai bila guru mengosongkan CP dan TP, dan TP guru selalu didahulukan (docs/KEPUTUSAN.md).
 *
 * Sumber dan tingkat kepastian per daftar: docs/referensi/format-ujian.md, bagian "Cakupan materi".
 */

export interface ButirCakupan {
  elemen: string;
  sub: string;
  butir: string;
}

export interface Cakupan {
  /** Porsi soal per elemen (dibagi ke jumlah soal dengan sisa terbesar). */
  porsi: Record<string, number>;
  butir: ButirCakupan[];
}

function daftar(elemen: string, sub: string, butir: string[]): ButirCakupan[] {
  return butir.map((b) => ({ elemen, sub, butir: b }));
}

/** Matematika SD/MI: Bilangan, Geometri dan Pengukuran, Data. Porsi usulan 50/30/20. */
const MAT_SD: Cakupan = {
  porsi: { Bilangan: 5, 'Geometri dan Pengukuran': 3, Data: 2 },
  butir: [
    ...daftar('Bilangan', 'Bilangan cacah', [
      'Nilai tempat, membandingkan, dan mengurutkan bilangan cacah',
      'Operasi hitung campuran bilangan cacah dalam soal cerita',
      'Pola bilangan sederhana',
      'Penaksiran (estimasi) dan pembulatan hasil hitung',
    ]),
    ...daftar('Bilangan', 'Faktor dan kelipatan', ['Kelipatan persekutuan terkecil (KPK) dalam masalah sehari-hari', 'Faktor persekutuan terbesar (FPB) dalam masalah sehari-hari']),
    ...daftar('Bilangan', 'Bilangan rasional', [
      'Pecahan senilai, membandingkan, dan mengurutkan pecahan',
      'Hubungan pecahan, desimal, dan persen',
      'Operasi hitung pecahan dan desimal dalam soal cerita',
      'Persen dalam konteks diskon, bagian, atau peningkatan',
      'Perbandingan dan rasio sederhana',
    ]),
    ...daftar('Geometri dan Pengukuran', 'Objek geometri', [
      'Sifat-sifat bangun datar (segitiga, segi empat, lingkaran)',
      'Sifat-sifat dan jaring-jaring kubus dan balok',
      'Bangun ruang dilihat dari depan, atas, dan samping',
      'Jenis dan besar sudut',
    ]),
    ...daftar('Geometri dan Pengukuran', 'Pengukuran', [
      'Konversi satuan panjang, berat, dan waktu',
      'Satuan volume (liter, mililiter, cm³) dan penaksiran ukuran',
      'Keliling dan luas bangun datar serta gabungannya',
      'Volume kubus dan balok',
    ]),
    ...daftar('Data', 'Penyajian dan interpretasi data', ['Membaca dan menafsirkan tabel frekuensi dan piktogram', 'Membaca dan menafsirkan diagram batang', 'Rata-rata (mean) dan nilai terbanyak dari data sederhana']),
  ],
};

/** Matematika SMP/MTs: butir cakupan kerangka asesmen (Perkaban BSKAP 047/H/AN/2025). Porsi 7/8/8/7 per 30 soal. */
const MAT_SMP: Cakupan = {
  porsi: { Bilangan: 7, Aljabar: 8, 'Geometri dan Pengukuran': 8, 'Data dan Peluang': 7 },
  butir: [
    ...daftar('Bilangan', 'Bilangan Real', [
      'Perbandingan dan sifat-sifat bilangan (bulat, rasional, berpangkat, akar, notasi ilmiah)',
      'Operasi aritmetika pada bilangan',
      'Estimasi atau perkiraan hasil perhitungan',
      'Faktorisasi prima bilangan asli',
      'Rasio (skala, proporsi, dan laju perubahan)',
      'Perbandingan senilai dan berbalik nilai',
    ]),
    ...daftar('Aljabar', 'Persamaan dan Pertidaksamaan Linear', ['Persamaan linear satu variabel', 'Pertidaksamaan linear satu variabel', 'Sistem persamaan linear dua variabel']),
    ...daftar('Aljabar', 'Bentuk Aljabar', ['Bentuk aljabar dan sifat-sifat operasinya (komutatif, asosiatif, dan distributif)']),
    ...daftar('Aljabar', 'Fungsi', ['Relasi dan fungsi (domain, kodomain, range) serta penyajiannya']),
    ...daftar('Aljabar', 'Barisan dan Deret', ['Barisan berhingga bilangan', 'Deret berhingga bilangan']),
    ...daftar('Geometri dan Pengukuran', 'Objek Geometri', [
      'Hubungan antarsudut pada dua garis berpotongan dan dua garis sejajar yang dipotong garis transversal, termasuk sudut dalam segitiga',
      'Teorema Pythagoras',
      'Kekongruenan dan kesebangunan bangun datar',
      'Jaring-jaring bangun ruang (prisma, tabung, limas, dan kerucut)',
    ]),
    ...daftar('Geometri dan Pengukuran', 'Transformasi Geometri', ['Transformasi tunggal (refleksi, translasi, rotasi, dan dilatasi) titik, garis, dan bangun datar']),
    ...daftar('Geometri dan Pengukuran', 'Pengukuran', ['Keliling dan luas bangun datar (segi banyak, lingkaran, dan gabungannya)', 'Volume bangun ruang (prisma, limas, dan bola)']),
    ...daftar('Data dan Peluang', 'Data', [
      'Perumusan pertanyaan, penyajian, dan penginterpretasian data (tabel, diagram batang, garis, lingkaran)',
      'Rerata, median, modus, dan jangkauan data',
      'Perbandingan ukuran pemusatan dan penyebaran beberapa kelompok data',
    ]),
    ...daftar('Data dan Peluang', 'Peluang', ['Peluang dan frekuensi relatif kejadian tunggal']),
  ],
};

/** Matematika SMA/MA (wajib): lima elemen kerangka asesmen (Perkaban BSKAP 045/H/AN/2025). Porsi usulan 4/7/5/3/6 per 25 soal. */
const MAT_SMA: Cakupan = {
  porsi: { Bilangan: 4, Aljabar: 7, 'Geometri dan Pengukuran': 5, Trigonometri: 3, 'Data dan Peluang': 6 },
  butir: [
    ...daftar('Bilangan', 'Bilangan Real', ['Bilangan berpangkat dan bentuk akar', 'Logaritma dan penerapannya', 'Bunga, pertumbuhan, dan peluruhan']),
    ...daftar('Aljabar', 'Persamaan dan Pertidaksamaan', ['Sistem persamaan linear tiga variabel', 'Sistem pertidaksamaan linear dua variabel dan program linear', 'Persamaan dan fungsi kuadrat']),
    ...daftar('Aljabar', 'Fungsi', ['Fungsi, komposisi fungsi, dan fungsi invers', 'Fungsi eksponensial dalam pemodelan']),
    ...daftar('Aljabar', 'Barisan dan Deret', ['Barisan dan deret aritmetika', 'Barisan dan deret geometri']),
    ...daftar('Geometri dan Pengukuran', 'Objek Geometri', ['Hubungan sudut dan unsur lingkaran', 'Kesebangunan dan teorema Pythagoras pada bangun datar dan ruang']),
    ...daftar('Geometri dan Pengukuran', 'Transformasi Geometri', ['Translasi, refleksi, rotasi, dan dilatasi pada bidang koordinat']),
    ...daftar('Geometri dan Pengukuran', 'Pengukuran', ['Luas permukaan dan volume bangun ruang']),
    ...daftar('Trigonometri', 'Perbandingan Trigonometri', ['Perbandingan trigonometri pada segitiga siku-siku', 'Penerapan trigonometri (sudut elevasi, depresi, jarak, dan tinggi)', 'Aturan sinus dan kosinus']),
    ...daftar('Data dan Peluang', 'Data', ['Penyajian dan interpretasi data', 'Ukuran pemusatan, letak, dan penyebaran data']),
    ...daftar('Data dan Peluang', 'Peluang', ['Kaidah pencacahan (aturan perkalian, permutasi, kombinasi)', 'Peluang kejadian dan frekuensi harapan']),
  ],
};

/**
 * Bahasa Indonesia: teks informasi dan teks fiksi berporsi seimbang. Kompetensi (tekstual, inferensial, evaluasi dan
 * apresiasi) tidak ada di sini: dipilih dari level TKA butir di prompt, agar level dan kompetensi selalu cocok.
 */
const BINDO_SD: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks informasi tunggal', [
      'Teks deskripsi tentang hewan, tumbuhan, atau tempat',
      'Teks laporan sederhana tentang kegiatan atau pengamatan',
      'Teks petunjuk atau langkah membuat sesuatu',
      'Berita sederhana tentang peristiwa di lingkungan sekitar',
      'Pengumuman, poster, atau surat undangan',
    ]),
    ...daftar('Teks fiksi', 'Cerita', [
      'Dongeng atau cerita fantasi dengan alur maju',
      'Fabel dengan pesan moral',
      'Cerita rakyat Nusantara',
      'Cerita pengalaman sehari-hari dengan sudut pandang orang pertama',
    ]),
  ],
};

const BINDO_SMP: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks informasi tunggal', [
      'Teks eksplanasi tentang gejala alam atau sosial',
      'Teks laporan hasil observasi',
      'Teks berita',
      'Teks prosedur',
      'Teks iklan atau infografis berisi data',
    ]),
    ...daftar('Teks informasi', 'Teks informasi jamak', ['Dua teks informasi bertopik sama dengan sudut pandang berbeda']),
    ...daftar('Teks fiksi', 'Prosa', ['Cerpen dengan tokoh berkarakter bulat dan alur campuran', 'Cerita fantasi', 'Cerita rakyat atau legenda']),
    ...daftar('Teks fiksi', 'Puisi', ['Puisi bertema alam, keluarga, atau sosial']),
  ],
};

const BINDO_SMA: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks informasi tunggal', ['Teks eksposisi', 'Artikel opini atau editorial', 'Artikel ilmiah populer', 'Teks berita dengan data', 'Infografis atau tabel data dengan teks pengantar']),
    ...daftar('Teks informasi', 'Teks informasi jamak', ['Dua teks informasi yang saling melengkapi atau bertentangan']),
    ...daftar('Teks fiksi', 'Prosa dan drama', ['Cerpen', 'Kutipan novel', 'Kutipan drama', 'Hikayat atau cerita rakyat']),
    ...daftar('Teks fiksi', 'Puisi', ['Puisi modern']),
  ],
};

const BING_SMA: Cakupan = {
  porsi: { 'Informational text': 3, 'Literary text': 2 },
  butir: [
    ...daftar('Informational text', 'Factual text', ['Descriptive text', 'Recount text', 'Procedure text', 'Report text']),
    ...daftar('Informational text', 'Argumentative text', ['Analytical exposition', 'Short opinion article or letter to the editor']),
    ...daftar('Informational text', 'Functional text', ['Announcement, notice, or advertisement', 'Email or short message']),
    ...daftar('Literary text', 'Narrative', ['Narrative text (short story)', 'Folktale or legend', 'Short poem or song lyric']),
  ],
};

// ---- OSN: ranah lomba (lihat aturan format di src/ujian/index.ts) ----

const OSN_MAT_SD: Cakupan = {
  porsi: { Bilangan: 1, Aritmetika: 1, Geometri: 1, Kombinatorik: 1, 'Statistika, data, dan pengukuran': 1 },
  butir: [
    ...daftar('Bilangan', 'Teori bilangan dasar', ['Sifat bilangan, faktor, kelipatan, dan bilangan prima', 'Pola dan barisan bilangan']),
    ...daftar('Aritmetika', 'Operasi dan penalaran', ['Operasi hitung bertingkat dan pecahan', 'Soal cerita kecepatan, umur, atau perbandingan']),
    ...daftar('Geometri', 'Bangun datar dan ruang', ['Luas dan keliling bangun gabungan', 'Volume dan susunan kubus satuan']),
    ...daftar('Kombinatorik', 'Membilang', ['Banyak cara menyusun atau memilih', 'Penalaran logika dan teka-teki']),
    ...daftar('Statistika, data, dan pengukuran', 'Data dan satuan', ['Rata-rata dan membaca data', 'Pengukuran waktu, jarak, dan satuan']),
  ],
};

const OSN_MAT_LANJUT: Cakupan = {
  porsi: { Aljabar: 1, Geometri: 1, Kombinatorika: 1, 'Teori bilangan': 1 },
  butir: [
    ...daftar('Aljabar', 'Aljabar olimpiade', ['Persamaan dan sistem persamaan', 'Barisan, deret, dan pola', 'Ketaksamaan dan nilai ekstrem']),
    ...daftar('Geometri', 'Geometri olimpiade', ['Sudut, segitiga, dan kesebangunan', 'Lingkaran dan luas daerah']),
    ...daftar('Kombinatorika', 'Membilang dan peluang', ['Aturan pencacahan, permutasi, dan kombinasi', 'Peluang dan prinsip sarang merpati']),
    ...daftar('Teori bilangan', 'Keterbagian', ['Keterbagian, FPB, dan KPK', 'Sisa pembagian dan digit']),
  ],
};

const OSN_IPA: Cakupan = {
  porsi: { 'Makhluk hidup': 1, 'Zat dan materi': 1, 'Energi dan gaya': 1, 'Bumi dan antariksa': 1 },
  butir: [
    ...daftar('Makhluk hidup', 'Biologi', ['Struktur dan fungsi organ', 'Ekosistem dan rantai makanan', 'Perkembangbiakan dan pewarisan sifat']),
    ...daftar('Zat dan materi', 'Kimia', ['Wujud dan perubahan zat', 'Campuran, larutan, dan pemisahan']),
    ...daftar('Energi dan gaya', 'Fisika', ['Gaya, gerak, dan pesawat sederhana', 'Listrik, magnet, cahaya, dan bunyi', 'Kalor dan perpindahannya']),
    ...daftar('Bumi dan antariksa', 'Ilmu kebumian', ['Tata surya dan gerak bumi', 'Cuaca, iklim, dan bencana alam']),
  ],
};

const OSN_IPS: Cakupan = {
  porsi: { Geografi: 1, Sejarah: 1, Ekonomi: 1, 'Sosial budaya': 1 },
  butir: [
    ...daftar('Geografi', 'Ruang dan lingkungan', ['Membaca peta dan letak geografis Indonesia', 'Sumber daya alam dan bencana']),
    ...daftar('Sejarah', 'Sejarah Indonesia', ['Kerajaan Nusantara dan peninggalannya', 'Perjuangan kemerdekaan']),
    ...daftar('Ekonomi', 'Kegiatan ekonomi', ['Kebutuhan, kelangkaan, dan pilihan', 'Pasar, harga, dan koperasi']),
    ...daftar('Sosial budaya', 'Masyarakat', ['Keragaman budaya Indonesia', 'Interaksi sosial dan lembaga sosial']),
  ],
};

// ---- OSN SMP dan SMA: ranah per bidang ----

const OSN_IPA_SMP: Cakupan = {
  porsi: { Fisika: 2, Kimia: 1, Biologi: 2, 'Bumi dan antariksa': 1 },
  butir: [
    ...daftar('Fisika', 'Mekanika', ['Gerak lurus, kelajuan, dan grafik gerak', 'Gaya, hukum Newton, usaha, energi, dan pesawat sederhana', 'Tekanan zat padat, cair, dan gas (Pascal, Archimedes)']),
    ...daftar('Fisika', 'Gelombang, listrik, dan kalor', ['Getaran, gelombang, bunyi, dan cahaya (cermin dan lensa)', 'Rangkaian listrik, hukum Ohm, dan energi listrik', 'Suhu, kalor, pemuaian, dan perubahan wujud']),
    ...daftar('Kimia', 'Materi dan perubahannya', ['Unsur, senyawa, campuran, dan pemisahan campuran', 'Atom, ion, molekul, dan reaksi kimia sederhana', 'Asam, basa, garam, dan indikator']),
    ...daftar('Biologi', 'Makhluk hidup', ['Klasifikasi makhluk hidup', 'Sel, jaringan, dan sistem organ manusia', 'Sistem organ tumbuhan dan fotosintesis', 'Pewarisan sifat dan bioteknologi sederhana', 'Ekosistem, interaksi, dan pencemaran lingkungan']),
    ...daftar('Bumi dan antariksa', 'Ilmu kebumian', ['Tata surya, gerak bumi dan bulan, gerhana', 'Lapisan bumi, gempa, dan gunung api', 'Atmosfer, cuaca, dan iklim']),
  ],
};

const OSN_IPS_SMP: Cakupan = {
  porsi: { Geografi: 1, Sejarah: 1, Ekonomi: 1, Sosiologi: 1 },
  butir: [
    ...daftar('Geografi', 'Ruang dan lingkungan', ['Peta, skala, dan letak geografis Indonesia dan ASEAN', 'Kondisi fisik wilayah, sumber daya alam, dan mitigasi bencana', 'Kependudukan dan mobilitas penduduk']),
    ...daftar('Sejarah', 'Sejarah Indonesia', ['Masa praaksara dan kerajaan Hindu-Buddha serta Islam', 'Kolonialisme dan pergerakan nasional', 'Proklamasi dan mempertahankan kemerdekaan']),
    ...daftar('Ekonomi', 'Kegiatan ekonomi', ['Kelangkaan, kebutuhan, dan pilihan ekonomi', 'Permintaan, penawaran, dan harga pasar', 'Pelaku ekonomi, uang, dan lembaga keuangan', 'Perdagangan internasional dan ekonomi kreatif']),
    ...daftar('Sosiologi', 'Masyarakat', ['Interaksi sosial dan lembaga sosial', 'Mobilitas sosial dan keragaman budaya', 'Perubahan sosial dan globalisasi']),
  ],
};

const OSN_FISIKA: Cakupan = {
  porsi: { Mekanika: 3, 'Termodinamika dan fluida': 1, Gelombang: 1, 'Listrik dan magnet': 1, 'Fisika modern': 1 },
  butir: [
    ...daftar('Mekanika', 'Kinematika dan dinamika', ['Kinematika gerak lurus, parabola, dan melingkar', 'Hukum Newton, gesekan, dan sistem benda terhubung', 'Usaha, energi, dan hukum kekekalan energi', 'Momentum, impuls, dan tumbukan', 'Dinamika rotasi dan kesetimbangan benda tegar', 'Gravitasi dan gerak harmonik sederhana']),
    ...daftar('Termodinamika dan fluida', 'Kalor dan fluida', ['Kalor, kalorimetri, dan perpindahan kalor', 'Teori kinetik gas dan hukum termodinamika', 'Fluida statis dan dinamis']),
    ...daftar('Gelombang', 'Gelombang dan optika', ['Gelombang mekanik dan bunyi (efek Doppler, resonansi)', 'Optika geometri dan interferensi cahaya']),
    ...daftar('Listrik dan magnet', 'Elektromagnetik', ['Listrik statis, medan, dan potensial listrik', 'Rangkaian arus searah dan kapasitor', 'Medan magnet dan induksi elektromagnetik']),
    ...daftar('Fisika modern', 'Fisika modern dasar', ['Relativitas khusus, efek fotolistrik, dan model atom']),
  ],
};

const OSN_KIMIA: Cakupan = {
  porsi: { 'Struktur dan stoikiometri': 2, 'Kimia fisik': 2, 'Larutan dan redoks': 2, 'Kimia organik': 1 },
  butir: [
    ...daftar('Struktur dan stoikiometri', 'Atom dan reaksi', ['Struktur atom, konfigurasi elektron, dan sistem periodik', 'Ikatan kimia, bentuk molekul, dan gaya antarmolekul', 'Stoikiometri: mol, pereaksi pembatas, dan rumus empiris']),
    ...daftar('Kimia fisik', 'Energi dan laju', ['Termokimia dan hukum Hess', 'Laju reaksi dan faktor yang memengaruhinya', 'Kesetimbangan kimia dan tetapan kesetimbangan']),
    ...daftar('Larutan dan redoks', 'Larutan', ['Asam-basa, pH, dan larutan penyangga', 'Hidrolisis garam, kelarutan, dan Ksp', 'Sifat koligatif larutan', 'Reaksi redoks dan elektrokimia']),
    ...daftar('Kimia organik', 'Senyawa karbon', ['Tata nama, isomer, dan reaksi senyawa hidrokarbon dan gugus fungsi']),
  ],
};

const OSN_BIOLOGI: Cakupan = {
  porsi: { 'Biologi sel dan molekuler': 2, 'Anatomi dan fisiologi': 3, 'Genetika dan evolusi': 2, Ekologi: 2, Biosistematika: 1 },
  butir: [
    ...daftar('Biologi sel dan molekuler', 'Sel', ['Struktur sel dan transpor membran', 'Enzim, respirasi seluler, dan fotosintesis', 'Replikasi DNA, sintesis protein, dan regulasi gen']),
    ...daftar('Anatomi dan fisiologi', 'Hewan dan manusia', ['Sistem pencernaan, peredaran darah, dan pernapasan', 'Sistem saraf, hormon, dan homeostasis', 'Sistem imun dan ekskresi']),
    ...daftar('Anatomi dan fisiologi', 'Tumbuhan', ['Struktur dan fisiologi tumbuhan (transportasi, hormon, pertumbuhan)']),
    ...daftar('Genetika dan evolusi', 'Pewarisan', ['Hukum Mendel, pautan, dan pewarisan terkait kromosom seks', 'Genetika populasi dan mekanisme evolusi']),
    ...daftar('Ekologi', 'Lingkungan', ['Ekosistem, aliran energi, dan daur biogeokimia', 'Dinamika populasi dan interaksi antarspesies']),
    ...daftar('Biosistematika', 'Keanekaragaman', ['Klasifikasi dan filogeni makhluk hidup']),
  ],
};

const OSN_INFORMATIKA: Cakupan = {
  porsi: { 'Berpikir komputasional': 2, 'Logika dan aritmetika': 2, Algoritma: 2 },
  butir: [
    ...daftar('Berpikir komputasional', 'Pemecahan masalah', ['Dekomposisi masalah dan pengenalan pola', 'Simulasi proses atau aturan permainan', 'Penjadwalan dan optimasi sederhana']),
    ...daftar('Logika dan aritmetika', 'Penalaran', ['Logika proposisi dan teka-teki penalaran', 'Aritmetika, sisa pembagian, dan basis bilangan', 'Kombinatorika dan pencacahan']),
    ...daftar('Algoritma', 'Pseudocode', ['Menelusuri keluaran pseudocode (perulangan dan percabangan)', 'Larik, pengurutan, dan pencarian', 'Rekursi dan graf sederhana']),
  ],
};

const OSN_ASTRONOMI: Cakupan = {
  porsi: { 'Bola langit dan waktu': 1, 'Mekanika benda langit': 1, 'Tata surya': 1, 'Bintang dan galaksi': 1, 'Kosmologi dan instrumen': 1 },
  butir: [
    ...daftar('Bola langit dan waktu', 'Tata koordinat', ['Tata koordinat horizon dan ekuatorial', 'Sistem waktu, kalender, dan gerak semu harian']),
    ...daftar('Mekanika benda langit', 'Gravitasi', ['Hukum Kepler dan gravitasi Newton', 'Orbit satelit dan kecepatan lepas']),
    ...daftar('Tata surya', 'Anggota tata surya', ['Planet, bulan, fase, dan gerhana', 'Komet, asteroid, dan meteor']),
    ...daftar('Bintang dan galaksi', 'Astrofisika', ['Magnitudo, luminositas, dan jarak bintang', 'Spektrum, suhu, dan evolusi bintang', 'Struktur Bima Sakti dan galaksi lain']),
    ...daftar('Kosmologi dan instrumen', 'Alam semesta dan teleskop', ['Hukum Hubble dan pengembangan alam semesta', 'Teleskop, perbesaran, dan daya pisah']),
  ],
};

const OSN_KEBUMIAN: Cakupan = {
  porsi: { Geologi: 2, Meteorologi: 1, Oseanografi: 1, 'Astronomi bumi': 1 },
  butir: [
    ...daftar('Geologi', 'Bumi padat', ['Mineral dan batuan serta siklus batuan', 'Tektonik lempeng, gempa bumi, dan gunung api', 'Peta geologi, penampang, dan struktur lapisan', 'Geomorfologi dan proses permukaan bumi']),
    ...daftar('Meteorologi', 'Atmosfer', ['Lapisan atmosfer, tekanan, angin, dan awan', 'Cuaca, iklim, dan fenomena El Niño serta La Niña']),
    ...daftar('Oseanografi', 'Laut', ['Arus, gelombang, dan pasang surut', 'Sifat fisik dan kimia air laut']),
    ...daftar('Astronomi bumi', 'Bumi di antariksa', ['Gerak rotasi dan revolusi bumi serta musim', 'Bulan, gerhana, dan tata surya']),
  ],
};

const OSN_EKONOMI: Cakupan = {
  porsi: { Mikroekonomi: 2, Makroekonomi: 2, 'Akuntansi dan manajemen': 1 },
  butir: [
    ...daftar('Mikroekonomi', 'Pasar dan perilaku', ['Permintaan, penawaran, keseimbangan, dan elastisitas', 'Perilaku konsumen dan utilitas', 'Biaya produksi dan bentuk pasar']),
    ...daftar('Makroekonomi', 'Perekonomian nasional', ['Pendapatan nasional dan pertumbuhan ekonomi', 'Inflasi, uang, dan kebijakan moneter', 'Kebijakan fiskal, APBN, dan perdagangan internasional']),
    ...daftar('Akuntansi dan manajemen', 'Usaha', ['Persamaan dasar akuntansi dan jurnal', 'Laporan keuangan sederhana', 'Fungsi manajemen dan badan usaha']),
  ],
};

const OSN_GEOGRAFI: Cakupan = {
  porsi: { 'Geografi fisik': 2, 'Geografi manusia': 2, 'Pemetaan dan SIG': 1 },
  butir: [
    ...daftar('Geografi fisik', 'Lingkungan fisik', ['Litosfer, bentuk lahan, dan tanah', 'Atmosfer, iklim, dan hidrosfer', 'Biosfer dan persebaran flora fauna', 'Bencana alam dan mitigasinya']),
    ...daftar('Geografi manusia', 'Penduduk dan wilayah', ['Dinamika dan persebaran penduduk', 'Desa, kota, dan interaksi wilayah', 'Sumber daya alam dan pembangunan berkelanjutan']),
    ...daftar('Pemetaan dan SIG', 'Analisis spasial', ['Peta, skala, dan proyeksi', 'Penginderaan jauh dan sistem informasi geografis']),
  ],
};

// ---- TKA SMA mapel pilihan (Perkaban BSKAP 045/H/AN/2025). Rincian dari ringkasan sekunder kerangka asesmen;
// porsi rata (usulan). Lihat docs/referensi/format-ujian.md bagian 5. ----

const TKA_MAT_LANJUT: Cakupan = {
  porsi: { Aljabar: 1, 'Geometri dan Pengukuran': 1, Kalkulus: 1 },
  butir: [
    ...daftar('Aljabar', 'Aljabar lanjut', ['Matriks dan determinan', 'Polinomial dan teorema sisa', 'Fungsi (komposisi, invers, eksponensial, logaritma)', 'Bilangan kompleks']),
    ...daftar('Geometri dan Pengukuran', 'Geometri lanjut', ['Vektor di bidang dan ruang', 'Persamaan lingkaran', 'Transformasi geometri dengan matriks', 'Trigonometri lanjut (identitas dan persamaan)']),
    ...daftar('Kalkulus', 'Limit, turunan, integral', ['Limit fungsi', 'Turunan dan penerapannya (gradien, nilai ekstrem)', 'Integral tentu dan tak tentu serta luas daerah']),
  ],
};

const TKA_BINDO_LANJUT: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks sastra': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks argumentasi', ['Artikel opini dengan kalimat kompleks', 'Teks diskusi atau editorial', 'Dua teks dengan pandangan berbeda']),
    ...daftar('Teks sastra', 'Prosa, puisi, dan drama', ['Cerpen atau kutipan novel realisme', 'Prosa absurd atau eksperimental', 'Puisi modern', 'Kutipan naskah drama', 'Karya sastra terjemahan']),
  ],
};

const TKA_BING_LANJUT: Cakupan = {
  porsi: { 'Argumentative text': 3, 'Literary text': 1 },
  butir: [
    ...daftar('Argumentative text', 'B2 text (300–400 words)', ['Analytical exposition', 'Hortatory exposition', 'Discussion text (pros and cons)', 'Opinion article or review']),
    ...daftar('Literary text', 'Narrative', ['Short story excerpt', 'Biography or memoir excerpt']),
  ],
};

const TKA_FISIKA: Cakupan = {
  porsi: { Kinematika: 1, Dinamika: 1, Fluida: 1, Gelombang: 1, 'Kalor dan Termodinamika': 1, Kelistrikan: 1 },
  butir: [
    ...daftar('Kinematika', 'Gerak', ['Gerak lurus beraturan dan berubah beraturan beserta grafiknya', 'Gerak parabola', 'Gerak melingkar']),
    ...daftar('Dinamika', 'Gaya dan energi', ['Hukum Newton dan gaya gesek', 'Usaha, energi, dan daya', 'Momentum, impuls, dan tumbukan', 'Dinamika rotasi dan kesetimbangan']),
    ...daftar('Fluida', 'Fluida', ['Tekanan hidrostatis, hukum Pascal, dan hukum Archimedes', 'Fluida dinamis dan hukum Bernoulli']),
    ...daftar('Gelombang', 'Gelombang', ['Gelombang mekanik dan bunyi', 'Gelombang elektromagnetik dan cahaya']),
    ...daftar('Kalor dan Termodinamika', 'Kalor', ['Kalor, pemuaian, dan perpindahan kalor', 'Teori kinetik gas dan hukum termodinamika']),
    ...daftar('Kelistrikan', 'Listrik dan magnet', ['Rangkaian listrik arus searah', 'Listrik statis dan kapasitor', 'Medan magnet dan induksi elektromagnetik']),
  ],
};

const TKA_KIMIA: Cakupan = {
  porsi: { 'Kimia dasar': 1, 'Kimia analitik': 1, 'Kimia fisik': 1, 'Kimia organik': 1 },
  butir: [
    ...daftar('Kimia dasar', 'Atom dan reaksi', ['Struktur atom dan sistem periodik', 'Ikatan kimia dan bentuk molekul', 'Stoikiometri dan hukum dasar kimia']),
    ...daftar('Kimia analitik', 'Larutan', ['Asam-basa dan pH', 'Larutan penyangga dan hidrolisis', 'Kelarutan dan Ksp', 'Sistem koloid']),
    ...daftar('Kimia fisik', 'Energetika dan laju', ['Termokimia', 'Laju reaksi', 'Kesetimbangan kimia', 'Redoks dan elektrokimia']),
    ...daftar('Kimia organik', 'Senyawa karbon', ['Hidrokarbon dan minyak bumi', 'Gugus fungsi senyawa karbon', 'Polimer dan makromolekul']),
  ],
};

const TKA_BIOLOGI: Cakupan = {
  porsi: { 'Keanekaragaman hayati': 1, 'Sel dan metabolisme': 1, 'Sistem organ': 2, 'Genetika dan evolusi': 1, 'Keterampilan proses': 1 },
  butir: [
    ...daftar('Keanekaragaman hayati', 'Keanekaragaman', ['Keanekaragaman hayati dan klasifikasi', 'Ekosistem dan perubahan lingkungan']),
    ...daftar('Sel dan metabolisme', 'Sel', ['Struktur dan fungsi sel serta transpor membran', 'Enzim dan metabolisme (respirasi, fotosintesis)']),
    ...daftar('Sistem organ', 'Fisiologi manusia', ['Sistem sirkulasi', 'Sistem respirasi', 'Sistem ekskresi', 'Sistem imun', 'Sistem koordinasi (saraf dan hormon)', 'Sistem reproduksi']),
    ...daftar('Genetika dan evolusi', 'Pewarisan', ['Pewarisan sifat dan hukum Mendel', 'Evolusi dan bioteknologi']),
    ...daftar('Keterampilan proses', 'Kerja ilmiah', ['Merancang percobaan dan menafsirkan data hasil percobaan']),
  ],
};

const TKA_EKONOMI: Cakupan = {
  porsi: { 'Konsep dasar ekonomi': 1, 'Ekonomi mikro': 1, 'Ekonomi makro': 1, 'Ekonomi internasional': 1, 'Akuntansi keuangan dasar': 1 },
  butir: [
    ...daftar('Konsep dasar ekonomi', 'Konsep dasar', ['Kelangkaan, biaya peluang, dan sistem ekonomi', 'Pelaku ekonomi dan diagram aliran']),
    ...daftar('Ekonomi mikro', 'Pasar', ['Permintaan, penawaran, dan harga keseimbangan', 'Elastisitas dan bentuk pasar']),
    ...daftar('Ekonomi makro', 'Perekonomian nasional', ['Pendapatan nasional dan pertumbuhan ekonomi', 'Inflasi, uang, perbankan, dan kebijakan moneter', 'APBN dan kebijakan fiskal', 'Ketenagakerjaan dan pengangguran']),
    ...daftar('Ekonomi internasional', 'Perdagangan', ['Perdagangan internasional, kurs, dan neraca pembayaran']),
    ...daftar('Akuntansi keuangan dasar', 'Akuntansi', ['Persamaan dasar akuntansi dan siklus akuntansi', 'Laporan keuangan perusahaan jasa dan dagang']),
  ],
};

const TKA_SOSIOLOGI: Cakupan = {
  porsi: { 'Sosiologi sebagai ilmu': 1, 'Hubungan dan gejala sosial': 1, 'Penelitian sosial': 1, 'Kelompok sosial, kesetaraan, dan konflik': 1, 'Perubahan sosial dan globalisasi': 1 },
  butir: [
    ...daftar('Sosiologi sebagai ilmu', 'Dasar sosiologi', ['Objek, ciri, dan fungsi sosiologi', 'Nilai dan norma sosial']),
    ...daftar('Hubungan dan gejala sosial', 'Interaksi', ['Interaksi sosial dan sosialisasi', 'Penyimpangan sosial dan pengendalian sosial']),
    ...daftar('Penelitian sosial', 'Metode', ['Langkah penelitian sosial dan teknik pengumpulan data']),
    ...daftar('Kelompok sosial, kesetaraan, dan konflik', 'Kelompok', ['Kelompok sosial dan dinamikanya', 'Diferensiasi, stratifikasi, dan kesetaraan sosial', 'Konflik, kekerasan, dan integrasi sosial']),
    ...daftar('Perubahan sosial dan globalisasi', 'Perubahan', ['Perubahan sosial dan dampaknya', 'Globalisasi dan pemberdayaan komunitas']),
  ],
};

const TKA_GEOGRAFI: Cakupan = {
  porsi: { 'Wilayah dan lingkungan': 1, 'Lingkungan fisik': 1, 'Lingkungan sosial': 1, 'Interaksi fisik dan manusia': 1, 'Mitigasi dan adaptasi bencana': 1 },
  butir: [
    ...daftar('Wilayah dan lingkungan', 'Ruang', ['Peta, penginderaan jauh, dan SIG', 'Wilayah, tata ruang, dan pusat pertumbuhan']),
    ...daftar('Lingkungan fisik', 'Fenomena fisik', ['Litosfer dan dinamika permukaan bumi', 'Atmosfer, hidrosfer, dan biosfer']),
    ...daftar('Lingkungan sosial', 'Penduduk', ['Dinamika kependudukan', 'Desa dan kota serta interaksinya']),
    ...daftar('Interaksi fisik dan manusia', 'Sumber daya', ['Sumber daya alam dan pembangunan berkelanjutan', 'Ketahanan pangan, industri, dan energi']),
    ...daftar('Mitigasi dan adaptasi bencana', 'Bencana', ['Jenis, persebaran, dan mitigasi bencana alam']),
  ],
};

const TKA_SEJARAH: Cakupan = {
  porsi: { 'Pengantar ilmu sejarah': 1, 'Hindu-Buddha dan Islam': 1, 'Kolonialisme dan perlawanan': 1, 'Pergerakan nasional': 1, 'Revolusi hingga Demokrasi Terpimpin': 1, 'Orde Baru hingga Reformasi': 1 },
  butir: [
    ...daftar('Pengantar ilmu sejarah', 'Konsep', ['Konsep dasar sejarah, sumber, dan penelitian sejarah', 'Masa praaksara dan asal-usul nenek moyang']),
    ...daftar('Hindu-Buddha dan Islam', 'Kerajaan Nusantara', ['Kerajaan Hindu-Buddha dan peninggalannya', 'Kerajaan Islam dan jaringan perdagangan']),
    ...daftar('Kolonialisme dan perlawanan', 'Penjajahan', ['Kedatangan bangsa Eropa dan kolonialisme', 'Perlawanan rakyat terhadap penjajahan']),
    ...daftar('Pergerakan nasional', 'Kebangkitan', ['Organisasi pergerakan dan Sumpah Pemuda', 'Pendudukan Jepang dan persiapan kemerdekaan']),
    ...daftar('Revolusi hingga Demokrasi Terpimpin', 'Mempertahankan kemerdekaan', ['Proklamasi dan revolusi kemerdekaan', 'Demokrasi Liberal dan Demokrasi Terpimpin']),
    ...daftar('Orde Baru hingga Reformasi', 'Indonesia modern', ['Pemerintahan Orde Baru', 'Reformasi dan perkembangan demokrasi']),
  ],
};

const TKA_ANTROPOLOGI: Cakupan = {
  porsi: { 'Konsep dasar antropologi': 1, Etnografi: 1, 'Masyarakat multikultural': 1, 'Perubahan sosial budaya': 1, 'Kearifan lokal dan tradisi lisan': 1 },
  butir: [
    ...daftar('Konsep dasar antropologi', 'Dasar', ['Kebudayaan, unsur, dan wujudnya', 'Cabang dan metode antropologi']),
    ...daftar('Etnografi', 'Penelitian', ['Penelitian etnografi dan teknik pengumpulan data']),
    ...daftar('Masyarakat multikultural', 'Keragaman', ['Keragaman suku, agama, dan budaya Indonesia', 'Integrasi dan konflik dalam masyarakat multikultural']),
    ...daftar('Perubahan sosial budaya', 'Dinamika', ['Akulturasi, asimilasi, dan difusi budaya', 'Dampak globalisasi terhadap budaya lokal']),
    ...daftar('Kearifan lokal dan tradisi lisan', 'Tradisi', ['Kearifan lokal dalam pengelolaan lingkungan', 'Tradisi lisan dan pelestariannya']),
  ],
};

const TKA_PPKN: Cakupan = {
  porsi: { Pancasila: 1, 'UUD 1945': 1, 'Bhinneka Tunggal Ika': 1, NKRI: 1 },
  butir: [
    ...daftar('Pancasila', 'Dasar negara', ['Pancasila sebagai dasar negara dan ideologi', 'Penerapan nilai Pancasila dalam kehidupan']),
    ...daftar('UUD 1945', 'Konstitusi', ['Hak dan kewajiban warga negara', 'Sistem pemerintahan dan lembaga negara', 'Kasus pelanggaran hak dan pengingkaran kewajiban']),
    ...daftar('Bhinneka Tunggal Ika', 'Keberagaman', ['Keberagaman dan persatuan bangsa', 'Harmoni dalam masyarakat majemuk']),
    ...daftar('NKRI', 'Wawasan kebangsaan', ['Wawasan Nusantara dan ancaman terhadap NKRI', 'Indonesia dalam hubungan internasional']),
  ],
};

const TKA_BAHASA_ASING: Cakupan = {
  porsi: { 'Teks informasi': 2, 'Teks interpersonal dan fungsional': 1, 'Teks sastra': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks tulis', ['Teks deskripsi tentang tempat atau budaya', 'Teks narasi pengalaman sehari-hari', 'Artikel singkat tentang topik umum']),
    ...daftar('Teks interpersonal dan fungsional', 'Komunikasi', ['Percakapan sehari-hari', 'Surat, pesan, pengumuman, atau iklan']),
    ...daftar('Teks sastra', 'Sastra', ['Cerita pendek atau dongeng sederhana']),
  ],
};

const TKA_PKK: Cakupan = {
  porsi: { 'Peluang usaha': 1, 'Perencanaan produk': 1, 'Pemasaran dan keuangan': 1 },
  butir: [
    ...daftar('Peluang usaha', 'Kewirausahaan', ['Mengidentifikasi peluang usaha dan analisis kebutuhan pasar', 'Karakter dan etika wirausaha']),
    ...daftar('Perencanaan produk', 'Projek kreatif', ['Merancang produk atau jasa kreatif', 'Proses produksi dan pengendalian mutu']),
    ...daftar('Pemasaran dan keuangan', 'Usaha', ['Strategi pemasaran dan promosi digital', 'Perhitungan biaya, harga jual, dan laporan keuangan sederhana']),
  ],
};

/** Mapel pilihan TKA SMA menurut nama mapel (huruf kecil, tanpa spasi ganda). */
const PILIHAN_SMA: Record<string, Cakupan> = {
  'matematika tingkat lanjut': TKA_MAT_LANJUT,
  'bahasa indonesia tingkat lanjut': TKA_BINDO_LANJUT,
  'bahasa inggris tingkat lanjut': TKA_BING_LANJUT,
  fisika: TKA_FISIKA,
  kimia: TKA_KIMIA,
  biologi: TKA_BIOLOGI,
  ekonomi: TKA_EKONOMI,
  sosiologi: TKA_SOSIOLOGI,
  geografi: TKA_GEOGRAFI,
  sejarah: TKA_SEJARAH,
  antropologi: TKA_ANTROPOLOGI,
  'pendidikan pancasila dan kewarganegaraan': TKA_PPKN,
  'pendidikan pancasila': TKA_PPKN,
  ppkn: TKA_PPKN,
  'bahasa arab': TKA_BAHASA_ASING,
  'bahasa jerman': TKA_BAHASA_ASING,
  'bahasa prancis': TKA_BAHASA_ASING,
  'bahasa jepang': TKA_BAHASA_ASING,
  'bahasa korea': TKA_BAHASA_ASING,
  'bahasa mandarin': TKA_BAHASA_ASING,
  'projek kreatif dan kewirausahaan': TKA_PKK,
};

const PETA: Record<string, Cakupan> = {
  'tka-sd-matematika': MAT_SD,
  'tkad-sd-matematika': MAT_SD,
  'tka-smp-matematika': MAT_SMP,
  'tkad-smp-matematika': MAT_SMP,
  'tka-sma-matematika': MAT_SMA,
  'tka-sd-bindo': BINDO_SD,
  'tkad-sd-bindo': BINDO_SD,
  'tka-smp-bindo': BINDO_SMP,
  'tkad-smp-bindo': BINDO_SMP,
  'tka-sma-bindo': BINDO_SMA,
  'tka-sma-binggris': BING_SMA,
  'osnk-sd-matematika': OSN_MAT_SD,
  'osnp-sd-matematika': OSN_MAT_SD,
  'osnk-smp-matematika': OSN_MAT_LANJUT,
  'osnk-sma-matematika': OSN_MAT_LANJUT,
  'osnk-sd-ipa': OSN_IPA,
  'osnp-sd-ipa': OSN_IPA,
  'osnk-smp-ipa': OSN_IPA_SMP,
  'osnk-sd-ips': OSN_IPS,
  'osnp-sd-ips': OSN_IPS,
  'osnk-smp-ips': OSN_IPS_SMP,
  'osnk-sma-fisika': OSN_FISIKA,
  'osnk-sma-kimia': OSN_KIMIA,
  'osnk-sma-biologi': OSN_BIOLOGI,
  'osnk-sma-informatika': OSN_INFORMATIKA,
  'osnk-sma-astronomi': OSN_ASTRONOMI,
  'osnk-sma-kebumian': OSN_KEBUMIAN,
  'osnk-sma-ekonomi': OSN_EKONOMI,
  'osnk-sma-geografi': OSN_GEOGRAFI,
};

/** Cakupan format ujian; mapel pilihan TKA SMA menurut nama mapel yang diisi guru. */
export function cakupanFormat(id: string | null | undefined, mapel = ''): Cakupan | null {
  if (id === 'tka-sma-pilihan') return PILIHAN_SMA[mapel.trim().toLowerCase().replace(/\s+/g, ' ')] ?? null;
  return (id && PETA[id]) || null;
}

/** Rumusan TP dari satu butir cakupan, mis. "Bilangan › Bilangan Real: Faktorisasi prima bilangan asli". */
export function rumusanCakupan(b: ButirCakupan): string {
  return `${b.elemen} › ${b.sub}: ${b.butir}`;
}

/**
 * Pilih butir cakupan untuk n soal: n dibagi ke elemen menurut porsi (sisa terbesar), lalu di tiap elemen butirnya
 * dipakai bergiliran mulai dari titik acak sehingga paket berikutnya mendapat campuran yang berbeda.
 * Hasil: daftar rumusan TP dan jumlah soal per TP (berjumlah n, tanpa angka 0).
 */
/** Banyak soal per elemen untuk n soal: dibagi menurut porsi dengan sisa terbesar; elemen tanpa butir dilewati. */
export function kuotaElemen(c: Cakupan, n: number): { elemen: string; soal: number; butir: string[] }[] {
  const elemen = Object.keys(c.porsi).filter((e) => c.porsi[e] > 0 && c.butir.some((b) => b.elemen === e));
  const total = elemen.reduce((a, e) => a + c.porsi[e], 0);
  if (!total) return [];
  const mentah = elemen.map((e) => (n * c.porsi[e]) / total);
  const kuota = mentah.map(Math.floor);
  let sisa = n - kuota.reduce((a, b) => a + b, 0);
  for (const i of elemen.map((_, i) => i).sort((a, b) => mentah[b] - kuota[b] - (mentah[a] - kuota[a]) || a - b)) {
    if (sisa-- <= 0) break;
    kuota[i]++;
  }
  return elemen.map((e, i) => ({ elemen: e, soal: kuota[i], butir: c.butir.filter((b) => b.elemen === e).map((b) => b.butir) }));
}

export function pilihCakupan(c: Cakupan, n: number, acak: () => number = Math.random): { rumusan: string[]; jumlah: number[] } {
  const kuotaPer = kuotaElemen(c, n);
  const elemen = kuotaPer.map((k) => k.elemen);
  const kuota = kuotaPer.map((k) => k.soal);
  const hitung = new Map<string, number>();
  elemen.forEach((e, i) => {
    const isi = c.butir.filter((b) => b.elemen === e);
    const mulai = Math.floor(acak() * isi.length);
    for (let k = 0; k < kuota[i]; k++) {
      const r = rumusanCakupan(isi[(mulai + k) % isi.length]);
      hitung.set(r, (hitung.get(r) ?? 0) + 1);
    }
  });
  // Urutan mengikuti katalog agar kisi-kisi tersusun per elemen.
  const urut = c.butir.map(rumusanCakupan).filter((r) => hitung.has(r));
  return { rumusan: urut, jumlah: urut.map((r) => hitung.get(r)!) };
}
