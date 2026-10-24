import type { GambarSoal } from '../db/tipe';
import type { Lingkup } from '../verifikasi/angka';
import { GalatTemplat } from './bantu';
import type { Gambar } from './primitif';
import { keSvg } from './svg';
import { bangunDatar } from './templat/bangun-datar';
import { blokNilaiTempat } from './templat/blok-nilai-tempat';
import { diagramBatang } from './templat/diagram-batang';
import { garisBilangan } from './templat/garis-bilangan';
import { gridLuas } from './templat/grid-luas';
import { jamAnalog } from './templat/jam-analog';
import { pecahanBatang } from './templat/pecahan-batang';
import { pecahanLingkaran } from './templat/pecahan-lingkaran';
import { penggaris } from './templat/penggaris';
import { piktogram } from './templat/piktogram';
import type { Templat } from './templat/tipe';

export const TEMPLAT: Templat<any>[] = [
  garisBilangan,
  pecahanBatang,
  pecahanLingkaran,
  bangunDatar,
  gridLuas,
  diagramBatang,
  piktogram,
  jamAnalog,
  blokNilaiTempat,
  penggaris,
];

export function cariTemplat(id: string): Templat<any> | undefined {
  return TEMPLAT.find((t) => t.id === id);
}

export interface HasilGambar {
  gambar: Gambar;
  lingkup: Lingkup;
  svg: string;
}

/**
 * Bangkitkan gambar dan variabel hitungnya dari parameter soal. Melempar GalatTemplat bila tidak sah.
 * Teks alternatif selalu dihitung dari parameter, bukan dari tulisan model, agar sesuai gambar.
 */
export function bangkitkanGambar(g: GambarSoal): HasilGambar {
  const t = cariTemplat(g.templat);
  if (!t) throw new GalatTemplat(`Templat gambar tidak dikenal: ${g.templat}`);
  const p = t.baca(g.parameter ?? {});
  const gambar = t.gambar(p);
  return { gambar, lingkup: t.lingkup(p), svg: keSvg(gambar) };
}

export { GalatTemplat };
