import type { Bentuk, PaketSoal, Profil, Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL, STATUS_MUTU_LABEL } from '../db/tipe';
import { bangkitkanGambar } from '../gambar';
import type { Gambar } from '../gambar/primitif';
import { teksPolos } from '../matematika/teks';
import { paketUntuk } from '../paket';
import { URUTAN_BENTUK } from '../generasi/rencana';

export interface OpsiEkspor {
  kop: boolean;
  kunci: boolean;
  kisi: boolean;
  pembahasan: boolean;
}

export interface ButirDok {
  nomor: number;
  soal: Soal;
  gambar: Gambar | null;
  svg: string | null;
  /** Soal pendek tanpa gambar: boleh dua kolom. */
  sederhana: boolean;
  /** Soal cerita atau uraian: kotak jawaban di bawah soal. */
  kotakJawaban: boolean;
  opsiPendek: boolean;
  /** Panjang opsi terpanjang (huruf polos), dasar tata letak opsi. */
  panjangOpsi: number;
}

/** Banyak opsi per baris: semua dalam satu baris bila pendek, dua per baris bila sedang, satu per baris bila panjang. */
export function opsiPerBaris(b: ButirDok, jumlahOpsi: number): number {
  if (b.sederhana) return b.panjangOpsi <= 10 ? 2 : 1;
  return b.panjangOpsi <= 14 ? jumlahOpsi : b.panjangOpsi <= 32 ? 2 : 1;
}

export interface BagianDok {
  bentuk: Bentuk;
  judul: string;
  petunjuk: string;
  butir: ButirDok[];
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
  inggris: boolean;
  kop: { sekolah: string; baris: string[]; alamat: string; logo: string | null } | null;
  identitas: string[];
  bagian: BagianDok[];
  kunci: { nomor: number; teks: string; rubrik?: string[] }[];
  pembahasan: { nomor: number; langkah: string[] }[];
  kisi: BarisKisi[];
  kurikulumLabel: string;
  jejak: string;
  opsi: OpsiEkspor;
}

const JUDUL_BAGIAN: Record<Bentuk, [string, string]> = {
  pilihan_ganda: ['Pilihan Ganda', 'Multiple Choice'],
  benar_salah: ['Benar atau Salah', 'True or False'],
  isian_singkat: ['Isian Singkat', 'Short Answer'],
  uraian: ['Uraian', 'Essay'],
};

const PETUNJUK: Record<Bentuk, [string, string]> = {
  pilihan_ganda: ['Pilihlah satu jawaban yang paling tepat.', 'Choose the one best answer.'],
  benar_salah: ['Tulislah B bila pernyataan benar dan S bila pernyataan salah.', 'Write T if the statement is true and F if it is false.'],
  isian_singkat: ['Isilah titik-titik dengan jawaban yang tepat.', 'Fill in the blanks with the correct answer.'],
  uraian: ['Jawablah pertanyaan berikut dengan langkah yang lengkap.', 'Answer the following questions and show your work.'],
};

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

/** Soal yang menghalangi ekspor: perlu telaah tetapi belum ditelaah guru, atau rumpun risiko tinggi tanpa centang sumber. */
export function penghalangEkspor(paket: PaketSoal, soal: Soal[]): Soal[] {
  const risiko = paketUntuk(paket.parameter_json.rumpun)?.risikoTinggi ?? false;
  return soal.filter((s) => s.status_mutu === 'perlu_telaah' && (s.status_telaah !== 'ditelaah_guru' || (risiko && !s.sumber_dicek)));
}

export function soalUntukEkspor(soal: Soal[]): Soal[] {
  return soal.filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak').sort((a, b) => a.urutan - b.urutan);
}

export function bangunDokumen(paket: PaketSoal, daftarSoal: Soal[], profil: Profil, opsi: OpsiEkspor, versiAplikasi: string): DokumenSoal {
  const p = paket.parameter_json;
  const inggris = p.bahasa === 'en';
  const soal = soalUntukEkspor(daftarSoal);
  let nomor = 0;
  const bagian: BagianDok[] = [];
  for (const bentuk of URUTAN_BENTUK) {
    const daftar = soal.filter((s) => s.bentuk === bentuk);
    if (!daftar.length) continue;
    bagian.push({
      bentuk,
      judul: `${ROMAWI[bagian.length]}. ${JUDUL_BAGIAN[bentuk][inggris ? 1 : 0]}`,
      petunjuk: PETUNJUK[bentuk][inggris ? 1 : 0],
      butir: daftar.map((s) => {
        nomor++;
        let gambar: Gambar | null = null;
        let svg: string | null = null;
        if (s.isi_json.gambar) {
          try {
            const g = bangkitkanGambar(s.isi_json.gambar);
            gambar = g.gambar;
            svg = g.svg;
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
        };
      }),
    });
  }
  const semua = bagian.flatMap((b) => b.butir);
  const versiSoal = soal.length ? `${Math.min(...soal.map((s) => s.versi))}–${Math.max(...soal.map((s) => s.versi))}` : '-';
  const kustom = p.tp.some((t) => t.sumber === 'kustom');
  const kurikulumLabel = kustom
    ? `${p.kurikulum_nama}${p.kurikulum_id === 'kustom' ? '' : ` ${p.kurikulum_versi}`} · TP kurikulum kustom`
    : `${p.kurikulum_nama} ${p.kurikulum_versi}${p.kurikulum_dasar ? ` · ${p.kurikulum_dasar}` : ''}`;
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const jumlahPerluTelaah = soal.filter((s) => s.status_mutu === 'perlu_telaah').length;
  return {
    judul: paket.judul,
    mapel: p.mapel,
    kelas: p.kelas,
    fase: p.fase,
    inggris,
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
      tp_kode: b.soal.tp.kode ?? (b.soal.tp.sumber === 'kustom' ? `kustom v${b.soal.tp.versi}` : ''),
      indikator: b.soal.isi_json.meta.indikator,
      level: b.soal.level_kognitif,
      kesukaran: KESUKARAN_LABEL[b.soal.kesukaran_rancangan],
      bentuk: BENTUK_LABEL[b.soal.bentuk],
      status: STATUS_MUTU_LABEL[b.soal.status_mutu] + (b.soal.status_telaah === 'ditelaah_guru' ? ' · ditelaah guru' : ''),
    })),
    kurikulumLabel,
    jejak: `GenSoal ${versiAplikasi} · versi soal ${versiSoal} · ${kurikulumLabel} · dibuat dengan bantuan AI${jumlahPerluTelaah ? `, ${jumlahPerluTelaah} soal ditelaah guru` : ''} · ${tanggal}`,
    opsi,
  };
}

export function namaBerkas(paket: PaketSoal, ekstensi: string): string {
  const dasar = `${paket.parameter_json.mapel} K${paket.parameter_json.kelas} ${paket.judul}`
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return `${dasar || 'soal'}.${ekstensi}`;
}
