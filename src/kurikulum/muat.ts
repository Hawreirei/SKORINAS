import type { BerkasMapel, IndeksKurikulum, KurikulumResmi, MapelResmi } from './tipe';

// Data kurikulum resmi selalu dibaca dari JSON di public/kurikulum (di-cache oleh PWA), tidak pernah ditulis di kode.

let indeks: Promise<IndeksKurikulum> | null = null;
const berkas = new Map<string, Promise<BerkasMapel>>();

async function ambilJson<T>(jalur: string): Promise<T> {
  const r = await fetch(`${import.meta.env.BASE_URL}kurikulum/${jalur}`);
  if (!r.ok) throw new Error(`Gagal memuat data kurikulum (${r.status}).`);
  return (await r.json()) as T;
}

export function muatIndeks(): Promise<IndeksKurikulum> {
  indeks ??= ambilJson<IndeksKurikulum>('index.json').catch((e) => {
    indeks = null;
    throw e;
  });
  return indeks;
}

export function muatBerkasMapel(m: MapelResmi): Promise<BerkasMapel> | null {
  if (!m.berkas) return null;
  let p = berkas.get(m.berkas);
  if (!p) {
    p = ambilJson<BerkasMapel>(m.berkas).catch((e) => {
      berkas.delete(m.berkas!);
      throw e;
    });
    berkas.set(m.berkas, p);
  }
  return p;
}

export function faseUntukKelas(k: KurikulumResmi, kelas: number): string {
  return k.fase.find((f) => kelas >= f.kelas_dari && kelas <= f.kelas_sampai)?.kode ?? '?';
}

export function mapelUntukFase(k: KurikulumResmi, fase: string): MapelResmi[] {
  return k.mapel.filter((m) => m.fase.includes(fase));
}
