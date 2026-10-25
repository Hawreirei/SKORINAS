import type { Bentuk, CaraBenarSalah, PaketSoal, Profil, Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL, STATUS_MUTU_LABEL, jenisUraian } from '../db/tipe';
import { bangkitkanGambar } from '../gambar';
import type { Gambar } from '../gambar/primitif';
import { keSvg } from '../gambar/svg';
import { teksPolos } from '../matematika/teks';
import { URUTAN_BENTUK } from '../generasi/rencana';

export interface OpsiEkspor {
  kop: boolean;
  /** Unduh kunci jawaban sebagai berkas tersendiri. */
  kunci: boolean;
  /** Unduh kisi-kisi sebagai berkas tersendiri. */
  kisi: boolean;
  /** Pembahasan ikut berkas kunci jawaban. */
  pembahasan: boolean;
}

/** Lembar soal, kunci jawaban, dan kisi-kisi selalu menjadi berkas yang terpisah. */
export type JenisBerkas = 'soal' | 'kunci' | 'kisi';

export const JENIS_BERKAS_LABEL: Record<JenisBerkas, string> = { soal: 'Lembar soal', kunci: 'Kunci jawaban', kisi: 'Kisi-kisi' };

/** Berkas yang dibuat untuk satu unduhan, berurutan. */
export function berkasDipilih(opsi: OpsiEkspor): JenisBerkas[] {
  return ['soal', ...(opsi.kunci ? (['kunci'] as const) : []), ...(opsi.kisi ? (['kisi'] as const) : [])];
}

/** Font dokumen Word dan PDF (rancangan v0.4): Times New Roman 12; PDF menanam Liberation Serif yang metriknya sama. */
export const FONT_DOKUMEN = 'Times New Roman';
export const UKURAN_DOKUMEN = 12;
const FONT_SVG_DOKUMEN = "'Times New Roman', 'Liberation Serif', Tinos, serif";

/**
 * Tempat jawaban menurut pakem penulisan soal:
 * isian singkat titik-titik (kotak bila jawabannya angka atau soal cerita), uraian penjelasan garis tulis
 * sebanyak bobotnya (2 sampai 6), uraian hitungan kotak cara pengerjaan dan kotak jawaban akhir.
 * Pilihan ganda dan benar-salah dijawab pada opsi atau tabel, jadi tanpa tempat jawaban terpisah.
 */
export type TempatJawab = { jenis: 'tidak_ada' } | { jenis: 'titik' } | { jenis: 'kotak' } | { jenis: 'garis'; jumlah: number } | { jenis: 'hitungan' };

export interface ButirDok {
  nomor: number;
  soal: Soal;
  gambar: Gambar | null;
  svg: string | null;
  /** Soal pendek tanpa gambar: boleh dua kolom (hanya templat LaTeX). */
  sederhana: boolean;
  /** Soal cerita atau uraian: kotak jawaban di bawah soal (templat LaTeX). */
  kotakJawaban: boolean;
  opsiPendek: boolean;
  /** Panjang opsi terpanjang (huruf polos), dasar tata letak opsi. */
  panjangOpsi: number;
  tempat: TempatJawab;
}

/** Banyak opsi per baris pada templat LaTeX: satu baris bila pendek, dua bila sedang, satu per baris bila panjang. */
export function opsiPerBaris(b: ButirDok, jumlahOpsi: number): number {
  if (b.sederhana) return b.panjangOpsi <= 10 ? 2 : 1;
  return b.panjangOpsi <= 14 ? jumlahOpsi : b.panjangOpsi <= 32 ? 2 : 1;
}

/** Word dan PDF: opsi 2 kolom bila pendek, 1 kolom bila panjang. */
export function kolomOpsi(b: ButirDok): 1 | 2 {
  return b.panjangOpsi <= 30 ? 2 : 1;
}

export interface BagianDok {
  bentuk: Bentuk;
  judul: string;
  petunjuk: string;
  butir: ButirDok[];
}

const ANGKA = /^[\d\s.,:/+\-−%°]+$/;

/** Jawaban berupa bilangan (termasuk pecahan dan satuan pendek)? */
export function jawabanAngka(kunci: string): boolean {
  const s = teksPolos(kunci)
    .replace(/\b(cm|mm|m|km|kg|g|l|ml|jam|menit|detik|rp|°c)\b\.?/gi, '')
    .trim();
  return s.length > 0 && s.length <= 20 && ANGKA.test(s) && /\d/.test(s);
}

/** Jumlah garis tulis uraian penjelasan dari bobot rubrik (skor dalam kurung), dibatasi 2 sampai 6. */
export function jumlahGaris(rubrik: string[] | undefined): number {
  const skor = (rubrik ?? []).map((r) => Number(r.match(/\((\d+)\)\s*$/)?.[1] ?? 1)).reduce((a, b) => a + b, 0);
  return Math.max(2, Math.min(6, skor || (rubrik?.length ?? 0) + 1));
}

