// Bentuk data milik guru (IndexedDB). Aplikasi tidak membawa data kurikulum:
// kelas, mapel, CP, dan TP diisi guru (docs/RANCANGAN.md v0.4, bagian Model Data).

export type Bentuk = 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'pilihan_ganda_kategori' | 'isian_singkat' | 'benar_salah' | 'menjodohkan' | 'uraian';
export type Kesukaran = 'mudah' | 'sedang' | 'sulit';
export type Level = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
export type StatusMutu = 'terverifikasi_hitung' | 'terverifikasi_aturan' | 'perlu_telaah' | 'ditolak';
export type StatusTelaah = 'draf' | 'ditelaah_guru' | 'ditolak';
export type Rumpun = 'matematika' | 'ipa' | 'bahasa' | 'ips' | 'pancasila_agama' | 'seni_pjok_informatika';
export type BahasaSoal = 'id' | 'en' | 'dwibahasa' | 'lain';
export type GayaSoal = 'biasa' | 'numerasi' | 'literasi' | 'hots';
export type ModeGambar = 'terprogram' | 'mati' | 'campuran';
export type JenisUraian = 'penjelasan' | 'hitungan';
export type CaraBenarSalah = 'centang' | 'lingkari';
export type GayaPembahasan = 'singkat' | 'langkah' | 'dddj';
/** Jenis jawaban isian singkat yang diminta guru. */
export type JenisIsian = 'bebas' | 'bilangan' | 'bilangan_bulat' | 'kata';
export type PenyediaId = 'gemini' | 'openrouter' | 'groq' | 'mistral' | 'openai' | 'anthropic';

export const BENTUK_LABEL: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihan ganda',
  pilihan_ganda_kompleks: 'Pilihan ganda kompleks',
  pilihan_ganda_kategori: 'PG kompleks kategori',
  isian_singkat: 'Isian singkat',
  benar_salah: 'Benar-salah',
  menjodohkan: 'Menjodohkan',
  uraian: 'Uraian',
};

/** Level kognitif menurut kategori kesukaran rancangan: C1–C2 mudah, C3–C4 sedang, C5–C6 sulit. */
export const LEVEL: Level[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

export function kesukaranDariLevel(l: Level): Kesukaran {
  return l === 'C1' || l === 'C2' ? 'mudah' : l === 'C3' || l === 'C4' ? 'sedang' : 'sulit';
}

export const KESUKARAN_LABEL: Record<Kesukaran, string> = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };

export const RUMPUN_LABEL: Record<Rumpun, string> = {
  matematika: 'Matematika',
  ipa: 'IPA',
  bahasa: 'Bahasa',
  ips: 'IPS',
  pancasila_agama: 'Pancasila dan Agama',
  seni_pjok_informatika: 'Seni, PJOK, Informatika',
};

export const STATUS_MUTU_LABEL: Record<StatusMutu, string> = {
  terverifikasi_hitung: 'Terverifikasi hitung',
  terverifikasi_aturan: 'Terverifikasi aturan',
  perlu_telaah: 'Perlu telaah',
  ditolak: 'Ditolak',
};

export const JENIS_URAIAN_LABEL: Record<JenisUraian, string> = { penjelasan: 'Penjelasan', hitungan: 'Hitungan' };

export const GAYA: GayaSoal[] = ['biasa', 'numerasi', 'literasi', 'hots'];
export const GAYA_LABEL: Record<GayaSoal, string> = { biasa: 'Biasa', numerasi: 'Numerasi', literasi: 'Literasi', hots: 'HOTS' };

/** Rincian tiap bentuk soal (opsi lanjutan v2). Setiap isian null berarti perilaku bawaan. */
export interface AturBentuk {
  /** Pilihan ganda kompleks: banyak jawaban benar per soal. */
  pgk_benar: { min: number; maks: number } | null;
  /** Menjodohkan: banyak butir kolom kiri (3–6) dan pengecoh di kolom kanan (0–2). */
  jodoh: { kiri: number; pengecoh: number } | null;
  /** Isian singkat: jenis jawaban. */
  isian: JenisIsian | null;
  /** Uraian: semua penjelasan, semua hitungan, atau null (campur, dipilih AI). */
  uraian: JenisUraian | null;
  /** PG kompleks kategori (F-40): dua label kategori dan banyak pernyataan per soal (3–6). null: Benar/Salah, 4 pernyataan. */
  kategori?: { label: [string, string]; pernyataan: number } | null;
}

