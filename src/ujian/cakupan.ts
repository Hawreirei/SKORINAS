import kerangka from './data/kerangka-tka.json';
import { kunciKerangka } from './kerangka';

/**
 * Cakupan materi format ujian (F-39, F-41): elemen → sub-elemen → butir, dengan porsi per elemen.
 *
 * Keputusan pemilik (7 November 2026): cakupan kerangka asesmen TKA dan ranah OSN boleh dibawa aplikasi agar soal
 * format ujian tersebar ke seluruh materi, bukan berulang di satu topik. Ini bukan CP atau TP sekolah: cakupan
 * hanya dipakai bila guru mengosongkan CP dan TP, dan TP guru selalu didahulukan (docs/KEPUTUSAN.md).
 *
 * TKA dan TKAD: matriks asesmen resmi dari situs pusmendik (./data/kerangka-tka.json, 76 mapel termasuk program
 * keahlian SMK; scripts/kerangka-tka/README.md). Mapel bahasa: jenis teks dari bagian Muatan halaman resmi; kompetensi
 * membaca dipilih per butir dari matriks (ujian/index.ts). OSN: ranah lomba (docs/referensi/format-ujian.md).
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

// ---- TKA dan TKAD dari matriks asesmen resmi ----

interface BarisKerangka {
  elemen: string;
  sub?: string;
  kompetensi?: string;
  butir?: string[];
  batasan?: string;
}

const KERANGKA = kerangka as unknown as Record<string, { nama: string; baris: BarisKerangka[] }>;

/** Batasan panjang dipotong di batas kata agar rumusan TP tetap terbaca di kisi-kisi. */
function potong(s: string, maks: number): string {
  if (s.length <= maks) return s;
  const t = s.slice(0, maks);
  return `${t.slice(0, Math.max(t.lastIndexOf(' '), maks - 20))}…`;
}

/**
 * Porsi elemen Matematika (usulan, tidak ada di halaman resmi; SMP mengikuti contoh paket 30 soal). Mapel lain:
 * porsi sebanding banyak butir per elemen, sehingga setiap butir matriks berpeluang sama.
 */
const PORSI_MATEMATIKA: Record<string, Record<string, number>> = {
  sd_wajib_matematika: { Bilangan: 5, 'Geometri dan Pengukuran': 3, Data: 2 },
  smp_wajib_matematika: { Bilangan: 7, Aljabar: 8, 'Geometri dan Pengukuran': 8, 'Data dan Peluang': 7 },
  sma_wajib_matematika: { Bilangan: 4, Aljabar: 7, 'Geometri dan Pengukuran': 5, Trigonometri: 3, 'Data dan Peluang': 6 },
};

/** Cakupan dari matriks asesmen: tiap butir sub-elemen menjadi satu butir cakupan; baris tanpa daftar butir memakai kompetensi dan batasannya. */
export function cakupanKerangka(kunci: string): Cakupan | null {
  const k = KERANGKA[kunci];
  if (!k?.baris.length) return null;
  const butir: ButirCakupan[] = [];
  for (const b of k.baris) {
    const sub = b.sub || b.elemen;
    if (b.butir?.length) {
      const batas = b.batasan ? ` (batasan: ${potong(b.batasan, 220)})` : '';
      for (const x of b.butir) butir.push({ elemen: b.elemen, sub, butir: `${x}${batas}` });
    } else {
      const isi = b.kompetensi || sub;
      butir.push({ elemen: b.elemen, sub, butir: b.batasan ? `${isi}. Materi: ${potong(b.batasan, 320)}` : isi });
    }
  }
  // Beberapa tabel resmi mengulang baris yang sama; butir kembar dibuang.
  const lihat = new Set<string>();
  const unik = butir.filter((b) => {
    const r = rumusanCakupan(b);
    return lihat.has(r) ? false : (lihat.add(r), true);
  });
  butir.length = 0;
  butir.push(...unik);
  const porsi: Record<string, number> = PORSI_MATEMATIKA[kunci] ? { ...PORSI_MATEMATIKA[kunci] } : {};
  if (!PORSI_MATEMATIKA[kunci]) for (const b of butir) porsi[b.elemen] = (porsi[b.elemen] ?? 0) + 1;
  return { porsi, butir };
}

// ---- Mapel bahasa: jenis teks dari bagian Muatan halaman resmi ----

