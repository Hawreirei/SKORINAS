import Dexie, { type EntityTable } from 'dexie';
import type { KunciApi, LogSoal, PaketSoal, ParameterPaket, PekerjaanGenerasi, PemakaianAi, Preset, Profil, Soal, SoalGambar } from './tipe';

/** Lengkapi parameter paket dari versi lama dengan nilai bawaan isian baru. */
export function lengkapiParameter(p: ParameterPaket): ParameterPaket {
  return { ...p, cara_bs: p.cara_bs ?? 'centang' };
}

export class GenSoalDb extends Dexie {
  profil!: EntityTable<Profil, 'id'>;
  kunci_api!: EntityTable<KunciApi, 'penyedia'>;
  preset!: EntityTable<Preset, 'id'>;
  paket_soal!: EntityTable<PaketSoal, 'id'>;
  soal!: EntityTable<Soal, 'id'>;
  soal_gambar!: EntityTable<SoalGambar, 'id'>;
  pekerjaan_generasi!: EntityTable<PekerjaanGenerasi, 'id'>;
  pemakaian_ai!: EntityTable<PemakaianAi, 'id'>;
  log_soal!: EntityTable<LogSoal, 'id'>;

  constructor(nama = 'gensoal') {
    super(nama);
    // Versi 1. Perubahan skema berikutnya: tambah this.version(2) dengan .upgrade(); jangan ubah blok ini.
    this.version(1).stores({
      profil: 'id',
      kunci_api: 'penyedia',
      preset: 'id, nama, terakhir_dipakai',
      paket_soal: 'id, status, dibuat_pada, dihapus_pada',
      soal: 'id, paket_id, status_mutu, status_telaah, dihapus_pada, [paket_id+urutan]',
      soal_gambar: 'id, soal_id',
      pekerjaan_generasi: 'id, paket_id, status',
      pemakaian_ai: 'id, tanggal, model, paket_id',
      log_soal: 'id, soal_id, dibuat_pada',
      tp_kustom: 'id, garis_id, [mapel+kelas]',
    });
    // Versi 2 (rancangan v0.4): aplikasi tidak lagi menyimpan kurikulum, jadi toko tp_kustom dihapus.
    // TP yang dipakai soal sudah tersalin utuh di paket dan soal, sehingga tidak ada yang hilang.
    // Parameter paket dan preset mendapat isian baru cara_bs.
    this.version(2)
      .stores({ tp_kustom: null })
      .upgrade(async (tx) => {
        await tx.table('preset').toCollection().modify((p: Preset) => {
          p.parameter_json = lengkapiParameter(p.parameter_json);
        });
        await tx.table('paket_soal').toCollection().modify((p: PaketSoal) => {
          p.parameter_json = lengkapiParameter(p.parameter_json);
        });
      });
  }
}

export const db = new GenSoalDb();

/** Toko yang ikut berkas .gensoal. kunci_api sengaja tidak ada di sini. */
export const TOKO_CADANGAN = ['profil', 'preset', 'paket_soal', 'soal', 'soal_gambar', 'pekerjaan_generasi', 'pemakaian_ai', 'log_soal'] as const;
export type TokoCadangan = (typeof TOKO_CADANGAN)[number];

/** Toko yang pernah ada di berkas .gensoal versi lama; dilewati saat memulihkan. */
export const TOKO_USANG = ['tp_kustom'] as const;