/** Label kategori bawaan PG kompleks kategori. */
export const KATEGORI_BAWAAN: [string, string] = ['Benar', 'Salah'];

/** Satu baris susunan rinci: sekian soal berbentuk ini, berlevel ini, untuk TP ini (null: TP bergiliran). */
export interface BarisRincian {
  bentuk: Bentuk;
  level: Level;
  tp: number | null;
  jumlah: number;
}

/** Satu TP yang dipakai paket, ditulis guru. Disalin utuh ke soal agar kisi-kisi lama tidak berubah diam-diam. */
export interface TpDipakai {
  id: string;
  kode?: string;
  rumusan: string;
  /** Data dari versi 0.3: 'resmi' bila diambil dari data kurikulum bundel. */
  /** 'ujian': butir cakupan format ujian yang dipakai karena guru mengosongkan CP dan TP (F-39). */
  sumber?: 'resmi' | 'kustom' | 'guru' | 'ujian';
  versi?: number | string;
  induk_id?: string | null;
}

/** Format ujian yang dipakai paket (F-35): id katalog `src/ujian` dan, untuk TKAD, nama daerah untuk konteks lokal. */
export interface UjianDipakai {
  id: string;
  daerah: string;
}

/** Isi formulir Buat soal. Dipakai sama persis oleh pengaturan tersimpan (preset) dan paket_soal.parameter_json. */
export interface ParameterPaket {
  kelas: number;
  fase: string;
  mapel: string;
  rumpun: Rumpun | null;
  cp: string;
  tp: TpDipakai[];
  n: number;
  persen: [number, number, number];
  bentuk: Bentuk[];
  bahasa: BahasaSoal;
  gaya: GayaSoal;
  gambar: ModeGambar;
  materi: string;
  /** Cara siswa menjawab benar-salah di berkas: centang kotak Benar/Salah atau lingkari B/S. */
  cara_bs: CaraBenarSalah;
  /** Jumlah soal per bentuk (berjumlah n). null: bentuk terpilih dibagi bergiliran. */
  jumlah_bentuk: Partial<Record<Bentuk, number>> | null;
  /** Jumlah soal per level kognitif C1–C6 (berjumlah n); menggantikan `persen`. null: dari persen kesukaran. */
  sebaran_level: Partial<Record<Level, number>> | null;
  /** Jumlah soal per TP, sejajar urutan `tp` (berjumlah n). null: TP dibagi rata bergiliran. */
  jumlah_tp: number[] | null;
  /** Banyak opsi pilihan ganda (biasa dan kompleks), 3–5. null: 5 untuk kelas 10–12, 4 untuk lainnya. */
  opsi_pg: 3 | 4 | 5 | null;
  /** Skor setiap soal per bentuk, dicetak di lembar soal dan pedoman penskoran. null: tanpa skor. */
  skor_bentuk: Partial<Record<Bentuk, number>> | null;
  /** Format ujian (TKA, TKAD, OSN) yang mengisi formulir dan menambah aturan ke prompt. null: soal biasa. */
  ujian: UjianDipakai | null;
  // ---- Opsi lanjutan v2 (Dexie versi 5). null atau kosong berarti perilaku bawaan. ----
  /** Susunan rinci per baris (bentuk × level × TP), menggantikan jumlah per bentuk, per level, dan per TP. */
  rincian: BarisRincian[] | null;
  /** Rincian tiap bentuk soal. */
  atur_bentuk: AturBentuk | null;
  /** Pengurangan skor untuk jawaban salah per bentuk (bilangan positif). Jawaban kosong selalu 0. */
  skor_salah: Partial<Record<Bentuk, number>> | null;
  /** Waktu mengerjakan, dicetak di lembar soal. */
  durasi_menit: number | null;
  /** Campuran gaya: jumlah soal per gaya (berjumlah n), menggantikan `gaya`. */
  jumlah_gaya: Partial<Record<GayaSoal, number>> | null;
  /** Nama bahasa bila `bahasa` = 'lain'. */
  bahasa_lain: string;
  /** Konteks atau tema soal yang diinginkan guru, mis. "pertanian dan pasar tradisional". */
  konteks: string;
  /** Aturan tambahan untuk AI, satu aturan per butir. Diisi format ujian dan dapat disunting guru. */
  aturan_tambahan: string[];
  /** Setiap soal wajib diawali stimulus (cerita, teks, atau situasi) yang dibutuhkan untuk menjawab (F-39, Dexie versi 6). */
  wajib_stimulus: boolean;
  // ---- Pengaturan mendalam (F-40, Dexie versi 7). null berarti perilaku bawaan. ----
  /** Bacaan bersama: banyak soal per bacaan (2–5) dalam satu bentuk. */
  soal_per_bacaan: number | null;
  /** Skor per kesukaran (benar dan pengurangan bila salah), menggantikan skor per bentuk. */
  skor_kesukaran: Record<Kesukaran, { benar: number; salah: number }> | null;
  /** Cakupan materi pilihan guru: butir yang dipakai (null: semua) dan porsi per elemen (null: bawaan format). */
  cakupan_pilih: { butir: string[] | null; porsi: Record<string, number> | null } | null;
  /** Daftar variasi sendiri; daftar kosong memakai bawaan. */
  variasi_sendiri: { tema: string[]; tokoh: string[]; stimulus: string[] } | null;
  /** Panjang stimulus (kata) sendiri. */
  panjang_stimulus: { min: number; maks: number } | null;
  /** Kalimat petunjuk bagian sendiri per bentuk di lembar soal. */
  petunjuk_bagian: Partial<Record<Bentuk, string>> | null;
  /** Urutan bentuk di lembar soal dan rencana butir. */
  urutan_bentuk: Bentuk[] | null;
  /** Gaya pembahasan: singkat, langkah demi langkah, atau Diketahui–Ditanya–Dijawab. */
  gaya_pembahasan: GayaPembahasan | null;
  /** Data dari versi 0.3 (sebelum aplikasi berhenti membawa data kurikulum). Tidak diisi lagi. */
  kurikulum_id?: string;
  kurikulum_nama?: string;
  kurikulum_versi?: string;
  kurikulum_dasar?: string;
}

