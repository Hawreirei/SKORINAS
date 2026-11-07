import type { AturBentuk, BahasaSoal, Bentuk, GayaSoal, Level, ModeGambar, ParameterPaket } from '../db/tipe';
import { LEVEL } from '../db/tipe';
import { URUTAN_BENTUK } from '../generasi/rencana';

/**
 * Format ujian: TKA, TKAD, dan OSN jenjang SD sampai SMA (F-35). Setiap format mengisi layar Buat dengan atribut
 * ujiannya (jumlah soal, bentuk, banyak opsi, level, gaya, bahasa) dan menambah aturan penulisan ke prompt.
 * Isinya atribut ujian; cakupan materi ada di ./cakupan.ts dan hanya dipakai bila guru mengosongkan CP dan TP (F-38).
 * Hasil riset dan sumbernya: docs/referensi/format-ujian.md. Angka yang belum pasti ditandai di sana.
 */

export type KeluargaUjian = 'TKA' | 'TKAD' | 'OSN';
export type Jenjang = 'SD' | 'SMP' | 'SMA';

export interface FormatUjian {
  id: string;
  keluarga: KeluargaUjian;
  jenjang: Jenjang;
  /** Nama di layar, mis. "TKA SD · Matematika". */
  nama: string;
  kelas: number;
  /** Kosong: guru memilih mapel sendiri (mis. mapel pilihan TKA SMA) dari `saranMapel`. */
  mapel: string;
  saranMapel?: string[];
  /** Ujian aslinya: jumlah soal dan durasi. null bila belum dapat dipastikan dari sumber. */
  asli: { soal: number | null; menit: number | null };
  /** Porsi bentuk soal; dibagi ke jumlah soal paket dengan sisa terbesar. */
  porsiBentuk: Partial<Record<Bentuk, number>>;
  /** Porsi level C1–C6; dibagi ke jumlah soal paket dengan sisa terbesar. */
  porsiLevel: Partial<Record<Level, number>>;
  opsiPg: 3 | 4 | 5;
  /** Rincian tiap bentuk (mis. jawaban isian berupa bilangan bulat). */
  aturBentuk?: Partial<AturBentuk>;
  /** Skor per soal bila aturan ujiannya seragam; null bila tidak. */
  skor: Partial<Record<Bentuk, number>> | null;
  gaya: GayaSoal;
  bahasa: BahasaSoal;
  gambar: ModeGambar;
  /** Bentuk soal resmi ujian, satu kalimat untuk layar. */
  bentukResmi: string;
  /** Cara penilaian ujian aslinya, satu kalimat untuk layar. */
  penilaian: string;
  /** Aturan penulisan khusus format ini, ditambahkan ke prompt. */
  aturan: string[];
}

/** Kompetensi membaca TKA (Bahasa Indonesia dan Inggris) per level. */
const KOMPETENSI_BACA: Record<string, string> = {
  'Pengetahuan dan Pemahaman': 'pemahaman tekstual, yaitu menemukan informasi yang tersurat dalam teks (siapa, apa, kapan, di mana, berapa, urutan kejadian).',
  Aplikasi: 'pemahaman inferensial, yaitu menyimpulkan informasi tersirat: gagasan utama, makna kata dalam konteks, hubungan sebab-akibat, watak tokoh, atau tujuan penulis.',
  Penalaran: 'evaluasi dan apresiasi, yaitu menilai isi, keakuratan, atau kesesuaian informasi, membandingkan dua bagian atau dua teks, menilai sikap tokoh, atau menilai penggunaan bahasa.',
};

/** Level kognitif TKA (kerangka asesmen BSKAP 2025) dipetakan ke C1–C6 GenSoal. */
export function levelTka(level: Level): string {
  return level === 'C1' || level === 'C2' ? 'Pengetahuan dan Pemahaman' : level === 'C3' ? 'Aplikasi' : 'Penalaran';
}

// ---- Atribut bersama -------------------------------------------------------------------------------------------

