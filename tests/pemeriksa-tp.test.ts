import { describe, expect, it } from 'vitest';
import { nilaiTp } from '../src/kurikulum/pemeriksa-tp';

describe('pemeriksa kualitas TP', () => {
  it('contoh rancangan: rumusan samar dinilai lemah', () => {
    const h = nilaiTp('Siswa memahami pecahan.');
    expect(h.nilai).toBe('lemah');
  });
  it('contoh rancangan: rumusan jelas dinilai baik dengan level yang dapat ditentukan', () => {
    const h = nilaiTp('Siswa dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya.');
    expect(h.nilai).toBe('baik');
    expect(h.level).toBe('C2');
  });
  it('menandai dua kompetensi', () => {
    const h = nilaiTp('Peserta didik dapat menjumlahkan dan mengurangkan pecahan berpenyebut sama.');
    expect(h.alasan.join(' ')).toMatch(/lebih dari satu kompetensi/);
  });
  it('lingkup materi kosong dinilai lemah', () => {
    expect(nilaiTp('Siswa dapat menghitung.').nilai).toBe('lemah');
  });
});
