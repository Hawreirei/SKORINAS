import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ADAPTOR } from '../src/ai';
import { butirPerPermintaan, MAKS_BUTIR_PER_PERMINTAAN } from '../src/ai/registri';
import type { Adaptor, JawabanAi, Registri } from '../src/ai/tipe';
import { hitungRencana } from '../src/app/rencana-buat';
import { simpanProfil } from '../src/db/profil';
import { db } from '../src/db/skema';
import type { ParameterPaket, Slot } from '../src/db/tipe';
import { soalLolos } from '../src/db/tipe';
import { buatKelompok, uraiKelompok } from '../src/generasi/butir';
import { buatPaket, jumlahLolosHariIni, pengatur } from '../src/generasi/pengatur';
import { SISTEM, SISTEM_KELOMPOK, susunPesan, susunPesanKelompok } from '../src/generasi/prompt';
import { kemiripan } from '../src/verifikasi/kemiripan';

// F-38: beberapa butir dalam satu permintaan agar kuota harian cukup untuk beberapa paket.

function param(n: number, ubah: Partial<ParameterPaket> = {}): ParameterPaket {
  return {
    kelas: 4,
    fase: 'B',
    mapel: 'Matematika',
    rumpun: 'matematika',
    cp: '',
    tp: [
      { id: '', rumusan: 'Peserta didik dapat menjumlahkan dua bilangan cacah sampai 1.000.', sumber: 'guru', versi: 1 },
      { id: '', rumusan: 'Peserta didik dapat mengurangkan dua bilangan cacah sampai 1.000.', sumber: 'guru', versi: 1 },
    ],
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
    ...ubah,
  };
}

