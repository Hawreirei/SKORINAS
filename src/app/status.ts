import type { JenisGalatAi } from '../ai/galat';
import type { PaketSoal } from '../db/tipe';
import type { NadaPemberitahuan } from '../komponen/Formulir';

/**
 * Satu peta status paket untuk semua layar (rancangan UI v0.5, UI-03). Tidak ada status per soal (v0.5).
 * Warna diambil dari nada `Pemberitahuan`, yang kontrasnya diuji di mode terang dan gelap.
 */
export type StatusPaket = 'membuat' | 'menunggu' | 'dijeda' | 'perhatian' | 'siap';

export const STATUS_PAKET: Record<StatusPaket, { label: string; nada: NadaPemberitahuan }> = {
  membuat: { label: 'Sedang dibuat', nada: 'info' },
  menunggu: { label: 'Menunggu batas penyedia', nada: 'awas' },
  dijeda: { label: 'Dijeda', nada: 'awas' },
  perhatian: { label: 'Perlu perhatian', nada: 'galat' },
  siap: { label: 'Siap diunduh', nada: 'berhasil' },
};

/** Keadaan pengatur generasi di tab ini; hanya berlaku bila `paketId` sama. */
export interface KeadaanPengatur {
  paketId: string | null;
  berjalan: boolean;
  menunggu: { alasan: string } | null;
  jenisGalat: JenisGalatAi | null;
}

export interface MasukanStatus {
  paketId: string;
  status: PaketSoal['status'];
  /** Jumlah slot yang gagal dibuat setelah dicoba ulang. */
  gagal: number;
  /** Galat terakhir pekerjaan pembuatan yang tersimpan di IndexedDB. */
  galat: string | null;
  pengatur?: KeadaanPengatur | null;
}

/**
 * Galat yang perlu tindakan guru (kunci, model, jaringan, server). Jeda karena kuota atau batas,
 * jeda manual, dan tab tertutup cukup ditunggu atau dilanjutkan. Jenis galat dari pengatur
 * didahulukan; galat lama di IndexedDB hanya menyimpan pesannya.
 */
export function galatPerluTindakan(galat: string | null, jenis?: JenisGalatAi | null): boolean {
  if (jenis) return jenis !== 'batas' && jenis !== 'dibatalkan';
  if (!galat) return false;
  return !/kuota|batas|tab ditutup/i.test(galat);
}

/** "Menjaga batas n permintaan per menit" adalah jeda yang diatur GenSoal sendiri: pembuatan tetap berjalan normal. */
export function menungguPenyedia(menunggu: { alasan: string } | null | undefined): boolean {
  return !!menunggu && !menunggu.alasan.startsWith('Menjaga');
}

export function statusPaket(m: MasukanStatus): StatusPaket {
  const p = m.pengatur && m.pengatur.paketId === m.paketId ? m.pengatur : null;
  if (p?.berjalan) return menungguPenyedia(p.menunggu) ? 'menunggu' : 'membuat';
  // Tersimpan "membuat" tanpa pengatur di tab ini: dibuat di tab lain, atau sedang menyimpan soal terakhir.
  if (m.status === 'membuat') return 'membuat';
  if (m.status === 'dijeda') return galatPerluTindakan(m.galat, p?.jenisGalat) ? 'perhatian' : 'dijeda';
  return m.gagal > 0 ? 'perhatian' : 'siap';
}