/** Contoh paket 30 soal: 19 PG, 5 PG kompleks, 6 kategori (benar-salah). Level 6/12/12. */
const BENTUK_TKA: Partial<Record<Bentuk, number>> = { pilihan_ganda: 19, pilihan_ganda_kompleks: 5, benar_salah: 6 };
/** Pengetahuan dan Pemahaman 6 (C1–C2), Aplikasi 12 (C3), Penalaran 12 (C4–C6). */
const LEVEL_TKA: Partial<Record<Level, number>> = { C1: 2, C2: 4, C3: 12, C4: 6, C5: 4, C6: 2 };
/** Olimpiade: tanpa soal hafalan, condong ke penalaran. */
const LEVEL_OSN: Partial<Record<Level, number>> = { C3: 2, C4: 3, C5: 3, C6: 2 };

const BENTUK_RESMI_TKA = 'Pilihan ganda, pilihan ganda kompleks (jawaban benar lebih dari satu), dan pilihan ganda kompleks kategori (Benar/Salah per pernyataan).';
const PENILAIAN_TKA = 'Nilai 0–100 dari banyak jawaban benar; tidak ada pengurangan untuk jawaban salah.';

const ATURAN_TKA = [
  'Soal setara Tes Kemampuan Akademik (TKA): mengukur pemahaman dan penalaran, bukan hafalan. Jangan menyalin soal TKA resmi, simulasi, atau bank soal; tulis soal baru yang setara.',
  'Utamakan soal berbasis stimulus singkat yang asli (teks, tabel, grafik, gambar, atau situasi nyata) dengan konteks personal, sosial budaya, atau saintifik.',
  'Level kognitif TKA hanya tiga: Pengetahuan dan Pemahaman, Aplikasi, dan Penalaran.',
  'Pilihan ganda kompleks mengikuti model TKA: pokok diakhiri "Pilihlah semua jawaban yang benar! (jawaban benar lebih dari satu)".',
  'Soal benar-salah mewakili pilihan ganda kompleks kategori TKA: satu pernyataan tentang stimulus yang dinilai Benar atau Salah.',
];

const ATURAN_MATEMATIKA_TKA = [
  'Elemen Matematika TKA: Bilangan, Aljabar, Geometri dan Pengukuran, serta Data dan Peluang. Soal tetap mengikuti TP guru bila ada.',
  'Soal aplikasi dan penalaran boleh menggabungkan beberapa langkah atau konsep dalam satu konteks nyata.',
];

const ATURAN_BINDO_TKA = [
  'Bahasa Indonesia TKA menguji membaca: setiap soal memuat teks asli yang pendek (teks informasi atau teks sastra) lalu pertanyaan tentang teks itu.',
  'Kompetensi membaca tiap butir mengikuti levelnya: pemahaman tekstual (informasi tersurat), pemahaman inferensial (simpulan, gagasan utama, makna kata dalam konteks), atau evaluasi dan apresiasi (menilai isi, sikap tokoh, atau penggunaan bahasa).',
  'Jawaban harus dapat ditemukan atau disimpulkan dari teks, bukan dari pengetahuan di luar teks.',
];

const SD_TEKS = 'Teks untuk SD sekitar 80–150 kata dengan kalimat sederhana (pola dasar SPOK) dan kosakata sehari-hari; cerita beralur maju dengan tokoh berkarakter datar.';
const SMP_TEKS = 'Teks untuk SMP sekitar 180–250 kata (puisi boleh lebih pendek) dengan kalimat yang lebih beragam; cerita boleh beralur campuran dengan tokoh berkarakter bulat.';
const SMA_TEKS = 'Teks untuk SMA sekitar 230–300 kata, boleh berupa teks tunggal atau dua teks yang saling berkaitan.';

const ATURAN_OSN = [
  'Soal setara Olimpiade Sains Nasional (OSN): pemecahan masalah tidak rutin yang menuntut penalaran mendalam, melampaui soal latihan kelas. Jangan menyalin soal OSN atau olimpiade lain; tulis soal baru yang setara.',
  'Kunci tunggal dan pasti; pembahasan menunjukkan langkah penalaran lengkap.',
];

