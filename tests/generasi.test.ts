import { beforeEach, describe, expect, it } from 'vitest';
import { GalatAi } from '../src/ai/galat';
import type { JawabanAi } from '../src/ai/tipe';
import { db } from '../src/db/skema';
import type { ParameterPaket } from '../src/db/tipe';
import { buatPaket, pengatur } from '../src/generasi/pengatur';
import { simpanProfil } from '../src/db/profil';

const MODEL = { penyedia: 'gemini' as const, model: 'uji', kunci: 'x' };

function param(n: number, bentuk: ParameterPaket['bentuk'] = ['pilihan_ganda']): ParameterPaket {
  return {
    kurikulum_id: 'merdeka-2024',
    kurikulum_nama: 'Kurikulum Merdeka',
    kurikulum_versi: '2024.1',
    kelas: 4,
    fase: 'B',
    mapel: 'Matematika',
    rumpun: 'matematika',
    cp: '',
    tp: [{ id: '', rumusan: 'Peserta didik dapat menjumlahkan dua bilangan cacah sampai 1.000.', sumber: 'kustom', versi: 1 }],
    n,
    persen: [30, 50, 20],
    bentuk,
    bahasa: 'id',
    gaya: 'biasa',
    gambar: 'mati',
    materi: '',
  };
}

const KATA = ['apel', 'jeruk', 'mangga', 'buku', 'pensil', 'kelereng', 'bola', 'kue', 'gelas', 'piring', 'sepeda', 'layang'];
const NAMA = ['Ani', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko', 'Kirana', 'Lukas'];

/** Model palsu: selalu PG penjumlahan dengan angka dan konteks berbeda tiap panggilan. */
const PER_MENIT = () => new GalatAi('batas', 'Batas permintaan per menit Google Gemini tercapai.', 429, { tungguMs: 5000, lingkup: 'menit' }, 'Please retry in 5s');
const HARIAN = () => new GalatAi('batas', 'Kuota harian Google Gemini untuk model ini sudah habis.', 429, { tungguMs: null, lingkup: 'harian' }, 'Quota exceeded for metric: generate_content_free_tier_requests');

function modelPalsu(opsi: { salahDulu?: number; selaluSalah?: boolean; galatPada?: number[]; galat?: () => GalatAi } = {}) {
  let panggil = 0;
  const pesan: string[] = [];
  const kirim = async (_s: string, p: string): Promise<JawabanAi> => {
    panggil++;
    pesan.push(p);
    if (opsi.galatPada?.includes(panggil)) throw (opsi.galat ?? HARIAN)();
    const a = 100 + panggil * 37;
    const b = 11 + panggil;
    const salah = opsi.selaluSalah || panggil <= (opsi.salahDulu ?? 0);
    const benar = a + b;
    const isi = {
      bentuk: 'pilihan_ganda',
      pokok: `${NAMA[panggil % NAMA.length]} memiliki ${a} ${KATA[panggil % KATA.length]} lalu membeli ${b} lagi di pasar nomor ${panggil * 7}. Berapa banyak ${KATA[panggil % KATA.length]} sekarang?`,
      opsi: { A: String(benar), B: String(benar + 10), C: String(benar - 1), D: String(a - b) },
      kunci: salah ? 'B' : 'A',
      pembahasan: [`${a} + ${b} = ${benar}`],
      verifikasi: { tipe: 'ekspresi', ekspresi: `${a} + ${b}`, nilai: String(salah ? benar + 10 : benar) },
      gambar: null,
      meta: { tp: 'x', indikator: 'Disajikan soal cerita, peserta didik dapat menjumlahkan.', level: 'C3', kesukaran: 'sedang' },
    };
    return { teks: '```json\n' + JSON.stringify(isi) + '\n```', token_masuk: 100, token_keluar: 50, sisa_kuota: null };
  };
  return { kirim, pesan, jumlah: () => panggil };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await simpanProfil({ batas_harian: 1000 });
});

