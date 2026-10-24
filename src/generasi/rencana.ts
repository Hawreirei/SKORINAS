import type { Bentuk, Kesukaran, Level, ParameterPaket, Slot } from '../db/tipe';
import { uuid } from '../db/util';
import { KATEGORI, bagiKomposisi } from './komposisi';

const LEVEL: Record<Kesukaran, [Level, Level]> = {
  mudah: ['C1', 'C2'],
  sedang: ['C3', 'C4'],
  sulit: ['C5', 'C6'],
};

export const URUTAN_BENTUK: Bentuk[] = ['pilihan_ganda', 'benar_salah', 'isian_singkat', 'uraian'];

/**
 * Rencana butir: kuota per kategori (sisa terbesar), bentuk bergiliran dalam tiap kategori,
 * TP disebar merata, level bergantian dalam pasangan kategorinya.
 * Butir diurutkan per bentuk (PG, B-S, isian, uraian) lalu dari mudah ke sulit.
 */
export function rencanakanSlot(p: Pick<ParameterPaket, 'n' | 'persen' | 'bentuk' | 'tp'>): Slot[] {
  if (p.tp.length === 0) throw new Error('Minimal satu TP.');
  if (p.bentuk.length === 0) throw new Error('Pilih minimal satu bentuk soal.');
  const kuota = bagiKomposisi(p.n, p.persen);
  const bentuk = URUTAN_BENTUK.filter((b) => p.bentuk.includes(b));
  const mentah: Omit<Slot, 'urutan'>[] = [];
  let giliranTp = 0;
  KATEGORI.forEach((k, ki) => {
    for (let i = 0; i < kuota[ki]; i++) {
      mentah.push({
        id: uuid(),
        tp_index: giliranTp++ % p.tp.length,
        kesukaran: k,
        level: LEVEL[k][i % 2],
        bentuk: bentuk[i % bentuk.length],
        status: 'menunggu',
        percobaan: 0,
        pengganti: false,
        galat: null,
        soal_id: null,
      });
    }
  });
  const urutK = (k: Kesukaran) => KATEGORI.indexOf(k);
  mentah.sort((a, b) => URUTAN_BENTUK.indexOf(a.bentuk) - URUTAN_BENTUK.indexOf(b.bentuk) || urutK(a.kesukaran) - urutK(b.kesukaran));
  return mentah.map((s, i) => ({ ...s, urutan: i + 1 }));
}