const SARAN_PILIHAN_SMA = [
  'Matematika Tingkat Lanjut',
  'Bahasa Indonesia Tingkat Lanjut',
  'Bahasa Inggris Tingkat Lanjut',
  'Fisika',
  'Kimia',
  'Biologi',
  'Ekonomi',
  'Sosiologi',
  'Geografi',
  'Sejarah',
  'Antropologi',
  'Pendidikan Pancasila dan Kewarganegaraan',
  'Bahasa Arab',
  'Bahasa Jerman',
  'Bahasa Prancis',
  'Bahasa Jepang',
  'Bahasa Korea',
  'Bahasa Mandarin',
  'Projek Kreatif dan Kewirausahaan',
];

type Dasar = Omit<FormatUjian, 'id' | 'nama' | 'mapel' | 'asli' | 'aturan' | 'gaya' | 'bahasa' | 'gambar'> & Partial<Pick<FormatUjian, 'gaya' | 'bahasa' | 'gambar'>>;

function tka(keluarga: 'TKA' | 'TKAD', jenjang: Jenjang, kelas: number, opsiPg: 3 | 4 | 5): Dasar {
  return {
    keluarga,
    jenjang,
    kelas,
    porsiBentuk: BENTUK_TKA,
    porsiLevel: LEVEL_TKA,
    opsiPg,
    skor: null,
    bentukResmi: BENTUK_RESMI_TKA,
    penilaian: keluarga === 'TKAD' ? 'Mengikuti petunjuk dinas pendidikan setempat; bawaan meniru TKA (nilai 0–100 dari jawaban benar).' : PENILAIAN_TKA,
  };
}

function osn(jenjang: Jenjang, kelas: number, opsiPg: 3 | 4 | 5, porsiBentuk: Partial<Record<Bentuk, number>>, bentukResmi: string, penilaian: string, skor: FormatUjian['skor'] = null): Dasar {
  return { keluarga: 'OSN', jenjang, kelas, porsiBentuk, porsiLevel: LEVEL_OSN, opsiPg, skor, bentukResmi, penilaian, gaya: 'hots' };
}

function buat(id: string, nama: string, mapel: string, asli: FormatUjian['asli'], dasar: Dasar, aturan: string[], lain: Partial<FormatUjian> = {}): FormatUjian {
  const matematis = /matemati|ipa|fisika|kimia/i.test(mapel);
  return {
    id,
    nama,
    mapel,
    asli,
    aturan,
    gaya: dasar.gaya ?? 'biasa',
    bahasa: dasar.bahasa ?? 'id',
    gambar: dasar.gambar ?? (matematis ? 'campuran' : 'mati'),
    ...dasar,
    ...lain,
  };
}

const PG = 'Pilihan ganda (pilihan jamak) dengan satu jawaban benar.';
const PENILAIAN_OSN_TAK_PASTI = 'Lihat panduan OSN tahun berjalan; aturan skor berbeda per bidang dan tahap.';

// ---- Katalog ---------------------------------------------------------------------------------------------------

