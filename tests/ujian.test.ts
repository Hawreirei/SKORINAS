import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { bacaCadangan } from '../src/db/cadangan';
import { GenSoalDb } from '../src/db/skema';
import type { Bentuk, Level, ParameterPaket, Slot } from '../src/db/tipe';
import { LEVEL } from '../src/db/tipe';
import { susunPesan } from '../src/generasi/prompt';
import { galatKomposisi, rencanakanSlot, URUTAN_BENTUK } from '../src/generasi/rencana';
import { rumpunDariMapel } from '../src/paket';
import { bagiPorsi, FORMAT_UJIAN, formatUjian, isianUjian, jumlahSoalUjian, levelTka, ringkasUjian } from '../src/ujian';
import { paketUji } from './bantu-soal';

const jumlah = (x: Partial<Record<string, number>>) => Object.values(x).reduce<number>((a, b) => a + (b ?? 0), 0);

function slot(level: Level, bentuk: Bentuk = 'pilihan_ganda'): Slot {
  return { id: 's', urutan: 1, tp_index: 0, kesukaran: 'sedang', level, bentuk, status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null };
}

function paramUjian(id: string, daerah = ''): ParameterPaket {
  const u = formatUjian(id)!;
  const x = isianUjian(u);
  return { ...paketUji().parameter_json, kelas: x.kelas, mapel: x.mapel ?? 'Fisika', n: x.n, bentuk: x.bentuk, jumlah_bentuk: x.jumlah_bentuk, sebaran_level: x.sebaran_level, opsi_pg: x.opsi_pg, ujian: { id, daerah } };
}

describe('katalog format ujian', () => {
  it('mencakup TKA, TKAD, dan OSN untuk SD, SMP, dan SMA', () => {
    const ada = new Set(FORMAT_UJIAN.map((u) => `${u.keluarga} ${u.jenjang}`));
    for (const k of ['TKA SD', 'TKA SMP', 'TKA SMA', 'TKAD SD', 'TKAD SMP', 'OSN SD', 'OSN SMP', 'OSN SMA']) expect(ada).toContain(k);
  });

  it('id unik dan kelas sesuai jenjang', () => {
    expect(new Set(FORMAT_UJIAN.map((u) => u.id)).size).toBe(FORMAT_UJIAN.length);
    const rentang = { SD: [1, 6], SMP: [7, 9], SMA: [10, 12] } as const;
    for (const u of FORMAT_UJIAN) {
      expect(u.kelas).toBeGreaterThanOrEqual(rentang[u.jenjang][0]);
      expect(u.kelas).toBeLessThanOrEqual(rentang[u.jenjang][1]);
    }
  });

  it.each(FORMAT_UJIAN.map((u) => [u.id, u] as const))('%s: isian bawaan dapat langsung dibuat', (_, u) => {
    const x = isianUjian(u);
    expect(x.n).toBe(jumlahSoalUjian(u));
    expect(x.n).toBeGreaterThanOrEqual(5);
    expect(x.n).toBeLessThanOrEqual(50);
    expect(jumlah(x.jumlah_bentuk)).toBe(x.n);
    expect(jumlah(x.sebaran_level)).toBe(x.n);
    expect(x.bentuk.length).toBeGreaterThan(0);
    const p = { n: x.n, persen: [30, 50, 20] as [number, number, number], bentuk: x.bentuk, tp: [{ id: '', rumusan: 'TP' }], jumlah_bentuk: x.jumlah_bentuk, sebaran_level: x.sebaran_level };
    expect(galatKomposisi(p)).toEqual([]);
    expect(rencanakanSlot(p)).toHaveLength(x.n);
    if (u.mapel) expect(rumpunDariMapel(u.mapel)).not.toBeNull();
    else expect(u.saranMapel?.length).toBeGreaterThan(0);
    expect(u.aturan.length).toBeGreaterThan(0);
  });

  it('jumlah per bentuk dan per level selalu pas untuk semua jumlah soal 5–50', () => {
    for (const u of FORMAT_UJIAN)
      for (let n = 5; n <= 50; n++) {
        const x = isianUjian(u, n);
        expect(jumlah(x.jumlah_bentuk)).toBe(n);
        expect(jumlah(x.sebaran_level)).toBe(n);
      }
  });

  it('ujian yang lebih dari 50 soal dibatasi 50', () => {
    expect(jumlahSoalUjian(formatUjian('osnk-sd-ipa')!)).toBe(50);
    expect(isianUjian(formatUjian('osnp-sd-ips')!).jumlah_bentuk).toEqual({ pilihan_ganda: 38, isian_singkat: 12 });
  });

  it('jumlah soal yang belum pasti memakai 30', () => {
    const u = formatUjian('osnk-sma-informatika')!;
    expect(u.asli.soal).toBeNull();
    expect(jumlahSoalUjian(u)).toBe(30);
    expect(ringkasUjian(u)).toBe('Ujian aslinya jumlah soal belum dipastikan dalam 150 menit.');
  });

  it('TKA SD Matematika: 30 soal, 19 PG, 5 PG kompleks, 6 benar-salah; level 6/12/12', () => {
    const x = isianUjian(formatUjian('tka-sd-matematika')!);
    expect(x).toMatchObject({ kelas: 6, mapel: 'Matematika', n: 30, opsi_pg: 4, gaya: 'numerasi' });
    expect(x.jumlah_bentuk).toEqual({ pilihan_ganda: 19, pilihan_ganda_kompleks: 5, benar_salah: 6 });
    const lv = x.sebaran_level;
    expect((lv.C1 ?? 0) + (lv.C2 ?? 0)).toBe(6);
    expect(lv.C3).toBe(12);
    expect((lv.C4 ?? 0) + (lv.C5 ?? 0) + (lv.C6 ?? 0)).toBe(12);
  });

  it('TKA SMA Matematika 25 soal 5 opsi; Bahasa Inggris berbahasa Inggris; mapel pilihan dipilih guru', () => {
    expect(isianUjian(formatUjian('tka-sma-matematika')!)).toMatchObject({ n: 25, opsi_pg: 5, kelas: 12 });
    expect(isianUjian(formatUjian('tka-sma-binggris')!).bahasa).toBe('en');
    const pilihan = formatUjian('tka-sma-pilihan')!;
    expect(isianUjian(pilihan).mapel).toBeNull();
    expect(pilihan.saranMapel).toContain('Matematika Tingkat Lanjut');
  });

  it('OSN-K SMP Matematika: 25 PG 4 opsi, skor benar 4', () => {
    const x = isianUjian(formatUjian('osnk-smp-matematika')!);
    expect(x).toMatchObject({ n: 25, opsi_pg: 4, skor_bentuk: { pilihan_ganda: 4 }, jumlah_bentuk: { pilihan_ganda: 25 } });
    expect((x.sebaran_level.C1 ?? 0) + (x.sebaran_level.C2 ?? 0)).toBe(0);
  });

  it('id yang tidak dikenal diabaikan', () => {
    expect(formatUjian('tidak-ada')).toBeNull();
    expect(formatUjian(null)).toBeNull();
  });
});

