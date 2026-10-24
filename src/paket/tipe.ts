import type { IsiSoal, Rumpun, StatusMutu } from '../db/tipe';
import type { Lingkup, Lokal } from '../verifikasi/angka';
import type { HasilHitung } from '../verifikasi/matematika';

/** Paket mata pelajaran: aturan verifikasi, templat gambar, dan gaya soal. Dipilih dari rumpun yang ditebak dari nama mapel. */
export interface PaketMapel {
  rumpun: Rumpun;
  nama: string;
  aturanPenulisan: string[];
  contohAcuan: Partial<IsiSoal>[];
  templatGambar: string[];
  /** Status bila pemeriksa lolos. */
  statusLolos: StatusMutu;
  pemeriksa: ((isi: IsiSoal, lokal: Lokal, lingkup: Lingkup) => HasilHitung) | null;
  /** Rumpun berisiko tinggi wajib centang "kutipan sumber sudah diperiksa" sebelum ekspor. */
  risikoTinggi: boolean;
}