export const FORMAT_UJIAN: FormatUjian[] = [
  // TKA SD/MI dan SMP/MTs (Perkaban BSKAP 047/H/AN/2025; pelaksanaan April 2026).
  buat('tka-sd-matematika', 'TKA SD · Matematika', 'Matematika', { soal: 30, menit: 75 }, { ...tka('TKA', 'SD', 6, 4), gaya: 'numerasi', gambar: 'terprogram' }, [...ATURAN_TKA, ...ATURAN_MATEMATIKA_TKA]),
  buat('tka-sd-bindo', 'TKA SD · Bahasa Indonesia', 'Bahasa Indonesia', { soal: 30, menit: 75 }, { ...tka('TKA', 'SD', 6, 4), gaya: 'literasi' }, [...ATURAN_TKA, ...ATURAN_BINDO_TKA, SD_TEKS]),
  buat('tka-smp-matematika', 'TKA SMP · Matematika', 'Matematika', { soal: 30, menit: 75 }, { ...tka('TKA', 'SMP', 9, 4), gaya: 'numerasi', gambar: 'terprogram' }, [...ATURAN_TKA, ...ATURAN_MATEMATIKA_TKA]),
  buat('tka-smp-bindo', 'TKA SMP · Bahasa Indonesia', 'Bahasa Indonesia', { soal: 30, menit: 75 }, { ...tka('TKA', 'SMP', 9, 4), gaya: 'literasi' }, [...ATURAN_TKA, ...ATURAN_BINDO_TKA, SMP_TEKS]),

  // TKA SMA/MA/SMK (Perkaban BSKAP 045/H/AN/2025; jadwal 2026): 3 mapel wajib dan 2 mapel pilihan.
  buat('tka-sma-bindo', 'TKA SMA · Bahasa Indonesia', 'Bahasa Indonesia', { soal: 30, menit: 75 }, { ...tka('TKA', 'SMA', 12, 5), gaya: 'literasi' }, [...ATURAN_TKA, ...ATURAN_BINDO_TKA, SMA_TEKS]),
  buat('tka-sma-matematika', 'TKA SMA · Matematika', 'Matematika', { soal: 25, menit: 75 }, { ...tka('TKA', 'SMA', 12, 5), gaya: 'numerasi' }, [
    ...ATURAN_TKA,
    'Elemen Matematika TKA SMA: Bilangan, Aljabar dan Fungsi, Geometri dan Pengukuran, Data dan Peluang, termasuk trigonometri. Soal tetap mengikuti TP guru bila ada.',
    'Soal aplikasi dan penalaran boleh menggabungkan beberapa langkah atau konsep dalam satu konteks nyata.',
  ]),
  buat('tka-sma-binggris', 'TKA SMA · Bahasa Inggris', 'Bahasa Inggris', { soal: 30, menit: 75 }, { ...tka('TKA', 'SMA', 12, 5), gaya: 'literasi', bahasa: 'en' }, [
    ...ATURAN_TKA,
    'Bahasa Inggris TKA menguji membaca: setiap soal memuat teks asli berbahasa Inggris (descriptive, narrative, procedural, report, exposition, atau teks fungsional) lalu pertanyaan tentang teks itu.',
    'Tingkat teks sekitar CEFR B1. Ukur pemahaman tekstual, inferensial, atau evaluasi dan apresiasi.',
    'Jawaban harus dapat ditemukan atau disimpulkan dari teks.',
  ]),
  buat('tka-sma-pilihan', 'TKA SMA · Mapel pilihan', '', { soal: 25, menit: 60 }, { ...tka('TKA', 'SMA', 12, 5), gaya: 'hots' }, [
    ...ATURAN_TKA,
    'Mapel pilihan TKA dipakai untuk seleksi masuk perguruan tinggi: soal menuntut penguasaan konsep mapel itu dan penalaran atas data, grafik, atau kasus.',
  ], { saranMapel: SARAN_PILIHAN_SMA }),

  // TKAD: tes kemampuan akademik yang diadakan dinas pendidikan daerah, meniru TKA SD/SMP, dan soal daerah TKA
  // (sekitar 30% soal TKA SD/SMP disusun daerah dengan unsur kelokalan).
  buat('tkad-sd-matematika', 'TKAD SD · Matematika', 'Matematika', { soal: 30, menit: 75 }, { ...tka('TKAD', 'SD', 6, 4), gaya: 'numerasi', gambar: 'terprogram' }, [...ATURAN_TKA, ...ATURAN_MATEMATIKA_TKA]),
  buat('tkad-sd-bindo', 'TKAD SD · Bahasa Indonesia', 'Bahasa Indonesia', { soal: 30, menit: 75 }, { ...tka('TKAD', 'SD', 6, 4), gaya: 'literasi' }, [...ATURAN_TKA, ...ATURAN_BINDO_TKA, SD_TEKS]),
  buat('tkad-smp-matematika', 'TKAD SMP · Matematika', 'Matematika', { soal: 30, menit: 75 }, { ...tka('TKAD', 'SMP', 9, 4), gaya: 'numerasi', gambar: 'terprogram' }, [...ATURAN_TKA, ...ATURAN_MATEMATIKA_TKA]),
  buat('tkad-smp-bindo', 'TKAD SMP · Bahasa Indonesia', 'Bahasa Indonesia', { soal: 30, menit: 75 }, { ...tka('TKAD', 'SMP', 9, 4), gaya: 'literasi' }, [...ATURAN_TKA, ...ATURAN_BINDO_TKA, SMP_TEKS]),

  // OSN SD/MI (peserta kelas 4–5). OSN-K: tingkat kabupaten/kota; OSN-P: tingkat provinsi.
  buat('osnk-sd-matematika', 'OSN-K SD · Matematika', 'Matematika', { soal: 30, menit: 60 }, osn('SD', 5, 4, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Ranah Matematika OSN SD: bilangan, aritmetika, geometri, kombinatorik, serta statistika, data, dan pengukuran.',
  ]),
  buat('osnk-sd-ipa', 'OSN-K SD · IPA', 'IPA', { soal: 60, menit: 60 }, osn('SD', 5, 4, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPA olimpiade SD menuntut penalaran ilmiah: membaca data atau hasil percobaan sederhana, sebab-akibat, dan penerapan konsep makhluk hidup, materi, energi, serta bumi dan antariksa.',
  ]),
  buat('osnk-sd-ips', 'OSN-K SD · IPS', 'IPS', { soal: 60, menit: 60 }, osn('SD', 5, 4, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPS olimpiade SD memadukan geografi, sejarah, ekonomi, dan sosial budaya Indonesia; utamakan analisis peta, tabel, gambar, atau kasus, bukan hafalan tanggal.',
  ]),
  buat('osnp-sd-matematika', 'OSN-P SD · Matematika', 'Matematika', { soal: 20, menit: 60 }, osn('SD', 5, 4, { isian_singkat: 1 }, 'Isian singkat.', PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Ranah Matematika OSN SD: bilangan, aritmetika, geometri, kombinatorik, serta statistika, data, dan pengukuran.',
  ], { aturBentuk: { isian: 'bilangan' } }),
  buat('osnp-sd-ipa', 'OSN-P SD · IPA', 'IPA', { soal: 20, menit: 60 }, osn('SD', 5, 4, { isian_singkat: 1 }, 'Isian singkat.', PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPA olimpiade SD menuntut penalaran ilmiah: membaca data atau hasil percobaan sederhana, sebab-akibat, dan penerapan konsep.',
    'Jawaban isian berupa satu kata, istilah, atau bilangan dengan satuan.',
  ]),
  buat('osnp-sd-ips', 'OSN-P SD · IPS', 'IPS', { soal: 52, menit: 60 }, osn('SD', 5, 4, { pilihan_ganda: 40, isian_singkat: 12 }, '40 pilihan ganda dan 12 isian singkat.', PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPS olimpiade SD memadukan geografi, sejarah, ekonomi, dan sosial budaya Indonesia; utamakan analisis peta, tabel, gambar, atau kasus.',
  ]),

  // OSN SMP/MTs (peserta kelas 7–8), tahap kabupaten/kota 2026.
  buat(
    'osnk-smp-matematika',
    'OSN-K SMP · Matematika',
    'Matematika',
    { soal: 25, menit: 150 },
    osn('SMP', 8, 4, { pilihan_ganda: 1 }, 'Pilihan ganda (pilihan jamak) dengan 4 opsi.', 'Benar 4, salah atau kosong 0; nilai maksimal 100.', { pilihan_ganda: 4 }),
    [...ATURAN_OSN, 'Ranah Matematika OSN SMP: aljabar, geometri, kombinatorika, dan teori bilangan.'],
  ),
  buat('osnk-smp-ipa', 'OSN-K SMP · IPA', 'IPA', { soal: 40, menit: 90 }, osn('SMP', 8, 4, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPA olimpiade SMP terpadu (fisika, kimia, biologi, bumi dan antariksa): analisis data percobaan, grafik, dan hitungan sederhana.',
  ]),
  buat('osnk-smp-ips', 'OSN-K SMP · IPS', 'IPS', { soal: 60, menit: 90 }, osn('SMP', 8, 4, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal IPS olimpiade SMP memadukan geografi, sejarah, ekonomi, dan sosiologi; utamakan analisis peta, data, sumber sejarah, atau kasus.',
  ]),

  // OSN SMA/MA (peserta kelas 10–11), tahap kabupaten/kota 2025–2026.
  buat(
    'osnk-sma-matematika',
    'OSN-K SMA · Matematika',
    'Matematika',
    { soal: 20, menit: 150 },
    { ...osn('SMA', 11, 5, { isian_singkat: 1 }, 'Isian singkat berjawaban bilangan bulat: 10 soal dasar dan 10 soal lanjut.', 'Soal dasar: benar 2, salah atau kosong 0. Soal lanjut: benar 4, kosong 0, salah −1.'), porsiLevel: { C3: 1, C4: 1, C5: 1, C6: 1 } },
    [...ATURAN_OSN, 'Ranah Matematika OSN SMA: aljabar, geometri, kombinatorika, dan teori bilangan.'],
    { aturBentuk: { isian: 'bilangan_bulat' } },
  ),
  buat('osnk-sma-fisika', 'OSN-K SMA · Fisika', 'Fisika', { soal: 40, menit: 120 }, osn('SMA', 11, 5, { isian_singkat: 1 }, 'Isian singkat.', PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Fisika olimpiade: mekanika, termodinamika, gelombang, listrik-magnet, dan fisika modern dasar dengan analisis model fisis.',
    'Jawaban isian berupa bilangan dengan satuan; sebutkan nilai konstanta yang dipakai di pokok soal.',
  ]),
  buat('osnk-sma-kimia', 'OSN-K SMA · Kimia', 'Kimia', { soal: 50, menit: 100 }, osn('SMA', 11, 5, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Kimia olimpiade: stoikiometri, struktur atom dan ikatan, termokimia, kinetika, kesetimbangan, larutan, redoks, dan kimia organik dasar.',
  ]),
  buat('osnk-sma-biologi', 'OSN-K SMA · Biologi', 'Biologi', { soal: 50, menit: 180 }, osn('SMA', 11, 5, { benar_salah: 1 }, 'Benar-salah.', PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Biologi olimpiade: biologi sel dan molekuler, anatomi dan fisiologi, genetika dan evolusi, ekologi, serta biosistematika; pernyataan menuntut pemahaman konsep atau analisis data percobaan.',
  ]),
  buat(
    'osnk-sma-informatika',
    'OSN-K SMA · Informatika',
    'Informatika',
    { soal: null, menit: 150 },
    osn('SMA', 11, 5, { pilihan_ganda: 2, isian_singkat: 2, benar_salah: 1 }, 'Campuran pilihan ganda, isian singkat, dan benar-salah (sekitar 30–50 soal).', PENILAIAN_OSN_TAK_PASTI),
    [...ATURAN_OSN, 'Soal Informatika olimpiade: berpikir komputasional, logika, aritmetika, dan algoritma; kode ditulis sebagai pseudocode, bukan bahasa pemrograman tertentu.'],
  ),
  buat('osnk-sma-astronomi', 'OSN-K SMA · Astronomi', 'Astronomi', { soal: null, menit: 100 }, osn('SMA', 11, 5, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Astronomi olimpiade: tata koordinat dan bola langit, mekanika benda langit, tata surya, bintang, galaksi, dan kosmologi dasar; sebutkan konstanta yang dipakai.',
  ]),
  buat('osnk-sma-kebumian', 'OSN-K SMA · Kebumian', 'Kebumian', { soal: null, menit: 120 }, osn('SMA', 11, 5, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Kebumian olimpiade: geologi, meteorologi, oseanografi, dan astronomi bumi; utamakan analisis peta, penampang, dan data.',
  ]),
  buat('osnk-sma-ekonomi', 'OSN-K SMA · Ekonomi', 'Ekonomi', { soal: null, menit: 60 }, osn('SMA', 11, 5, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Ekonomi olimpiade: mikroekonomi, makroekonomi, akuntansi dasar, dan manajemen; utamakan analisis kasus, grafik, dan hitungan.',
  ]),
  buat('osnk-sma-geografi', 'OSN-K SMA · Geografi', 'Geografi', { soal: null, menit: 120 }, osn('SMA', 11, 5, { pilihan_ganda: 1 }, PG, PENILAIAN_OSN_TAK_PASTI), [
    ...ATURAN_OSN,
    'Soal Geografi olimpiade: geografi fisik, manusia, dan regional serta pemetaan; utamakan analisis peta, citra, dan data spasial.',
  ]),
];