describe('bagiPorsi', () => {
  it('sisa terbesar, seri ke kunci lebih awal, jumlah selalu n', () => {
    expect(bagiPorsi({ pilihan_ganda: 19, pilihan_ganda_kompleks: 5, benar_salah: 6 }, 25, URUTAN_BENTUK)).toEqual({ pilihan_ganda: 16, pilihan_ganda_kompleks: 4, benar_salah: 5 });
    expect(bagiPorsi({ C3: 1, C4: 1 }, 5, LEVEL)).toEqual({ C3: 3, C4: 2 });
    expect(bagiPorsi({ C1: 1, C6: 9 }, 5, LEVEL)).toEqual({ C1: 1, C6: 4 });
  });

  it('kunci yang mendapat 0 tidak muncul', () => {
    expect(bagiPorsi({ pilihan_ganda: 40, uraian: 1 }, 5, URUTAN_BENTUK)).toEqual({ pilihan_ganda: 5 });
    expect(bagiPorsi({}, 5, URUTAN_BENTUK)).toEqual({});
  });
});

describe('level TKA', () => {
  it('memetakan C1–C6 ke tiga level resmi', () => {
    expect(LEVEL.map(levelTka)).toEqual(['Pengetahuan dan Pemahaman', 'Pengetahuan dan Pemahaman', 'Aplikasi', 'Penalaran', 'Penalaran', 'Penalaran']);
  });
});

