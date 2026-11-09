import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADAPTOR } from '../src/ai';
import { ambil, GalatAi } from '../src/ai/galat';
import { gemini, konfigPenalaranGemini } from '../src/ai/adaptor/gemini';
import { groq } from '../src/ai/adaptor/openai-kompat';
import { PembatasLaju } from '../src/ai/laju';
import type { Adaptor, JawabanAi } from '../src/ai/tipe';
import { db } from '../src/db/skema';
import { simpanProfil } from '../src/db/profil';
import type { ParameterPaket } from '../src/db/tipe';
import { banyakSerentak, buatPaket, MAKS_SERENTAK, pengatur } from '../src/generasi/pengatur';
import { kemiripan } from '../src/verifikasi/kemiripan';

// F-37: pembuatan soal dipercepat tanpa melewati batas per menit dan per hari.

function param(n: number): ParameterPaket {
  return {
    kelas: 4,
    fase: 'B',
    mapel: 'Matematika',
    rumpun: 'matematika',
    cp: '',
    tp: [{ id: '', rumusan: 'Peserta didik dapat menjumlahkan dua bilangan cacah sampai 1.000.', sumber: 'guru', versi: 1 }],
    n,
    persen: [30, 50, 20],
    bentuk: ['pilihan_ganda'],
    bahasa: 'id',
    gaya: 'biasa',
    gambar: 'mati',
    materi: '',
    cara_bs: 'centang',
    jumlah_bentuk: null,
    sebaran_level: null,
    jumlah_tp: null,
    opsi_pg: null,
    skor_bentuk: null,
    ujian: null,
    rincian: null,
    atur_bentuk: null,
    skor_salah: null,
    durasi_menit: null,
    jumlah_gaya: null,
    bahasa_lain: '',
    konteks: '',
    aturan_tambahan: [],
    wajib_stimulus: false,
    soal_per_bacaan: null,
    skor_kesukaran: null,
    cakupan_pilih: null,
    variasi_sendiri: null,
    panjang_stimulus: null,
    petunjuk_bagian: null,
    urutan_bentuk: null,
    gaya_pembahasan: null,
  };
}

