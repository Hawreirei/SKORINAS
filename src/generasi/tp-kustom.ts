import { db } from '../db/skema';
import type { ParameterPaket, TpDipakai, TpKustom } from '../db/tipe';
import { sekarang, uuid } from '../db/util';

/**
 * Simpan TP yang ditulis guru sebagai TP kustom berversi.
 * Rumusan sama dipakai ulang; rumusan berubah pada TP yang sudah tersimpan membuat versi baru,
 * sehingga soal lama tetap menunjuk versi yang dipakainya.
 */
export async function simpanTpKustom(p: ParameterPaket): Promise<TpDipakai[]> {
  const hasil: TpDipakai[] = [];
  for (const tp of p.tp) {
    if (tp.sumber === 'resmi') {
      hasil.push(tp);
      continue;
    }
    const rumusan = tp.rumusan.trim();
    const kandidat = await db.tp_kustom.where('[mapel+kelas]').equals([p.mapel, p.kelas]).toArray();
    const sama = kandidat.find((k) => k.rumusan === rumusan);
    if (sama) {
      hasil.push({ ...tp, id: sama.id, versi: sama.versi, rumusan });
      continue;
    }
    const lama = tp.id ? await db.tp_kustom.get(tp.id) : undefined;
    const t = sekarang();
    const garis = lama ? await db.tp_kustom.where('garis_id').equals(lama.garis_id).toArray() : [];
    const baru: TpKustom = {
      id: uuid(),
      garis_id: lama?.garis_id ?? uuid(),
      versi: lama ? Math.max(...garis.map((g) => g.versi)) + 1 : 1,
      kurikulum_nama: p.kurikulum_nama,
      kelas: p.kelas,
      mapel: p.mapel,
      rumpun: p.rumpun,
      cp: p.cp,
      rumusan,
      induk_id: tp.induk_id ?? null,
      dibuat_pada: t,
      diubah_pada: t,
    };
    await db.tp_kustom.add(baru);
    hasil.push({ ...tp, id: baru.id, versi: baru.versi, rumusan });
  }
  return hasil;
}
