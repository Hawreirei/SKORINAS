import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import golden from '../data/golden/pengaturan-bentuk.json';
import { isianDariParameter, isianDariUjian, isianKosong, galatKartu, keParameter, kuotaKesukaran, rincianDariIsian, ubahJumlah, type Isian } from '../src/app/isian-buat';
import { GenSoalDb } from '../src/db/skema';
import type { AturBentuk, IsiSoal, ParameterPaket, Slot } from '../src/db/tipe';
import { bangunDokumen } from '../src/ekspor/model';
import { rincianBentuk, susunPesan } from '../src/generasi/prompt';
import { galatKomposisi, rencanakanSlot } from '../src/generasi/rencana';
import { formatUjian } from '../src/ujian';
import { periksaKaidah } from '../src/verifikasi/kaidah';
import { periksaPengaturan, terapkanPengaturan } from '../src/verifikasi/pengaturan';
import { paketUji, profilUji, soalUji } from './bantu-soal';

const meta = { tp: 'TP', indikator: 'Disajikan soal, peserta didik dapat menjawab.', level: 'C3' as const, kesukaran: 'sedang' as const };
const lengkap = (isi: object) => ({ ...isi, meta }) as IsiSoal;
const tp = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, rumusan: `TP ${i + 1}` }));
const param = (u: Partial<ParameterPaket> = {}): ParameterPaket => ({ ...paketUji().parameter_json, ...u });
const slot = (u: Partial<Slot> = {}): Slot => ({ id: 's', urutan: 1, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null, ...u });
const isian = (u: Partial<Isian> = {}): Isian => ({ ...isianKosong(), kelas: 5, mapel: 'Matematika', ...u });