const KATA = ['apel', 'jeruk', 'mangga', 'buku', 'pensil', 'kelereng', 'bola', 'kue', 'gelas', 'piring', 'sepeda', 'layang', 'topi', 'kaus', 'sendok', 'botol', 'tas', 'payung'];
const NAMA = ['Ani', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Intan', 'Joko', 'Kirana', 'Lukas', 'Made', 'Nia', 'Oki', 'Putu', 'Rina', 'Sari', 'Tono'];

/** Satu butir PG penjumlahan yang lolos pemeriksa (atau berkunci salah); u membuat angka dan konteks unik. */
function butirSoal(nomor: number, u: number, salah = false) {
  const a = 100 + u * 37;
  const b = 11 + u;
  const k = KATA[u % KATA.length];
  return {
    nomor,
    bentuk: 'pilihan_ganda',
    pokok: `${NAMA[u % NAMA.length]} memiliki ${a} ${k} lalu membeli ${b} lagi di pasar nomor ${u * 7}. Berapa banyak ${k} sekarang?`,
    opsi: { A: String(a + b), B: String(a + b + 10), C: String(a + b - 1), D: String(a - b) },
    kunci: salah ? 'B' : 'A',
    pembahasan: [`${a} + ${b} = ${a + b}`],
    verifikasi: { tipe: 'ekspresi', ekspresi: `${a} + ${b}`, nilai: String(salah ? a + b + 10 : a + b) },
    gambar: null,
    meta: { tp: 'x', indikator: 'Disajikan soal cerita, peserta didik dapat menjumlahkan.', level: 'C3', kesukaran: 'sedang' },
  };
}

/**
 * Model palsu berkelompok: membaca banyak butir dari pesan dan menjawab sebanyak itu.
 * salah(panggil, nomor) membuat butir tertentu berkunci salah; rusak(panggil, banyak) membuat jawaban terpotong.
 */
function modelKelompok(o: { salah?: (panggil: number, nomor: number) => boolean; rusak?: (panggil: number, banyak: number) => boolean; acak?: boolean } = {}) {
  let panggil = 0;
  let unik = 0;
  const banyakPerPanggil: number[] = [];
  const pesan: string[] = [];
  const sistem: string[] = [];
  const kirim = async (s: string, p: string): Promise<JawabanAi> => {
    panggil++;
    sistem.push(s);
    pesan.push(p);
    const banyak = Number(p.match(/## Daftar butir yang diminta \((\d+) butir\)/)?.[1] ?? 1);
    banyakPerPanggil.push(banyak);
    if (o.rusak?.(panggil, banyak)) return { teks: '{"butir": [{"nomor": 1, "bentuk": "pilihan_ganda", "pokok": "Terpo', token_masuk: 100, token_keluar: 50, sisa_kuota: null, terpotong: true };
    const butir = Array.from({ length: banyak }, (_, i) => butirSoal(i + 1, ++unik, o.salah?.(panggil, i + 1)));
    if (o.acak) butir.reverse();
    return { teks: JSON.stringify({ butir }), token_masuk: 1000, token_keluar: 400 * banyak, sisa_kuota: null };
  };
  return { kirim, jumlah: () => panggil, banyak: banyakPerPanggil, pesan, sistem };
}

const MODEL = { penyedia: 'gemini' as const, model: 'uji-kelompok', kunci: 'x' };

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  await simpanProfil({ batas_harian: 1000 });
});

afterEach(() => {
  // pengatur adalah tunggal; pastikan tidak ada pekerjaan yang tertinggal antaruji.
  pengatur.jeda();
});

describe('prompt berkelompok', () => {
  const slot = (urutan: number, ubah: Partial<Slot> = {}): Slot => ({ id: `s${urutan}`, urutan, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null, ...ubah });

  it('sistem meminta objek {"butir": [...]} dan butir yang saling berbeda', () => {
    expect(SISTEM_KELOMPOK).not.toBe(SISTEM);
    expect(SISTEM_KELOMPOK).toContain('{"butir": [...]}');
    expect(SISTEM_KELOMPOK).toContain('tidak boleh mirip dengan butir lain');
    expect(SISTEM_KELOMPOK).not.toContain('HANYA satu objek JSON sesuai skema');
  });

  it('konteks bersama dikirim sekali; tiap butir punya baris sendiri beserta alasan penolakan', () => {
    const pesan = susunPesanKelompok({
      param: param(3, { bentuk: ['pilihan_ganda', 'isian_singkat'] }),
      butir: [
        { slot: slot(1), alasanGagal: [] },
        { slot: slot(2, { tp_index: 1, kesukaran: 'sulit', level: 'C5' }), alasanGagal: ['Kunci tidak sesuai hitungan.'] },
        { slot: slot(3, { bentuk: 'isian_singkat', kesukaran: 'mudah', level: 'C1' }), alasanGagal: [] },
      ],
      pokokLain: ['Soal lama tentang kelereng'],
    });
    expect(pesan).toContain('## Daftar butir yang diminta (3 butir)');
    expect(pesan).toContain('TP 1: Peserta didik dapat menjumlahkan');
    expect(pesan).toContain('TP 2: Peserta didik dapat mengurangkan');
    expect(pesan).toMatch(/2\. Bentuk "pilihan_ganda"; kesukaran sulit; level C5;.*TP 2\./);
    expect(pesan).toMatch(/ditolak pemeriksa: Kunci tidak sesuai hitungan/);
    expect(pesan).toContain('"nomor": <nomor butir dari daftar>');
    expect(pesan).toContain('Soal lama tentang kelereng');
    expect(pesan.match(/## Aturan penulisan/g)).toHaveLength(1);
    expect(pesan.match(/Aturan verifikasi/g)).toHaveLength(1);
    expect(pesan).toContain('Isian singkat ("isian_singkat")');
    expect(pesan).toContain('tepat 3 objek');
  });

  it('aturan verifikasi menuntun tipe yang sering keliru (uji model 8 November 2026)', () => {
    for (const pesan of [susunPesanKelompok({ param: param(1), butir: [{ slot: slot(1), alasanGagal: [] }], pokokLain: [] }), susunPesan({ param: param(1), slot: slot(1), pokokLain: [], alasanGagal: [] })]) {
      expect(pesan).toContain('HANYA bila semua opsi berupa tanda perbandingan');
      expect(pesan).toContain('max(2/3, 3/4, 5/8)');
      expect(pesan).toContain('"nilai" adalah angka yang DISEBUT dalam pernyataan');
      expect(pesan).toContain('boleh memakai satuan');
    }
  });

  it('format TKA: level TKA disebut per butir', () => {
    const pesan = susunPesanKelompok({ param: param(2, { ujian: { id: 'tka-sd-matematika', daerah: '' } }), butir: [{ slot: slot(1, { level: 'C1' }), alasanGagal: [] }, { slot: slot(2, { level: 'C5' }), alasanGagal: [] }], pokokLain: [] });
    expect(pesan).toMatch(/1\. .*level C1 \(level TKA "/);
    expect(pesan).toMatch(/2\. .*level C5 \(level TKA "/);
    expect(pesan).not.toContain('Butir ini berlevel TKA');
  });
});

describe('membaca jawaban berkelompok', () => {
  it('mencocokkan menurut nomor, lalu menurut urutan', () => {
    expect(uraiKelompok({ butir: [{ nomor: 2, x: 'b' }, { nomor: 1, x: 'a' }] }, 2)).toEqual([{ nomor: 1, x: 'a' }, { nomor: 2, x: 'b' }]);
    expect(uraiKelompok([{ x: 'a' }, { x: 'b' }], 3)).toEqual([{ x: 'a' }, { x: 'b' }, undefined]);
    expect(uraiKelompok({ bentuk: 'pilihan_ganda' }, 1)).toEqual([{ bentuk: 'pilihan_ganda' }]);
    expect(() => uraiKelompok({ bentuk: 'pilihan_ganda' }, 2)).toThrow();
  });

  it('larik di tingkat teratas dan nomor terbalik tetap terbaca; tiap butir diperiksa sendiri', async () => {
    const p = param(3);
    const slots: Slot[] = [1, 2, 3].map((u) => ({ id: `s${u}`, urutan: u, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null }));
    const kirim = async (): Promise<JawabanAi> => ({ teks: '```json\n' + JSON.stringify([butirSoal(3, 3), butirSoal(2, 2, true), butirSoal(1, 1)]) + '\n```', token_masuk: 1, token_keluar: 1, sisa_kuota: null });
    const catat: number[] = [];
    const h = await buatKelompok(kirim, { param: p, butir: slots.map((slot) => ({ slot, alasanGagal: [] })), konteks: async () => ({ pokokLain: [], kunciTerpakai: {} }) }, (_j, n) => void catat.push(n));
    expect(h.butir.map((b) => b.ok)).toEqual([true, false, true]);
    expect(h.butir[0].isi?.pokok).toContain('pasar nomor 7');
    expect(h.butir[1].alasan.join(' ')).toMatch(/kunci|hitung/i);
    expect(catat).toEqual([2]);
  });

  it('butir kembar dalam satu jawaban: yang kedua ditolak', async () => {
    const slots: Slot[] = [1, 2].map((u) => ({ id: `s${u}`, urutan: u, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null }));
    const kirim = async (): Promise<JawabanAi> => ({ teks: JSON.stringify({ butir: [butirSoal(1, 5), butirSoal(2, 5)] }), token_masuk: 1, token_keluar: 1, sisa_kuota: null });
    const h = await buatKelompok(kirim, { param: param(2), butir: slots.map((slot) => ({ slot, alasanGagal: [] })), konteks: async () => ({ pokokLain: [], kunciTerpakai: {} }) });
    expect(h.butir.map((b) => b.ok)).toEqual([true, false]);
    expect(h.butir[1].alasan.join(' ')).toMatch(/mirip/);
  });
});

describe('pengatur berkelompok', () => {
  it('30 soal dengan 10 butir per permintaan: 3 permintaan, bukan 30', async () => {
    const id = await buatPaket(param(30), 'Uji');
    const m = modelKelompok();
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1, perPermintaan: 10 });
    expect(m.jumlah()).toBe(3);
    expect(m.sistem.every((s) => s === SISTEM_KELOMPOK)).toBe(true);
    const soal = await db.soal.where('paket_id').equals(id).toArray();
    expect(soal).toHaveLength(30);
    expect(soal.every((s) => s.status_mutu === 'terverifikasi_hitung')).toBe(true);
    expect(new Set(soal.map((s) => s.urutan)).size).toBe(30);
    // kunci tetap tersebar merata walau model selalu menaruh kunci di A
    const hitung = new Map<string, number>();
    for (const s of soal) hitung.set(s.isi_json.kunci as string, (hitung.get(s.isi_json.kunci as string) ?? 0) + 1);
    expect(Math.max(...hitung.values()) - Math.min(...hitung.values())).toBeLessThanOrEqual(1);
    // satu catatan pemakaian per permintaan, dengan banyak soal lolos di dalamnya
    const pakai = await db.pemakaian_ai.toArray();
    expect(pakai).toHaveLength(3);
    expect(pakai.reduce((n, p) => n + soalLolos(p), 0)).toBe(30);
    expect(await jumlahLolosHariIni()).toBe(30);
    expect((await db.paket_soal.get(id))?.status).toBe('siap');
    // biaya per soal dibagi rata dari permintaannya
    expect(soal.every((s) => s.biaya_usd === null || s.biaya_usd >= 0)).toBe(true);
  });

  it('butir yang ditolak ikut permintaan berikutnya bersama butir baru, tanpa permintaan tambahan sendiri', async () => {
    const id = await buatPaket(param(10), 'Uji');
    const m = modelKelompok({ salah: (panggil, nomor) => panggil === 1 && nomor === 2 });
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1, perPermintaan: 5 });
    // [1–5] → butir 2 ditolak → [2, 6–9] → [10]
    expect(m.banyak).toEqual([5, 5, 1]);
    expect(m.pesan[1]).toMatch(/1\. .*\n {3}Percobaan sebelumnya ditolak pemeriksa/);
    expect((await db.soal.where('paket_id').equals(id).toArray()).filter((s) => s.status_mutu !== 'ditolak')).toHaveLength(10);
  });

  it('butir yang selalu salah: tiga percobaan, putaran pengganti, lalu gagal tanpa menahan butir lain', async () => {
    const id = await buatPaket(param(4), 'Uji');
    const m = modelKelompok({ salah: (_p, nomor) => nomor === 1 });
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1, perPermintaan: 4 });
    const kerja = await db.pekerjaan_generasi.where('paket_id').equals(id).first();
    const gagal = kerja!.slot.filter((s) => s.status === 'gagal');
    expect(gagal).toHaveLength(1);
    expect(kerja!.slot.filter((s) => s.status === 'lolos')).toHaveLength(3);
    expect(gagal[0].percobaan).toBe(6);
    expect(m.jumlah()).toBe(6);
  });

  it('jawaban terpotong: kelompok berikutnya diperkecil sendiri', async () => {
    const id = await buatPaket(param(8), 'Uji');
    const m = modelKelompok({ rusak: (_p, banyak) => banyak > 2 });
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1, perPermintaan: 8 });
    expect(m.banyak[0]).toBe(8);
    expect(m.banyak[1]).toBe(4);
    expect(m.banyak[2]).toBe(2);
    expect(m.banyak.slice(2).every((b) => b <= 2)).toBe(true);
    expect((await db.soal.where('paket_id').equals(id).toArray()).filter((s) => s.status_mutu !== 'ditolak')).toHaveLength(8);
  });

  it('batas harian GenSoal: kelompok terakhir dipotong agar tidak terlewati', async () => {
    await simpanProfil({ batas_harian: 7 });
    const id = await buatPaket(param(10), 'Uji');
    const m = modelKelompok();
    await pengatur.mulai(id, { pengirim: m.kirim, model: MODEL, cadangan: null, serentak: 1, perPermintaan: 5 });
    expect(m.banyak).toEqual([5, 2]);
    expect(await db.soal.where('paket_id').equals(id).count()).toBe(7);
    expect(pengatur.ambil().pesan).toMatch(/Batas harian/);
  });

  it('kemiripan antarkelompok yang dikerjakan serentak tetap diperiksa', async () => {
    const id = await buatPaket(param(6), 'Uji');
    // Dua kelompok serentak menerima soal yang sama persis.
    let panggil = 0;
    const kirim = async (_s: string, p: string): Promise<JawabanAi> => {
      const ke = ++panggil;
      const banyak = Number(p.match(/\((\d+) butir\)/)?.[1] ?? 1);
      await new Promise((r) => setTimeout(r, 10));
      return { teks: JSON.stringify({ butir: Array.from({ length: banyak }, (_, i) => butirSoal(i + 1, ke <= 2 ? i + 1 : ke * 10 + i)) }), token_masuk: 1, token_keluar: 1, sisa_kuota: null };
    };
    await pengatur.mulai(id, { pengirim: kirim, model: MODEL, cadangan: null, serentak: 2, perPermintaan: 3 });
    const lolos = (await db.soal.where('paket_id').equals(id).toArray()).filter((s) => s.status_mutu !== 'ditolak');
    expect(lolos).toHaveLength(6);
    for (let i = 0; i < lolos.length; i++) for (let j = i + 1; j < lolos.length; j++) expect(kemiripan(lolos[i].isi_json.pokok, lolos[j].isi_json.pokok)).toBeLessThan(0.8);
  });

  it('kuota 20 permintaan per hari cukup untuk lebih dari satu paket 30 soal', async () => {
    await simpanProfil({ batas_model: { 'gemini|uji-paket': { rpm: null, rpd: 20 } } });
    const m = modelKelompok({ salah: (panggil, nomor) => panggil % 3 === 0 && nomor <= 2 });
    const asli = ADAPTOR.gemini;
    ADAPTOR.gemini = { ...asli, kirim: (p) => m.kirim(p.sistem, p.pesan) } as Adaptor;
    try {
      const model = { penyedia: 'gemini' as const, model: 'uji-paket', kunci: 'x' };
      let paketSiap = 0;
      for (let i = 0; i < 6; i++) {
        const id = await buatPaket(param(30), `Paket ${i + 1}`);
        await pengatur.mulai(id, { model, cadangan: null, perPermintaan: 10 });
        if ((await db.paket_soal.get(id))?.status === 'siap') paketSiap++;
        else break;
      }
      expect(paketSiap).toBeGreaterThanOrEqual(4);
      expect(m.jumlah()).toBeLessThanOrEqual(20);
      expect(pengatur.ambil().pesan).toMatch(/Kuota harian/);
    } finally {
      ADAPTOR.gemini = asli;
    }
  });
});

