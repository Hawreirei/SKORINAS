import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import golden from '../data/golden/stimulus.json';
import { isianDariParameter, isianDariUjian, isianKosong, keParameter, type Isian } from '../src/app/isian-buat';
import { GenSoalDb } from '../src/db/skema';
import type { IsiSoal, ParameterPaket, Slot } from '../src/db/tipe';
import { bangunDokumen } from '../src/ekspor/model';
import { bagianStimulus, susunPesan } from '../src/generasi/prompt';
import { rencanakanSlot } from '../src/generasi/rencana';
import { beriVariasi, panjangStimulus, TOKOH } from '../src/generasi/variasi';
import { bagianPromptUjian, FORMAT_UJIAN } from '../src/ujian';
import { cakupanFormat, pilihCakupan } from '../src/ujian/cakupan';
import { periksaStimulus, ukurPokok } from '../src/verifikasi/stimulus';
import { paketUji, profilUji, soalUji } from './bantu-soal';

/** Pembangkit acak tetap agar uji dapat diulang. */
function acakTetap(benih: number): () => number {
  let s = benih;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

const meta = { tp: 'TP', indikator: 'Disajikan cerita, peserta didik dapat menjawab.', level: 'C3' as const, kesukaran: 'sedang' as const };
const isian = (u: Partial<Isian> = {}): Isian => ({ ...isianKosong(), kelas: 9, mapel: 'Matematika', ...u });
const param = (u: Partial<ParameterPaket> = {}): ParameterPaket => ({ ...paketUji().parameter_json, ...u });
const slot = (u: Partial<Slot> = {}): Slot => ({ id: 's', urutan: 1, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null, ...u });

describe('cakupan materi format ujian', () => {
  it('setiap cakupan merujuk format yang ada dan setiap elemen berporsi punya butir', () => {
    for (const u of FORMAT_UJIAN) {
      const c = cakupanFormat(u.id);
      if (!c) continue;
      for (const e of Object.keys(c.porsi)) expect(c.butir.some((b) => b.elemen === e), `${u.id}: ${e}`).toBe(true);
      for (const b of c.butir) expect(Object.keys(c.porsi)).toContain(b.elemen);
    }
    expect(FORMAT_UJIAN.filter((u) => u.keluarga !== 'OSN' && u.mapel).every((u) => cakupanFormat(u.id))).toBe(true);
  });

  it('TKA SMP Matematika 30 soal: porsi elemen 7/8/8/7, tanpa angka 0, berjumlah 30', () => {
    const c = cakupanFormat('tka-smp-matematika')!;
    const p = pilihCakupan(c, 30, acakTetap(1));
    expect(p.jumlah.reduce((a, b) => a + b, 0)).toBe(30);
    expect(p.jumlah.every((x) => x > 0)).toBe(true);
    const perElemen = (e: string) => p.rumusan.reduce((a, r, i) => a + (r.startsWith(`${e} ›`) ? p.jumlah[i] : 0), 0);
    expect([perElemen('Bilangan'), perElemen('Aljabar'), perElemen('Geometri dan Pengukuran'), perElemen('Data dan Peluang')]).toEqual([7, 8, 8, 7]);
    // 30 soal untuk 21 butir cakupan: setiap butir terpakai sedikitnya sekali.
    expect(p.rumusan).toHaveLength(c.butir.length);
  });

  it('paket kecil memakai butir berbeda pada paket berikutnya', () => {
    const c = cakupanFormat('tka-sd-matematika')!;
    const a = pilihCakupan(c, 10, acakTetap(1)).rumusan.join('|');
    const b = pilihCakupan(c, 10, acakTetap(99)).rumusan.join('|');
    expect(a).not.toBe(b);
  });

  it('CP dan TP kosong: TP paket dari cakupan (sumber ujian) dengan jumlah per TP; paket dapat direncanakan', () => {
    const f = isianDariUjian(isian(), 'tka-smp-matematika');
    const p = keParameter(f, acakTetap(3));
    expect(p.tp.every((t) => t.sumber === 'ujian')).toBe(true);
    expect(p.tp[0].rumusan).toMatch(/^Bilangan › Bilangan Real: /);
    expect(p.jumlah_tp!.reduce((a, b) => a + b, 0)).toBe(30);
    const s = rencanakanSlot(p);
    expect(new Set(s.map((x) => x.tp_index)).size).toBe(p.tp.length);
    // Membuka kembali paket (buat paket serupa) tidak memasukkan cakupan ke isian TP guru.
    expect(isianDariParameter(p)).toMatchObject({ tpTeks: '', jumlahTp: null });
  });

  it('TP atau CP dari guru selalu didahulukan', () => {
    const f = isianDariUjian(isian({ tpTeks: 'Peserta didik dapat menyelesaikan masalah perbandingan senilai.' }), 'tka-smp-matematika');
    expect(keParameter(f).tp).toEqual([expect.objectContaining({ sumber: 'guru' })]);
    expect(keParameter(isianDariUjian(isian({ cp: 'CP fase D' }), 'tka-smp-matematika')).tp[0].sumber).toBe('guru');
  });

  it('kisi-kisi mencatat cakupan materi format ujian', () => {
    const pk = paketUji();
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, ujian: { id: 'tka-sd-matematika', daerah: '' }, tp: [{ id: 'c', rumusan: 'Data › X: Y', sumber: 'ujian', versi: 1 }] } }, soalUji(), profilUji(), { kop: true, kunci: true, kisi: true, pembahasan: false });
    expect(d.kurikulumLabel).toBe('Cakupan materi TKA SD · Matematika');
  });
});

