import { db } from './skema';

export const MASA_SAMPAH_MS = 30 * 24 * 60 * 60 * 1000;

/** Kosongkan paket dan soal yang dihapus lebih dari 30 hari lalu. */
export async function kosongkanSampahLama(kini = Date.now()): Promise<number> {
  const batas = kini - MASA_SAMPAH_MS;
  const paketLama = await db.paket_soal.filter((p) => p.dihapus_pada != null && p.dihapus_pada < batas).toArray();
  const soalLama = await db.soal.filter((s) => s.dihapus_pada != null && s.dihapus_pada < batas).toArray();
  const idPaket = paketLama.map((p) => p.id);
  await db.transaction('rw', [db.paket_soal, db.soal, db.soal_gambar, db.pekerjaan_generasi], async () => {
    for (const id of idPaket) {
      const ids = await db.soal.where('paket_id').equals(id).primaryKeys();
      await db.soal_gambar.where('soal_id').anyOf(ids).delete();
      await db.soal.bulkDelete(ids);
      await db.pekerjaan_generasi.where('paket_id').equals(id).delete();
    }
    await db.paket_soal.bulkDelete(idPaket);
    const idSoal = soalLama.map((s) => s.id);
    await db.soal_gambar.where('soal_id').anyOf(idSoal).delete();
    await db.soal.bulkDelete(idSoal);
  });
  return paketLama.length + soalLama.length;
}
