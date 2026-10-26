import type { IsiSoal, Rumpun, StatusMutu } from '../db/tipe';
import { bangkitkanGambar } from '../gambar';
import { paketUntuk } from '../paket';
import type { Lingkup, Lokal } from './angka';
import { periksaKaidah } from './kaidah';
import type { HasilHitung } from './matematika';

export interface KonteksPeriksa {
  rumpun: Rumpun | null;
  kelas: number;
  fase: string;
  lokal: Lokal;
  literasi: boolean;
  pokokLain: string[];
  gambarDiizinkan: boolean;
  /** Banyak opsi pilihan ganda yang diatur guru (lihat KonteksKaidah). */
  opsiPg?: { jumlah: 4 | 5; wajib: boolean } | null;
}

export interface HasilPeriksa {
  lolos: boolean;
  status_mutu: StatusMutu;
  /** Alasan gagal; dikirim balik ke model saat membuat ulang. */
  alasan: string[];
  /** Catatan mutu untuk guru. */
  catatan: string[];
  hitung: HasilHitung;
  svg: string | null;
}

export function periksaSoal(isi: IsiSoal, k: KonteksPeriksa): HasilPeriksa {
  const alasan: string[] = [];
  const catatan: string[] = [];
  let lingkup: Lingkup = {};
  let svg: string | null = null;
  const paket = paketUntuk(k.rumpun);

  if (isi.gambar) {
    if (!k.gambarDiizinkan) alasan.push('Soal tidak boleh memakai gambar pada paket ini.');
    else if (paket && !paket.templatGambar.includes(isi.gambar.templat)) alasan.push(`Templat ${isi.gambar.templat} tidak tersedia untuk ${paket.nama}.`);
    else {
      try {
        const g = bangkitkanGambar(isi.gambar);
        lingkup = g.lingkup;
        svg = g.svg;
      } catch (e) {
        alasan.push(`Gambar tidak sah: ${(e as Error).message}`);
      }
    }
  }

  let hitung: HasilHitung;
  if (!paket) hitung = { hasil: 'tidak_dapat', alasan: 'Rumpun mapel belum dipilih, sehingga tidak ada pemeriksa jawaban.' };
  else if (!paket.pemeriksa) hitung = { hasil: 'tidak_dapat', alasan: `Pemeriksa otomatis untuk rumpun ${paket.nama} belum tersedia.` };
  else hitung = paket.pemeriksa(isi, k.lokal, lingkup);
  if (hitung.hasil === 'gagal') alasan.push(hitung.alasan);

  const kaidah = periksaKaidah(isi, { kelas: k.kelas, fase: k.fase, lokal: k.lokal, literasi: k.literasi, pokokLain: k.pokokLain, opsiPg: k.opsiPg });
  alasan.push(...kaidah.keras);
  catatan.push(...kaidah.lunak);

  const lolos = alasan.length === 0;
  let status_mutu: StatusMutu;
  if (!lolos) status_mutu = 'ditolak';
  else if (hitung.hasil === 'lolos' && isi.bentuk !== 'uraian' && paket) status_mutu = paket.statusLolos;
  else {
    status_mutu = 'perlu_telaah';
    catatan.unshift(isi.bentuk === 'uraian' ? 'Soal uraian: kunci dan rubrik tidak dicek otomatis.' : hitung.alasan);
  }
  return { lolos, status_mutu, alasan, catatan, hitung, svg };
}