describe('susunan per baris', () => {
  const rincian = [
    { bentuk: 'pilihan_ganda' as const, level: 'C2' as const, tp: 0, jumlah: 3 },
    { bentuk: 'pilihan_ganda' as const, level: 'C4' as const, tp: null, jumlah: 4 },
    { bentuk: 'uraian' as const, level: 'C6' as const, tp: 1, jumlah: 1 },
  ];
  const masukan = { n: 8, persen: [30, 50, 20] as [number, number, number], bentuk: [], tp: tp(2), rincian };

  it('setiap baris menjadi butir dengan bentuk, level, dan TP-nya; baris tanpa TP bergiliran', () => {
    const s = rencanakanSlot(masukan);
    expect(s).toHaveLength(8);
    expect(s.map((x) => x.urutan)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const ringkas = s.map((x) => `${x.bentuk}|${x.level}|${x.tp_index}`);
    expect(ringkas.filter((x) => x === 'pilihan_ganda|C2|0')).toHaveLength(3);
    expect(ringkas.filter((x) => x.startsWith('pilihan_ganda|C4')).map((x) => x.split('|')[2])).toEqual(['0', '1', '0', '1']);
    expect(ringkas.at(-1)).toBe('uraian|C6|1');
    expect(s.find((x) => x.level === 'C2')!.kesukaran).toBe('mudah');
  });

  it('menggantikan jumlah per bentuk, level, dan TP; total harus n dan TP harus ada', () => {
    expect(galatKomposisi({ ...masukan, jumlah_bentuk: { isian_singkat: 99 }, sebaran_level: { C1: 1 } })).toEqual([]);
    expect(galatKomposisi({ ...masukan, n: 10 })).toEqual(['Jumlah pada susunan per baris 8, harus sama dengan jumlah soal (10).']);
    expect(galatKomposisi({ ...masukan, tp: tp(1) })[0]).toMatch(/TP yang sudah dihapus/);
    expect(galatKomposisi({ ...masukan, rincian: [] })[0]).toMatch(/masih kosong/);
  });

  it('isi dari pengaturan sekarang menghasilkan baris yang berjumlah n', () => {
    const f = isian({ n: 12, bentuk: ['pilihan_ganda', 'uraian'], jumlahBentuk: { pilihan_ganda: 10, uraian: 2 } });
    const r = rincianDariIsian(f);
    expect(r.reduce((a, x) => a + x.jumlah, 0)).toBe(12);
    expect(r.filter((x) => x.bentuk === 'uraian').reduce((a, x) => a + x.jumlah, 0)).toBe(2);
    expect(kuotaKesukaran({ ...f, rincian: r }).reduce((a, b) => a + b, 0)).toBe(12);
  });
});

describe('campuran gaya', () => {
  it('menyebar gaya ke butir sesuai jumlahnya', () => {
    const s = rencanakanSlot({ n: 10, persen: [30, 50, 20], bentuk: ['pilihan_ganda'], tp: tp(1), jumlah_gaya: { literasi: 6, numerasi: 4 } });
    expect(s.filter((x) => x.gaya === 'literasi')).toHaveLength(6);
    expect(s.filter((x) => x.gaya === 'numerasi')).toHaveLength(4);
    expect(galatKomposisi({ n: 10, persen: [30, 50, 20], bentuk: ['pilihan_ganda'], tp: tp(1), jumlah_gaya: { literasi: 3 } })).toEqual(['Jumlah per gaya soal 3, harus sama dengan jumlah soal (10).']);
  });

  it('prompt memakai gaya butir, bukan gaya paket', () => {
    const pesan = susunPesan({ param: param({ gaya: 'biasa' }), slot: slot({ gaya: 'literasi' }), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('Gaya: Soal literasi');
  });

  it('jumlah soal berubah: campuran gaya dibagi ulang menurut porsinya', () => {
    const f = ubahJumlah(isian({ n: 10, jumlahGaya: { literasi: 5, numerasi: 5 } }), 20);
    expect(f.jumlahGaya).toEqual({ numerasi: 10, literasi: 10 });
  });
});

describe('rincian tiap bentuk di prompt', () => {
  const atur = (a: Partial<AturBentuk>): AturBentuk => ({ pgk_benar: null, jodoh: null, isian: null, uraian: null, ...a });
  it('banyak opsi 3–5', () => {
    expect(rincianBentuk(param({ opsi_pg: 3 }), 'pilihan_ganda')).toContain('Gunakan 3 opsi (A–C).');
    expect(rincianBentuk(param({ opsi_pg: null, kelas: 11 }), 'pilihan_ganda_kompleks')).toContain('Gunakan 5 opsi (A–E).');
  });
  it('jawaban benar, pasangan, jenis isian, jenis uraian', () => {
    expect(rincianBentuk(param({ atur_bentuk: atur({ pgk_benar: { min: 2, maks: 2 } }) }), 'pilihan_ganda_kompleks')).toContain('Tepat 2 opsi benar.');
    expect(rincianBentuk(param({ atur_bentuk: atur({ pgk_benar: { min: 2, maks: 3 } }) }), 'pilihan_ganda_kompleks')).toContain('Banyak opsi benar 2 sampai 3.');
    expect(rincianBentuk(param({ atur_bentuk: atur({ jodoh: { kiri: 5, pengecoh: 2 } }) }), 'menjodohkan')[0]).toBe('Kolom kiri tepat 5 butir; kolom kanan 7 butir (2 pengecoh).');
    expect(rincianBentuk(param({ atur_bentuk: atur({ isian: 'bilangan_bulat' }) }), 'isian_singkat')).toContain('Jawaban isian berupa satu bilangan bulat tanpa satuan.');
    expect(rincianBentuk(param({ atur_bentuk: atur({ uraian: 'hitungan' }) }), 'uraian')[0]).toMatch(/"jenis_uraian": "hitungan"/);
    // Rincian bentuk lain tidak ikut.
    expect(rincianBentuk(param({ atur_bentuk: atur({ isian: 'kata' }) }), 'uraian')).toEqual([]);
  });
  it('konteks, aturan tambahan, dan bahasa lain', () => {
    const pesan = susunPesan({ param: param({ konteks: 'pasar tradisional', aturan_tambahan: ['Pakai nama dari Bugis.', '  '], bahasa: 'lain', bahasa_lain: 'Jawa' }), slot: slot(), pokokLain: [], alasanGagal: [] });
    expect(pesan).toContain('Konteks atau tema yang diminta guru: pasar tradisional');
    expect(pesan).toContain('## Aturan tambahan dari guru (wajib diikuti)\n- Pakai nama dari Bugis.');
    expect(pesan).toContain('dalam bahasa Jawa');
    expect(susunPesan({ param: param(), slot: slot(), pokokLain: [], alasanGagal: [] })).not.toContain('Aturan tambahan');
  });
});

describe('pemeriksa rincian tiap bentuk (golden)', () => {
  it.each(golden.patuh.map((g) => [g.id, g] as const))('%s lolos', (_, g) => {
    expect(periksaPengaturan(lengkap(g.isi), g.atur as AturBentuk | null)).toEqual([]);
  });
  it.each(golden.langgar.map((g) => [g.id, g] as const))('%s ditolak', (_, g) => {
    expect(periksaPengaturan(lengkap(g.isi), g.atur as AturBentuk)).not.toEqual([]);
  });
  it('jenis uraian dari guru diterapkan tanpa membuat ulang', () => {
    const isi = lengkap({ bentuk: 'uraian', pokok: 'Jelaskan.', kunci: 'x', jenis_uraian: 'penjelasan', pembahasan: [], verifikasi: { tipe: 'tidak_ada' }, gambar: null });
    expect(terapkanPengaturan(isi, { pgk_benar: null, jodoh: null, isian: null, uraian: 'hitungan' }).jenis_uraian).toBe('hitungan');
    expect(terapkanPengaturan(isi, null)).toBe(isi);
  });
});

describe('tiga opsi pilihan ganda', () => {
  const isi = lengkap({ bentuk: 'pilihan_ganda', pokok: 'Hasil dari 2 + 3 adalah ....', opsi: { A: '5', B: '6', C: '7' }, kunci: 'A', pembahasan: [], verifikasi: { tipe: 'ekspresi', ekspresi: '2+3', nilai: '5' }, gambar: null });
  const k = { kelas: 4, fase: 'B', lokal: 'id' as const, literasi: false, pokokLain: [] };
  it('sah bila guru memilih 3 opsi', () => {
    expect(periksaKaidah(isi, { ...k, opsiPg: { jumlah: 3, wajib: true } }).keras).toEqual([]);
  });
  it('tetap ditolak tanpa pengaturan', () => {
    expect(periksaKaidah(isi, k).keras).toContain('Pilihan ganda harus memiliki 4 atau 5 opsi, bukan 3.');
  });
});

describe('isian layar Buat ↔ parameter', () => {
  it('pulang-pergi tanpa kehilangan isian baru', () => {
    const f = isian({
      tpTeks: 'TP satu\nTP dua',
      n: 6,
      bentuk: ['pilihan_ganda', 'isian_singkat'],
      rincian: [
        { bentuk: 'pilihan_ganda', level: 'C3', tp: 1, jumlah: 4 },
        { bentuk: 'isian_singkat', level: 'C5', tp: null, jumlah: 2 },
      ],
      aturBentuk: { pgk_benar: { min: 2, maks: 2 }, jodoh: null, isian: 'bilangan', uraian: 'hitungan' },
      opsiPg: 3,
      skorBentuk: { pilihan_ganda: 2, isian_singkat: 4 },
      skorSalah: { isian_singkat: 1 },
      durasi: 45,
      jumlahGaya: { numerasi: 4, hots: 2 },
      bahasa: 'lain',
      bahasaLain: ' Sunda ',
      konteks: ' kebun teh ',
      aturanTeks: '- Pakai satuan rupiah.\n\n2. Tanpa gambar orang.',
    });
    const p = keParameter(f);
    expect(p.rincian).toEqual(f.rincian);
    expect(p.bentuk).toEqual(['pilihan_ganda', 'isian_singkat']);
    expect(p.jumlah_bentuk).toBeNull();
    // Hanya rincian untuk bentuk yang dipakai yang disimpan.
    expect(p.atur_bentuk).toEqual({ pgk_benar: null, jodoh: null, isian: 'bilangan', uraian: null, kategori: null });
    expect(p.skor_salah).toEqual({ pilihan_ganda: 0, isian_singkat: 1 });
    expect(p).toMatchObject({ opsi_pg: 3, durasi_menit: 45, jumlah_gaya: { numerasi: 4, hots: 2 }, gaya: 'numerasi', bahasa_lain: 'Sunda', konteks: 'kebun teh', aturan_tambahan: ['Pakai satuan rupiah.', 'Tanpa gambar orang.'] });
    const balik = isianDariParameter(p);
    expect(balik).toMatchObject({ rincian: f.rincian, opsiPg: 3, durasi: 45, bahasaLain: 'Sunda', konteks: 'kebun teh', aturanTeks: 'Pakai satuan rupiah.\nTanpa gambar orang.' });
  });

  it('skor salah tidak disimpan tanpa skor per soal', () => {
    expect(keParameter(isian({ skorSalah: { pilihan_ganda: 1 } })).skor_salah).toBeNull();
  });

  it('format ujian mengisi aturan tambahan, waktu, dan jenis isian', () => {
    const f = isianDariUjian(isian({ rincian: [{ bentuk: 'uraian', level: 'C1', tp: null, jumlah: 10 }] }), 'osnk-sma-matematika');
    expect(f.rincian).toBeNull();
    expect(f.durasi).toBe(150);
    expect(f.aturBentuk.isian).toBe('bilangan_bulat');
    expect(f.aturanTeks).toBe(formatUjian('osnk-sma-matematika')!.aturan.join('\n'));
  });

  it('galat per kartu: persen bukan 100, jawaban benar melebihi opsi, bahasa tanpa nama', () => {
    expect(galatKartu(isian({ persen: [30, 50, 30] })).kesukaran).toContain('Jumlah persen kesukaran 110%, harus 100%.');
    expect(galatKartu(isian({ bentuk: ['pilihan_ganda_kompleks'], opsiPg: 4, aturBentuk: { pgk_benar: { min: 2, maks: 4 }, jodoh: null, isian: null, uraian: null } })).rincianBentuk[0]).toMatch(/paling banyak 3/);
    expect(galatKartu(isian({ bahasa: 'lain' })).gaya).toContain('Tulis nama bahasa soal.');
    expect(galatKartu(isian())).toEqual({ susunan: [], kesukaran: [], rincianBentuk: [], gaya: [] });
  });
});

describe('ekspor: waktu dan skor salah', () => {
  const OPSI = { kop: true, kunci: true, kisi: true, pembahasan: false };
  it('waktu tercetak dan aturan skor salah masuk petunjuk serta pedoman penskoran', () => {
    const pk = paketUji();
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, durasi_menit: 90, skor_bentuk: { pilihan_ganda: 4, isian_singkat: 2 }, skor_salah: { pilihan_ganda: 1 } } }, soalUji(), profilUji(), OPSI);
    expect(d.waktu).toBe('Waktu: 90 menit');
    expect(d.bagian.find((b) => b.bentuk === 'pilihan_ganda')!.petunjuk).toContain('Skor setiap soal 4; jawaban salah dikurangi 1.');
    expect(d.penskoran!.catatan).toEqual(['Pilihan Ganda: jawaban salah dikurangi 1, jawaban kosong 0.']);
    expect(bangunDokumen(pk, soalUji(), profilUji(), OPSI).waktu).toBeNull();
  });
});

