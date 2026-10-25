import { db } from '../db/skema';
import { ambilProfil, simpanProfil } from '../db/profil';
import { kosongkanSampahLama } from '../db/sampah';
import { pulihkanPekerjaanTertinggal } from '../generasi/pengatur';

export async function mintaPenyimpananPersisten(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  const ok = await navigator.storage.persist();
  await simpanProfil({ persisten_diminta: true });
  return ok;
}

/** Cermin tema di localStorage, dibaca public/tema.js sebelum render pertama agar tidak berkedip. */
export const KUNCI_CERMIN_TEMA = 'gensoal:tema';

export function terapkanTema(tema: 'sistem' | 'terang' | 'gelap') {
  const gelap = tema === 'gelap' || (tema === 'sistem' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', gelap);
  try {
    localStorage.setItem(KUNCI_CERMIN_TEMA, tema);
  } catch {
    // localStorage dapat ditolak (mode privat); tema tetap dari profil, hanya kedipan yang tidak dicegah.
  }
}

/** Tugas saat aplikasi dibuka: pekerjaan tertinggal, sampah lama, tema, penyimpanan persisten. */
export function mulaiAplikasi() {
  void (async () => {
    try {
      await db.open();
      await pulihkanPekerjaanTertinggal();
      await kosongkanSampahLama();
      const p = await ambilProfil();
      terapkanTema(p.tema);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => terapkanTema((await ambilProfil()).tema));
      if (!p.persisten_diminta && (await db.soal.count()) > 0) await mintaPenyimpananPersisten();
    } catch (e) {
      console.error('Gagal memulai penyimpanan lokal', e);
    }
  })();
}