describe('pengatur generasi', () => {
  it('membuat semua butir, memverifikasi, dan menyebar kunci', async () => {
    const id = await buatPaket(param(8), 'Uji');
    const m = modelPalsu();
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null });
    const soal = await db.soal.where('paket_id').equals(id).toArray();
    expect(soal).toHaveLength(8);
    expect(soal.every((s) => s.status_mutu === 'terverifikasi_hitung')).toBe(true);
    const kunci = new Set(soal.map((s) => s.isi_json.kunci));
    expect(kunci.size).toBe(4);
    expect((await db.paket_soal.get(id))?.status).toBe('siap');
    expect(await db.pemakaian_ai.filter((p) => p.lolos).count()).toBe(8);
  });

  it('membuat ulang dengan alasan penolakan bila kunci salah', async () => {
    const id = await buatPaket(param(1), 'Uji');
    const m = modelPalsu({ salahDulu: 2 });
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null });
    expect(m.jumlah()).toBe(3);
    expect(m.pesan[1]).toMatch(/ditolak pemeriksa/);
    const soal = await db.soal.where('paket_id').equals(id).toArray();
    expect(soal).toHaveLength(1);
    expect(soal[0].status_mutu).toBe('terverifikasi_hitung');
    // hanya soal lolos yang mengurangi batas harian
    expect(await db.pemakaian_ai.filter((p) => p.lolos).count()).toBe(1);
    expect(await db.pemakaian_ai.count()).toBe(3);
  });

  it('soal yang selalu salah tidak pernah tampil: ditolak, diganti sekali, lalu slot gagal', async () => {
    const id = await buatPaket(param(1), 'Uji');
    const m = modelPalsu({ selaluSalah: true });
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null });
    expect(m.jumlah()).toBe(6);
    const soal = await db.soal.where('paket_id').equals(id).toArray();
    expect(soal.every((s) => s.status_mutu === 'ditolak')).toBe(true);
    const kerja = await db.pekerjaan_generasi.where('paket_id').equals(id).first();
    expect(kerja?.slot[0].status).toBe('gagal');
  });

  it('batas per menit: menunggu lalu melanjutkan sendiri tanpa dijeda', async () => {
    const id = await buatPaket(param(4), 'Uji');
    const m = modelPalsu({ galatPada: [2, 3], galat: PER_MENIT });
    const tunggu: number[] = [];
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, tunda: async (ms) => void tunggu.push(ms) });
    expect(tunggu).toEqual([6000, 6000]);
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(4);
    expect((await db.paket_soal.get(id))?.status).toBe('siap');
  });

  it('kuota harian habis: pindah otomatis ke model cadangan', async () => {
    const id = await buatPaket(param(4), 'Uji');
    const utama = modelPalsu({ galatPada: [3, 4, 5, 6, 7, 8, 9, 10] });
    const cadangan = modelPalsu();
    await pengatur.mulai(id, { pengirim: utama.kirim, model: MODEL, cadangan: { model: { penyedia: 'groq', model: 'cadangan-uji', kunci: 'y' }, pengirim: cadangan.kirim }, tunda: async () => {} });
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(4);
    expect((await db.paket_soal.get(id))?.model).toBe('cadangan-uji');
    expect(pengatur.ambil().catatan).toMatch(/model cadangan/);
    expect((await db.soal.where('paket_id').equals(id).toArray()).filter((x) => x.model === 'cadangan-uji')).toHaveLength(2);
  });

  it('kuota harian habis tanpa cadangan: dijeda dengan pesan jelas, lalu dapat dilanjutkan', async () => {
    const id = await buatPaket(param(4), 'Uji');
    const m = modelPalsu({ galatPada: [3] });
    const tunggu: number[] = [];
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, tunda: async (ms) => void tunggu.push(ms) });
    expect(tunggu).toEqual([]);
    expect(pengatur.ambil().jenisGalat).toBe('batas');
    expect(pengatur.ambil().pesan).toMatch(/Kuota harian Google Gemini/);
    expect(pengatur.ambil().pesan).toMatch(/model cadangan/);
    expect(pengatur.ambil().rinci).toMatch(/Quota exceeded/);
    expect((await db.paket_soal.get(id))?.status).toBe('dijeda');
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(2);
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null });
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(4);
    expect((await db.paket_soal.get(id))?.status).toBe('siap');
  });

  it('berhenti pada batas harian', async () => {
    await simpanProfil({ batas_harian: 2 });
    const id = await buatPaket(param(4), 'Uji');
    await pengatur.mulai(id, { pengirim: modelPalsu().kirim, model: MODEL, cadangan: null });
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(2);
    expect(pengatur.ambil().pesan).toMatch(/Batas harian/);
  });

  it('menyimpan TP kustom berversi', async () => {
    const p = param(1);
    const id1 = await buatPaket(p, 'Satu');
    const paket1 = await db.paket_soal.get(id1);
    const tp1 = paket1!.parameter_json.tp[0];
    expect(tp1.versi).toBe(1);
    const id2 = await buatPaket({ ...p, tp: [{ ...tp1, rumusan: tp1.rumusan + ' dengan cara bersusun' }] }, 'Dua');
    const tp2 = (await db.paket_soal.get(id2))!.parameter_json.tp[0];
    expect(tp2.versi).toBe(2);
    expect(tp2.id).not.toBe(tp1.id);
    expect(await db.tp_kustom.count()).toBe(2);
  });
});