function tempatJawab(s: Soal, kata: number): TempatJawab {
  const isi = s.isi_json;
  if (isi.bentuk === 'isian_singkat') return jawabanAngka(isi.kunci) || kata > 25 ? { jenis: 'kotak' } : { jenis: 'titik' };
  if (isi.bentuk === 'uraian') return jenisUraian(isi) === 'hitungan' ? { jenis: 'hitungan' } : { jenis: 'garis', jumlah: jumlahGaris(isi.rubrik) };
  return { jenis: 'tidak_ada' };
}

export interface BarisKisi {
  nomor: number;
  tp: string;
  tp_kode: string;
  indikator: string;
  level: string;
  kesukaran: string;
  bentuk: string;
  status: string;
}

export interface DokumenSoal {
  judul: string;
  mapel: string;
  kelas: number;
  fase: string;
  cp: string;
  inggris: boolean;
  cara_bs: CaraBenarSalah;
  kop: { sekolah: string; baris: string[]; alamat: string; logo: string | null } | null;
  identitas: string[];
  bagian: BagianDok[];
  kunci: { nomor: number; teks: string; rubrik?: string[] }[];
  pembahasan: { nomor: number; langkah: string[] }[];
  kisi: BarisKisi[];
  /** Kelas, mapel, dan sumber TP yang dipakai; dicatat di kisi-kisi. */
  kurikulumLabel: string;
  berkas: JenisBerkas;
  opsi: OpsiEkspor;
}

const JUDUL_BAGIAN: Record<Bentuk, [string, string]> = {
  pilihan_ganda: ['Pilihan Ganda', 'Multiple Choice'],
  benar_salah: ['Benar atau Salah', 'True or False'],
  isian_singkat: ['Isian Singkat', 'Short Answer'],
  uraian: ['Uraian', 'Essay'],
};

/** Satu kalimat petunjuk cara menjawab untuk tiap bagian. */
function petunjukBagian(bentuk: Bentuk, butir: ButirDok[], cara: CaraBenarSalah, en: boolean): string {
  switch (bentuk) {
    case 'pilihan_ganda': {
      const huruf = [...new Set(butir.flatMap((b) => Object.keys(b.soal.isi_json.opsi ?? {})))].sort();
      const daftar = huruf.length > 1 ? `${huruf.slice(0, -1).join(', ')}, ${en ? 'or' : 'atau'} ${huruf.at(-1)}` : huruf.join('');
      return en ? `Choose the one best answer by putting a cross (X) on the letter ${daftar}.` : `Pilihlah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf ${daftar}.`;
    }
    case 'benar_salah':
      return cara === 'lingkari'
        ? en
          ? 'Circle T if the statement is true or F if it is false.'
          : 'Lingkarilah B bila pernyataan benar atau S bila pernyataan salah.'
        : en
          ? 'Put a tick (✓) in the True or False column for each statement.'
          : 'Berilah tanda centang (✓) pada kolom Benar atau Salah untuk setiap pernyataan.';
    case 'isian_singkat': {
      const kotak = butir.some((b) => b.tempat.jenis === 'kotak');
      const titik = butir.some((b) => b.tempat.jenis === 'titik');
      const tempat = kotak && titik ? (en ? 'dotted line or box' : 'titik-titik atau kotak') : kotak ? (en ? 'box' : 'kotak') : en ? 'dotted line' : 'titik-titik';
      return en ? `Write your answer on the ${tempat} provided.` : `Tuliskan jawabanmu pada ${tempat} yang tersedia.`;
    }
    case 'uraian': {
      const garis = butir.some((b) => b.tempat.jenis === 'garis');
      const hitung = butir.some((b) => b.tempat.jenis === 'hitungan');
      if (garis && hitung)
        return en
          ? 'Work clearly. Questions asking for an explanation are answered on the lines. Calculations are done in the box, with the final answer written in the space below it.'
          : 'Kerjakan dengan jelas. Soal yang meminta penjelasan dijawab pada garis. Soal hitungan dikerjakan pada kotak, hasil akhir ditulis pada kolom di bawahnya.';
      if (hitung) return en ? 'Show your working in the box and write the final answer in the space below it.' : 'Kerjakan pada kotak cara pengerjaan, lalu tulis hasil akhir pada kolom di bawahnya.';
      return en ? 'Answer clearly on the lines provided.' : 'Jawablah dengan jelas pada garis yang tersedia.';
    }
  }
}

const ROMAWI = ['A', 'B', 'C', 'D'];

function jumlahKata(teks: string): number {
  return teksPolos(teks).split(/\s+/).filter(Boolean).length;
}

export function teksKunci(s: Soal, inggris: boolean): string {
  const isi = s.isi_json;
  switch (isi.bentuk) {
    case 'pilihan_ganda':
      return `${isi.kunci}. ${isi.opsi?.[isi.kunci as 'A'] ?? ''}`;
    case 'benar_salah':
      return isi.kunci === 'B' ? (inggris ? 'True' : 'Benar') : inggris ? 'False' : 'Salah';
    default:
      return isi.kunci;
  }
}