describe('variasi per butir', () => {
  const dasar = rencanakanSlot({ n: 24, persen: [30, 50, 20], bentuk: ['pilihan_ganda'], tp: [{ id: '', rumusan: 'TP' }] });

  it('tidak mengubah paket tanpa stimulus wajib', () => {
    expect(beriVariasi(dasar, { wajib_stimulus: false, rumpun: 'matematika' })).toBe(dasar);
  });

  it('tema, bentuk stimulus, dan tokoh berbeda antarbutir; tema bergiliran tiga konteks', () => {
    const v = beriVariasi(dasar, { wajib_stimulus: true, rumpun: 'matematika' }, acakTetap(7)).map((s) => s.variasi!);
    expect(new Set(v.map((x) => x.tema)).size).toBe(24);
    expect(new Set(v.map((x) => x.tokoh)).size).toBe(24);
    expect(new Set(v.slice(0, 6).map((x) => x.stimulus)).size).toBe(6);
    expect(TOKOH.length).toBeGreaterThanOrEqual(40);
  });

  it('paket berikutnya mendapat urutan lain', () => {
    const a = beriVariasi(dasar, { wajib_stimulus: true, rumpun: 'ipa' }, acakTetap(1)).map((s) => s.variasi!.tema);
    const b = beriVariasi(dasar, { wajib_stimulus: true, rumpun: 'ipa' }, acakTetap(2)).map((s) => s.variasi!.tema);
    expect(a).not.toEqual(b);
  });

  it('format TKA dan TKAD menyalakan stimulus wajib; OSN tidak', () => {
    expect(isianDariUjian(isian(), 'tka-sd-bindo').wajibStimulus).toBe(true);
    expect(isianDariUjian(isian(), 'tkad-smp-matematika').wajibStimulus).toBe(true);
    expect(isianDariUjian(isian(), 'osnk-sma-fisika').wajibStimulus).toBe(false);
    expect(keParameter(isianDariUjian(isian(), 'tka-sd-bindo')).wajib_stimulus).toBe(true);
  });
});

