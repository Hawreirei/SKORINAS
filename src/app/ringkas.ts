import { db } from '../db/skema';
import type { PaketSoal, Soal } from '../db/tipe';

export interface RingkasanPaket {
  paket: PaketSoal;
  jumlah: number;
  terverifikasi: number;
  perluTelaah: number;
  belumDitelaah: number;
  ditolak: number;
  disetujui: number;
}

export function ringkasPaket(paket: PaketSoal, soal: Soal[]): RingkasanPaket {
  const aktif = soal.filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak');
  return {
    paket,
    jumlah: aktif.length,
    terverifikasi: aktif.filter((s) => s.status_mutu === 'terverifikasi_hitung' || s.status_mutu === 'terverifikasi_aturan').length,
    perluTelaah: aktif.filter((s) => s.status_mutu === 'perlu_telaah').length,
    belumDitelaah: aktif.filter((s) => s.status_mutu === 'perlu_telaah' && s.status_telaah !== 'ditelaah_guru').length,
    ditolak: soal.filter((s) => s.status_mutu === 'ditolak').length,
    disetujui: aktif.filter((s) => s.status_telaah === 'ditelaah_guru').length,
  };
}

export async function daftarRingkasan(batas?: number, terhapus = false): Promise<RingkasanPaket[]> {
  let paket = (await db.paket_soal.orderBy('dibuat_pada').reverse().toArray()).filter((p) => (terhapus ? p.dihapus_pada != null : p.dihapus_pada == null));
  if (batas) paket = paket.slice(0, batas);
  const hasil: RingkasanPaket[] = [];
  for (const p of paket) hasil.push(ringkasPaket(p, await db.soal.where('paket_id').equals(p.id).toArray()));
  return hasil;
}

export function labelStatusPaket(r: RingkasanPaket): { teks: string; isi: boolean } {
  if (r.paket.status === 'membuat') return { teks: `${r.jumlah}/${r.paket.parameter_json.n} soal · Dibuat`, isi: false };
  if (r.paket.status === 'dijeda') return { teks: `${r.jumlah}/${r.paket.parameter_json.n} soal · Dijeda`, isi: false };
  if (r.belumDitelaah) return { teks: `${r.jumlah} soal · Perlu telaah`, isi: false };
  return { teks: `${r.jumlah} soal · Terverifikasi`, isi: true };
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
