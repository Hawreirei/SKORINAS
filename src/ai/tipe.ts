import type { PenyediaId } from '../db/tipe';

export interface PermintaanAi {
  kunci: string;
  model: string;
  sistem: string;
  pesan: string;
  suhu?: number;
  signal?: AbortSignal;
}

export interface JawabanAi {
  teks: string;
  token_masuk: number;
  token_keluar: number;
  /** Sisa kuota dari header penyedia bila tersedia, mis. "48 permintaan". */
  sisa_kuota: string | null;
}

export interface ModelLangsung {
  id: string;
  nama: string;
}

/** Satu adaptor per penyedia, tiga fungsi yang sama. */
export interface Adaptor {
  id: PenyediaId;
  kirim(p: PermintaanAi): Promise<JawabanAi>;
  daftarModel(kunci: string, signal?: AbortSignal): Promise<ModelLangsung[]>;
}

export type StatusModel = 'direkomendasikan' | 'stabil' | 'pratinjau' | 'usang';

export interface ModelRegistri {
  id: string;
  label: string;
  status: StatusModel;
  tingkat: 'gratis' | 'murah' | 'premium';
  /** USD per 1 juta token. null bila belum diverifikasi. */
  harga: { masuk: number; keluar: number } | null;
  golden: { status: 'lolos' | 'gagal' | 'belum'; tanggal: string | null; benar_lolos?: number; salah_ditolak?: number; json_sah?: number };
  catatan: string;
}

export interface PenyediaRegistri {
  id: PenyediaId;
  nama: string;
  tingkat_gratis: boolean;
  situs_kunci: string;
  awalan_kunci: string;
  peringatan_biaya: string;
  peringatan_privasi: string;
  akses: 'langsung' | 'proxy';
  model: ModelRegistri[];
}

export interface Registri {
  versi: string;
  diperiksa_pada: string;
  catatan: string;
  penyedia: PenyediaRegistri[];
}