/** Satu pernyataan yang dihitung ulang: kiri relasi kanan, mis. 3/4 > 2/3. */
export interface Pernyataan {
  kiri: string;
  relasi: string;
  kanan: string;
}

export type Verifikasi =
  | { tipe: 'ekspresi'; ekspresi: string; nilai: string }
  | { tipe: 'perbandingan'; kiri: string; relasi: string; kanan: string }
  | { tipe: 'urutan'; nilai: string[]; arah: 'naik' | 'turun' }
  /** Pilihan ganda kompleks: satu pernyataan per opsi; opsi benar tepat yang pernyataannya benar. */
  | { tipe: 'per_opsi'; opsi: Partial<Record<HurufOpsi, Pernyataan>> }
  /** Menjodohkan: nilai tiap butir kolom kiri dan kanan; pasangan benar bernilai sama. */
  | { tipe: 'pasangan'; kiri: string[]; kanan: string[] }
  /** PG kompleks kategori: satu pernyataan hitung per butir; benar = kategori pertama (mis. Benar), salah = kedua. */
  | { tipe: 'per_pernyataan'; pernyataan: Pernyataan[] }
  | { tipe: 'tidak_ada'; alasan?: string };

export interface GambarSoal {
  templat: string;
  parameter: Record<string, unknown>;
  alt?: string;
}

export type HurufOpsi = 'A' | 'B' | 'C' | 'D' | 'E';

/** Skema isi_json, mengikuti bagian Mesin AI. */
export interface IsiSoal {
  bentuk: Bentuk;
  pokok: string;
  opsi?: Partial<Record<HurufOpsi, string>>;
  /** Hanya menjodohkan: kolom kiri bernomor 1, 2, …; kolom kanan berhuruf A, B, … (boleh lebih banyak sebagai pengecoh). */
  pasangan?: { kiri: string[]; kanan: string[] };
  /** Hanya PG kompleks kategori: pernyataan yang masing-masing digolongkan ke salah satu kategori. */
  pernyataan?: string[];
  /** Hanya PG kompleks kategori: dua label kategori, mis. ['Benar', 'Salah']. */
  kategori?: [string, string];
  /** Bacaan bersama (F-40): teks yang dipakai beberapa soal; dicetak sekali sebelum soal pertama kelompoknya. */
  stimulus?: { id: string; teks: string } | null;
  /**
   * Pilihan ganda: satu huruf. Pilihan ganda kompleks: huruf dipisah koma ("A,C").
   * Benar-salah: "B" atau "S". Menjodohkan: "1-B, 2-A, 3-C". Isian dan uraian: jawaban.
   */
  kunci: string;
  rubrik?: string[];
  /** Hanya uraian: penjelasan dijawab pada garis, hitungan pada kotak cara pengerjaan dan jawaban akhir. */
  jenis_uraian?: JenisUraian;
  pembahasan: string[];
  verifikasi: Verifikasi;
  gambar: GambarSoal | null;
  terjemahan?: { pokok: string; opsi?: Partial<Record<HurufOpsi, string>> } | null;
  meta: { tp: string; indikator: string; level: Level; kesukaran: Kesukaran };
}