const KATA = ['apel', 'jeruk', 'mangga', 'buku', 'pensil', 'kelereng', 'bola', 'kue', 'gelas', 'piring', 'sepeda', 'layang'];
const NAMA = ['Ani', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko', 'Kirana', 'Lukas'];

/** Jawaban PG penjumlahan yang lolos pemeriksa; nomor menentukan angka dan konteks. */
function jawabanSoal(nomor: number): JawabanAi {
  const a = 100 + nomor * 37;
  const b = 11 + nomor;
  const isi = {
    bentuk: 'pilihan_ganda',
    pokok: `${NAMA[nomor % NAMA.length]} memiliki ${a} ${KATA[nomor % KATA.length]} lalu membeli ${b} lagi di pasar nomor ${nomor * 7}. Berapa banyak ${KATA[nomor % KATA.length]} sekarang?`,
    opsi: { A: String(a + b), B: String(a + b + 10), C: String(a + b - 1), D: String(a - b) },
    kunci: 'A',
    pembahasan: [`${a} + ${b} = ${a + b}`],
    verifikasi: { tipe: 'ekspresi', ekspresi: `${a} + ${b}`, nilai: String(a + b) },
    gambar: null,
    meta: { tp: 'x', indikator: 'Disajikan soal cerita, peserta didik dapat menjumlahkan.', level: 'C3', kesukaran: 'sedang' },
  };
  return { teks: JSON.stringify(isi), token_masuk: 100, token_keluar: 50, sisa_kuota: null };
}

/** Model palsu yang menjawab setelah jeda dan mencatat berapa permintaan berjalan bersamaan. */
function modelLambat(opsi: { jedaMs?: number; nomor?: (panggil: number) => number } = {}) {
  let panggil = 0;
  let jalan = 0;
  let puncak = 0;
  const kirim = async (): Promise<JawabanAi> => {
    panggil++;
    const ke = panggil;
    jalan++;
    puncak = Math.max(puncak, jalan);
    await new Promise((r) => setTimeout(r, opsi.jedaMs ?? 15));
    jalan--;
    return jawabanSoal(opsi.nomor ? opsi.nomor(ke) : ke);
  };
  return { kirim, jumlah: () => panggil, puncak: () => puncak };
}

const MODEL = { penyedia: 'gemini' as const, model: 'uji-serentak', kunci: 'x' };

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await simpanProfil({ batas_harian: 1000 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('banyak butir serentak', () => {
  it('mengikuti batas per menit model', () => {
    expect(banyakSerentak(null)).toBe(MAKS_SERENTAK);
    expect(banyakSerentak(2)).toBe(1);
    expect(banyakSerentak(5)).toBe(2);
    expect(banyakSerentak(30)).toBe(3);
  });

  it('mengerjakan beberapa butir bersamaan dan semua soal tersimpan berurutan', async () => {
    const id = await buatPaket(param(9), 'Uji');
    const m = modelLambat();
    await pengatur.mulai(id, { perPermintaan: 1, pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 3 });
    expect(m.puncak()).toBe(3);
    const soal = await db.soal.where('paket_id').equals(id).toArray();
    expect(soal).toHaveLength(9);
    expect(soal.every((s) => s.status_mutu === 'terverifikasi_hitung')).toBe(true);
    expect(new Set(soal.map((s) => s.urutan)).size).toBe(9);
    // kunci tetap tersebar meski butir selesai bersamaan
    const hitung = new Map<string, number>();
    for (const s of soal) hitung.set(s.isi_json.kunci as string, (hitung.get(s.isi_json.kunci as string) ?? 0) + 1);
    expect(Math.max(...hitung.values()) - Math.min(...hitung.values())).toBeLessThanOrEqual(1);
    expect(hitung.size).toBe(4);
    expect((await db.paket_soal.get(id))?.status).toBe('siap');
  });

  it('serentak 1 tetap berurutan seperti sebelumnya', async () => {
    const id = await buatPaket(param(4), 'Uji');
    const m = modelLambat();
    await pengatur.mulai(id, { perPermintaan: 1, pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1 });
    expect(m.puncak()).toBe(1);
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(4);
  });

  it('dua butir serentak yang hasilnya kembar: satu ditolak lalu diganti', async () => {
    const id = await buatPaket(param(2), 'Uji');
    // Panggilan 1 dan 2 berjalan bersamaan dan menghasilkan soal yang sama persis.
    const m = modelLambat({ nomor: (ke) => (ke <= 2 ? 1 : ke) });
    await pengatur.mulai(id, { perPermintaan: 1, pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 2 });
    const lolos = (await db.soal.where('paket_id').equals(id).toArray()).filter((s) => s.status_mutu !== 'ditolak');
    expect(lolos).toHaveLength(2);
    expect(kemiripan(lolos[0].isi_json.pokok, lolos[1].isi_json.pokok)).toBeLessThan(0.8);
  });

  it('batas harian GenSoal tidak terlewati walau butir dikerjakan serentak', async () => {
    await simpanProfil({ batas_harian: 2 });
    const id = await buatPaket(param(6), 'Uji');
    const m = modelLambat();
    await pengatur.mulai(id, { perPermintaan: 1, pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 3 });
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(2);
    expect(m.jumlah()).toBe(2);
    expect(pengatur.ambil().pesan).toMatch(/Batas harian/);
  });

  it('kuota per hari model dijaga pembatas laju saat serentak: tidak ada permintaan melebihi RPD', async () => {
    await simpanProfil({ batas_model: { 'gemini|uji-rpd': { rpm: null, rpd: 4 } } });
    const m = modelLambat({ jedaMs: 20 });
    const asli = ADAPTOR.gemini;
    ADAPTOR.gemini = { ...asli, kirim: m.kirim } as Adaptor;
    try {
      const id = await buatPaket(param(6), 'Uji');
      await pengatur.mulai(id, { perPermintaan: 1, model: { penyedia: 'gemini', model: 'uji-rpd', kunci: 'x' }, cadangan: null, serentak: 3 });
      expect(m.jumlah()).toBe(4);
      expect(await db.soal.where('paket_id').equals(id).count()).toBe(4);
      expect(pengatur.ambil().jenisGalat).toBe('batas');
      expect(pengatur.ambil().pesan).toMatch(/Kuota harian/);
    } finally {
      ADAPTOR.gemini = asli;
    }
  });
});

describe('pembatas laju: jatah harian yang dipesan', () => {
  it('izin yang belum dilepas ikut dihitung dalam batas per hari', async () => {
    const p = new PembatasLaju();
    const o = { hitungHarian: async () => 1 };
    const lepas = await Promise.all([p.izin('gemini', 'r', { rpm: null, rpd: 3 }, o), p.izin('gemini', 'r', { rpm: null, rpd: 3 }, o)]);
    await expect(p.izin('gemini', 'r', { rpm: null, rpd: 3 }, o)).rejects.toMatchObject({ jenis: 'batas', batas: { lingkup: 'harian' } });
    lepas[0]();
    lepas[0](); // dua kali tidak melepas dua jatah
    expect(p.sedangDipesan('gemini', 'r')).toBe(1);
    await expect(p.izin('gemini', 'r', { rpm: null, rpd: 3 }, o)).resolves.toBeTypeOf('function');
  });

  it('jeda saat menunggu jendela per menit melepas jatah', async () => {
    const p = new PembatasLaju();
    let t = 0;
    const sekarang = () => t;
    await p.izin('gemini', 'j', { rpm: 1, rpd: 10 }, { sekarang, hitungHarian: async () => 0 });
    const kendali = new AbortController();
    const tunda = (_ms: number, signal?: AbortSignal) => new Promise<void>((_, gagal) => signal?.addEventListener('abort', () => gagal(new GalatAi('dibatalkan', 'Dijeda.'))));
    const tunggu = p.izin('gemini', 'j', { rpm: 1, rpd: 10 }, { sekarang, tunda, signal: kendali.signal, hitungHarian: async () => 0 });
    await new Promise((r) => setTimeout(r, 0));
    expect(p.sedangDipesan('gemini', 'j')).toBe(2);
    kendali.abort();
    await expect(tunggu).rejects.toMatchObject({ jenis: 'dibatalkan' });
    expect(p.sedangDipesan('gemini', 'j')).toBe(1);
  });

  it('batas per menit tetap terjaga untuk permintaan serentak', async () => {
    const p = new PembatasLaju();
    let t = 0;
    const tunda = async (ms: number) => {
      await new Promise((r) => setTimeout(r, 0));
      t += ms;
    };
    const waktu: number[] = [];
    await Promise.all(
      Array.from({ length: 9 }, async () => {
        await p.izin('gemini', 'w', { rpm: 3, rpd: null }, { sekarang: () => t, tunda });
        waktu.push(t);
      }),
    );
    for (const w of waktu) expect(waktu.filter((x) => x >= w && x < w + 60_000).length).toBeLessThanOrEqual(3);
  });
});

describe('batas waktu permintaan', () => {
  it('permintaan yang tidak dijawab menjadi galat server yang dicoba ulang, bukan galat jaringan', async () => {
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => new Promise((_, gagal) => init.signal?.addEventListener('abort', () => gagal(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    await expect(ambil('https://contoh.test', {}, 'Uji', 20)).rejects.toMatchObject({ jenis: 'server' });
  });

  it('jeda dari guru tetap menjadi dibatalkan', async () => {
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => new Promise((_, gagal) => init.signal?.addEventListener('abort', () => gagal(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    const k = new AbortController();
    const janji = ambil('https://contoh.test', { signal: k.signal }, 'Uji', 5_000);
    k.abort();
    await expect(janji).rejects.toMatchObject({ jenis: 'dibatalkan' });
  });
});

describe('penalaran singkat', () => {
  it('Gemini 2.5 memakai anggaran token, Gemini 3 ke atas memakai tingkat', () => {
    expect(konfigPenalaranGemini('gemini-2.5-flash', 'rendah')).toEqual({ thinkingBudget: 1024 });
    expect(konfigPenalaranGemini('gemini-3.8-flash', 'rendah')).toEqual({ thinkingLevel: 'low' });
    expect(konfigPenalaranGemini('gemini-3.8-flash', undefined)).toBeUndefined();
  });

  it('Gemini: dikirim bila diminta; ditolak sekali lalu dikirim tanpa thinkingConfig', async () => {
    const badan: Record<string, unknown>[] = [];
    let tolak = true;
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      badan.push(b);
      if (b.generationConfig.thinkingConfig && tolak) {
        tolak = false;
        return new Response(JSON.stringify({ error: { message: 'Unknown name "thinkingLevel" at generation_config.thinking_config' } }), { status: 400 });
      }
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } }));
    });
    await expect(gemini.kirim({ kunci: 'k', model: 'gemini-uji-tolak', sistem: 's', pesan: 'p', penalaran: 'rendah' })).rejects.toBeInstanceOf(GalatAi);
    await expect(gemini.kirim({ kunci: 'k', model: 'gemini-uji-tolak', sistem: 's', pesan: 'p', penalaran: 'rendah' })).resolves.toMatchObject({ teks: '{}' });
    expect((badan[0].generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect((badan[1].generationConfig as Record<string, unknown>).thinkingConfig).toBeUndefined();
  });

  it('Groq: reasoning_effort rendah hanya bila diminta', async () => {
    const badan: Record<string, unknown>[] = [];
    vi.stubGlobal('fetch', async (_u: string, init: RequestInit) => {
      badan.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }], usage: {} }));
    });
    await groq.kirim({ kunci: 'k', model: 'openai/gpt-oss-20b', sistem: 's', pesan: 'p', penalaran: 'rendah' });
    await groq.kirim({ kunci: 'k', model: 'openai/gpt-oss-20b', sistem: 's', pesan: 'p' });
    expect(badan[0].reasoning_effort).toBe('low');
    expect(badan[1].reasoning_effort).toBeUndefined();
  });
});