const BINDO_SD: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    // Muatan resmi: teks informasi berisi fakta sederhana dari berbagai bidang atau topik, berskala lokal dan nasional.
    ...daftar('Teks informasi', 'Fakta sederhana berskala lokal atau nasional', [
      'Teks deskripsi tentang hewan, tumbuhan, atau tempat',
      'Teks laporan sederhana tentang kegiatan atau pengamatan',
      'Teks petunjuk atau langkah membuat sesuatu',
      'Berita sederhana tentang peristiwa di lingkungan sekitar',
      'Teks informasi tentang budaya, kesehatan, atau lingkungan',
    ]),
    // Muatan resmi: cerita rekaan berupa fantasi atau faktual (sejarah/biografi), latar konkret, tokoh datar, konflik tunggal, alur maju, sudut pandang orang pertama.
    ...daftar('Teks fiksi', 'Cerita fantasi atau faktual', ['Cerita fantasi (dongeng atau fabel)', 'Cerita faktual: kisah sejarah', 'Cerita faktual: biografi tokoh', 'Puisi anak']),
  ],
};

const BINDO_SMP: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    // Muatan resmi: fakta, konsep, atau prosedur dari berbagai bidang, berskala lokal, nasional, atau global; tunggal maupun jamak.
    ...daftar('Teks informasi', 'Teks informasi tunggal', ['Teks berisi fakta dari bidang sains atau lingkungan', 'Teks berisi konsep dari bidang sosial atau budaya', 'Teks prosedur', 'Teks berita atau laporan dengan data']),
    ...daftar('Teks informasi', 'Teks informasi jamak', ['Dua teks informasi bertopik sama dengan sudut pandang atau data berbeda']),
    // Muatan resmi: faktual (sejarah/biografi) atau realisme, tokoh bulat, konflik tunggal atau jamak, alur campuran, sudut pandang orang ketiga.
    ...daftar('Teks fiksi', 'Prosa dan puisi', ['Cerpen realisme dengan alur campuran', 'Cerita faktual: sejarah atau biografi', 'Puisi']),
  ],
};

const BINDO_SMA: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    // Muatan resmi: fakta, konsep, prosedur, dan metakognisi dari berbagai bidang, genre, dan konteks; lokal, nasional, global; tunggal maupun jamak.
    ...daftar('Teks informasi', 'Teks informasi tunggal', ['Teks eksposisi atau artikel ilmiah populer', 'Artikel opini atau editorial', 'Teks prosedur atau panduan', 'Teks berita atau infografis dengan data']),
    ...daftar('Teks informasi', 'Teks informasi jamak', ['Dua teks informasi yang saling melengkapi atau bertentangan']),
    // Muatan resmi: realisme atau absurd, tokoh bulat, konflik tunggal atau jamak, penyelesaian terbuka, alur dan sudut pandang campuran; puisi, prosa, drama.
    ...daftar('Teks fiksi', 'Puisi, prosa, dan drama', ['Cerpen atau kutipan novel realisme', 'Prosa absurd', 'Kutipan drama', 'Puisi']),
  ],
};

/** Muatan resmi Bahasa Inggris: descriptive, recount, narrative, procedure, analytical exposition; konteks sehari-hari, tempat kerja, akademik. */
const BING_SMA: Cakupan = {
  porsi: { 'Descriptive text': 1, 'Recount text': 1, 'Narrative text': 1, 'Procedure text': 1, 'Analytical exposition text': 1 },
  butir: ['Descriptive text', 'Recount text', 'Narrative text', 'Procedure text', 'Analytical exposition text'].flatMap((j) =>
    daftar(j, 'Communication context', ['Everyday life context', 'Workplace context', 'Academic context']),
  ),
};

/** Bahasa Indonesia Tingkat Lanjut: teks informasi tunggal atau jamak (akademik, dunia kerja) dan fiksi realisme atau absurd, termasuk sastra Melayu Klasik dan terjemahan; 300–350 kata. */
const BINDO_LANJUT: Cakupan = {
  porsi: { 'Teks informasi': 1, 'Teks fiksi': 1 },
  butir: [
    ...daftar('Teks informasi', 'Teks informasi tunggal atau jamak', ['Teks akademik atau ilmiah', 'Teks dunia kerja (usulan, laporan, atau surat resmi)', 'Teks berisi tabel atau grafik dengan uraian', 'Dua teks dengan gagasan yang dibandingkan']),
    ...daftar('Teks fiksi', 'Sastra Indonesia dan terjemahan', ['Cerpen atau kutipan novel realisme', 'Prosa absurd atau metaforis', 'Sastra Melayu Klasik (hikayat, syair, atau gurindam)', 'Puisi Indonesia atau terjemahan', 'Kutipan drama']),
  ],
};