describe('prompt format ujian', () => {
  it('menambah aturan TKA dan level resmi butir', () => {
    const pesan = susunPesan({ param: paramUjian('tka-sd-matematika'), slot: slot('C3'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('## Format ujian: TKA SD · Matematika');
    expect(pesan).toContain('Butir ini berlevel TKA "Aplikasi".');
    expect(pesan).toContain('Pilihlah semua jawaban yang benar!');
    expect(pesan).toContain('Gunakan 4 opsi (A–D).');
  });

  it('TKAD meminta unsur kelokalan daerah yang diisi guru', () => {
    const pesan = susunPesan({ param: paramUjian('tkad-sd-bindo', 'Kabupaten Tegal'), slot: slot('C4'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('unsur kelokalan Kabupaten Tegal');
    expect(pesan).toContain('Butir ini berlevel TKA "Penalaran".');
    const tanpa = susunPesan({ param: paramUjian('tkad-sd-bindo'), slot: slot('C4'), pokokLain: [], alasanGagal: [] });
    expect(tanpa).toContain('unsur kelokalan Nusantara');
  });

  it('OSN tanpa level TKA; isian Matematika SMA berjawaban bilangan bulat', () => {
    const pesan = susunPesan({ param: paramUjian('osnk-sma-matematika'), slot: slot('C6', 'isian_singkat'), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('## Format ujian: OSN-K SMA · Matematika');
    expect(pesan).toContain('Jawaban isian berupa satu bilangan bulat.');
    expect(pesan).not.toContain('berlevel TKA');
  });

  it('paket tanpa format ujian tidak berubah', () => {
    const pesan = susunPesan({ param: paketUji().parameter_json, slot: slot('C3'), pokokLain: [], alasanGagal: [] });
    expect(pesan).not.toContain('Format ujian');
    const tidakDikenal = susunPesan({ param: { ...paketUji().parameter_json, ujian: { id: 'usang', daerah: '' } }, slot: slot('C3'), pokokLain: [], alasanGagal: [] });
    expect(tidakDikenal).not.toContain('Format ujian');
  });
});

describe('migrasi skema versi 4 (format ujian)', () => {
  it('melengkapi isian ujian dengan null pada preset dan paket versi 3', async () => {
    const nama = `uji-migrasi-4-${Math.random()}`;
    const lama = new Dexie(nama);
    lama.version(3).stores({
      profil: 'id',
      kunci_api: 'penyedia',
      preset: 'id, nama, terakhir_dipakai',
      paket_soal: 'id, status, dibuat_pada, dihapus_pada',
      soal: 'id, paket_id, status_mutu, status_telaah, dihapus_pada, [paket_id+urutan]',
      soal_gambar: 'id, soal_id',
      pekerjaan_generasi: 'id, paket_id, status',
      pemakaian_ai: 'id, tanggal, model, paket_id',
      log_soal: 'id, soal_id, dibuat_pada',
    });
    await lama.open();
    const param = { kelas: 4, mapel: 'Matematika', tp: [{ id: 't', rumusan: 'x' }], cara_bs: 'centang', bentuk: ['pilihan_ganda'], opsi_pg: 5 };
    await lama.table('preset').add({ id: 'p1', nama: 'Lama', parameter_json: param, terakhir_dipakai: 0 });
    await lama.table('paket_soal').add({ id: 'k1', judul: 'Lama', parameter_json: param, status: 'siap', dibuat_pada: 0, dihapus_pada: null });
    lama.close();

    const baru = new GenSoalDb(nama);
    await baru.open();
    for (const p of [(await baru.preset.get('p1'))!.parameter_json, (await baru.paket_soal.get('k1'))!.parameter_json]) {
      expect(p.ujian).toBeNull();
      expect(p.opsi_pg).toBe(5);
    }
    baru.close();
    await Dexie.delete(nama);
  });

  it('cadangan lama tanpa isian ujian tetap dapat dibaca; format ujian ikut cadangan', () => {
    const lama = bacaCadangan(JSON.stringify({ format: 'gensoal', versi: 1, versi_aplikasi: '0.4.0', dibuat_pada: '', data: { preset: [{ id: 'p', parameter_json: { kelas: 4 } }] } }));
    expect((lama.data.preset![0] as { parameter_json: ParameterPaket }).parameter_json.ujian).toBeNull();
    const ujian = { id: 'tkad-smp-matematika', daerah: 'Kota Yogyakarta' };
    const baru = bacaCadangan(JSON.stringify({ format: 'gensoal', versi: 1, versi_aplikasi: '0.4.0', dibuat_pada: '', data: { preset: [{ id: 'p', parameter_json: { kelas: 9, ujian } }] } }));
    expect((baru.data.preset![0] as { parameter_json: ParameterPaket }).parameter_json.ujian).toEqual(ujian);
  });
});