export const KELUARGA_LABEL: Record<KeluargaUjian, string> = {
  TKA: 'TKA (Tes Kemampuan Akademik)',
  TKAD: 'TKAD (TKA daerah)',
  OSN: 'OSN (Olimpiade Sains Nasional)',
};

export function formatUjian(id: string | null | undefined): FormatUjian | null {
  return (id && FORMAT_UJIAN.find((u) => u.id === id)) || null;
}

/** Format yang dipakai paket; null bila paket bukan format ujian atau formatnya tidak dikenal lagi. */
export function formatPaket(p: Pick<ParameterPaket, 'ujian'>): FormatUjian | null {
  return formatUjian(p.ujian?.id);
}

/**
 * Bagi n ke kunci-kunci porsi dengan metode sisa terbesar (seperti komposisi kesukaran).
 * Seri didahulukan ke kunci yang lebih awal di `urutan`. Kunci berporsi 0 tidak muncul.
 */
export function bagiPorsi<K extends string>(porsi: Partial<Record<K, number>>, n: number, urutan: readonly K[]): Partial<Record<K, number>> {
  const kunci = urutan.filter((k) => (porsi[k] ?? 0) > 0);
  const total = kunci.reduce((a, k) => a + (porsi[k] ?? 0), 0);
  if (!total || n <= 0) return {};
  const mentah = kunci.map((k) => (n * (porsi[k] ?? 0)) / total);
  const dasar = mentah.map(Math.floor);
  let sisa = n - dasar.reduce((a, b) => a + b, 0);
  const urutSisa = kunci.map((_, i) => i).sort((a, b) => mentah[b] - dasar[b] - (mentah[a] - dasar[a]) || a - b);
  for (const i of urutSisa) {
    if (sisa <= 0) break;
    dasar[i]++;
    sisa--;
  }
  return Object.fromEntries(kunci.map((k, i) => [k, dasar[i]]).filter(([, v]) => (v as number) > 0)) as Partial<Record<K, number>>;
}

