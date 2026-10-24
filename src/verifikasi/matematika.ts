import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { angkaDariTeks, daftarAngkaDariTeks, evaluasi, normalisasiRelasi, samaNilai, ujiRelasi, type Lingkup, type Lokal } from './angka';

export type HasilHitung = { hasil: 'lolos' | 'gagal' | 'tidak_dapat'; alasan: string };

const lolos = (alasan: string): HasilHitung => ({ hasil: 'lolos', alasan });
const gagal = (alasan: string): HasilHitung => ({ hasil: 'gagal', alasan });

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
}

function hitung(e: string, lingkup: Lingkup): number {
  try {
    return evaluasi(e, lingkup);
  } catch (g) {
    throw new Error(`Ekspresi "${e}" tidak dapat dihitung: ${(g as Error).message}`);
  }
}

function opsiLain(isi: IsiSoal): [HurufOpsi, string][] {
  return (Object.entries(isi.opsi ?? {}) as [HurufOpsi, string][]).filter(([h]) => h !== isi.kunci);
}

function samaDaftar(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => samaNilai(x, b[i]));
}

/**
 * Pemeriksa rumpun Matematika: hitung ulang dengan mathjs lalu bandingkan dengan kunci.
 * Model hanya menulis instruksi pemeriksaan; hasilnya ditentukan kode ini.
 */