export function soalUntukEkspor(soal: Soal[]): Soal[] {
  return soal.filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak').sort((a, b) => a.urutan - b.urutan);
}

export function bangunDokumen(paket: PaketSoal, daftarSoal: Soal[], profil: Profil, opsi: OpsiEkspor, berkas: JenisBerkas = 'soal'): DokumenSoal {
  const p = paket.parameter_json;
  const inggris = p.bahasa === 'en';
  const cara = p.cara_bs ?? 'centang';
  const soal = soalUntukEkspor(daftarSoal);
  let nomor = 0;
  const bagian: BagianDok[] = [];
  for (const bentuk of URUTAN_BENTUK) {
    const daftar = soal.filter((s) => s.bentuk === bentuk);
    if (!daftar.length) continue;
    const butir: ButirDok[] = daftar.map((s) => {
      nomor++;
      let gambar: Gambar | null = null;
      let svg: string | null = null;
      if (s.isi_json.gambar) {
        try {
          gambar = bangkitkanGambar(s.isi_json.gambar).gambar;
          // Teks pada gambar memakai font dokumen.
          svg = keSvg(gambar, { font: FONT_SVG_DOKUMEN });
        } catch {
          /* gambar tidak sah sudah ditolak saat verifikasi */
        }
      }
      const kata = jumlahKata(s.isi_json.pokok);
      const panjangOpsi = Math.max(0, ...Object.values(s.isi_json.opsi ?? {}).map((o) => teksPolos(o ?? '').length));
      const opsiPendek = panjangOpsi <= 18;
      return {
        nomor,
        soal: s,
        gambar,
        svg,
        sederhana: bentuk !== 'uraian' && !gambar && kata <= 25 && opsiPendek && !s.isi_json.terjemahan,
        kotakJawaban: bentuk === 'uraian' || (bentuk === 'isian_singkat' && kata > 25),
        opsiPendek,
        panjangOpsi,
        tempat: tempatJawab(s, kata),
      };
    });
    bagian.push({ bentuk, judul: `${ROMAWI[bagian.length]}. ${JUDUL_BAGIAN[bentuk][inggris ? 1 : 0]}`, petunjuk: petunjukBagian(bentuk, butir, cara, inggris), butir });
  }
  const semua = bagian.flatMap((b) => b.butir);
  // Paket dari versi 0.3 masih mencatat kurikulum resminya; paket baru memakai CP dan TP yang ditulis guru.
  const kurikulumLabel = p.kurikulum_nama && p.tp.some((t) => t.sumber === 'resmi') ? `${p.kurikulum_nama} ${p.kurikulum_versi ?? ''}`.trim() : inggris ? "Teacher's learning objectives" : 'CP dan TP dari guru';
  return {
    judul: paket.judul,
    mapel: p.mapel,
    kelas: p.kelas,
    fase: p.fase,
    cp: p.cp,
    inggris,
    cara_bs: cara,
    kop: opsi.kop
      ? { sekolah: profil.sekolah || (inggris ? 'SCHOOL NAME' : 'NAMA SEKOLAH'), baris: profil.kop_json.baris.filter(Boolean), alamat: profil.kop_json.alamat, logo: profil.logo_blob }
      : null,
    identitas: opsi.kop ? profil.identitas_siswa.filter(Boolean) : [],
    bagian,
    kunci: semua.map((b) => ({ nomor: b.nomor, teks: teksKunci(b.soal, inggris), rubrik: b.soal.isi_json.rubrik })),
    pembahasan: semua.map((b) => ({ nomor: b.nomor, langkah: b.soal.isi_json.pembahasan })),
    kisi: semua.map((b) => ({
      nomor: b.nomor,
      tp: b.soal.tp.rumusan,
      tp_kode: b.soal.tp.kode ?? '',
      indikator: b.soal.isi_json.meta.indikator,
      level: b.soal.level_kognitif,
      kesukaran: KESUKARAN_LABEL[b.soal.kesukaran_rancangan],
      bentuk: BENTUK_LABEL[b.soal.bentuk],
      status: STATUS_MUTU_LABEL[b.soal.status_mutu],
    })),
    kurikulumLabel,
    opsi,
    berkas,
  };
}

const AKHIRAN_BERKAS: Record<JenisBerkas, string> = { soal: '', kunci: '-Kunci-Jawaban', kisi: '-Kisi-kisi' };

export function namaBerkas(paket: PaketSoal, ekstensi: string, berkas: JenisBerkas = 'soal'): string {
  const dasar = `${paket.parameter_json.mapel} K${paket.parameter_json.kelas} ${paket.judul}`
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${dasar || 'soal'}${AKHIRAN_BERKAS[berkas]}.${ekstensi}`;
}
