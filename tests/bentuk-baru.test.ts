import { describe, expect, it } from 'vitest';
import type { IsiSoal } from '../src/db/tipe';
import { hurufKunci, petaJodoh, teksJodoh, teksPembanding } from '../src/db/tipe';
import { jumlahOpsiPg, susunPesan } from '../src/generasi/prompt';
import { periksaSoal } from '../src/verifikasi';
import { periksaKaidah } from '../src/verifikasi/kaidah';
import { bacaIsiSoal, GalatSkema } from '../src/verifikasi/skema';
import { paketUji } from './bantu-soal';

const paramUji = () => paketUji().parameter_json;

const meta = { tp: 'TP', indikator: 'Disajikan soal, peserta didik dapat memilih.', level: 'C3', kesukaran: 'sedang' };
const harapan = (bentuk: IsiSoal['bentuk']) => ({ bentuk, level: 'C3' as const, kesukaran: 'sedang' as const, tp: 'TP' });

function galat(f: () => unknown): string[] {
  try {
    f();
  } catch (e) {
    if (e instanceof GalatSkema) return e.daftar;
    throw e;
  }
  return [];
}

describe('skema pilihan ganda kompleks', () => {
  const dasar = { bentuk: 'pilihan_ganda_kompleks', pokok: 'Pilihlah semua yang benar.', opsi: { A: '6', B: '7', C: '$\\frac{12}{2}$', D: '3' }, pembahasan: ['x'], verifikasi: { tipe: 'ekspresi', ekspresi: '6', nilai: '6' }, gambar: null, meta };

  it.each([['A,C'], ['C, A'], [['A', 'C']], ['A dan C'], [{ A: true, B: false, C: true, D: false }]])('membaca kunci %j sebagai "A,C"', (kunci) => {
    expect(bacaIsiSoal({ ...dasar, kunci }, harapan('pilihan_ganda_kompleks')).kunci).toBe('A,C');
  });

  it('menolak satu jawaban benar, semua benar, dan huruf yang tidak ada', () => {
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: 'A' }, harapan('pilihan_ganda_kompleks')))).toContain('Pilihan ganda kompleks memerlukan sedikitnya dua jawaban benar.');
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: 'A,B,C,D' }, harapan('pilihan_ganda_kompleks')))).toContain('Pilihan ganda kompleks harus memiliki sedikitnya satu opsi yang salah.');
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: 'A,E' }, harapan('pilihan_ganda_kompleks')))).toContain('kunci harus huruf-huruf opsi yang ada.');
  });

  it('membaca verifikasi per_opsi dengan relasi bawaan "="', () => {
    const isi = bacaIsiSoal({ ...dasar, kunci: 'A,C', verifikasi: { tipe: 'per_opsi', opsi: { A: { kiri: '6', kanan: '18/3' } } } }, harapan('pilihan_ganda_kompleks'));
    expect(isi.verifikasi).toEqual({ tipe: 'per_opsi', opsi: { A: { kiri: '6', relasi: '=', kanan: '18/3' } } });
  });

  it('hurufKunci mengurutkan dan membuang duplikat', () => {
    expect(hurufKunci('c, a, C')).toEqual(['A', 'C']);
  });
});

