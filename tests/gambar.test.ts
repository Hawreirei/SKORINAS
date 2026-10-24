import { describe, expect, it } from 'vitest';
import { bangkitkanGambar, TEMPLAT } from '../src/gambar';
import { keTikz } from '../src/gambar/tikz';

function jumlahArsir(svg: string): number {
  return (svg.match(/fill="#c9cdd3"/g) ?? []).length;
}

type Kasus = { parameter: Record<string, unknown>; lingkup?: Record<string, unknown>; arsir?: number; gagal?: boolean };

const KASUS: Record<string, Kasus[]> = {
  garis_bilangan: [
    { parameter: { min: 0, maks: 10, langkah: 1, titik: [{ nilai: 7, label: '?' }] }, lingkup: { nilai: 7 } },
    { parameter: { min: 0, maks: 2, langkah: '1/4', titik: [{ nilai: '3/4', label: '?' }] }, lingkup: { nilai: 0.75 } },
    { parameter: { min: -5, maks: 5, langkah: 1, lompatan: [{ dari: -2, ke: 3 }] }, lingkup: { lompatan: [5] } },
    { parameter: { min: 0, maks: 100, langkah: 3 }, gagal: true },
    { parameter: { min: 5, maks: 1, langkah: 1 }, gagal: true },
  ],
  pecahan_batang: [
    { parameter: { penyebut: 8, diarsir: 3 }, lingkup: { pecahan: 3 / 8 }, arsir: 3 },
    { parameter: { penyebut: 4, diarsir: 5, jumlah_batang: 2 }, lingkup: { pecahan: 5 / 4 }, arsir: 5 },
    { parameter: { batang: [{ penyebut: 2, diarsir: 1 }, { penyebut: 4, diarsir: 2 }] }, lingkup: { batang: [0.5, 0.5] }, arsir: 3 },
    { parameter: { penyebut: 3, diarsir: 4 }, gagal: true },
    { parameter: { penyebut: 0, diarsir: 0 }, gagal: true },
  ],
  pecahan_lingkaran: [
    { parameter: { penyebut: 4, diarsir: 3 }, lingkup: { pecahan: 0.75 }, arsir: 3 },
    { parameter: { penyebut: 2, diarsir: 1 }, lingkup: { pecahan: 0.5 }, arsir: 1 },
    { parameter: { penyebut: 6, diarsir: 8, jumlah_lingkaran: 2 }, lingkup: { pecahan: 8 / 6 }, arsir: 8 },
    { parameter: { penyebut: 5, diarsir: 6 }, gagal: true },
    { parameter: { penyebut: 13, diarsir: 1 }, gagal: true },
  ],
  bangun_datar: [
    { parameter: { jenis: 'persegi', sisi: [6] }, lingkup: { luas: 36, keliling: 24 } },
    { parameter: { jenis: 'persegi_panjang', sisi: [12, 5] }, lingkup: { luas: 60, keliling: 34 } },
    { parameter: { jenis: 'segitiga_siku', sisi: [3, 4] }, lingkup: { luas: 6, keliling: 12 } },
    { parameter: { jenis: 'lingkaran', sisi: [7], pi: '22/7' }, lingkup: { luas: 154, keliling: 44 } },
    { parameter: { jenis: 'trapesium', sisi: [10, 6, 4] }, gagal: true },
  ],
  grid_luas: [
    { parameter: { baris: 3, kolom: 5, sel_diarsir: 'semua' }, lingkup: { luas: 15 }, arsir: 15 },
    { parameter: { baris: 4, kolom: 4, sel_diarsir: [[1, 1], [2, 2], [3, 3]] }, lingkup: { luas: 3, total_sel: 16 }, arsir: 3 },
    { parameter: { baris: 2, kolom: 2, sel_diarsir: [[1, 1], [1, 1]] }, lingkup: { luas: 1 }, arsir: 1 },
    { parameter: { baris: 2, kolom: 2, sel_diarsir: [[3, 1]] }, gagal: true },
    { parameter: { baris: 20, kolom: 2, sel_diarsir: [] }, gagal: true },
  ],
  diagram_batang: [
    { parameter: { kategori: ['A', 'B', 'C'], nilai: [2, 4, 6], skala: 2 }, lingkup: { total: 12, maks: 6, min: 2 }, arsir: 3 },
    { parameter: { kategori: ['Sen', 'Sel', 'Rab', 'Kam'], nilai: [6, 8, 4, 10], skala: 2 }, lingkup: { rata: 7 }, arsir: 4 },
    { parameter: { kategori: ['X', 'Y'], nilai: [15, 25], skala: 5 }, lingkup: { nilai: [15, 25] }, arsir: 2 },
    { parameter: { kategori: ['X', 'Y'], nilai: [3, 4], skala: 2 }, lingkup: { nilai: [3, 4] }, arsir: 2 },
    { parameter: { kategori: ['X', 'Y'], nilai: [1] }, gagal: true },
  ],
  piktogram: [
    { parameter: { kategori: ['Apel', 'Jeruk'], jumlah: [3, 5], nilai_per_ikon: 1 }, lingkup: { total: 8 } },
    { parameter: { kategori: ['A', 'B', 'C'], jumlah: [2, 2.5, 4], nilai_per_ikon: 2 }, lingkup: { nilai: [4, 5, 8], total: 17 } },
    { parameter: { kategori: ['A', 'B'], jumlah: [1, 1], nilai_per_ikon: 10, ikon: 'bintang' }, lingkup: { total: 20 } },
    { parameter: { kategori: ['A', 'B'], jumlah: [1.3, 1], nilai_per_ikon: 1 }, gagal: true },
    { parameter: { kategori: ['A'], jumlah: [1], nilai_per_ikon: 1 }, gagal: true },
  ],
  jam_analog: [
    { parameter: { jam: 3, menit: 0 }, lingkup: { total_menit: 180 } },
    { parameter: { jam: 9, menit: 30 }, lingkup: { total_menit: 570 } },
    { parameter: { jam: 14, menit: 45 }, lingkup: { jam: 14, menit: 45 } },
    { parameter: { jam: 24, menit: 0 }, gagal: true },
    { parameter: { jam: 2, menit: 60 }, gagal: true },
  ],
  blok_nilai_tempat: [
    { parameter: { ratusan: 2, puluhan: 3, satuan: 5 }, lingkup: { nilai: 235 } },
    { parameter: { puluhan: 4, satuan: 6 }, lingkup: { nilai: 46 } },
    { parameter: { ratusan: 1 }, lingkup: { nilai: 100 } },
    { parameter: { ratusan: 0, puluhan: 0, satuan: 0 }, gagal: true },
    { parameter: { puluhan: 12 }, gagal: true },
  ],
  penggaris: [
    { parameter: { mulai: 0, panjang_objek: 8 }, lingkup: { panjang: 8, akhir: 8 } },
    { parameter: { mulai: 2, panjang_objek: 7 }, lingkup: { akhir: 9 } },
    { parameter: { mulai: 1, panjang_objek: 4.5 }, lingkup: { akhir: 5.5 } },
    { parameter: { mulai: 1, panjang_objek: 4.55 }, gagal: true },
    { parameter: { mulai: 10, panjang_objek: 25 }, gagal: true },
  ],
};