describe('registri dan perkiraan', () => {
  it('butir per permintaan dari registri, dibatasi 1–10, bawaan 5', () => {
    const reg = { penyedia: [{ id: 'gemini', model: [{ id: 'a', butir_per_permintaan: 10 }, { id: 'b', butir_per_permintaan: 50 }, { id: 'c' }] }] } as unknown as Registri;
    expect(butirPerPermintaan(reg, 'gemini', 'a')).toBe(10);
    expect(butirPerPermintaan(reg, 'gemini', 'b')).toBe(MAKS_BUTIR_PER_PERMINTAAN);
    expect(butirPerPermintaan(reg, 'gemini', 'c')).toBe(5);
    expect(butirPerPermintaan(null, 'groq', 'x')).toBe(5);
  });

  it('panel Rencana: permintaan dihitung per kelompok dan menyebut berapa paket lagi yang cukup', () => {
    const r = hitungRencana({ n: 30, rpm: 5, rpd: 20, terpakaiHariIni: 0, adaCadangan: false, tokenRata: null, biayaHariIni: null, batasBiayaUsd: 1, perPermintaan: 10 });
    expect(r.permintaanMin).toBe(3);
    expect(r.permintaanMaks).toBe(4);
    expect(r.kuotaKurang).toBe(false);
    expect(r.paketCukup).toBe(5);
    expect(r.menit).toBeNull();
    // tanpa kelompok seperti sebelumnya
    const lama = hitungRencana({ n: 30, rpm: 5, rpd: 20, terpakaiHariIni: 0, adaCadangan: false, tokenRata: null, biayaHariIni: null, batasBiayaUsd: 1 });
    expect(lama.permintaanMin).toBe(30);
    expect(lama.kuotaKurang).toBe(true);
    expect(lama.paketCukup).toBe(0);
  });
});

