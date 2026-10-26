// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { ModelRegistri } from '../src/ai/tipe';
import { bacaDraf, bagiRata, hapusDraf, hitungRencana, KUNCI_DRAF, levelDariPersen, simpanDraf, type MasukanRencana } from '../src/app/rencana-buat';
import { rencanakanSlot } from '../src/generasi/rencana';

const model = (harga: ModelRegistri['harga'], tingkat: ModelRegistri['tingkat'] = 'murah'): ModelRegistri => ({ id: 'm', label: 'M', status: 'stabil', tingkat, harga, golden: { status: 'belum', tanggal: null }, catatan: '' });
const dasar: MasukanRencana = { n: 12, rpm: null, rpd: null, terpakaiHariIni: 0, adaCadangan: false, tokenRata: null, biayaHariIni: 0, batasBiayaUsd: 1 };

describe('panel Rencana', () => {
  it('permintaan n sampai ±1,3n, tanpa waktu dan kuota bila tidak dibatasi', () => {
    const r = hitungRencana(dasar);
    expect([r.permintaanMin, r.permintaanMaks, r.menit, r.sisaKuota, r.kuotaKurang]).toEqual([12, 16, null, null, false]);
  });

  it('waktu dari batas per menit dan kuota dari batas harian', () => {
    const r = hitungRencana({ ...dasar, rpm: 5, rpd: 20, terpakaiHariIni: 12 });
    expect(r.menit).toBe(2);
    expect(r.sisaKuota).toBe(8);
    expect(r.kuotaKurang).toBe(true);
    expect(hitungRencana({ ...dasar, n: 5, rpm: 5 }).menit).toBeNull();
  });

  it('biaya hanya bila harga diketahui; model gratis tanpa harga berbiaya nol', () => {
    expect(hitungRencana({ ...dasar, model: model(null) }).biayaMaks).toBeNull();
    expect(hitungRencana({ ...dasar, model: model(null, 'gratis') }).biayaMaks).toBe(0);
    const r = hitungRencana({ ...dasar, model: model({ masuk: 1, keluar: 4 }), tokenRata: { masuk: 1000, keluar: 500 } });
    // 12 permintaan × (1000 × 1 + 500 × 4) / 1 juta = 0,036; 16 permintaan = 0,048.
    expect(r.biayaMin).toBeCloseTo(0.036);
    expect(r.biayaMaks).toBeCloseTo(0.048);
    expect(r.lewatBatasBiaya).toBe(false);
  });

  it('peringatan bila biaya hari ini ditambah paket ini melewati batas', () => {
    const r = hitungRencana({ ...dasar, model: model({ masuk: 1, keluar: 4 }), tokenRata: { masuk: 1000, keluar: 500 }, biayaHariIni: 0.97 });
    expect(r.lewatBatasBiaya).toBe(true);
    expect(hitungRencana({ ...dasar, model: model(null, 'gratis'), biayaHariIni: 5 }).lewatBatasBiaya).toBe(false);
  });
});

describe('draf layar Buat', () => {
  beforeEach(() => localStorage.clear());
  it('disimpan, dibaca, dan dihapus', () => {
    expect(bacaDraf()).toBeNull();
    simpanDraf({ f: { kelas: 4, mapel: 'Matematika' }, judul: 'X' });
    expect(bacaDraf<{ f: { kelas: number } }>()?.f.kelas).toBe(4);
    hapusDraf();
    expect(localStorage.getItem(KUNCI_DRAF)).toBeNull();
  });
  it('draf rusak dianggap tidak ada', () => {
    localStorage.setItem(KUNCI_DRAF, '{rusak');
    expect(bacaDraf()).toBeNull();
  });
});

describe('nilai awal Pengaturan lanjutan', () => {
  it('bagiRata memberi sisa ke kelompok awal dan jumlahnya tepat', () => {
    expect(bagiRata(10, 3)).toEqual([4, 3, 3]);
    expect(bagiRata(5, 0)).toEqual([]);
  });

  it('levelDariPersen sama dengan sebaran level rencana bawaan', () => {
    for (const [n, persen] of [[20, [30, 50, 20]], [7, [50, 40, 10]], [45, [20, 50, 30]]] as [number, [number, number, number]][]) {
      const slot = rencanakanSlot({ n, persen, bentuk: ['pilihan_ganda'], tp: [{ id: 't', rumusan: 'TP', sumber: 'guru', versi: 1 }] });
      const hitung = Object.fromEntries(['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((l) => [l, slot.filter((s) => s.level === l).length]));
      expect(levelDariPersen(n, persen)).toEqual(hitung);
    }
  });
});