export const MIN_SOAL_UJIAN = 5;
export const MAKS_SOAL_UJIAN = 50;
/** Jumlah soal bila sumber belum memastikan jumlah soal ujian aslinya. */
export const SOAL_BAWAAN_UJIAN = 30;

/** Jumlah soal paket untuk format ini: jumlah aslinya, dibatasi 5–50. */
export function jumlahSoalUjian(u: FormatUjian): number {
  return Math.max(MIN_SOAL_UJIAN, Math.min(MAKS_SOAL_UJIAN, u.asli.soal ?? SOAL_BAWAAN_UJIAN));
}

export interface IsianUjian {
  kelas: number;
  mapel: string | null;
  n: number;
  bentuk: Bentuk[];
  jumlah_bentuk: Partial<Record<Bentuk, number>>;
  sebaran_level: Partial<Record<Level, number>>;
  opsi_pg: 3 | 4 | 5;
  atur_bentuk: AturBentuk | null;
  durasi_menit: number | null;
  aturan_tambahan: string[];
  wajib_stimulus: boolean;
  skor_bentuk: Partial<Record<Bentuk, number>> | null;
  gaya: GayaSoal;
  bahasa: BahasaSoal;
  gambar: ModeGambar;
}

/** Isian layar Buat untuk format ini. `mapel` null: guru memilih mapel sendiri. */
export function isianUjian(u: FormatUjian, n = jumlahSoalUjian(u)): IsianUjian {
  const jumlah_bentuk = bagiPorsi(u.porsiBentuk, n, URUTAN_BENTUK);
  return {
    kelas: u.kelas,
    mapel: u.mapel || null,
    n,
    bentuk: URUTAN_BENTUK.filter((b) => (jumlah_bentuk[b] ?? 0) > 0),
    jumlah_bentuk,
    sebaran_level: bagiPorsi(u.porsiLevel, n, LEVEL),
    opsi_pg: u.opsiPg,
    atur_bentuk: u.aturBentuk ? { pgk_benar: null, jodoh: null, isian: null, uraian: null, ...u.aturBentuk } : null,
    durasi_menit: u.asli.menit,
    aturan_tambahan: [...u.aturan],
    // TKA dan TKAD selalu berbasis stimulus; OSN boleh soal langsung.
    wajib_stimulus: u.keluarga !== 'OSN',
    skor_bentuk: u.skor,
    gaya: u.gaya,
    bahasa: u.bahasa,
    gambar: u.gambar,
  };
}

