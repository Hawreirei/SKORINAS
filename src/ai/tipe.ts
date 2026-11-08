import type { PenyediaId } from '../db/tipe';

export interface PermintaanAi {
  kunci: string;
  model: string;
  sistem: string;
  pesan: string;
  suhu?: number;
  signal?: AbortSignal;
  /**
   * 'rendah': minta model penalaran berpikir singkat (Gemini thinkingLevel/thinkingBudget,
   * reasoning_effort ala OpenAI) agar jawaban lebih cepat. Diambil dari registri model.
   */
  penalaran?: 'rendah';
  /** Batas token keluaran bila penyedia mewajibkannya (Anthropic); naik untuk permintaan berisi banyak butir. */
  maksKeluar?: number;
}

export interface JawabanAi {
  teks: string;
  token_masuk: number;
  token_keluar: number;
  /** Sisa kuota dari header penyedia bila tersedia, mis. "48 permintaan". */
  sisa_kuota: string | null;
  /** Jawaban terpotong karena batas token keluaran (F-38): kelompok berikutnya diperkecil. */
  terpotong?: boolean;
  /** Diisi pengirim yang dijaga pembatas laju: lepaskan jatah harian setelah percobaan tercatat. */
  lepas?: () => void;
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
  /** Batas tingkat gratis: permintaan per menit dan per hari. null bila tidak diketahui atau berbayar. */
  batas_gratis?: { rpm: number | null; rpd: number | null } | null;
  /** 'rendah' bila model penalaran ini cukup berpikir singkat untuk satu butir soal (F-37). */
  penalaran?: 'rendah' | null;
  /** Banyak butir yang diminta dalam satu permintaan (F-38). Tanpa isian: BUTIR_PER_PERMINTAAN_BAWAAN. */
  butir_per_permintaan?: number | null;
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
