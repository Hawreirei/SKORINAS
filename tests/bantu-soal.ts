import acuan from '../data/golden/matematika-acuan.json';
import type { IsiSoal, PaketSoal, Soal } from '../src/db/tipe';
import { profilBawaan } from '../src/db/profil';

export function paketUji(): PaketSoal {
  return {
    id: 'paket-uji',
    judul: 'Pecahan & bangun datar',
    status: 'siap',
    penyedia: 'gemini',
    model: 'uji',
    dibuat_pada: 0,
    diubah_pada: 0,
    dihapus_pada: null,
    parameter_json: {
      kurikulum_id: 'merdeka-2024',
      kurikulum_nama: 'Kurikulum Merdeka',
      kurikulum_versi: '2024.1',
      kurikulum_dasar: 'BSKAP 032/H/KR/2024',
      kelas: 4,
      fase: 'B',
      mapel: 'Matematika',
      rumpun: 'matematika',
      cp: '',
      tp: [{ id: 'tp1', kode: 'MAT.B.4.BIL.06', rumusan: 'Membandingkan pecahan', sumber: 'resmi', versi: '2024.1' }],
      n: 40,
      persen: [30, 50, 20],
      bentuk: ['pilihan_ganda', 'isian_singkat', 'benar_salah', 'uraian'],
      bahasa: 'id',
      gaya: 'biasa',
      gambar: 'terprogram',
      materi: '',
    },
  };
}

export function soalUji(): Soal[] {
  return (acuan.benar as { id: string; isi: Omit<IsiSoal, 'meta'>; harapan: string }[]).map((b, i) => ({
    id: b.id,
    paket_id: 'paket-uji',
    slot_id: b.id,
    urutan: i + 1,
    tp_id: 'tp1',
    tp: { id: 'tp1', kode: 'MAT.B.4.BIL.06', rumusan: 'Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda & menyamakan penyebut (50%).', sumber: 'resmi', versi: '2024.1' },
    indikator_id: null,
    bentuk: b.isi.bentuk,
    level_kognitif: 'C3',
    kesukaran_rancangan: 'sedang',
    isi_json: { ...(b.isi as IsiSoal), meta: { tp: 'x', indikator: 'Disajikan soal, peserta didik dapat menentukan hasil $\\frac{1}{2}$ dengan tepat_benar.', level: 'C3', kesukaran: 'sedang' } },
    status_mutu: b.harapan as Soal['status_mutu'],
    status_telaah: 'ditelaah_guru',
    catatan_mutu: [],
    sumber_dicek: false,
    terkunci: false,
    versi: 1,
    penyedia: 'gemini',
    model: 'uji',
    biaya_usd: 0,
    dibuat_pada: 0,
    diubah_pada: 0,
    dihapus_pada: null,
  }));
}

export function profilUji() {
  return { ...profilBawaan(), sekolah: 'SD Negeri 1 Contoh & Mandiri', kop_json: { baris: ['Penilaian Sumatif Tengah Semester'], alamat: 'Jl. Merdeka No. 1, Bandung' } };
}
