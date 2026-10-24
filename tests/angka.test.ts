import { describe, expect, it } from 'vitest';
import { angkaDariTeks, daftarAngkaDariTeks, evaluasi, keSintaksMathjs, normalisasiRelasi } from '../src/verifikasi/angka';

describe('evaluasi', () => {
  it('menghitung pecahan, LaTeX, dan bilangan campuran', () => {
    expect(evaluasi('3/4 + 1/8')).toBeCloseTo(0.875);
    expect(evaluasi('\\frac{3}{4} + \\frac{1}{8}')).toBeCloseTo(0.875);
    expect(evaluasi('2\\frac{1}{3} \\times 3')).toBeCloseTo(7);
    expect(evaluasi('12 : 4')).toBe(3);
    expect(evaluasi('25%  * 80')).toBe(20);
    expect(evaluasi('2,5 * 2')).toBe(5);
    expect(evaluasi('nilai[2] - nilai[1]', { nilai: [4, 9] })).toBe(5);
  });
  it('menolak fungsi berbahaya dan simbol tak dikenal', () => {
    expect(() => evaluasi('import({}, {})')).toThrow();
    expect(() => evaluasi('createUnit("x")')).toThrow();
    expect(() => evaluasi('y + 2')).toThrow();
  });
  it('mengubah sintaks', () => {
    expect(keSintaksMathjs('$\\frac{1}{2}$')).toBe('((1)/(2))');
  });
});

describe('angkaDariTeks', () => {
  it('membaca format Indonesia', () => {
    expect(angkaDariTeks('Rp12.500')).toBe(12500);
    expect(angkaDariTeks('2,5 kg')).toBe(2.5);
    expect(angkaDariTeks('24 cm')).toBe(24);
    expect(angkaDariTeks('$\\frac{7}{8}$')).toBeCloseTo(0.875);
    expect(angkaDariTeks('2 1/3')).toBeCloseTo(7 / 3);
    expect(angkaDariTeks('1.250.000')).toBe(1250000);
    expect(angkaDariTeks('90°')).toBe(90);
    expect(angkaDariTeks('25%')).toBe(0.25);
  });
  it('membaca format Inggris', () => {
    expect(angkaDariTeks('1,250', 'en')).toBe(1250);
    expect(angkaDariTeks('2.5', 'en')).toBe(2.5);
  });
  it('mengembalikan null untuk kalimat', () => {
    expect(angkaDariTeks('Bagian yang diarsir sama besar')).toBeNull();
    expect(angkaDariTeks('Tidak dapat dibandingkan')).toBeNull();
  });
  it('membaca daftar', () => {
    expect(daftarAngkaDariTeks('$\\frac{2}{3}$, $\\frac{3}{4}$, $\\frac{5}{6}$')).toEqual([2 / 3, 3 / 4, 5 / 6]);
    expect(daftarAngkaDariTeks('$\\frac{2}{3} < \\frac{3}{4} < \\frac{5}{6}$')).toEqual([2 / 3, 3 / 4, 5 / 6]);
  });
  it('mengenali relasi', () => {
    expect(normalisasiRelasi('$<$')).toBe('<');
    expect(normalisasiRelasi('lebih dari')).toBe('>');
    expect(normalisasiRelasi('\\geq')).toBe('>=');
    expect(normalisasiRelasi('apel')).toBeNull();
  });
});
