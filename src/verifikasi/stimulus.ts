import type { IsiSoal } from '../db/tipe';
import { panjangStimulus } from '../generasi/variasi';
import { teksPolos } from '../matematika/teks';

/** Hitung kata dan kalimat teks polos pokok soal (rumus dihitung sebagai kata). */
export function ukurPokok(pokok: string): { kata: number; kalimat: number } {
  const teks = teksPolos(pokok).replace(/\s+/g, ' ').trim();
  const kata = teks ? teks.split(' ').filter((k) => /[\p{L}\p{N}]/u.test(k)).length : 0;
  const kalimat = teks
    .split(/(?<=[.!?…:])\s+|\n+/)
    .map((k) => k.trim())
    .filter((k) => k.split(/\s+/).length >= 3).length;
  return { kata, kalimat };
}

/**
 * Pemeriksa stimulus (F-39): soal dari paket berstimulus wajib harus diawali cerita, teks, atau situasi yang cukup
 * panjang (sedikitnya dua kalimat dan batas kata per jenjang) sebelum pertanyaan. Menjodohkan dikecualikan karena
 * pokoknya perintah singkat. Pelanggaran membuat butir dibuat ulang.
 */
export function periksaStimulus(isi: IsiSoal, k: { kelas: number; bahasa: boolean; panjang?: { min: number; maks: number } | null }): string[] {
  if (isi.bentuk === 'menjodohkan') return [];
  const { kata, kalimat } = ukurPokok(isi.pokok);
  const { min } = panjangStimulus(k.kelas, k.bahasa, k.panjang);
  const alasan: string[] = [];
  if (kalimat < 2) alasan.push('Soal harus diawali stimulus (cerita, teks, atau situasi) sedikitnya dua kalimat sebelum pertanyaan.');
  else if (kata < min) alasan.push(`Stimulus terlalu pendek: ${kata} kata, perlu sedikitnya ${min} kata cerita atau bacaan sebelum pertanyaan.`);
  return alasan;
}