/** Teks pembanding kemiripan antarsoal: pokok, ditambah kolom kiri untuk menjodohkan karena pokoknya sering sama. */
export function teksPembanding(isi: Pick<IsiSoal, 'pokok' | 'pasangan' | 'pernyataan'>): string {
  if (isi.pasangan) return `${isi.pokok} ${isi.pasangan.kiri.join(' ')}`;
  if (isi.pernyataan) return `${isi.pokok} ${isi.pernyataan.join(' ')}`;
  return isi.pokok;
}

/**
 * Kunci PG kompleks kategori disimpan "B-S-B": B = kategori pertama, S = kategori kedua, satu huruf per pernyataan.
 * Membaca juga label kategori ("Benar, Salah"), Y/T, atau 1/2. Hasil: 0 (pertama), 1 (kedua), -1 (tidak terbaca).
 */
export function petaKategori(kunci: string | string[], jumlah: number, label: [string, string] = KATEGORI_BAWAAN): number[] {
  const token = (Array.isArray(kunci) ? kunci : kunci.split(/[\s,;|/]*[-–—,;|/][\s,;|/]*|\s+/)).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  const [a, b] = label.map((l) => l.toLowerCase());
  const baca = (t: string) => {
    if (t === a || (t.length > 1 && a.startsWith(t) && !b.startsWith(t))) return 0;
    if (t === b || (t.length > 1 && b.startsWith(t) && !a.startsWith(t))) return 1;
    if (['b', 'y', '1', 'v', '✓'].includes(t)) return 0;
    if (['s', 't', '2', 'x', '✗'].includes(t)) return 1;
    return -1;
  };
  return Array.from({ length: jumlah }, (_, i) => (i < token.length ? baca(token[i]) : -1));
}

export function teksKategori(peta: number[]): string {
  return peta.map((j) => (j === 0 ? 'B' : j === 1 ? 'S' : '?')).join('-');
}

/** Huruf kunci pilihan ganda kompleks, terurut. */
export function hurufKunci(kunci: string): HurufOpsi[] {
  return [...new Set(kunci.toUpperCase().match(/[A-E]/g) ?? [])].sort() as HurufOpsi[];
}

/** Huruf kolom kanan menjodohkan. */
export const HURUF_KANAN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Kunci menjodohkan sebagai indeks kolom kanan untuk tiap butir kolom kiri; -1 bila tidak terbaca. */
export function petaJodoh(kunci: string, jumlahKiri: number): number[] {
  const peta = Array.from({ length: jumlahKiri }, () => -1);
  for (const m of kunci.toUpperCase().matchAll(/(\d+)\s*[-–:=>→]+\s*([A-H])/g)) {
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < jumlahKiri) peta[i] = HURUF_KANAN.indexOf(m[2]);
  }
  return peta;
}

export function teksJodoh(peta: number[]): string {
  return peta.map((j, i) => `${i + 1}-${HURUF_KANAN[j] ?? '?'}`).join(', ');
}

/** Jenis jawaban uraian; soal lama tanpa penanda ditebak dari verifikasinya. */
export function jenisUraian(isi: Pick<IsiSoal, 'jenis_uraian' | 'verifikasi'>): JenisUraian {
  return isi.jenis_uraian ?? (isi.verifikasi.tipe === 'tidak_ada' ? 'penjelasan' : 'hitungan');
}

export interface Rekaman {
  id: string;
  dibuat_pada: number;
  diubah_pada: number;
}

export interface Profil extends Rekaman {
  nama: string;
  sekolah: string;
  kop_json: { baris: string[]; alamat: string };
  logo_blob: string | null;
  identitas_siswa: string[];
  tema: 'sistem' | 'terang' | 'gelap';
  batas_harian: number;
  batas_biaya_usd: number;
  penyedia_utama: PenyediaId | null;
  model_utama: string | null;
  penyedia_cadangan: PenyediaId | null;
  model_cadangan: string | null;
  cadangan_terakhir: number | null;
  persisten_diminta: boolean;
  /** Batas laju yang diatur guru per model ("penyedia|model"), menimpa angka registri. */
  batas_model: Record<string, { rpm: number | null; rpd: number | null }>;
}

