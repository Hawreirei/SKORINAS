import type { GenSoalDb, TokoCadangan } from './skema';
import { TOKO_CADANGAN } from './skema';

export const FORMAT_CADANGAN = 'gensoal';
export const VERSI_CADANGAN = 1;

export interface BerkasCadangan {
  format: typeof FORMAT_CADANGAN;
  versi: number;
  versi_aplikasi: string;
  dibuat_pada: string;
  data: Partial<Record<TokoCadangan, unknown[]>>;
}

/** Semua data guru kecuali kunci API. */
export async function buatCadangan(db: GenSoalDb, versiAplikasi: string): Promise<BerkasCadangan> {
  const data: BerkasCadangan['data'] = {};
  for (const toko of TOKO_CADANGAN) {
    data[toko] = await db.table(toko).toArray();
  }
  return {
    format: FORMAT_CADANGAN,
    versi: VERSI_CADANGAN,
    versi_aplikasi: versiAplikasi,
    dibuat_pada: new Date().toISOString(),
    data,
  };
}

export function bacaCadangan(teks: string): BerkasCadangan {
  let obj: unknown;
  try {
    obj = JSON.parse(teks);
  } catch {
    throw new Error('Berkas bukan JSON yang sah.');
  }
  const b = obj as Partial<BerkasCadangan>;
  if (!b || b.format !== FORMAT_CADANGAN) throw new Error('Berkas ini bukan cadangan GenSoal.');
  if (typeof b.versi !== 'number' || b.versi > VERSI_CADANGAN) {
    throw new Error('Versi cadangan lebih baru dari aplikasi ini. Perbarui aplikasi lalu coba lagi.');
  }
  if (!b.data || typeof b.data !== 'object') throw new Error('Isi cadangan kosong atau rusak.');
  for (const [toko, baris] of Object.entries(b.data)) {
    if (!(TOKO_CADANGAN as readonly string[]).includes(toko)) throw new Error(`Toko tidak dikenal: ${toko}`);
    if (!Array.isArray(baris)) throw new Error(`Toko ${toko} rusak.`);
  }
  // Kunci API tidak pernah boleh masuk lewat cadangan.
  const data = b.data as Record<string, unknown[]>;
  if ('kunci_api' in data) delete data.kunci_api;
  return b as BerkasCadangan;
}

export function ringkasCadangan(b: BerkasCadangan): Record<string, number> {
  const r: Record<string, number> = {};
  for (const toko of TOKO_CADANGAN) r[toko] = b.data[toko]?.length ?? 0;
  return r;
}

/**
 * mode 'gabung': rekaman dengan id sama ditimpa, sisanya dipertahankan.
 * mode 'ganti': semua data guru (kecuali kunci API) dihapus lebih dulu.
 */
export async function pulihkanCadangan(db: GenSoalDb, b: BerkasCadangan, mode: 'gabung' | 'ganti'): Promise<void> {
  const tabel = TOKO_CADANGAN.map((t) => db.table(t));
  await db.transaction('rw', tabel, async () => {
    for (const toko of TOKO_CADANGAN) {
      const t = db.table(toko);
      if (mode === 'ganti') await t.clear();
      const baris = b.data[toko];
      if (baris?.length) await t.bulkPut(baris);
    }
  });
}

export async function hapusSemuaData(db: GenSoalDb): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
}