describe('prompt stimulus', () => {
  const variasi = { tema: 'pasar tradisional', stimulus: 'percakapan singkat antara dua tokoh', tokoh: 'Daeng' };

  it('meminta stimulus berisi data, dengan tema, bentuk, dan tokoh butir', () => {
    const t = bagianStimulus(param({ wajib_stimulus: true, kelas: 6 }), slot({ variasi }));
    expect(t).toContain('## Stimulus (wajib)');
    expect(t).toContain(`sekitar ${panjangStimulus(6, false).sasaran.join('–')} kata`);
    expect(t).toContain('tema "pasar tradisional"');
    expect(t).toContain('tokoh utama bernama Daeng');
    expect(susunPesan({ param: param({ wajib_stimulus: true }), slot: slot({ variasi }), pokokLain: [], alasanGagal: [] })).toContain('## Stimulus (wajib)');
  });

  it('bahasa: teks bacaan sepanjang kerangka TKA; benar-salah: stimulus lalu pernyataan', () => {
    expect(bagianStimulus(param({ wajib_stimulus: true, kelas: 9, rumpun: 'bahasa' }), slot())).toContain('teks bacaan asli sekitar 200–250 kata');
    expect(bagianStimulus(param({ wajib_stimulus: true }), slot({ bentuk: 'benar_salah' }))).toContain('satu pernyataan tentang isi stimulus');
  });

  it('konteks guru didahulukan; TKAD memakai nama tokoh khas daerah; menjodohkan dan paket biasa tanpa stimulus', () => {
    expect(bagianStimulus(param({ wajib_stimulus: true, konteks: 'kebun teh' }), slot({ variasi }))).toContain('tema di dalam konteks "kebun teh"');
    const tkad = bagianStimulus(param({ wajib_stimulus: true, ujian: { id: 'tkad-sd-matematika', daerah: 'Tegal' } }), slot({ variasi }));
    expect(tkad).toContain('tokoh bernama khas daerah soal');
    expect(tkad).not.toContain('Daeng');
    expect(bagianStimulus(param({ wajib_stimulus: true }), slot({ bentuk: 'menjodohkan' }))).toBe('');
    expect(bagianStimulus(param({ wajib_stimulus: false }), slot({ variasi }))).toBe('');
  });

  it('format Bahasa Indonesia TKA: kompetensi membaca mengikuti level butir', () => {
    const p = { ujian: { id: 'tka-smp-bindo', daerah: '' } };
    expect(bagianPromptUjian(p, 'C1')).toContain('pemahaman tekstual');
    expect(bagianPromptUjian(p, 'C3')).toContain('pemahaman inferensial');
    expect(bagianPromptUjian(p, 'C6')).toContain('evaluasi dan apresiasi');
    expect(bagianPromptUjian({ ujian: { id: 'tka-smp-matematika', daerah: '' } }, 'C3')).not.toContain('Kompetensi membaca');
  });
});

describe('pemeriksa stimulus (golden)', () => {
  const lengkap = (isi: object) => ({ ...isi, meta }) as IsiSoal;
  it.each(golden.lolos.map((g) => [g.id, g] as const))('%s lolos', (_, g) => {
    expect(periksaStimulus(lengkap(g.isi), { kelas: g.kelas, bahasa: g.bahasa })).toEqual([]);
  });
  it.each(golden.ditolak.map((g) => [g.id, g] as const))('%s ditolak', (_, g) => {
    expect(periksaStimulus(lengkap(g.isi), { kelas: g.kelas, bahasa: g.bahasa })).not.toEqual([]);
  });
  it('menghitung kata dan kalimat dari teks polos', () => {
    expect(ukurPokok('Ani membeli $\\frac{1}{2}$ kg gula di warung. Harga gula Rp16.000 per kg.\nBerapa yang dibayar Ani?')).toEqual({ kata: 16, kalimat: 3 });
  });
});

describe('migrasi skema versi 6', () => {
  it('paket lama tetap tanpa stimulus wajib', async () => {
    const nama = `uji-migrasi-6-${Math.random()}`;
    const lama = new Dexie(nama);
    lama.version(5).stores({
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
    await lama.table('paket_soal').add({ id: 'k1', judul: 'Lama', parameter_json: { kelas: 6, mapel: 'Matematika', tp: [{ id: 't', rumusan: 'x' }], bentuk: ['pilihan_ganda'], konteks: 'pasar' }, status: 'siap', dibuat_pada: 0, dihapus_pada: null });
    lama.close();
    const baru = new GenSoalDb(nama);
    await baru.open();
    expect((await baru.paket_soal.get('k1'))!.parameter_json).toMatchObject({ wajib_stimulus: false, konteks: 'pasar' });
    baru.close();
    await Dexie.delete(nama);
  });
});