describe('pilihan ganda dengan pernyataan per opsi', () => {
  const isi = {
    bentuk: 'pilihan_ganda' as const,
    pokok: 'Di antara pecahan-pecahan berikut, pecahan yang nilainya lebih besar dari $\\frac{3}{5}$ adalah ....',
    opsi: { A: '$\\frac{1}{2}$', B: '$\\frac{4}{10}$', C: '$\\frac{7}{10}$', D: '$\\frac{4}{15}$' },
    kunci: 'C',
    pembahasan: ['3/5 = 6/10. Pecahan yang lebih dari 6/10 hanya 7/10.'],
    verifikasi: {
      tipe: 'per_opsi' as const,
      opsi: { A: { kiri: '1/2', relasi: '>', kanan: '3/5' }, B: { kiri: '4/10', relasi: '>', kanan: '3/5' }, C: { kiri: '7/10', relasi: '>', kanan: '3/5' }, D: { kiri: '4/15', relasi: '>', kanan: '3/5' } },
    },
    gambar: null,
    meta: { tp: 'x', indikator: 'Disajikan beberapa pecahan, peserta didik dapat membandingkan pecahan.', level: 'C3' as const, kesukaran: 'sedang' as const },
  };

  it('penyeimbang kunci menukar pernyataan bersama opsinya sehingga verifikasi tetap sesuai', async () => {
    const { seimbangkanKunci } = await import('../src/verifikasi/acak');
    const { periksaHitung } = await import('../src/verifikasi/matematika');
    expect(periksaHitung(isi, 'id').hasil).toBe('lolos');
    const baru = seimbangkanKunci(isi, { B: 2, C: 2, D: 2 });
    expect(baru.kunci).toBe('A');
    expect(baru.opsi?.A).toBe('$\\frac{7}{10}$');
    expect(baru.verifikasi.tipe === 'per_opsi' && baru.verifikasi.opsi.A?.kiri).toBe('7/10');
    expect(periksaHitung(baru, 'id').hasil).toBe('lolos');
  });

  it('pilihan ganda kompleks tetap memakai aturannya sendiri', async () => {
    const { periksaHitung } = await import('../src/verifikasi/matematika');
    expect(periksaHitung({ ...isi, bentuk: 'uraian' }, 'id').alasan).toMatch(/hanya untuk pilihan ganda dan pilihan ganda kompleks/);
  });
});