/** Bahasa Inggris Tingkat Lanjut: exposition dan discussion bertopik teknologi dan isu faktual; B2 (300–400 kata) dan B1. */
const BING_LANJUT: Cakupan = {
  porsi: { 'Exposition text': 1, 'Discussion text': 1 },
  butir: ['Exposition text', 'Discussion text'].flatMap((j) => daftar(j, 'Topic', ['Technology', 'Factual issues in society', 'Factual issues in the environment or health', 'Vocational or academic context'])),
};

/** Bahasa asing: topik dari bagian Muatan halaman resmi tiap bahasa. */
function bahasaAsing(topik: string[], teks: string): Cakupan {
  return { porsi: { Topik: 1 }, butir: daftar('Topik', teks, topik) };
}
const BAHASA_ASING: Record<string, Cakupan> = {
  'sma_pilihan_bahasa-arab': bahasaAsing(['Kehidupan sekolah', 'Kehidupan keluarga', 'Hobi', 'Pekerjaan', 'Pelayanan umum', 'Lingkungan sekitar (al-bi’ah)', 'Dialog ungkapan persetujuan (muwāfaqah)', 'Dialog perintah (al-amr) dan larangan (an-nahyu)'], 'Teks naratif atau dialog berbahasa Arab fusha'),
  'sma_pilihan_bahasa-jepang': bahasaAsing(['Aisatsu (salam)', 'Jikoshoukai (perkenalan diri)', 'Jikan (waktu)', 'Kazoku (keluarga)', 'Dekirukoto (kemampuan)', 'Gakkou no seikatsu (kehidupan sekolah)', 'Uchi (rumah)', 'Mainichi no seikatsu (kehidupan sehari-hari)', 'Shumi (hobi)', 'Himana toki (waktu senggang)'], 'Teks pendek sederhana (A1)'),
  'sma_pilihan_bahasa-jerman': bahasaAsing(['Identität', 'Schulleben', 'Familien', 'Wohnen', 'Freizeitaktivitäten', 'Berufe', 'Essen und Trinken', 'Einkaufen', 'Reisen'], 'Teks naratif, deskripsi, dialog, atau fungsional (A1–A2.1)'),
  'sma_pilihan_bahasa-korea': bahasaAsing(['Perkenalan diri (자기 소개)', 'Salam (인사)', 'Belanja (쇼핑)', 'Hobi (취미)', 'Transportasi (교통)', 'Cuaca (날씨)', 'Kehidupan sehari-hari (일상생활)', 'Kehidupan keluarga (가족생활)', 'Wisata (여행)', 'Kehidupan sekolah (학교활동)'], 'Teks sederhana TOPIK I Level 1'),
  'sma_pilihan_bahasa-mandarin': bahasaAsing(['Identitas diri', 'Kehidupan sekolah', 'Kehidupan keluarga', 'Kehidupan sehari-hari', 'Waktu senggang dan hobi'], 'Teks sederhana HSK 1 (Hanzi dan Pinyin)'),
  'sma_pilihan_bahasa-prancis': bahasaAsing(['Salam dan berpamitan', 'Ucapan selamat dan harapan', 'Menyatakan opini', 'Angka, jam, dan tanggal', 'Pesan singkat dan pengumuman', 'Perkenalan diri dan aktivitas sehari-hari', 'Keberadaan orang dan benda', 'Tanda dan rambu', 'Karakter seseorang', 'Benda dan bangunan publik'], 'Teks pendek (présent)'),
};

/** Kerangka bahasa (tanpa matriks elemen) → cakupan jenis teks atau topik. */
const BAHASA: Record<string, Cakupan> = {
  'sd_wajib_bahasa-indonesia': BINDO_SD,
  'smp_wajib_bahasa-indonesia': BINDO_SMP,
  'sma_wajib_bahasa-indonesia': BINDO_SMA,
  'sma_wajib_bahasa-inggris': BING_SMA,
  'sma_pilihan_bahasa-indonesia-tingkat-lanjut': BINDO_LANJUT,
  'sma_pilihan_bahasa-inggris-tingkat-lanjut': BING_LANJUT,
  ...BAHASA_ASING,
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

/** OSN: ranah lomba per format (bukan kerangka resmi TKA). */
const PETA: Record<string, Cakupan> = {
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
  const kunci = kunciKerangka(id, mapel);
  if (kunci) return BAHASA[kunci] ?? cakupanKerangka(kunci);
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
