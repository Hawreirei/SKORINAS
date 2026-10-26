import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { hurufKunci, petaJodoh, teksPembanding } from '../db/tipe';
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
  /** Banyak opsi pilihan ganda yang diatur guru. `wajib` saat dibuat AI (selisih membuat soal dibuat ulang); suntingan guru hanya diberi catatan. */
  opsiPg?: { jumlah: 4 | 5; wajib: boolean } | null;
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

  if (isi.bentuk === 'pilihan_ganda' || isi.bentuk === 'pilihan_ganda_kompleks') {
    const opsi = Object.entries(isi.opsi ?? {}) as [HurufOpsi, string][];
    const jumlahDiharapkan = k.opsiPg?.jumlah ?? (k.kelas >= 10 ? 5 : 4);
    if (opsi.length < 4 || opsi.length > 5) keras.push(`Pilihan ganda harus memiliki 4 atau 5 opsi, bukan ${opsi.length}.`);
    else if (opsi.length !== jumlahDiharapkan) (k.opsiPg?.wajib ? keras : lunak).push(k.opsiPg ? `Paket ini memakai ${jumlahDiharapkan} opsi, bukan ${opsi.length}.` : `Jenjang ini biasanya memakai ${jumlahDiharapkan} opsi.`);

    const polos = opsi.map(([, t]) => teksPolos(t).toLowerCase().replace(/\s+/g, ' ').trim());
    const angka = opsi.map(([, t]) => angkaDariTeks(t, k.lokal));
    for (let i = 0; i < opsi.length; i++)
      for (let j = i + 1; j < opsi.length; j++) {
        // Pada pilihan ganda kompleks, opsi benar justru boleh bernilai sama (mis. 6/8 dan 12/16); yang dilarang hanya teks kembar.
        const sama = polos[i] === polos[j] || (isi.bentuk === 'pilihan_ganda' && angka[i] !== null && angka[j] !== null && samaNilai(angka[i]!, angka[j]!));
        if (sama) keras.push(`Opsi ${opsi[i][0]} dan ${opsi[j][0]} sama.`);
      }
    for (const [h, t] of opsi) if (OPSI_TERLARANG.test(teksPolos(t))) keras.push(`Opsi ${h} memakai pola "semua benar" atau gabungan opsi.`);

    const panjang = opsi.map(([, t]) => teksPolos(t).length);
    const iKunci = isi.bentuk === 'pilihan_ganda' ? opsi.findIndex(([h]) => h === isi.kunci) : -1;
    if (iKunci >= 0 && opsi.length > 1) {
      const lain = panjang.filter((_, i) => i !== iKunci);
      const rata = lain.reduce((a, b) => a + b, 0) / lain.length;
      if (panjang[iKunci] >= 15 && panjang[iKunci] > rata * 1.6) lunak.push('Opsi kunci jauh lebih panjang dari pengecoh; panjang opsi kurang seimbang.');
    }
  }

  if (isi.bentuk === 'pilihan_ganda_kompleks') {
    const kunci = hurufKunci(isi.kunci);
    const jumlahOpsi = Object.keys(isi.opsi ?? {}).length;
    if (kunci.length < 2 || kunci.length >= jumlahOpsi || kunci.some((h) => !isi.opsi?.[h])) keras.push('Pilihan ganda kompleks harus memiliki sedikitnya dua jawaban benar dan satu opsi salah.');
  }

  if (isi.bentuk === 'menjodohkan' && isi.pasangan) {
    const peta = petaJodoh(isi.kunci, isi.pasangan.kiri.length);
    if (isi.pasangan.kiri.length < 2 || isi.pasangan.kanan.length < isi.pasangan.kiri.length) keras.push('Kolom kanan harus sedikitnya sama banyak dengan kolom kiri.');
    if (peta.some((j) => j < 0 || j >= isi.pasangan!.kanan.length) || new Set(peta).size !== peta.length) keras.push('Kunci harus memasangkan setiap butir kolom kiri dengan satu huruf kolom kanan yang berbeda.');
    for (const [nama, daftar] of [
      ['kiri', isi.pasangan.kiri],
      ['kanan', isi.pasangan.kanan],
    ] as const) {
      const polos = daftar.map((t) => teksPolos(t).toLowerCase().replace(/\s+/g, ' ').trim());
      if (new Set(polos).size !== polos.length) keras.push(`Ada butir kolom ${nama} yang sama.`);
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
  for (const lain of k.pokokLain) tertinggi = Math.max(tertinggi, kemiripan(teksPembanding(isi), lain));
  if (tertinggi >= AMBANG_KEMIRIPAN) keras.push(`Terlalu mirip dengan soal lain dalam paket (${Math.round(tertinggi * 100)}%).`);

  return { keras, lunak };
}
