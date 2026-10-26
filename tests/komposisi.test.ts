import { describe, expect, it } from 'vitest';
import { bagiKomposisi, geserPersen } from '../src/generasi/komposisi';
import { galatKomposisi, rencanakanSlot, sebarKuota } from '../src/generasi/rencana';

describe('bagiKomposisi', () => {
  it('contoh rancangan: 25 soal 30:50:20 menjadi 8, 12, 5', () => {
    expect(bagiKomposisi(25, [30, 50, 20])).toEqual([8, 12, 5]);
  });

  it('jumlah selalu n untuk semua n 5–50 dan semua kombinasi kelipatan 5', () => {
    let kasus = 0;
    for (let n = 5; n <= 50; n++)
      for (let m = 0; m <= 100; m += 5)
        for (let s = 0; s <= 100 - m; s += 5) {
          const h = 100 - m - s;
          const hasil = bagiKomposisi(n, [m, s, h]);
          expect(hasil.reduce((a, b) => a + b, 0)).toBe(n);
          // tiap kategori tidak menyimpang lebih dari satu soal dari nilai mentah
          [m, s, h].forEach((p, i) => expect(Math.abs(hasil[i] - (n * p) / 100)).toBeLessThan(1));
          kasus++;
        }
    expect(kasus).toBe(46 * 231);
  });

  it('seri didahulukan ke kategori yang lebih mudah', () => {
    expect(bagiKomposisi(5, [50, 50, 0])).toEqual([3, 2, 0]);
    expect(bagiKomposisi(10, [35, 35, 30])).toEqual([4, 3, 3]);
  });

  it('menolak persentase yang tidak berjumlah 100', () => {
    expect(() => bagiKomposisi(10, [30, 30, 30])).toThrow();
  });
});

describe('geserPersen', () => {
  it('menjaga total 100 dengan sedang sebagai penyeimbang', () => {
    expect(geserPersen([30, 50, 20], 0, 40)).toEqual([40, 40, 20]);
    expect(geserPersen([30, 50, 20], 2, 30)).toEqual([30, 40, 30]);
    expect(geserPersen([30, 0, 70], 0, 50)).toEqual([50, 0, 50]);
  });
});

