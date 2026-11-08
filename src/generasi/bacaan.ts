import { GalatAi } from '../ai/galat';
import type { ParameterPaket, Slot } from '../db/tipe';
import { ukurPokok } from '../verifikasi/stimulus';
import { ekstrakJson } from '../verifikasi/skema';
import type { PencatatPercobaan, Pengirim } from './butir';
import { panjangStimulus } from './variasi';

/**
 * Bacaan bersama (F-40): satu cerita atau teks dipakai beberapa soal berurutan, seperti TKA. Slot dikelompokkan saat
 * paket dibuat; bacaan tiap kelompok dibuat sekali lewat permintaan AI tersendiri dan disimpan di pekerjaan, lalu
 * setiap soal anggota hanya menulis pertanyaannya.
 */

/** Bentuk yang tidak dikelompokkan: benar-salah dicetak sebagai satu tabel per bagian, menjodohkan berupa perintah. */
const TANPA_BACAAN = new Set<Slot['bentuk']>(['benar_salah', 'menjodohkan']);

/**
 * Kelompokkan slot berurutan dalam satu bentuk menjadi kelompok berisi `k` soal. Sisa satu soal digabung ke kelompok
 * sebelumnya. Anggota memakai TP dan variasi (tema, tokoh) ketua kelompok agar bacaannya cocok untuk semuanya.
 */
export function kelompokkanBacaan(slot: Slot[], k: number | null | undefined): Slot[] {
  if (!k || k < 2) return slot;
  const hasil = slot.map((s) => ({ ...s }));
  let i = 0;
  let nomor = 0;
  while (i < hasil.length) {
    const bentuk = hasil[i].bentuk;
    let j = i;
    while (j < hasil.length && hasil[j].bentuk === bentuk) j++;
    if (!TANPA_BACAAN.has(bentuk)) {
      const bagian = hasil.slice(i, j);
      const kelompok: Slot[][] = [];
      for (let a = 0; a < bagian.length; a += k) kelompok.push(bagian.slice(a, a + k));
      if (kelompok.length > 1 && kelompok.at(-1)!.length === 1) kelompok[kelompok.length - 2].push(...kelompok.pop()!);
      for (const g of kelompok) {
        if (g.length < 2) continue;
        const id = `bacaan-${++nomor}`;
        const ketua = g[0];
        for (const s of g) {
          s.kelompok = id;
          s.tp_index = ketua.tp_index;
          if (ketua.variasi) s.variasi = ketua.variasi;
        }
      }
    }
    i = j;
  }
  return hasil;
}

export const SISTEM_BACAAN = `Anda penulis bacaan untuk soal asesmen sekolah di Indonesia.
- Keluarkan HANYA satu objek JSON {"bacaan": "..."}. Tanpa teks lain, tanpa pagar kode.
- Bacaan asli, tidak menyalin buku, ujian, atau situs; konteks lokal Indonesia yang bebas stereotip.
- Bacaan memuat cukup informasi, data, dan detail untuk beberapa soal yang berbeda (informasi tersurat, simpulan, dan penilaian).
- Pisahkan paragraf dengan baris baru (\\n). Rumus sebaris di antara $...$. Jangan menulis soal atau pertanyaan.`;

/** Isi permintaan bacaan untuk satu kelompok. */
export function pesanBacaan(p: ParameterPaket, slot: Slot, banyakSoal: number): string {
  const tp = p.tp[slot.tp_index];
  const bahasa = p.rumpun === 'bahasa';
  const { sasaran } = panjangStimulus(p.kelas, bahasa, p.panjang_stimulus);
  // Bacaan bersama lebih panjang dari stimulus satu soal karena dipakai beberapa soal.
  const kata: [number, number] = bahasa || p.panjang_stimulus ? sasaran : [sasaran[0] * 2, sasaran[1] * 2];
  const v = slot.variasi;
  const baris = [
    `Kelas ${p.kelas}, mata pelajaran ${p.mapel}.`,
    `Bacaan untuk ${banyakSoal} soal tentang: ${tp.rumusan}.`,
    bahasa ? `Bentuk bacaan sesuai jenis teks tersebut, sekitar ${kata[0]}–${kata[1]} kata.` : `Bentuk bacaan: cerita atau situasi nyata yang memuat data (angka, tabel sebagai daftar singkat, atau keadaan) sekitar ${kata[0]}–${kata[1]} kata.`,
    p.konteks?.trim() ? `Konteks yang diminta guru: ${p.konteks.trim()}.` : v ? `Tema: ${v.tema}.` : '',
    v ? `Tokoh utama bernama ${v.tokoh}.` : '',
    p.bahasa === 'en' ? 'Write the text in English.' : p.bahasa === 'lain' && p.bahasa_lain.trim() ? `Tulis dalam bahasa ${p.bahasa_lain.trim()}.` : 'Tulis dalam bahasa Indonesia baku sesuai jenjang.',
    ...(p.aturan_tambahan ?? []).slice(0, 20).map((a) => `Aturan guru: ${a}`),
  ].filter(Boolean);
  return baris.map((b) => `- ${b}`).join('\n');
}

/** Baca dan periksa keluaran bacaan; melempar Error berisi alasan bila tidak sah. */
export function bacaBacaan(teks: string, p: Pick<ParameterPaket, 'kelas' | 'rumpun'> & Partial<Pick<ParameterPaket, 'panjang_stimulus'>>): string {
  const o = ekstrakJson(teks) as Record<string, unknown> | null;
  const bacaan = typeof o?.bacaan === 'string' ? o.bacaan.trim() : '';
  const { min } = panjangStimulus(p.kelas, p.rumpun === 'bahasa', p.panjang_stimulus);
  const { kata, kalimat } = ukurPokok(bacaan);
  if (!bacaan) throw new Error('Keluaran harus {"bacaan": "..."}.');
  if (kalimat < 3 || kata < min * 1.5) throw new Error(`Bacaan terlalu pendek: ${kata} kata, perlu sedikitnya ${Math.ceil(min * 1.5)} kata.`);
  return bacaan;
}

/**
 * Buat bacaan satu kelompok: sampai tiga percobaan. Galat penyedia (batas, kunci, jaringan) diteruskan apa adanya agar
 * pengatur menanganinya seperti galat butir. Setiap percobaan dicatat sebagai pemakaian (tidak lolos sebagai soal).
 */
export async function buatBacaan(kirim: Pengirim, p: ParameterPaket, slot: Slot, banyakSoal: number, signal?: AbortSignal, catat?: PencatatPercobaan): Promise<string> {
  let alasan = '';
  for (let i = 0; i < 3; i++) {
    const pesan = pesanBacaan(p, slot, banyakSoal) + (alasan ? `\n\nPercobaan sebelumnya ditolak: ${alasan}` : '');
    const j = await kirim(SISTEM_BACAAN, pesan, signal);
    try {
      const bacaan = bacaBacaan(j.teks, p);
      await catat?.({ jawaban: j, alasan: [], isi: null }, false);
      return bacaan;
    } catch (e) {
      alasan = (e as Error).message;
      await catat?.({ jawaban: j, alasan: [alasan], isi: null }, false);
    } finally {
      j.lepas?.();
    }
  }
  throw new GalatAi('lain', `Bacaan bersama gagal dibuat: ${alasan}`);
}
