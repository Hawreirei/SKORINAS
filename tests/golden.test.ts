import { describe, expect, it } from 'vitest';
import acuan from '../data/golden/matematika-acuan.json';
import aritmetika from '../data/golden/matematika-aritmetika.json';
import bentukBaru from '../data/golden/matematika-bentuk-baru.json';
import type { HurufOpsi, IsiSoal } from '../src/db/tipe';
import { faseDariKelas } from '../src/kurikulum/fase';
import { periksaSoal } from '../src/verifikasi';

interface Butir {
  id: string;
  kelas: number;
  harapan?: string;
  isi: Omit<IsiSoal, 'meta'>;
}

function lengkap(b: Butir): IsiSoal {
  return { ...(b.isi as IsiSoal), meta: { tp: 'acuan', indikator: 'Indikator acuan golden set', level: 'C3', kesukaran: 'sedang' } };
}

function periksa(b: Butir, isi = lengkap(b)) {
  return periksaSoal(isi, { rumpun: 'matematika', kelas: b.kelas, fase: faseDariKelas(b.kelas), lokal: 'id', literasi: false, pokokLain: [], gambarDiizinkan: true });
}

const benar = [...(acuan.benar as Butir[]), ...(aritmetika.benar as Butir[]), ...(bentukBaru.benar as unknown as Butir[])];
const salah = [...(acuan.salah as Butir[]), ...(bentukBaru.salah as unknown as Butir[])];

/** Varian salah-kunci yang sengaja dibuat dari tiap butir benar yang dapat dihitung. */
function mutasi(b: Butir): { id: string; isi: IsiSoal }[] {
  const isi = lengkap(b);
  if (b.harapan !== 'terverifikasi_hitung') return [];
  switch (isi.bentuk) {
    case 'pilihan_ganda':
      return (Object.keys(isi.opsi ?? {}) as HurufOpsi[]).filter((h) => h !== isi.kunci).map((h) => ({ id: `${b.id}~${h}`, isi: { ...isi, kunci: h } }));
    case 'pilihan_ganda_kompleks': {
      // Setiap kunci yang berbeda satu huruf dari kunci benar.
      const kunci = new Set(isi.kunci.split(','));
      return (Object.keys(isi.opsi ?? {}) as HurufOpsi[]).map((h) => {
        const k = new Set(kunci);
        if (k.has(h)) k.delete(h);
        else k.add(h);
        return { id: `${b.id}~${h}`, isi: { ...isi, kunci: [...k].sort().join(',') } };
      });
    }
    case 'menjodohkan': {
      // Tukar pasangan butir pertama dengan setiap butir lain.
      const huruf = isi.kunci.split(', ').map((x) => x.split('-')[1]);
      return huruf.slice(1).map((_, i) => {
        const h = [...huruf];
        [h[0], h[i + 1]] = [h[i + 1], h[0]];
        return { id: `${b.id}~${i + 1}`, isi: { ...isi, kunci: h.map((x, j) => `${j + 1}-${x}`).join(', ') } };
      });
    }
    case 'benar_salah':
      return [{ id: `${b.id}~bs`, isi: { ...isi, kunci: isi.kunci === 'B' ? 'S' : 'B' } }];
    case 'isian_singkat': {
      const ganti: Record<string, string> = { '=': '<', '<': '>', '>': '=' };
      const kunci = ganti[isi.kunci] ?? isi.kunci.replace(/\d+/, (d) => String(Number(d) + 1));
      return [{ id: `${b.id}~isian`, isi: { ...isi, kunci } }];
    }
    default:
      return [];
  }
}

describe('golden set Matematika', () => {
  it('memiliki sedikitnya 100 butir acuan', () => {
    expect(benar.length).toBeGreaterThanOrEqual(100);
  });

  it.each(benar.map((b) => [b.id, b] as const))('butir benar %s lolos dengan status yang diharapkan', (_, b) => {
    const h = periksa(b);
    expect(h.alasan, h.alasan.join('; ')).toEqual([]);
    expect(h.lolos).toBe(true);
    expect(h.status_mutu).toBe(b.harapan);
  });

  it.each(salah.map((b) => [b.id, b] as const))('butir salah %s ditolak', (_, b) => {
    const h = periksa(b);
    expect(h.lolos).toBe(false);
    expect(h.status_mutu).toBe('ditolak');
  });

  const mutan = benar.flatMap(mutasi);
  it('menyiapkan banyak varian salah-kunci', () => {
    expect(mutan.length).toBeGreaterThanOrEqual(100);
  });
  it.each(mutan.map((m) => [m.id, m] as const))('varian salah-kunci %s ditolak (100%)', (_, m) => {
    const b = benar.find((x) => m.id.startsWith(x.id + '~'))!;
    const h = periksa(b, m.isi);
    expect(h.lolos).toBe(false);
  });
});
