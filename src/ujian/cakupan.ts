/**
 * Cakupan materi format ujian (F-38): elemen → sub-elemen → butir, dengan porsi per elemen.
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
      'Keliling dan luas bangun datar serta gabungannya',
      'Volume kubus dan balok',
    ]),
    ...daftar('Data', 'Penyajian dan interpretasi data', ['Membaca dan menafsirkan tabel dan piktogram', 'Membaca dan menafsirkan diagram batang', 'Rata-rata (mean) dan nilai terbanyak dari data sederhana']),
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
  'osnk-smp-ipa': OSN_IPA,
  'osnk-sd-ips': OSN_IPS,
  'osnp-sd-ips': OSN_IPS,
  'osnk-smp-ips': OSN_IPS,
};

export function cakupanFormat(id: string | null | undefined): Cakupan | null {
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
export function pilihCakupan(c: Cakupan, n: number, acak: () => number = Math.random): { rumusan: string[]; jumlah: number[] } {
  const elemen = Object.keys(c.porsi).filter((e) => c.butir.some((b) => b.elemen === e));
  const total = elemen.reduce((a, e) => a + c.porsi[e], 0);
  const mentah = elemen.map((e) => (n * c.porsi[e]) / total);
  const kuota = mentah.map(Math.floor);
  let sisa = n - kuota.reduce((a, b) => a + b, 0);
  for (const i of elemen.map((_, i) => i).sort((a, b) => mentah[b] - kuota[b] - (mentah[a] - kuota[a]) || a - b)) {
    if (sisa-- <= 0) break;
    kuota[i]++;
  }
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
