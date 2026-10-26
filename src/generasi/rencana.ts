import type { Bentuk, Kesukaran, Level, ParameterPaket, Slot } from '../db/tipe';
import { BENTUK_LABEL, LEVEL, kesukaranDariLevel } from '../db/tipe';
import { uuid } from '../db/util';
import { KATEGORI, bagiKomposisi } from './komposisi';

const LEVEL_KATEGORI: Record<Kesukaran, [Level, Level]> = {
  mudah: ['C1', 'C2'],
  sedang: ['C3', 'C4'],
  sulit: ['C5', 'C6'],
};

export const URUTAN_BENTUK: Bentuk[] = ['pilihan_ganda', 'pilihan_ganda_kompleks', 'benar_salah', 'menjodohkan', 'isian_singkat', 'uraian'];

export type MasukanRencana = Pick<ParameterPaket, 'n' | 'persen' | 'bentuk' | 'tp'> & Partial<Pick<ParameterPaket, 'jumlah_bentuk' | 'sebaran_level' | 'jumlah_tp'>>;

const jumlah = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Bentuk yang dipakai paket: dari jumlah per bentuk bila diatur, selain itu bentuk yang dicentang. */
export function bentukDipakai(p: Pick<ParameterPaket, 'bentuk'> & Partial<Pick<ParameterPaket, 'jumlah_bentuk'>>): Bentuk[] {
  if (p.jumlah_bentuk) return URUTAN_BENTUK.filter((b) => (p.jumlah_bentuk![b] ?? 0) > 0);
  return URUTAN_BENTUK.filter((b) => p.bentuk.includes(b));
}

/** Masalah komposisi yang membuat rencana tidak dapat disusun; kosong bila sah. */
export function galatKomposisi(p: MasukanRencana): string[] {
  const galat: string[] = [];
  if (p.jumlah_bentuk) {
    const t = jumlah(URUTAN_BENTUK.map((b) => p.jumlah_bentuk![b] ?? 0));
    if (t !== p.n) galat.push(`Jumlah per bentuk soal ${t}, harus sama dengan jumlah soal (${p.n}).`);
  } else if (!p.bentuk.length) galat.push('Pilih minimal satu bentuk soal.');
  if (p.sebaran_level) {
    const t = jumlah(LEVEL.map((l) => p.sebaran_level![l] ?? 0));
    if (t !== p.n) galat.push(`Jumlah per level kognitif ${t}, harus sama dengan jumlah soal (${p.n}).`);
  }
  if (p.jumlah_tp) {
    const t = jumlah(p.jumlah_tp);
    if (p.jumlah_tp.length !== p.tp.length) galat.push('Jumlah soal per TP tidak cocok dengan daftar TP. Atur ulang jumlah per TP.');
    else if (t !== p.n) galat.push(`Jumlah soal per TP ${t}, harus sama dengan jumlah soal (${p.n}).`);
  }
  return galat;
}

/**
 * Sebar kuota menjadi deret indeks sepanjang n yang selang-seling: pada langkah t dipilih indeks dengan
 * kekurangan terbesar terhadap porsinya (kuota × (t+1) / n). Seri didahulukan ke indeks yang lebih kecil.
 */
export function sebarKuota(kuota: number[]): number[] {
  const n = jumlah(kuota);
  const pakai = kuota.map(() => 0);
  const hasil: number[] = [];
  for (let t = 0; t < n; t++) {
    let terbaik = -1;
    let kurang = -Infinity;
    kuota.forEach((k, i) => {
      if (pakai[i] >= k) return;
      const d = (k * (t + 1)) / n - pakai[i];
      if (d > kurang + 1e-9) {
        kurang = d;
        terbaik = i;
      }
    });
    pakai[terbaik]++;
    hasil.push(terbaik);
  }
  return hasil;
}

