import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { normalisasiRelasi } from './angka';

/**
 * Sebar kunci pilihan ganda merata dalam paket: pindahkan kunci ke huruf yang paling jarang
 * menjadi kunci, dengan menukar dua opsi. Tidak menyentuh soal yang pembahasannya menyebut huruf
 * opsi atau opsinya berupa tanda perbandingan yang urutannya bermakna.
 */
export function seimbangkanKunci(isi: IsiSoal, terpakai: Partial<Record<HurufOpsi, number>>, acak: () => number = Math.random): IsiSoal {
  if (isi.bentuk !== 'pilihan_ganda' || !isi.opsi) return isi;
  const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
  if (!huruf.includes(isi.kunci as HurufOpsi)) return isi;
  if (isi.pembahasan.some((p) => /\b(opsi|pilihan|jawaban)\s*\(?[A-E]\)?(\b|\.)/i.test(p))) return isi;
  if (huruf.every((h) => normalisasiRelasi(isi.opsi![h] ?? '') !== null)) return isi;
  const minimum = Math.min(...huruf.map((h) => terpakai[h] ?? 0));
  const calon = huruf.filter((h) => (terpakai[h] ?? 0) === minimum);
  const tujuan = calon[Math.floor(acak() * calon.length) % calon.length];
  if (tujuan === isi.kunci) return isi;
  const tukar = <T extends Partial<Record<HurufOpsi, string>> | undefined>(o: T): T => {
    if (!o) return o;
    const baru = { ...o };
    const a = baru[isi.kunci as HurufOpsi];
    baru[isi.kunci as HurufOpsi] = baru[tujuan];
    baru[tujuan] = a;
    return baru;
  };
  return {
    ...isi,
    opsi: tukar(isi.opsi),
    kunci: tujuan,
    terjemahan: isi.terjemahan ? { ...isi.terjemahan, opsi: tukar(isi.terjemahan.opsi) } : isi.terjemahan,
  };
}
