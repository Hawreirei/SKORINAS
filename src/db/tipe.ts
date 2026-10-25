// Bentuk data milik guru (IndexedDB). Aplikasi tidak membawa data kurikulum:
// kelas, mapel, CP, dan TP diisi guru (docs/RANCANGAN.md v0.4, bagian Model Data).

export type Bentuk = 'pilihan_ganda' | 'isian_singkat' | 'benar_salah' | 'uraian';
export type Kesukaran = 'mudah' | 'sedang' | 'sulit';
export type Level = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
export type StatusMutu = 'terverifikasi_hitung' | 'terverifikasi_aturan' | 'perlu_telaah' | 'ditolak';
export type StatusTelaah = 'draf' | 'ditelaah_guru' | 'ditolak';
export type Rumpun = 'matematika' | 'ipa' | 'bahasa' | 'ips' | 'pancasila_agama' | 'seni_pjok_informatika';
export type BahasaSoal = 'id' | 'en' | 'dwibahasa';
export type GayaSoal = 'biasa' | 'numerasi' | 'literasi' | 'hots';
export type ModeGambar = 'terprogram' | 'mati' | 'campuran';
export type JenisUraian = 'penjelasan' | 'hitungan';
export type CaraBenarSalah = 'centang' | 'lingkari';
export type PenyediaId = 'gemini' | 'openrouter' | 'groq' | 'mistral' | 'openai' | 'anthropic';

export const BENTUK_LABEL: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihan ganda',
  isian_singkat: 'Isian singkat',
  benar_salah: 'Benar-salah',
  uraian: 'Uraian',
};

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

/** Satu TP yang dipakai paket, ditulis guru. Disalin utuh ke soal agar kisi-kisi lama tidak berubah diam-diam. */
export interface TpDipakai {
  id: string;
  kode?: string;
  rumusan: string;
  /** Data dari versi 0.3: 'resmi' bila diambil dari data kurikulum bundel. */
  sumber?: 'resmi' | 'kustom' | 'guru';
  versi?: number | string;
  induk_id?: string | null;
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
  /** Data dari versi 0.3 (sebelum aplikasi berhenti membawa data kurikulum). Tidak diisi lagi. */
  kurikulum_id?: string;
  kurikulum_nama?: string;
  kurikulum_versi?: string;
  kurikulum_dasar?: string;
}

export type Verifikasi =
  | { tipe: 'ekspresi'; ekspresi: string; nilai: string }
  | { tipe: 'perbandingan'; kiri: string; relasi: string; kanan: string }
  | { tipe: 'urutan'; nilai: string[]; arah: 'naik' | 'turun' }
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
}

export interface PekerjaanGenerasi extends Rekaman {
  paket_id: string;
  status: 'menunggu' | 'berjalan' | 'dijeda' | 'selesai';
  slot: Slot[];
  percobaan: number;
  galat: string | null;
  mulai: number | null;
  selesai: number | null;
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
  paket_id: string | null;
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
