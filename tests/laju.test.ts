import { beforeEach, describe, expect, it } from 'vitest';
import { GalatAi } from '../src/ai/galat';
import { awalHariKuota, batasEfektif, PembatasLaju, permintaanHariIni } from '../src/ai/laju';
import { db } from '../src/db/skema';
import type { Registri } from '../src/ai/tipe';

function jam(mulai = 1_000_000) {
  let t = mulai;
  return {
    sekarang: () => t,
    tunda: async (ms: number) => {
      t += ms;
    },
  };
}

describe('pembatas laju', () => {
  it('RPM 5: lima permintaan langsung, keenam menunggu jendela 60 detik', async () => {
    const p = new PembatasLaju();
    const j = jam();
    const tunggu: number[] = [];
    const waktu: number[] = [];
    for (let i = 0; i < 12; i++) {
      await p.izin('gemini', 'm', { rpm: 5, rpd: null }, { ...j, saatMenunggu: (ms) => tunggu.push(ms) });
      waktu.push(j.sekarang());
    }
    // dalam jendela 60 detik mana pun tidak pernah lebih dari 5 permintaan
    for (let i = 0; i < waktu.length; i++) expect(waktu.filter((t) => t >= waktu[i] && t < waktu[i] + 60_000).length).toBeLessThanOrEqual(5);
    expect(tunggu).toHaveLength(2);
    expect(waktu[11] - waktu[0]).toBeGreaterThanOrEqual(120_000);
  });

  it('model lain punya jendela sendiri', async () => {
    const p = new PembatasLaju();
    const j = jam();
    for (let i = 0; i < 5; i++) await p.izin('gemini', 'a', { rpm: 5, rpd: null }, j);
    let menunggu = false;
    await p.izin('gemini', 'b', { rpm: 5, rpd: null }, { ...j, saatMenunggu: () => (menunggu = true) });
    expect(menunggu).toBe(false);
  });

  it('tanpa batas tidak pernah menunggu', async () => {
    const p = new PembatasLaju();
    const j = jam();
    let menunggu = false;
    for (let i = 0; i < 50; i++) await p.izin('openai', 'x', { rpm: null, rpd: null }, { ...j, saatMenunggu: () => (menunggu = true) });
    expect(menunggu).toBe(false);
  });

  it('RPD habis: melempar galat kuota harian tanpa mengirim', async () => {
    const p = new PembatasLaju();
    await expect(p.izin('gemini', 'm', { rpm: 5, rpd: 20 }, { hitungHarian: async () => 20 })).rejects.toMatchObject({ jenis: 'batas', batas: { lingkup: 'harian' } });
    await expect(p.izin('gemini', 'm', { rpm: 5, rpd: 20 }, { hitungHarian: async () => 19 })).resolves.toBeUndefined();
    expect(GalatAi).toBeDefined();
  });

  it('angka guru menimpa registri', () => {
    const reg = { penyedia: [{ id: 'gemini', model: [{ id: 'm', batas_gratis: { rpm: 5, rpd: 20 } }] }] } as unknown as Registri;
    expect(batasEfektif({ batas_model: {} }, reg, 'gemini', 'm')).toEqual({ rpm: 5, rpd: 20 });
    expect(batasEfektif({ batas_model: { 'gemini|m': { rpm: 10, rpd: null } } }, reg, 'gemini', 'm')).toEqual({ rpm: 10, rpd: 20 });
    expect(batasEfektif({ batas_model: {} }, reg, 'groq', 'x')).toEqual({ rpm: null, rpd: null });
  });

  it('hari kuota Gemini dimulai tengah malam waktu Pasifik', () => {
    // 24 Okt 2026 08.00 UTC = 01.00 PDT -> hari kuota mulai 24 Okt 07.00 UTC
    expect(new Date(awalHariKuota('gemini', new Date('2026-10-24T08:00:00Z'))).toISOString()).toBe('2026-10-24T07:00:00.000Z');
    // 24 Okt 2026 06.00 UTC = 23.00 PDT tanggal 23 -> mulai 23 Okt 07.00 UTC
    expect(new Date(awalHariKuota('gemini', new Date('2026-10-24T06:00:00Z'))).toISOString()).toBe('2026-10-23T07:00:00.000Z');
  });
});

describe('hitungan permintaan harian', () => {
  beforeEach(async () => {
    await db.pemakaian_ai.clear();
  });
  it('menghitung permintaan model sejak awal hari kuota', async () => {
    const kini = new Date('2026-10-24T08:00:00Z');
    const awal = awalHariKuota('gemini', kini);
    const baris = (t: number, model = 'm') => ({ id: crypto.randomUUID(), tanggal: '', dibuat_pada: t, penyedia: 'gemini' as const, model, token_masuk: 0, token_keluar: 0, perkiraan_biaya: 0, lolos: false, paket_id: null });
    await db.pemakaian_ai.bulkAdd([baris(awal - 1000), baris(awal + 1000), baris(awal + 2000), baris(awal + 3000, 'lain')]);
    expect(await permintaanHariIni('gemini', 'm', kini)).toBe(2);
  });
});