/** Kalimat ringkas tentang ujian aslinya untuk layar. */
export function ringkasUjian(u: FormatUjian): string {
  const soal = u.asli.soal ? `${u.asli.soal} soal` : 'jumlah soal belum dipastikan';
  const menit = u.asli.menit ? `${u.asli.menit} menit` : null;
  return `Ujian aslinya ${[soal, menit].filter(Boolean).join(' dalam ')}.`;
}

/**
 * Bagian prompt untuk format ujian paket; kosong bila paket bukan format ujian. Aturan penulisan format sudah disalin
 * ke `aturan_tambahan` paket (dapat disunting guru), jadi di sini hanya nama format, level TKA butir, dan kelokalan TKAD.
 */
export function bagianPromptUjian(p: Pick<ParameterPaket, 'ujian'>, level: Level): string {
  const u = formatPaket(p);
  if (!u) return '';
  const aturan = [`Soal disusun setara ${u.nama}.`];
  if (u.keluarga === 'TKA' || u.keluarga === 'TKAD') aturan.push(`Butir ini berlevel TKA "${levelTka(level)}".`);
  // Mapel bahasa: kompetensi membaca butir mengikuti level TKA-nya, agar level dan kompetensi selalu cocok.
  if ((u.keluarga === 'TKA' || u.keluarga === 'TKAD') && /bahasa/i.test(u.mapel)) aturan.push(`Kompetensi membaca butir ini: ${KOMPETENSI_BACA[levelTka(level)]}`);
  if (u.keluarga === 'TKAD') {
    const daerah = p.ujian?.daerah?.trim();
    aturan.push(
      daerah
        ? `Soal daerah: wajib memuat unsur kelokalan ${daerah} (nama tempat, budaya, kuliner, mata pencaharian, atau potensi khas daerah itu), tanpa stereotip dan tanpa fakta yang diragukan.`
        : 'Soal daerah: muat unsur kelokalan Nusantara (tempat, budaya, atau potensi daerah), tanpa stereotip dan tanpa fakta yang diragukan.',
    );
  }
  return `## Format ujian: ${u.nama}\n${aturan.map((a) => `- ${a}`).join('\n')}`;
}