describe('skema menjodohkan', () => {
  const dasar = {
    bentuk: 'menjodohkan',
    pokok: 'Pasangkan soal dengan hasilnya.',
    pasangan: { kiri: ['$8 + 5$', '$15 - 7$', '$6 + 6$'], kanan: ['12', '8', '13', '20'] },
    pembahasan: ['x'],
    verifikasi: { tipe: 'pasangan', kiri: ['8+5', '15-7', '6+6'], kanan: ['12', '8', '13', '20'] },
    gambar: null,
    meta,
  };

  it.each([['1-C, 2-B, 3-A'], ['1 → C; 2 → B; 3 → A'], [['C', 'B', 'A']], [{ 1: 'C', 2: 'b', 3: 'A' }]])('membaca kunci %j', (kunci) => {
    const isi = bacaIsiSoal({ ...dasar, kunci }, harapan('menjodohkan'));
    expect(isi.kunci).toBe('1-C, 2-B, 3-A');
    expect(isi.pasangan).toEqual(dasar.pasangan);
  });

  it('menolak pasangan ganda, huruf di luar kolom kanan, dan kolom yang tidak seimbang', () => {
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: '1-C, 2-C, 3-A' }, harapan('menjodohkan')))).toContain('Setiap butir kolom kanan hanya boleh dipasangkan sekali.');
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: '1-E, 2-B, 3-A' }, harapan('menjodohkan')))[0]).toMatch(/memasangkan setiap butir/);
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: '1-C, 2-B, 3-A', pasangan: { kiri: dasar.pasangan.kiri, kanan: ['1', '2'] } }, harapan('menjodohkan'))).join(' ')).toMatch(/Kolom kanan/);
    expect(galat(() => bacaIsiSoal({ ...dasar, kunci: '1-A, 2-B', pasangan: { kiri: ['a', 'b'], kanan: ['c', 'd'] } }, harapan('menjodohkan'))).join(' ')).toMatch(/3 sampai 6/);
  });

  it('petaJodoh dan teksJodoh saling balik', () => {
    expect(petaJodoh('2-a, 1-D', 3)).toEqual([3, 0, -1]);
    expect(teksJodoh([3, 0, 1])).toBe('1-D, 2-A, 3-B');
  });

  it('teks pembanding kemiripan memuat kolom kiri, sehingga dua soal menjodohkan berperintah sama tidak dianggap kembar', () => {
    const isi = bacaIsiSoal({ ...dasar, kunci: '1-C, 2-B, 3-A' }, harapan('menjodohkan'));
    expect(teksPembanding(isi)).toContain('$15 - 7$');
    const lain = teksPembanding({ pokok: dasar.pokok, pasangan: { kiri: ['$40 : 5$', '$9 \\times 3$', '$100 - 64$'], kanan: [] } });
    const h = periksaSoal(isi, { rumpun: 'matematika', kelas: 2, fase: 'A', lokal: 'id', literasi: false, pokokLain: [lain], gambarDiizinkan: true });
    expect(h.alasan).toEqual([]);
    expect(h.status_mutu).toBe('terverifikasi_hitung');
  });
});

describe('banyak opsi pilihan ganda yang diatur guru', () => {
  const isi = { bentuk: 'pilihan_ganda', pokok: 'Hasil $2 + 2$ adalah ....', opsi: { A: '4', B: '3', C: '5', D: '6' }, kunci: 'A', pembahasan: ['x'], verifikasi: { tipe: 'ekspresi', ekspresi: '2+2', nilai: '4' }, gambar: null, meta } as IsiSoal;
  const k = { kelas: 2, fase: 'A', lokal: 'id' as const, literasi: false, pokokLain: [] };

  it('saat dibuat AI, selisih banyak opsi membuat soal dibuat ulang', () => {
    expect(periksaKaidah(isi, { ...k, opsiPg: { jumlah: 5, wajib: true } }).keras).toContain('Paket ini memakai 5 opsi, bukan 4.');
  });

  it('pada suntingan guru hanya menjadi catatan', () => {
    const h = periksaKaidah(isi, { ...k, opsiPg: { jumlah: 5, wajib: false } });
    expect(h.keras).toEqual([]);
    expect(h.lunak).toContain('Paket ini memakai 5 opsi, bukan 4.');
  });

  it('tanpa pengaturan, tetap mengikuti jenjang', () => {
    expect(jumlahOpsiPg({ kelas: 11, opsi_pg: null })).toBe(5);
    expect(jumlahOpsiPg({ kelas: 4, opsi_pg: null })).toBe(4);
    expect(jumlahOpsiPg({ kelas: 4, opsi_pg: 5 })).toBe(5);
  });
});

describe('prompt untuk pengaturan baru', () => {
  const slot = (bentuk: IsiSoal['bentuk']) => ({ id: 's', urutan: 1, tp_index: 0, kesukaran: 'sedang' as const, level: 'C3' as const, bentuk, status: 'menunggu' as const, percobaan: 0, pengganti: false, galat: null, soal_id: null });

  it('meminta banyak opsi yang diatur guru untuk pilihan ganda kompleks', () => {
    const pesan = susunPesan({ param: { ...paramUji(), opsi_pg: 5 }, slot: slot('pilihan_ganda_kompleks'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('Gunakan 5 opsi (A–E).');
    expect(pesan).toContain('"pilihan_ganda_kompleks"');
  });

  it('meminta jumlah skor rubrik uraian sama dengan skor soal', () => {
    const pesan = susunPesan({ param: { ...paramUji(), skor_bentuk: { uraian: 6 } }, slot: slot('uraian'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('jumlah skor dalam kurung pada rubrik harus 6');
  });

  it('menjelaskan bentuk menjodohkan dan verifikasi pasangan', () => {
    const pesan = susunPesan({ param: paramUji(), slot: slot('menjodohkan'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('Menjodohkan (tarik garis)');
    expect(pesan).toContain('"tipe":"pasangan"');
  });
});
