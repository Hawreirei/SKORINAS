import type { Lingkup } from '../../verifikasi/angka';
import type { Gambar } from '../primitif';

export interface Templat<P = unknown> {
  id: string;
  nama: string;
  /** Penjelasan parameter untuk instruksi model dan dokumentasi. */
  parameter: string;
  contoh: Record<string, unknown>;
  dipakai: string;
  /** Validasi dan normalisasi parameter. Melempar GalatTemplat bila tidak sah. */
  baca(mentah: Record<string, unknown>): P;
  gambar(p: P): Gambar;
  /** Variabel yang dapat dipakai ekspresi verifikasi, dihitung dari parameter yang sama dengan gambar. */
  lingkup(p: P): Lingkup;
}