export function periksaHitung(isi: IsiSoal, lokal: Lokal, lingkup: Lingkup = {}): HasilHitung {
  const v = isi.verifikasi;
  try {
    switch (v.tipe) {
      case 'tidak_ada':
        return { hasil: 'tidak_dapat', alasan: v.alasan || 'Soal tidak dapat dihitung ulang otomatis.' };

      case 'ekspresi': {
        const h = hitung(v.ekspresi, lingkup);
        const klaim = hitung(v.nilai, lingkup);
        if (isi.bentuk === 'benar_salah') {
          const benar = samaNilai(h, klaim);
          if ((isi.kunci === 'B') !== benar) return gagal(`Pernyataan ${benar ? 'benar' : 'salah'} (${v.ekspresi} = ${fmt(h)}), tetapi kunci ${isi.kunci}.`);
          return lolos(`${v.ekspresi} = ${fmt(h)}; pernyataan ${benar ? 'benar' : 'salah'}.`);
        }
        if (!samaNilai(h, klaim)) return gagal(`Hitung ulang ${v.ekspresi} = ${fmt(h)}, bukan ${v.nilai}.`);
        if (isi.bentuk === 'pilihan_ganda') {
          const teksKunci = isi.opsi?.[isi.kunci as HurufOpsi] ?? '';
          const nk = angkaDariTeks(teksKunci, lokal);
          if (nk === null) return gagal(`Opsi kunci ${isi.kunci} ("${teksKunci}") bukan bilangan, tidak dapat dibandingkan.`);
          if (!samaNilai(nk, h)) return gagal(`Opsi kunci ${isi.kunci} bernilai ${fmt(nk)}, padahal hasil hitung ${fmt(h)}.`);
          for (const [huruf, teks] of opsiLain(isi)) {
            const n = angkaDariTeks(teks, lokal);
            if (n !== null && samaNilai(n, h)) return gagal(`Opsi ${huruf} juga bernilai ${fmt(h)}; ada dua jawaban benar.`);
          }
          return lolos(`${v.ekspresi} = ${fmt(h)} sama dengan opsi ${isi.kunci}.`);
        }
        if (isi.bentuk === 'isian_singkat') {
          const nk = angkaDariTeks(isi.kunci, lokal);
          if (nk === null) return gagal(`Kunci isian "${isi.kunci}" bukan bilangan.`);
          if (!samaNilai(nk, h)) return gagal(`Kunci isian bernilai ${fmt(nk)}, padahal hasil hitung ${fmt(h)}.`);
          return lolos(`${v.ekspresi} = ${fmt(h)} sama dengan kunci.`);
        }
        // uraian: jawaban akhir diperiksa; rubrik tetap ditelaah guru.
        return lolos(`Jawaban akhir ${v.ekspresi} = ${fmt(h)} cocok.`);
      }

      case 'perbandingan': {
        const a = hitung(v.kiri, lingkup);
        const b = hitung(v.kanan, lingkup);
        const relasi = normalisasiRelasi(v.relasi);
        if (!relasi) return gagal(`Relasi "${v.relasi}" tidak dikenal.`);
        const benar = ujiRelasi(a, relasi, b);
        if (isi.bentuk === 'benar_salah') {
          if ((isi.kunci === 'B') !== benar) return gagal(`${v.kiri} ${relasi} ${v.kanan} ${benar ? 'benar' : 'salah'}, tetapi kunci ${isi.kunci}.`);
          return lolos(`${fmt(a)} ${relasi} ${fmt(b)} ${benar ? 'benar' : 'salah'}.`);
        }
        if (!benar) return gagal(`${v.kiri} ${relasi} ${v.kanan} tidak benar (${fmt(a)} dan ${fmt(b)}).`);
        if (isi.bentuk === 'pilihan_ganda') {
          const rk = normalisasiRelasi(isi.opsi?.[isi.kunci as HurufOpsi] ?? '');
          if (!rk) return gagal('Opsi kunci bukan tanda perbandingan.');
          if (!ujiRelasi(a, rk, b)) return gagal(`Opsi kunci (${rk}) tidak berlaku untuk ${fmt(a)} dan ${fmt(b)}.`);
          for (const [huruf, teks] of opsiLain(isi)) {
            const r = normalisasiRelasi(teks);
            if (r && ujiRelasi(a, r, b)) return gagal(`Opsi ${huruf} (${r}) juga benar; ada dua jawaban benar.`);
          }
          return lolos(`${fmt(a)} ${rk} ${fmt(b)}.`);
        }
        if (isi.bentuk === 'isian_singkat') {
          const rk = normalisasiRelasi(isi.kunci);
          if (rk && !ujiRelasi(a, rk, b)) return gagal(`Kunci isian (${rk}) tidak berlaku.`);
          if (!rk) {
            const nk = angkaDariTeks(isi.kunci, lokal);
            if (nk === null || !(samaNilai(nk, a) || samaNilai(nk, b))) return gagal('Kunci isian tidak cocok dengan perbandingan.');
          }
        }
        return lolos(`${fmt(a)} ${relasi} ${fmt(b)}.`);
      }

      case 'urutan': {
        const nilai = v.nilai.map((x) => hitung(x, lingkup));
        const terurut = nilai.every((x, i) => i === 0 || (v.arah === 'naik' ? x > nilai[i - 1] && !samaNilai(x, nilai[i - 1]) : x < nilai[i - 1] && !samaNilai(x, nilai[i - 1])));
        if (isi.bentuk === 'benar_salah') {
          if ((isi.kunci === 'B') !== terurut) return gagal(`Urutan ${terurut ? 'benar' : 'salah'}, tetapi kunci ${isi.kunci}.`);
          return lolos(`Urutan ${terurut ? 'benar' : 'salah'}.`);
        }
        if (!terurut) return gagal(`Nilai ${nilai.map(fmt).join(', ')} tidak terurut ${v.arah}.`);
        const teksKunci = isi.bentuk === 'pilihan_ganda' ? isi.opsi?.[isi.kunci as HurufOpsi] ?? '' : isi.kunci;
        const dk = daftarAngkaDariTeks(teksKunci, lokal);
        if (!dk) return gagal('Kunci bukan daftar bilangan.');
        if (!samaDaftar(dk, nilai)) return gagal('Urutan pada kunci berbeda dengan hasil hitung.');
        if (isi.bentuk === 'pilihan_ganda') {
          for (const [huruf, teks] of opsiLain(isi)) {
            const d = daftarAngkaDariTeks(teks, lokal);
            if (d && samaDaftar(d, nilai)) return gagal(`Opsi ${huruf} juga berisi urutan yang benar.`);
          }
        }
        return lolos(`Urutan ${v.arah} ${nilai.map(fmt).join(', ')} cocok.`);
      }
    }
  } catch (g) {
    return gagal((g as Error).message);
  }
}