/**
 * Rencana butir. Bawaan: kuota per kategori kesukaran (sisa terbesar), bentuk bergiliran dalam tiap kategori,
 * TP disebar merata, level bergantian dalam pasangan kategorinya. Bila guru mengatur jumlah per bentuk,
 * per level C1–C6, atau per TP, kuota itu dipakai persis dan disebar selang-seling agar tiap bentuk
 * mendapat campuran level dan TP. Butir diurutkan per bentuk (URUTAN_BENTUK) lalu dari mudah ke sulit.
 */
export function rencanakanSlot(p: MasukanRencana): Slot[] {
  if (p.tp.length === 0) throw new Error('Minimal satu TP.');
  const galat = galatKomposisi(p);
  if (galat.length) throw new Error(galat.join(' '));

  // 1. Deret level dari mudah ke sulit.
  const deretLevel: { kesukaran: Kesukaran; level: Level }[] = [];
  if (p.sebaran_level) {
    for (const l of LEVEL) for (let i = 0; i < (p.sebaran_level[l] ?? 0); i++) deretLevel.push({ kesukaran: kesukaranDariLevel(l), level: l });
  } else {
    const kuota = bagiKomposisi(p.n, p.persen);
    KATEGORI.forEach((k, ki) => {
      for (let i = 0; i < kuota[ki]; i++) deretLevel.push({ kesukaran: k, level: LEVEL_KATEGORI[k][i % 2] });
    });
  }

  // 2. Bentuk per posisi.
  const bentuk = bentukDipakai(p);
  let deretBentuk: Bentuk[];
  if (p.jumlah_bentuk) deretBentuk = sebarKuota(bentuk.map((b) => p.jumlah_bentuk![b] ?? 0)).map((i) => bentuk[i]);
  else {
    // Bergiliran dalam tiap kategori kesukaran.
    const giliran: Partial<Record<Kesukaran, number>> = {};
    deretBentuk = deretLevel.map(({ kesukaran }) => {
      const i = giliran[kesukaran] ?? 0;
      giliran[kesukaran] = i + 1;
      return bentuk[i % bentuk.length];
    });
  }

  // 3. TP per posisi.
  const deretTp: number[] = Array.from({ length: p.n }, (_, i) => i % p.tp.length);
  if (p.jumlah_tp) {
    // Disebar menurut urutan akhir (per bentuk), agar setiap bentuk mendapat campuran TP.
    const urutan = deretLevel.map((_, i) => i).sort((a, b) => URUTAN_BENTUK.indexOf(deretBentuk[a]) - URUTAN_BENTUK.indexOf(deretBentuk[b]) || a - b);
    sebarKuota(p.jumlah_tp).forEach((tp, t) => (deretTp[urutan[t]] = tp));
  }

  const mentah: Omit<Slot, 'urutan'>[] = deretLevel.map((l, i) => ({
    id: uuid(),
    tp_index: deretTp[i],
    kesukaran: l.kesukaran,
    level: l.level,
    bentuk: deretBentuk[i],
    status: 'menunggu',
    percobaan: 0,
    pengganti: false,
    galat: null,
    soal_id: null,
  }));
  const urutK = (k: Kesukaran) => KATEGORI.indexOf(k);
  mentah.sort((a, b) => URUTAN_BENTUK.indexOf(a.bentuk) - URUTAN_BENTUK.indexOf(b.bentuk) || urutK(a.kesukaran) - urutK(b.kesukaran));
  return mentah.map((s, i) => ({ ...s, urutan: i + 1 }));
}

/** Ringkasan bentuk untuk layar, mis. "20 pilihan ganda · 5 uraian" atau "pilihan ganda, uraian". */
export function ringkasBentuk(p: Pick<ParameterPaket, 'bentuk'> & Partial<Pick<ParameterPaket, 'jumlah_bentuk'>>): string {
  const b = bentukDipakai(p);
  if (!b.length) return 'belum ada bentuk soal';
  if (p.jumlah_bentuk) return b.map((x) => `${p.jumlah_bentuk![x]} ${BENTUK_LABEL[x].toLowerCase()}`).join(' · ');
  return b.map((x) => BENTUK_LABEL[x].toLowerCase()).join(', ');
}
