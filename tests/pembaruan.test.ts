import { describe, expect, it } from 'vitest';
import { MASA_AWAL_MS, saatnyaPasang } from '../src/app/pembaruan';

const dasar = { berjalan: false, tersembunyi: false, pindahLayar: false, msSejakMuat: 5 * 60_000 };

describe('pembaruan otomatis aplikasi', () => {
  it('tidak memasang versi baru selama soal sedang dibuat di tab ini', () => {
    expect(saatnyaPasang({ berjalan: true, tersembunyi: true, pindahLayar: true, msSejakMuat: 0 })).toBe(false);
  });

  it('memasang sesaat setelah aplikasi dibuka', () => {
    expect(saatnyaPasang({ ...dasar, msSejakMuat: 3000 })).toBe(true);
    expect(saatnyaPasang({ ...dasar, msSejakMuat: MASA_AWAL_MS + 1 })).toBe(false);
  });

  it('memasang saat guru pindah layar atau tab tidak sedang dilihat', () => {
    expect(saatnyaPasang({ ...dasar, pindahLayar: true })).toBe(true);
    expect(saatnyaPasang({ ...dasar, tersembunyi: true })).toBe(true);
  });

  it('tidak memasang selagi guru sedang bekerja di layar yang sama', () => {
    expect(saatnyaPasang(dasar)).toBe(false);
  });
});
