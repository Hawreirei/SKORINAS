import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { teksPolos } from '../matematika/teks';
import { angkaDariTeks, samaNilai, type Lokal } from './angka';
import { AMBANG_KEMIRIPAN, kemiripan } from './kemiripan';

export interface HasilKaidah {
  /** Pelanggaran yang membuat soal dibuat ulang. */
  keras: string[];
  /** Catatan untuk guru; soal tetap tampil. */
  lunak: string[];
}

export interface KonteksKaidah {
  kelas: number;
  fase: string;
  lokal: Lokal;
  literasi: boolean;
  pokokLain: string[];
}

const OPSI_TERLARANG =
  /semua (jawaban |pilihan |opsi )?(di atas )?(benar|salah)|tidak ada (jawaban |pilihan )?yang benar|all of the above|none of the above|^\s*[A-E]\s*(dan|and|&)\s*[A-E]\s*(benar|correct)?\s*$/i;

/** Rata-rata kata per kalimat yang masih wajar untuk tiap fase. */
const BATAS_KATA_KALIMAT: Record<string, number> = { A: 12, B: 15, C: 18, D: 22, E: 25, F: 25 };

function kalimat(teks: string): string[] {
  return teksPolos(teks)
    .split(/(?<=[.?!])\s+|\n+/)
    .map((k) => k.trim())
    .filter((k) => k.split(/\s+/).length > 1);
}

export function periksaKaidah(isi: IsiSoal, k: KonteksKaidah): HasilKaidah {
  const keras: string[] = [];
  const lunak: string[] = [];

  if (isi.bentuk === 'pilihan_ganda') {
    const opsi = Object.entries(isi.opsi ?? {}) as [HurufOpsi, string][];
    const jumlahDiharapkan = k.kelas >= 10 ? 5 : 4;
    if (opsi.length < 4 || opsi.length > 5) keras.push(`Pilihan ganda harus memiliki 4 atau 5 opsi, bukan ${opsi.length}.`);
    else if (opsi.length !== jumlahDiharapkan) lunak.push(`Jenjang ini biasanya memakai ${jumlahDiharapkan} opsi.`);

    const polos = opsi.map(([, t]) => teksPolos(t).toLowerCase().replace(/\s+/g, ' ').trim());
    const angka = opsi.map(([, t]) => angkaDariTeks(t, k.lokal));
    for (let i = 0; i < opsi.length; i++)
      for (let j = i + 1; j < opsi.length; j++) {
        const sama = polos[i] === polos[j] || (angka[i] !== null && angka[j] !== null && samaNilai(angka[i]!, angka[j]!));
        if (sama) keras.push(`Opsi ${opsi[i][0]} dan ${opsi[j][0]} sama.`);
      }
    for (const [h, t] of opsi) if (OPSI_TERLARANG.test(teksPolos(t))) keras.push(`Opsi ${h} memakai pola "semua benar" atau gabungan opsi.`);

    const panjang = opsi.map(([, t]) => teksPolos(t).length);
    const iKunci = opsi.findIndex(([h]) => h === isi.kunci);
    if (iKunci >= 0 && opsi.length > 1) {
      const lain = panjang.filter((_, i) => i !== iKunci);
      const rata = lain.reduce((a, b) => a + b, 0) / lain.length;
      if (panjang[iKunci] >= 15 && panjang[iKunci] > rata * 1.6) lunak.push('Opsi kunci jauh lebih panjang dari pengecoh; panjang opsi kurang seimbang.');
    }
  }

  if (isi.bentuk === 'benar_salah' && /\?\s*$/.test(teksPolos(isi.pokok))) lunak.push('Soal benar-salah sebaiknya berupa pernyataan, bukan pertanyaan.');

  const daftarKalimat = kalimat(isi.pokok);
  if (daftarKalimat.length) {
    const rata = daftarKalimat.reduce((a, s) => a + s.split(/\s+/).length, 0) / daftarKalimat.length;
    const batas = (BATAS_KATA_KALIMAT[k.fase] ?? 22) * (k.literasi ? 1.5 : 1);
    if (rata > batas) lunak.push(`Kalimat rata-rata ${Math.round(rata)} kata, panjang untuk fase ${k.fase}.`);
  }

  let tertinggi = 0;
  for (const lain of k.pokokLain) tertinggi = Math.max(tertinggi, kemiripan(isi.pokok, lain));
  if (tertinggi >= AMBANG_KEMIRIPAN) keras.push(`Terlalu mirip dengan soal lain dalam paket (${Math.round(tertinggi * 100)}%).`);

  return { keras, lunak };
}