describe('rencanakanSlot', () => {
  const tp = [
    { id: 'a', rumusan: 'TP satu', sumber: 'kustom' as const, versi: 1 },
    { id: 'b', rumusan: 'TP dua', sumber: 'kustom' as const, versi: 1 },
  ];
  it('menyebar TP merata dan level sesuai kategori', () => {
    const slot = rencanakanSlot({ n: 20, persen: [30, 50, 20], bentuk: ['pilihan_ganda'], tp });
    expect(slot).toHaveLength(20);
    expect(slot.filter((s) => s.tp_index === 0)).toHaveLength(10);
    for (const s of slot) {
      if (s.kesukaran === 'mudah') expect(['C1', 'C2']).toContain(s.level);
      if (s.kesukaran === 'sedang') expect(['C3', 'C4']).toContain(s.level);
      if (s.kesukaran === 'sulit') expect(['C5', 'C6']).toContain(s.level);
    }
    expect(slot.map((s) => s.urutan)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
  it('mengurutkan per bentuk lalu kesukaran', () => {
    const slot = rencanakanSlot({ n: 12, persen: [40, 40, 20], bentuk: ['uraian', 'pilihan_ganda'], tp });
    const iUraian = slot.findIndex((s) => s.bentuk === 'uraian');
    expect(slot.slice(iUraian).every((s) => s.bentuk === 'uraian')).toBe(true);
  });
});

describe('rencanakanSlot dengan komposisi yang diatur guru', () => {
  const tp = ['TP satu', 'TP dua', 'TP tiga'].map((rumusan, i) => ({ id: String(i), rumusan, sumber: 'guru' as const, versi: 1 }));
  const dasar = { n: 30, persen: [30, 50, 20] as [number, number, number], bentuk: ['pilihan_ganda' as const], tp };
  const hitung = <T,>(xs: T[]) => xs.reduce<Map<T, number>>((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());

  it('memakai jumlah per bentuk persis dan mengurutkan bentuk baru di tempatnya', () => {
    const slot = rencanakanSlot({ ...dasar, jumlah_bentuk: { pilihan_ganda: 15, pilihan_ganda_kompleks: 5, menjodohkan: 2, isian_singkat: 3, uraian: 5 } });
    const n = hitung(slot.map((s) => s.bentuk));
    expect(Object.fromEntries(n)).toEqual({ pilihan_ganda: 15, pilihan_ganda_kompleks: 5, menjodohkan: 2, isian_singkat: 3, uraian: 5 });
    expect([...new Set(slot.map((s) => s.bentuk))]).toEqual(['pilihan_ganda', 'pilihan_ganda_kompleks', 'menjodohkan', 'isian_singkat', 'uraian']);
    // Uraian tidak hanya mendapat soal mudah: kuota disebar selang-seling di sepanjang deret kesukaran.
    expect(new Set(slot.filter((s) => s.bentuk === 'uraian').map((s) => s.kesukaran)).size).toBeGreaterThan(1);
  });

  it('memakai sebaran level C1–C6 persis dengan kesukaran yang sesuai', () => {
    const slot = rencanakanSlot({ ...dasar, sebaran_level: { C1: 3, C2: 5, C3: 8, C4: 8, C5: 4, C6: 2 } });
    expect(Object.fromEntries(hitung(slot.map((s) => s.level)))).toEqual({ C1: 3, C2: 5, C3: 8, C4: 8, C5: 4, C6: 2 });
    for (const s of slot) expect(s.kesukaran).toBe(s.level <= 'C2' ? 'mudah' : s.level <= 'C4' ? 'sedang' : 'sulit');
  });

  it('memakai jumlah per TP persis dan setiap bentuk mendapat lebih dari satu TP', () => {
    const slot = rencanakanSlot({ ...dasar, jumlah_bentuk: { pilihan_ganda: 20, uraian: 10 }, jumlah_tp: [10, 15, 5] });
    expect(Object.fromEntries(hitung(slot.map((s) => s.tp_index)))).toEqual({ 0: 10, 1: 15, 2: 5 });
    expect(new Set(slot.filter((s) => s.bentuk === 'uraian').map((s) => s.tp_index)).size).toBeGreaterThan(1);
  });

  it('tanpa pengaturan, rencana sama dengan cara lama', () => {
    const lama = rencanakanSlot({ ...dasar, bentuk: ['pilihan_ganda', 'uraian'] });
    const baru = rencanakanSlot({ ...dasar, bentuk: ['pilihan_ganda', 'uraian'], jumlah_bentuk: null, sebaran_level: null, jumlah_tp: null });
    const ringkas = (xs: typeof lama) => xs.map((s) => [s.bentuk, s.kesukaran, s.level, s.tp_index]);
    expect(ringkas(baru)).toEqual(ringkas(lama));
  });

  it('menolak jumlah yang tidak sama dengan n', () => {
    expect(galatKomposisi({ ...dasar, jumlah_bentuk: { pilihan_ganda: 10 } })).toHaveLength(1);
    expect(galatKomposisi({ ...dasar, sebaran_level: { C3: 29 } })).toHaveLength(1);
    expect(galatKomposisi({ ...dasar, jumlah_tp: [10, 10] })[0]).toMatch(/daftar TP/);
    expect(() => rencanakanSlot({ ...dasar, jumlah_tp: [10, 10, 11] })).toThrow(/31/);
  });

  it('sebarKuota selang-seling dan jumlahnya tepat', () => {
    expect(sebarKuota([2, 1])).toEqual([0, 1, 0]);
    expect(hitung(sebarKuota([4, 0, 3])).get(1)).toBeUndefined();
  });
});
