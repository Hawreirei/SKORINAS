import { db } from '../db/skema';
import type { PaketSoal, PekerjaanGenerasi, Soal } from '../db/tipe';
import { statusPaket, type KeadaanPengatur, type StatusPaket } from './status';

export interface RingkasanPaket {
  paket: PaketSoal;
  jumlah: number;
  ditolak: number;
  /** Slot yang gagal dibuat setelah dicoba ulang. */
  gagal: number;
  /** Galat terakhir pekerjaan pembuatan. */
  galat: string | null;
}

export function ringkasPaket(paket: PaketSoal, soal: Soal[], kerja?: PekerjaanGenerasi): RingkasanPaket {
  const aktif = soal.filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak');
  return {
    paket,
    jumlah: aktif.length,
    ditolak: soal.filter((s) => s.status_mutu === 'ditolak').length,
    gagal: kerja?.slot.filter((s) => s.status === 'gagal').length ?? 0,
    galat: kerja?.galat ?? null,
  };
}

export async function daftarRingkasan(batas?: number, terhapus = false): Promise<RingkasanPaket[]> {
  let paket = (await db.paket_soal.orderBy('dibuat_pada').reverse().toArray()).filter((p) => (terhapus ? p.dihapus_pada != null : p.dihapus_pada == null));
  if (batas) paket = paket.slice(0, batas);
  const hasil: RingkasanPaket[] = [];
  for (const p of paket) hasil.push(ringkasPaket(p, await db.soal.where('paket_id').equals(p.id).toArray(), await db.pekerjaan_generasi.where('paket_id').equals(p.id).first()));
  return hasil;
}

/** Status paket untuk baris daftar, dari peta pusat (src/app/status.ts). */
export function statusRingkasan(r: RingkasanPaket, pengatur?: KeadaanPengatur | null): StatusPaket {
  return statusPaket({ paketId: r.paket.id, status: r.paket.status, gagal: r.gagal, galat: r.galat, pengatur });
}

/** Jumlah soal di baris daftar; paket yang belum selesai menyebut targetnya. */
export function teksJumlah(r: RingkasanPaket): string {
  if (r.paket.status !== 'siap') return `${r.jumlah} dari ${r.paket.parameter_json.n} soal`;
  return r.gagal ? `${r.jumlah} soal · ${r.gagal} gagal dibuat` : `${r.jumlah} soal`;
}

export function formatTanggal(t: number | null): string {
  if (!t) return 'belum pernah';
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatBiaya(usd: number | null): string {
  if (usd === null) return 'biaya belum diketahui';
  if (usd === 0) return 'gratis';
  return usd < 0.01 ? `< US$0,01` : `US$${usd.toFixed(3).replace('.', ',')}`;
}
