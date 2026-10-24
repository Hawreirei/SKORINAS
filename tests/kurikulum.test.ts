import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { BerkasMapel, IndeksKurikulum } from '../src/kurikulum/tipe';
import { nilaiTp } from '../src/kurikulum/pemeriksa-tp';
import { uraiCsv } from '../scripts/csv';

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

describe('data kurikulum resmi', () => {
  const indeks = JSON.parse(readFileSync('public/kurikulum/index.json', 'utf8')) as IndeksKurikulum;
  it('memuat Kurikulum Merdeka dengan fase A sampai F', () => {
    const k = indeks.kurikulum.find((x) => x.id === 'merdeka-2024')!;
    expect(k.fase.map((f) => f.kode)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(k.mapel.find((m) => m.kode === 'matematika')?.paket_aktif).toBe(true);
  });
  it('setiap TP Matematika berada pada kelas yang sesuai fasenya dan dapat diterima pemeriksa', () => {
    const berkas = JSON.parse(readFileSync('public/kurikulum/merdeka-2024/matematika.json', 'utf8')) as BerkasMapel;
    for (const f of ['A', 'B', 'C']) expect(berkas.fase[f]?.length).toBe(5);
    const fase = indeks.kurikulum[0].fase;
    for (const [kode, elemen] of Object.entries(berkas.fase)) {
      const info = fase.find((x) => x.kode === kode)!;
      for (const e of elemen)
        for (const tp of e.tp) {
          expect(tp.kelas).toBeGreaterThanOrEqual(info.kelas_dari);
          expect(tp.kelas).toBeLessThanOrEqual(info.kelas_sampai);
          expect(nilaiTp(tp.rumusan).nilai, tp.rumusan).not.toBe('lemah');
        }
    }
  });
  it('pengurai CSV menangani kutip dan koma', () => {
    expect(uraiCsv('a,b\n"x, y","he said ""hi"""\n')).toEqual([{ a: 'x, y', b: 'he said "hi"' }]);
  });
});