describe('migrasi skema versi 5 (opsi lanjutan v2)', () => {
  it('melengkapi isian baru; paket format ujian mendapat salinan aturannya', async () => {
    const nama = `uji-migrasi-5-${Math.random()}`;
    const lama = new Dexie(nama);
    lama.version(4).stores({
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
    const dasar = { kelas: 6, mapel: 'Matematika', tp: [{ id: 't', rumusan: 'x' }], bentuk: ['pilihan_ganda'], opsi_pg: 4 };
    await lama.table('preset').add({ id: 'p1', nama: 'Biasa', parameter_json: { ...dasar, ujian: null }, terakhir_dipakai: 0 });
    await lama.table('paket_soal').add({ id: 'k1', judul: 'TKA', parameter_json: { ...dasar, ujian: { id: 'tka-sd-matematika', daerah: '' } }, status: 'siap', dibuat_pada: 0, dihapus_pada: null });
    lama.close();

    const baru = new GenSoalDb(nama);
    await baru.open();
    const biasa = (await baru.preset.get('p1'))!.parameter_json;
    expect(biasa).toMatchObject({ rincian: null, atur_bentuk: null, skor_salah: null, durasi_menit: null, jumlah_gaya: null, bahasa_lain: '', konteks: '', aturan_tambahan: [], opsi_pg: 4 });
    const tka = (await baru.paket_soal.get('k1'))!.parameter_json;
    expect(tka.aturan_tambahan).toEqual(formatUjian('tka-sd-matematika')!.aturan);
    baru.close();
    await Dexie.delete(nama);
  });
});
