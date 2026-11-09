// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { bacaIsianCepat, isianKosong, simpanIsianCepat, terapkanIsianCepat } from '../src/app/isian-buat';
import { bacaDraf, hapusDraf } from '../src/app/rencana-buat';
import { formatUjian, jumlahSoalUjian } from '../src/ujian';

const jumlah = (r: Partial<Record<string, number>> | null) => Object.values(r ?? {}).reduce<number>((a, b) => a + (b ?? 0), 0);

describe('Mulai cepat di beranda dengan format ujian', () => {
  beforeEach(() => hapusDraf());

  it('format ujian mengisi atribut ujiannya seperti di layar Buat', () => {
    const u = formatUjian('tka-sd-matematika')!;
    const f = terapkanIsianCepat(isianKosong(), { ujian: u.id, kelas: u.kelas, mapel: u.mapel, n: jumlahSoalUjian(u) });
    expect(f.ujian?.id).toBe('tka-sd-matematika');
    expect([f.kelas, f.mapel, f.n]).toEqual([6, 'Matematika', jumlahSoalUjian(u)]);
    expect(f.jumlahBentuk).toMatchObject({ pilihan_ganda_kompleks: expect.any(Number) });
    expect(f.opsiPg).toBe(u.opsiPg);
    expect(f.wajibStimulus).toBe(true);
  });

  it('jumlah soal yang diubah guru membagi ulang bentuk dan level format', () => {
    const f = terapkanIsianCepat(isianKosong(), { ujian: 'osnk-smp-matematika', kelas: 8, mapel: 'Matematika', n: 12 });
    expect(f.n).toBe(12);
    expect(jumlah(f.jumlahBentuk)).toBe(12);
    expect(jumlah(f.sebaranLevel)).toBe(12);
  });

  it('mapel pilihan TKA SMA diisi guru, dan "Soal biasa" melepas format', () => {
    const pilihan = terapkanIsianCepat(isianKosong(), { ujian: 'tka-sma-pilihan', kelas: 12, mapel: 'Fisika', n: 25 });
    expect([pilihan.ujian?.id, pilihan.mapel]).toEqual(['tka-sma-pilihan', 'Fisika']);
    const biasa = terapkanIsianCepat(pilihan, { ujian: null, kelas: 12, mapel: 'Fisika', n: 25 });
    expect(biasa.ujian).toBeNull();
  });

  it('nilai kosong atau di luar batas tidak menimpa draf', () => {
    const f = terapkanIsianCepat({ ...isianKosong(), kelas: 4, mapel: 'IPAS', n: 15 }, { ujian: null, kelas: 0, mapel: '  ', n: 99 });
    expect([f.kelas, f.mapel, f.n]).toEqual([4, 'IPAS', 15]);
  });

  it('tersimpan ke draf layar Buat dan terbaca lagi di beranda', () => {
    simpanIsianCepat({ ujian: 'tka-smp-bindo', kelas: 9, mapel: 'Bahasa Indonesia', n: 20 });
    expect(bacaIsianCepat()).toEqual({ ujian: 'tka-smp-bindo', kelas: 9, mapel: 'Bahasa Indonesia', n: 20 });
    const d = bacaDraf<{ f: { soalPerBacaan: number | null } }>();
    expect(d?.f.soalPerBacaan).toBe(3);
  });
});