describe('templat gambar', () => {
  it('sepuluh templat MVP terdaftar dan masing-masing punya lima kasus uji', () => {
    expect(TEMPLAT.map((t) => t.id).sort()).toEqual(Object.keys(KASUS).sort());
    for (const k of Object.values(KASUS)) expect(k.length).toBeGreaterThanOrEqual(5);
  });

  for (const [id, kasus] of Object.entries(KASUS)) {
    describe(id, () => {
      kasus.forEach((k, i) => {
        it(`kasus ${i + 1}${k.gagal ? ' ditolak' : ''}`, () => {
          if (k.gagal) {
            expect(() => bangkitkanGambar({ templat: id, parameter: k.parameter })).toThrow();
            return;
          }
          const h = bangkitkanGambar({ templat: id, parameter: k.parameter });
          expect(h.svg.startsWith('<svg')).toBe(true);
          expect(h.svg).toContain('viewBox="0 0 ');
          expect(h.svg).toContain('<title>');
          expect(h.gambar.alt.length).toBeGreaterThan(10);
          // hitam putih: hanya warna abu dan hitam
          const warna = new Set(h.svg.match(/#[0-9a-f]{6}/gi));
          for (const w of warna) expect(['#0b0c0e', '#ffffff', '#c9cdd3', '#e4e6e9']).toContain(w.toLowerCase());
          for (const [kunci, nilai] of Object.entries(k.lingkup ?? {})) {
            const v = h.lingkup[kunci];
            if (Array.isArray(nilai)) expect(v).toEqual(nilai);
            else expect(v as number).toBeCloseTo(nilai as number, 9);
          }
          if (k.arsir !== undefined) expect(jumlahArsir(h.svg)).toBe(k.arsir);
          const tikz = keTikz(h.gambar);
          expect(tikz).toContain('\\begin{tikzpicture}');
          expect(tikz).toContain('\\end{tikzpicture}');
        });
      });
    });
  }

  it('gambar dan lingkup dibangkitkan dari parameter yang sama (deterministik)', () => {
    const a = bangkitkanGambar({ templat: 'pecahan_batang', parameter: { penyebut: 5, diarsir: 2 } });
    const b = bangkitkanGambar({ templat: 'pecahan_batang', parameter: { penyebut: 5, diarsir: 2 } });
    expect(a.svg).toBe(b.svg);
  });
});
