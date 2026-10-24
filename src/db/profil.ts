import { db } from './skema';
import type { Profil } from './tipe';
import { sekarang } from './util';

export const ID_PROFIL = 'utama';

export function profilBawaan(): Profil {
  const t = sekarang();
  return {
    id: ID_PROFIL,
    dibuat_pada: t,
    diubah_pada: t,
    nama: '',
    sekolah: '',
    kop_json: { baris: [], alamat: '' },
    logo_blob: null,
    identitas_siswa: ['Nama', 'Kelas', 'No. absen'],
    tema: 'sistem',
    batas_harian: 200,
    batas_biaya_usd: 1,
    penyedia_utama: null,
    model_utama: null,
    penyedia_cadangan: null,
    model_cadangan: null,
    cadangan_terakhir: null,
    persisten_diminta: false,
  };
}

export async function ambilProfil(): Promise<Profil> {
  const p = await db.profil.get(ID_PROFIL);
  return p ? { ...profilBawaan(), ...p } : profilBawaan();
}

export async function simpanProfil(ubah: Partial<Profil>): Promise<Profil> {
  const lama = await ambilProfil();
  const baru: Profil = { ...lama, ...ubah, id: ID_PROFIL, diubah_pada: sekarang() };
  await db.profil.put(baru);
  return baru;
}
