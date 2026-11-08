import type { ParameterPaket, Slot } from '../db/tipe';

/**
 * Variasi per butir (F-39). Soal yang dibuat dari prompt yang hampir sama cenderung seragam: tema, tokoh, dan bentuk
 * stimulus berulang. Karena itu setiap butir paket berstimulus mendapat kombinasi tema konteks, bentuk stimulus, dan
 * nama tokoh yang berbeda. Urutan diacak per paket sehingga paket berikutnya juga berbeda.
 */

/** Tema per konteks asesmen (personal, sosial budaya, saintifik), dipakai bergiliran. */
export const TEMA = {
  personal: [
    'menabung dan uang saku',
    'hobi berkebun di rumah',
    'persiapan perjalanan mudik keluarga',
    'kegiatan olahraga pagi',
    'merapikan dan menata kamar',
    'memasak bersama keluarga',
    'jadwal belajar dan bermain',
    'merawat hewan peliharaan',
    'berbelanja kebutuhan sekolah',
    'bersepeda ke sekolah',
  ],
  sosial_budaya: [
    'pasar tradisional',
    'festival budaya daerah',
    'kerajinan tenun, batik, atau anyaman',
    'kuliner khas Nusantara',
    'kerja bakti dan gotong royong di kampung',
    'koperasi atau kantin sekolah',
    'pertunjukan seni tradisional (gamelan, angklung, tari)',
    'transportasi umum dan lalu lintas',
    'permainan tradisional anak',
    'perpustakaan keliling atau taman baca',
    'usaha kecil warga (warung, bengkel, toko kelontong)',
    'lomba tujuh belasan',
  ],
  saintifik: [
    'cuaca dan curah hujan',
    'pertumbuhan tanaman',
    'sampah, daur ulang, dan bank sampah',
    'hemat energi listrik',
    'air bersih dan sumur resapan',
    'pengamatan hewan di sekitar sekolah',
    'kesehatan, gizi, dan olahraga',
    'teknologi sederhana dan alat rumah tangga',
    'pertanian, sawah, dan terasering',
    'nelayan, laut, dan perahu pinisi',
    'gunung, sungai, dan bencana alam',
    'tata surya dan pengamatan langit',
  ],
} as const;

/** Nama tokoh dari berbagai daerah, perempuan dan laki-laki bergantian. */
export const TOKOH = [
  'Ayu', 'Rahmat', 'Siti', 'Made', 'Nurul', 'Yohanes', 'Putri', 'Bayu', 'Wulan', 'Andi', 'Dewi', 'Ketut',
  'Rina', 'Fajar', 'Maria', 'Daeng', 'Intan', 'Ucok', 'Lestari', 'Teuku', 'Nadia', 'Galih', 'Fitri', 'Yosua',
  'Melati', 'Raka', 'Aisyah', 'Putu', 'Tiara', 'Arif', 'Ratna', 'Bima', 'Citra', 'Marthen', 'Laila', 'Dimas',
  'Kartika', 'Rizky', 'Nengah', 'Hendra', 'Sekar', 'Oktavianus', 'Zahra', 'Kadek', 'Mega', 'Gilang', 'Anisa', 'Tigor',
];

const STIMULUS_HITUNG = [
  'cerita situasi sehari-hari yang memuat data angka',
  'tabel data yang ditulis sebagai daftar singkat di dalam teks',
  'percakapan singkat antara dua tokoh',
  'daftar harga, brosur, atau pengumuman',
  'catatan kegiatan, jadwal, atau resep',
  'hasil pengamatan atau percobaan sederhana',
];

const STIMULUS_UMUM = [
  'cerita situasi sehari-hari',
  'berita atau laporan singkat',
  'percakapan singkat antara dua tokoh',
  'catatan pengamatan atau percobaan',
  'kutipan surat, pesan, atau pengumuman',
  'data yang ditulis sebagai daftar singkat di dalam teks',
];

