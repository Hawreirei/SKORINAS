import { describe, expect, it } from 'vitest';
import { bagiKomposisi, geserPersen } from '../src/generasi/komposisi';
import { rencanakanSlot } from '../src/generasi/rencana';

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