/** Kunci API guru. Toko terpisah agar tidak pernah ikut berkas .gensoal. */
export interface KunciApi {
  penyedia: PenyediaId;
  kunci: string;
  diuji_pada: number | null;
  status: 'belum' | 'berfungsi' | 'gagal';
  pesan: string;
  model_tersedia: string[];
}

export interface Preset extends Rekaman {
  nama: string;
  parameter_json: ParameterPaket;
  terakhir_dipakai: number;
}

export interface PaketSoal extends Rekaman {
  judul: string;
  parameter_json: ParameterPaket;
  status: 'membuat' | 'dijeda' | 'siap';
  penyedia: PenyediaId | null;
  model: string | null;
  dihapus_pada: number | null;
}

export interface Soal extends Rekaman {
  paket_id: string;
  slot_id: string;
  urutan: number;
  tp_id: string;
  tp: TpDipakai;
  indikator_id: string | null;
  bentuk: Bentuk;
  level_kognitif: Level;
  kesukaran_rancangan: Kesukaran;
  isi_json: IsiSoal;
  status_mutu: StatusMutu;
  status_telaah: StatusTelaah;
  catatan_mutu: string[];
  sumber_dicek: boolean;
  terkunci: boolean;
  versi: number;
  penyedia: PenyediaId | null;
  model: string | null;
  biaya_usd: number | null;
  dihapus_pada: number | null;
}

export interface SoalGambar extends Rekaman {
  soal_id: string;
  jalur: 'terprogram' | 'ilustrasi' | 'unggahan';
  templat: string;
  parameter_json: Record<string, unknown>;
  svg: string;
}

export interface Slot {
  id: string;
  urutan: number;
  tp_index: number;
  kesukaran: Kesukaran;
  level: Level;
  bentuk: Bentuk;
  status: 'menunggu' | 'berjalan' | 'lolos' | 'gagal';
  percobaan: number;
  pengganti: boolean;
  galat: string | null;
  soal_id: string | null;
  /** Gaya butir ini bila paket memakai campuran gaya; selain itu gaya paket. */
  gaya?: GayaSoal;
  /** Variasi butir (F-39): tema konteks, bentuk stimulus, dan nama tokoh yang berbeda antarbutir. */
  variasi?: { tema: string; stimulus: string; tokoh: string };
  /** Bacaan bersama (F-40): id kelompok slot yang memakai satu bacaan. */
  kelompok?: string;
}

export interface PekerjaanGenerasi extends Rekaman {
  paket_id: string;
  status: 'menunggu' | 'berjalan' | 'dijeda' | 'selesai';
  slot: Slot[];
  percobaan: number;
  galat: string | null;
  mulai: number | null;
  selesai: number | null;
  /** Bacaan bersama per kelompok slot (F-40), dibuat sekali lalu dipakai semua anggota. */
  bacaan?: Record<string, string>;
}

export interface PemakaianAi {
  id: string;
  tanggal: string;
  dibuat_pada: number;
  penyedia: PenyediaId;
  model: string;
  token_masuk: number;
  token_keluar: number;
  perkiraan_biaya: number | null;
  lolos: boolean;
  /** Banyak soal lolos dari permintaan ini (F-38, satu permintaan berisi beberapa butir). Kosong pada catatan lama: 1 bila lolos. */
  jumlah_lolos?: number;
  paket_id: string | null;
}

/** Banyak soal lolos yang dihasilkan satu catatan pemakaian. */
export function soalLolos(p: Pick<PemakaianAi, 'lolos' | 'jumlah_lolos'>): number {
  return p.jumlah_lolos ?? (p.lolos ? 1 : 0);
}

export interface LogSoal {
  id: string;
  soal_id: string;
  /** 'setujui' dan 'telaah' hanya ada di log lama (sebelum v0.5); tetap diterima agar cadangan lama terbaca. */
  aksi: 'sunting' | 'ganti' | 'buat_ulang' | 'setujui' | 'telaah' | 'kunci' | 'buka_kunci' | 'hapus' | 'pulihkan' | 'tolak' | 'jenis_uraian';
  sebelum_json: unknown;
  sesudah_json: unknown;
  dibuat_pada: number;
}