/** Untuk mapel bahasa, bentuk stimulus mengikuti jenis teks pada TP butir; tidak dirotasi di sini. */
const STIMULUS_BAHASA = ['teks bacaan sesuai jenis teks pada tujuan pembelajaran butir ini'];

function acakUrutan<T>(xs: readonly T[], acak: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tema bergiliran antarkonteks: personal, sosial budaya, saintifik, personal, ... masing-masing teracak. */
function deretTema(acak: () => number): string[] {
  const k = [acakUrutan(TEMA.personal, acak), acakUrutan(TEMA.sosial_budaya, acak), acakUrutan(TEMA.saintifik, acak)];
  const panjang = Math.max(...k.map((x) => x.length));
  const hasil: string[] = [];
  for (let i = 0; i < panjang; i++) for (const x of k) if (i < x.length) hasil.push(x[i]);
  // Mulai dari konteks acak agar butir pertama tidak selalu personal.
  const mulai = Math.floor(acak() * 3);
  return [...hasil.slice(mulai), ...hasil.slice(0, mulai)];
}

/** Beri setiap butir tema, bentuk stimulus, dan nama tokoh yang berbeda; hanya untuk paket berstimulus wajib. */
export function beriVariasi(slot: Slot[], p: Pick<ParameterPaket, 'wajib_stimulus' | 'rumpun'> & Partial<Pick<ParameterPaket, 'variasi_sendiri'>>, acak: () => number = Math.random): Slot[] {
  if (!p.wajib_stimulus) return slot;
  // Daftar dari guru (bila ada) menggantikan daftar bawaan; urutannya tetap diacak per paket.
  const sendiri = p.variasi_sendiri;
  const tema = sendiri?.tema.length ? acakUrutan(sendiri.tema, acak) : deretTema(acak);
  const tokoh = acakUrutan(sendiri?.tokoh.length ? sendiri.tokoh : TOKOH, acak);
  const bentuk = sendiri?.stimulus.length ? acakUrutan(sendiri.stimulus, acak) : p.rumpun === 'bahasa' ? STIMULUS_BAHASA : acakUrutan(p.rumpun === 'matematika' || p.rumpun === 'ipa' ? STIMULUS_HITUNG : STIMULUS_UMUM, acak);
  return slot.map((s, i) => ({ ...s, variasi: { tema: tema[i % tema.length], stimulus: bentuk[i % bentuk.length], tokoh: tokoh[i % tokoh.length] } }));
}

export type Jenjang = 'SD' | 'SMP' | 'SMA';

export function jenjangDariKelas(kelas: number): Jenjang {
  return kelas <= 6 ? 'SD' : kelas <= 9 ? 'SMP' : 'SMA';
}

/**
 * Panjang stimulus: sasaran untuk prompt dan batas minimal untuk pemeriksa. Mapel bahasa mengikuti panjang teks
 * kerangka asesmen TKA (SMP 200–250 kata, SMA 250–300 kata); mapel lain cukup satu paragraf cerita.
 */
export function panjangStimulus(kelas: number, bahasa: boolean, sendiri?: { min: number; maks: number } | null): { min: number; sasaran: [number, number] } {
  // Panjang dari guru: sasaran persis seperti diatur, batas pemeriksa 70% dari minimalnya.
  if (sendiri && sendiri.min > 0 && sendiri.maks >= sendiri.min) return { min: Math.max(10, Math.floor(sendiri.min * 0.7)), sasaran: [sendiri.min, sendiri.maks] };
  const j = jenjangDariKelas(kelas);
  if (bahasa) return j === 'SD' ? { min: 50, sasaran: [80, 150] } : j === 'SMP' ? { min: 100, sasaran: [180, 250] } : { min: 130, sasaran: [230, 300] };
  return j === 'SD' ? { min: 25, sasaran: [35, 80] } : j === 'SMP' ? { min: 30, sasaran: [45, 100] } : { min: 35, sasaran: [50, 120] };
}
