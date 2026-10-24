import type { Rumpun } from '../db/tipe';

// Bentuk berkas JSON di public/kurikulum, dibangun oleh scripts/bangun-kurikulum.ts dari CSV kurator.

export interface FaseResmi {
  id: string;
  kurikulum_id: string;
  kode: string;
  kelas_dari: number;
  kelas_sampai: number;
}

export interface MapelResmi {
  id: string;
  kurikulum_id: string;
  kode: string;
  nama: string;
  rumpun: Rumpun;
  fase: string[];
  paket_aktif: boolean;
  /** Berkas CP dan TP relatif terhadap /kurikulum/, null bila belum ada data. */
  berkas: string | null;
}

export interface KurikulumResmi {
  id: string;
  nama: string;
  versi: string;
  dasar_hukum: string;
  berlaku_dari: string;
  aktif: boolean;
  fase: FaseResmi[];
  mapel: MapelResmi[];
}

export interface IndeksKurikulum {
  versi_data: string;
  dibangun_pada: string;
  kurikulum: KurikulumResmi[];
}

export interface TpResmi {
  id: string;
  cp_id: string;
  kode: string;
  kelas: number;
  rumusan: string;
  lingkup_materi: string;
  status_validasi: 'draf' | 'tervalidasi';
}

export interface CpResmi {
  id: string;
  elemen_id: string;
  teks: string;
  sumber_dokumen: string;
}

export interface ElemenResmi {
  id: string;
  mapel_id: string;
  nama: string;
  urutan: number;
  cp: CpResmi;
  tp: TpResmi[];
}

export interface BerkasMapel {
  kurikulum_id: string;
  kurikulum_versi: string;
  mapel: MapelResmi;
  fase: Record<string, ElemenResmi[]>;
}
