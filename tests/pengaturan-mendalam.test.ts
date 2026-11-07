import Dexie from 'dexie';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import kategoriGolden from '../data/golden/kategori.json';
import { galatKartu, isianDariParameter, isianDariUjian, isianKosong, keParameter, terapkanPilihanCakupan, type Isian } from '../src/app/isian-buat';
import { GenSoalDb } from '../src/db/skema';
import type { IsiSoal, Kesukaran, ParameterPaket, Slot, Soal } from '../src/db/tipe';
import { petaKategori, teksKategori } from '../src/db/tipe';
import { buatDocx } from '../src/ekspor/docx';
import { bangunDokumen, teksKunci } from '../src/ekspor/model';
import { buatTex } from '../src/ekspor/tex';
import { bacaBacaan, buatBacaan, kelompokkanBacaan, pesanBacaan } from '../src/generasi/bacaan';
import { buatButir } from '../src/generasi/butir';
import { rincianBentuk, susunPesan } from '../src/generasi/prompt';
import { rencanakanSlot, urutanBentuk } from '../src/generasi/rencana';
import { beriVariasi, panjangStimulus } from '../src/generasi/variasi';
import { faseDariKelas } from '../src/kurikulum/fase';
import { cakupanFormat, rumusanCakupan } from '../src/ujian/cakupan';
import { periksaSoal } from '../src/verifikasi';
import { periksaKaidah } from '../src/verifikasi/kaidah';
import { bacaIsiSoal, GalatSkema } from '../src/verifikasi/skema';
import { periksaStimulus } from '../src/verifikasi/stimulus';
import { paketUji, profilUji, soalUji } from './bantu-soal';

const meta = { tp: 'TP', indikator: 'Disajikan cerita, peserta didik dapat menentukan kebenaran pernyataan.', level: 'C3' as const, kesukaran: 'sedang' as const };
const param = (u: Partial<ParameterPaket> = {}): ParameterPaket => ({ ...paketUji().parameter_json, ...u });
const slot = (u: Partial<Slot> = {}): Slot => ({ id: 's', urutan: 1, tp_index: 0, kesukaran: 'sedang', level: 'C3', bentuk: 'pilihan_ganda', status: 'menunggu', percobaan: 0, pengganti: false, galat: null, soal_id: null, ...u });
const isian = (u: Partial<Isian> = {}): Isian => ({ ...isianKosong(), kelas: 9, mapel: 'Matematika', ...u });
const OPSI = { kop: true, kunci: true, kisi: true, pembahasan: true };

function soalDari(isi: Omit<IsiSoal, 'meta'>, u: Partial<Soal> = {}): Soal {
  const dasar = soalUji()[0];
  return { ...dasar, id: u.id ?? Math.random().toString(36), bentuk: isi.bentuk, isi_json: { ...(isi as IsiSoal), meta }, status_mutu: 'terverifikasi_hitung', ...u };
}

describe('PG kompleks kategori: kunci', () => {
  it('membaca B-S, label kategori, Y/T, 1/2, dan daftar', () => {
    expect(petaKategori('B-S-B', 3)).toEqual([0, 1, 0]);
    expect(petaKategori('Benar, Salah, Benar', 3)).toEqual([0, 1, 0]);
    expect(petaKategori(['Fakta', 'Opini'], 2, ['Fakta', 'Opini'])).toEqual([0, 1]);
    expect(petaKategori('Sesuai - Tidak sesuai', 2, ['Sesuai', 'Tidak sesuai'])).toEqual([0, 1]);
    expect(petaKategori('1 2 2', 3)).toEqual([0, 1, 1]);
    expect(petaKategori('B-S', 3)).toEqual([0, 1, -1]);
    expect(teksKategori([0, 1, 1, 0])).toBe('B-S-S-B');
  });
});

describe('PG kompleks kategori: skema, kaidah, dan golden hitung', () => {
  const mentah = { bentuk: 'pilihan_ganda_kategori', pokok: 'Cerita.', pernyataan: ['a', 'b', 'c'], kunci: ['Sesuai', 'Tidak sesuai', 'Sesuai'], pembahasan: ['x'], verifikasi: { tipe: 'tidak_ada' }, gambar: null, meta };
  const harapan = { bentuk: 'pilihan_ganda_kategori' as const, level: 'C3' as const, kesukaran: 'sedang' as const, tp: 'TP', kategori: ['Sesuai', 'Tidak sesuai'] as [string, string] };

  it('skema menyimpan pernyataan, label, dan kunci baku', () => {
    const isi = bacaIsiSoal(mentah, harapan);
    expect(isi).toMatchObject({ pernyataan: ['a', 'b', 'c'], kategori: ['Sesuai', 'Tidak sesuai'], kunci: 'B-S-B' });
  });

  it('skema menolak pernyataan kurang dari 3 atau kunci tidak lengkap', () => {
    const galat = (o: object) => {
      try {
        bacaIsiSoal({ ...mentah, ...o }, harapan);
        return [];
      } catch (e) {
        return (e as GalatSkema).daftar;
      }
    };
    expect(galat({ pernyataan: ['a', 'b'] })[0]).toMatch(/3 sampai 6 pernyataan/);
    expect(galat({ kunci: 'B-S' })[0]).toMatch(/satu kategori untuk setiap pernyataan/);
  });

  it('kaidah: pernyataan kembar ditolak, satu kategori saja hanya catatan', () => {
    const isi = { ...bacaIsiSoal(mentah, harapan), pernyataan: ['a', 'a', 'c'] };
    expect(periksaKaidah(isi, { kelas: 9, fase: 'D', lokal: 'id', literasi: true, pokokLain: [] }).keras).toContain('Ada pernyataan yang sama.');
    const sama = { ...bacaIsiSoal(mentah, harapan), kunci: 'B-B-B' };
    expect(periksaKaidah(sama, { kelas: 9, fase: 'D', lokal: 'id', literasi: true, pokokLain: [] }).lunak).toContain('Semua pernyataan berkategori sama; sebaiknya kedua kategori muncul.');
  });

  const cek = (b: { kelas: number; isi: object }) => periksaSoal({ ...(b.isi as IsiSoal), meta }, { rumpun: 'matematika', kelas: b.kelas, fase: faseDariKelas(b.kelas), lokal: 'id', literasi: true, pokokLain: [], gambarDiizinkan: true });
  it.each(kategoriGolden.benar.map((b) => [b.id, b] as const))('golden %s lolos hitung ulang', (_, b) => {
    const h = cek(b);
    expect(h.alasan, h.alasan.join('; ')).toEqual([]);
    expect(h.status_mutu).toBe('terverifikasi_hitung');
  });
  it.each(kategoriGolden.salah.map((b) => [b.id, b] as const))('golden %s ditolak', (_, b) => {
    expect(cek(b).lolos).toBe(false);
  });
  it('setiap butir benar yang satu kuncinya dibalik ditolak', () => {
    for (const b of kategoriGolden.benar) {
      const n = b.isi.pernyataan.length;
      for (let i = 0; i < n; i++) {
        const peta = petaKategori(b.isi.kunci, n).map((j, k) => (k === i ? 1 - j : j));
        expect(cek({ ...b, isi: { ...b.isi, kunci: teksKategori(peta) } }).lolos, `${b.id} pernyataan ${i + 1}`).toBe(false);
      }
    }
  });
});

describe('PG kompleks kategori: prompt dan ekspor', () => {
  it('prompt menyebut label dan banyak pernyataan dari guru', () => {
    const r = rincianBentuk(param({ atur_bentuk: { pgk_benar: null, jodoh: null, isian: null, uraian: null, kategori: { label: ['Fakta', 'Opini'], pernyataan: 5 } } }), 'pilihan_ganda_kategori');
    expect(r).toContain('Kategori pertama "Fakta", kategori kedua "Opini"; tulis tepat 5 pernyataan.');
  });

  const isiKategori = kategoriGolden.benar[0].isi as Omit<IsiSoal, 'meta'>;
  const pk = paketUji();
  const d = bangunDokumen(pk, [soalDari(isiKategori, { id: 'k1', urutan: 1 })], profilUji(), OPSI);
  it('bagian, petunjuk, dan kunci berlabel', () => {
    expect(d.bagian[0].judul).toBe('A. Pilihan Ganda Kompleks Kategori');
    expect(d.bagian[0].petunjuk).toContain('Tentukan Benar atau Salah untuk setiap pernyataan');
    expect(teksKunci(d.bagian[0].butir[0].soal, false)).toBe('1. Benar; 2. Benar; 3. Salah; 4. Benar');
  });
  it('Word memuat tabel pernyataan; LaTeX memuat tabel kategori', async () => {
    const zip = await JSZip.loadAsync(await (await buatDocx(d, async () => new Uint8Array())).arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Pernyataan');
    expect(xml).toContain('Pilihan Ganda Kompleks Kategori');
    expect(buatTex(d)).toContain('\\textbf{Benar} & \\textbf{Salah}');
  });
});

describe('bacaan bersama', () => {
  const s = rencanakanSlot({ n: 9, persen: [30, 50, 20], bentuk: ['pilihan_ganda', 'benar_salah'], tp: [{ id: '', rumusan: 'A' }, { id: '', rumusan: 'B' }], jumlah_bentuk: { pilihan_ganda: 7, benar_salah: 2 } });

  it('mengelompokkan dalam satu bentuk; sisa satu soal bergabung ke kelompok sebelumnya; benar-salah tidak', () => {
    const k = kelompokkanBacaan(s, 3);
    const pg = k.filter((x) => x.bentuk === 'pilihan_ganda');
    expect(pg.map((x) => x.kelompok)).toEqual(['bacaan-1', 'bacaan-1', 'bacaan-1', 'bacaan-2', 'bacaan-2', 'bacaan-2', 'bacaan-2']);
    expect(k.filter((x) => x.bentuk === 'benar_salah').every((x) => !x.kelompok)).toBe(true);
    // Anggota memakai TP ketua.
    expect(new Set(pg.slice(0, 3).map((x) => x.tp_index)).size).toBe(1);
    expect(kelompokkanBacaan(s, null)).toBe(s);
  });

  it('permintaan bacaan menyebut banyak soal, TP, dan tokoh; keluaran diperiksa panjangnya', () => {
    const p = param({ kelas: 9, rumpun: 'bahasa', tp: [{ id: 't', rumusan: 'Teks berita' }] });
    const pesan = pesanBacaan(p, slot({ variasi: { tema: 'pasar', stimulus: 'x', tokoh: 'Daeng' } }), 3);
    expect(pesan).toContain('Bacaan untuk 3 soal tentang: Teks berita.');
    expect(pesan).toContain('Tokoh utama bernama Daeng.');
    expect(() => bacaBacaan('{"bacaan": "Terlalu pendek. Sekali. Dua."}', p)).toThrow(/terlalu pendek/);
    const panjang = Array.from({ length: 20 }, (_, i) => `Kalimat ke-${i + 1} menceritakan kegiatan warga di pasar pagi itu.`).join(' ');
    expect(bacaBacaan(JSON.stringify({ bacaan: panjang }), p)).toBe(panjang);
  });

  it('buatBacaan mencoba ulang lalu mengembalikan bacaan yang sah', async () => {
    const panjang = Array.from({ length: 20 }, (_, i) => `Kalimat ke-${i + 1} menceritakan kegiatan warga di pasar pagi itu.`).join(' ');
    const jawab = ['{"bacaan": "pendek."}', JSON.stringify({ bacaan: panjang })];
    let n = 0;
    const teks = await buatBacaan(async () => ({ teks: jawab[n++], token_masuk: 1, token_keluar: 1, sisa_kuota: null }), param({ kelas: 9, rumpun: 'bahasa' }), slot(), 3);
    expect(teks).toBe(panjang);
    expect(n).toBe(2);
  });

  it('butir anggota memakai bacaan: prompt tanpa stimulus sendiri, isi menyimpan bacaan, pemeriksa stimulus dilewati', async () => {
    const bacaan = 'Di sebuah desa, warga menanam padi di sawah terasering. Setiap petak menghasilkan 120 kg gabah. Pak Made memiliki 15 petak.';
    const pesan = susunPesan({ param: param({ wajib_stimulus: true }), slot: slot(), pokokLain: [], alasanGagal: [], bacaan });
    expect(pesan).toContain('## Bacaan bersama (sudah ditulis, dipakai beberapa soal)');
    expect(pesan).not.toContain('## Stimulus (wajib)');
    const butirAi = { bentuk: 'pilihan_ganda', pokok: 'Berapa kg gabah yang dihasilkan Pak Made?', opsi: { A: '1.800 kg', B: '1.500 kg', C: '135 kg', D: '1.200 kg' }, kunci: 'A', pembahasan: ['15 × 120 = 1.800'], verifikasi: { tipe: 'ekspresi', ekspresi: '15 * 120', nilai: '1800' }, gambar: null, meta: { ...meta, level: 'C3', kesukaran: 'sedang' } };
    const h = await buatButir(async () => ({ teks: JSON.stringify(butirAi), token_masuk: 1, token_keluar: 1, sisa_kuota: null }), { param: param({ wajib_stimulus: true, kelas: 6 }), slot: slot(), pokokLain: [], kunciTerpakai: {}, bacaan: { id: 'bacaan-1', teks: bacaan } });
    expect(h.ok).toBe(true);
    expect(h.isi!.stimulus).toEqual({ id: 'bacaan-1', teks: bacaan });
  });

  it('ekspor mencetak bacaan sekali dengan rentang nomor', () => {
    const st = { id: 'b1', teks: 'Paragraf satu.\nParagraf dua.' };
    const pg = soalUji().filter((x) => x.bentuk === 'pilihan_ganda').slice(0, 3);
    const soal = pg.map((x, i) => ({ ...x, isi_json: { ...x.isi_json, stimulus: i < 2 ? st : null } }));
    const d = bangunDokumen(paketUji(), soal, profilUji(), OPSI);
    const butir = d.bagian[0].butir;
    expect(butir[0].bacaan).toEqual({ teks: st.teks, dari: 1, sampai: 2 });
    expect(butir[1].bacaan).toBeUndefined();
    expect(buatTex(d)).toContain('Bacalah teks berikut untuk menjawab soal nomor 1–2.');
  });
});

describe('skor per kesukaran', () => {
  it('skor tiap soal dicetak dan pedoman penskoran per tingkat', () => {
    const pk = paketUji();
    const sk: Record<Kesukaran, { benar: number; salah: number }> = { mudah: { benar: 2, salah: 0 }, sedang: { benar: 4, salah: 1 }, sulit: { benar: 6, salah: 1 } };
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, skor_kesukaran: sk, skor_bentuk: { pilihan_ganda: 9 } } }, soalUji(), profilUji(), OPSI);
    expect(d.bagian[0].butir[0].skorButir).toBe(4);
    expect(d.bagian[0].petunjuk).toContain('Skor tiap soal tertera di akhir soal.');
    expect(d.bagian[0].skor).toBeNull();
    expect(d.penskoran).toMatchObject({ perKesukaran: true, baris: [{ bentuk: 'Soal sedang', skor: 4 }] });
    expect(d.penskoran!.catatan).toEqual(['Soal sedang: jawaban salah dikurangi 1, jawaban kosong 0.']);
    expect(buatTex(bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, skor_kesukaran: sk } }, soalUji(), profilUji(), OPSI, 'kunci'))).toContain('Tingkat kesukaran');
  });
  it('rubrik uraian mengikuti skor kesukarannya', () => {
    const r = rincianBentuk(param({ skor_kesukaran: { mudah: { benar: 2, salah: 0 }, sedang: { benar: 4, salah: 0 }, sulit: { benar: 8, salah: 0 } } }), 'uraian', 'sulit');
    expect(r).toContain('Skor soal ini 8: jumlah skor dalam kurung pada rubrik harus 8.');
  });
});

describe('cakupan pilihan, variasi sendiri, panjang stimulus, urutan, petunjuk, pembahasan', () => {
  it('cakupan: hanya butir dicentang dan porsi dari guru', () => {
    const c = cakupanFormat('tka-smp-matematika')!;
    const pilih = c.butir.filter((b) => b.elemen === 'Aljabar').map(rumusanCakupan);
    const t = terapkanPilihanCakupan(c, { butir: pilih, porsi: { Aljabar: 3 } });
    expect(Object.keys(t.porsi)).toEqual(['Aljabar']);
    const p = keParameter({ ...isianDariUjian(isian(), 'tka-smp-matematika'), cakupanPilih: { butir: pilih, porsi: null } });
    expect(p.tp.every((x) => x.rumusan.startsWith('Aljabar ›'))).toBe(true);
    expect(galatKartu({ ...isianDariUjian(isian(), 'tka-smp-matematika'), cakupanPilih: { butir: [], porsi: null } }).susunan).toContain('Centang sedikitnya satu butir cakupan materi.');
  });

  it('variasi sendiri menggantikan daftar bawaan', () => {
    const v = beriVariasi([slot(), slot({ id: 't' })], { wajib_stimulus: true, rumpun: 'matematika', variasi_sendiri: { tema: ['panen kopi'], tokoh: ['La Ode'], stimulus: [] } });
    expect(v.map((x) => x.variasi!.tema)).toEqual(['panen kopi', 'panen kopi']);
    expect(v[0].variasi!.tokoh).toBe('La Ode');
    const p = keParameter(isian({ temaTeks: 'a\n\nb', tokohTeks: '', stimulusTeks: 'resep' }));
    expect(p.variasi_sendiri).toEqual({ tema: ['a', 'b'], tokoh: [], stimulus: ['resep'] });
  });

  it('panjang stimulus sendiri dipakai prompt dan pemeriksa', () => {
    expect(panjangStimulus(6, false, { min: 100, maks: 150 })).toEqual({ min: 70, sasaran: [100, 150] });
    const pendek = { bentuk: 'pilihan_ganda', pokok: 'Ani menabung uang sakunya setiap hari di sebuah celengan bambu buatan ayahnya. Setelah satu pekan berjalan, uang di celengan itu bertambah cukup banyak karena ia juga mendapat hadiah dari nenek. Berapa uang Ani sekarang?', opsi: {}, kunci: 'A', pembahasan: [], verifikasi: { tipe: 'tidak_ada' }, gambar: null, meta } as unknown as IsiSoal;
    expect(periksaStimulus(pendek, { kelas: 6, bahasa: false })).toEqual([]);
    expect(periksaStimulus(pendek, { kelas: 6, bahasa: false, panjang: { min: 100, maks: 150 } })[0]).toMatch(/terlalu pendek/);
  });

  it('urutan bentuk dipakai rencana dan lembar soal', () => {
    expect(urutanBentuk({ urutan_bentuk: ['uraian', 'pilihan_ganda'] }).slice(0, 3)).toEqual(['uraian', 'pilihan_ganda', 'pilihan_ganda_kompleks']);
    const s = rencanakanSlot({ n: 4, persen: [30, 50, 20], bentuk: ['pilihan_ganda', 'uraian'], tp: [{ id: '', rumusan: 'A' }], urutan_bentuk: ['uraian'] });
    expect(s[0].bentuk).toBe('uraian');
    const pk = paketUji();
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, urutan_bentuk: ['uraian', 'isian_singkat'] } }, soalUji(), profilUji(), OPSI);
    expect(d.bagian.map((b) => b.bentuk).slice(0, 2)).toEqual(['uraian', 'isian_singkat']);
  });

  it('petunjuk bagian sendiri dan gaya pembahasan', () => {
    const pk = paketUji();
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, petunjuk_bagian: { pilihan_ganda: 'Lingkari jawaban yang benar.' } } }, soalUji(), profilUji(), OPSI);
    expect(d.bagian[0].petunjuk).toBe('Lingkari jawaban yang benar.');
    expect(susunPesan({ param: param({ gaya_pembahasan: 'dddj' }), slot: slot(), pokokLain: [], alasanGagal: [] })).toContain('Diketahui–Ditanya–Dijawab');
    const p = keParameter(isian({ petunjukBagian: { pilihan_ganda: '  ', uraian: ' Tulis rapi. ' } }));
    expect(p.petunjuk_bagian).toEqual({ uraian: 'Tulis rapi.' });
  });

  it('isian ↔ parameter untuk semua isian baru', () => {
    const f = isian({ soalPerBacaan: 3, skorKesukaran: { mudah: { benar: 1, salah: 0 }, sedang: { benar: 2, salah: 0 }, sulit: { benar: 3, salah: 1 } }, panjangStimulus: { min: 40, maks: 90 }, urutanBentuk: ['uraian'], gayaPembahasan: 'langkah', temaTeks: 'kebun' });
    const balik = isianDariParameter(keParameter(f));
    expect(balik).toMatchObject({ soalPerBacaan: 3, skorKesukaran: f.skorKesukaran, panjangStimulus: f.panjangStimulus, urutanBentuk: ['uraian'], gayaPembahasan: 'langkah', temaTeks: 'kebun' });
  });

  it('format TKA: PG kompleks kategori sungguhan; Bahasa memakai bacaan bersama', () => {
    expect(isianDariUjian(isian(), 'tka-sd-matematika').jumlahBentuk).toEqual({ pilihan_ganda: 19, pilihan_ganda_kompleks: 5, pilihan_ganda_kategori: 6 });
    expect(isianDariUjian(isian(), 'tka-smp-bindo').soalPerBacaan).toBe(3);
    expect(isianDariUjian(isian(), 'tka-smp-matematika').soalPerBacaan).toBeNull();
  });
});

describe('migrasi skema versi 7', () => {
  it('paket lama mendapat isian baru bernilai null', async () => {
    const nama = `uji-migrasi-7-${Math.random()}`;
    const lama = new Dexie(nama);
    lama.version(6).stores({
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
    await lama.table('preset').add({ id: 'p1', nama: 'Lama', parameter_json: { kelas: 6, mapel: 'Matematika', tp: [], bentuk: ['pilihan_ganda'], wajib_stimulus: true }, terakhir_dipakai: 0 });
    lama.close();
    const baru = new GenSoalDb(nama);
    await baru.open();
    expect((await baru.preset.get('p1'))!.parameter_json).toMatchObject({ wajib_stimulus: true, soal_per_bacaan: null, skor_kesukaran: null, cakupan_pilih: null, variasi_sendiri: null, panjang_stimulus: null, petunjuk_bagian: null, urutan_bentuk: null, gaya_pembahasan: null });
    baru.close();
    await Dexie.delete(nama);
  });
});

describe('PDF: kategori, bacaan bersama, dan skor per soal', () => {
  it('menghasilkan PDF tanpa galat', async () => {
    const { readFileSync, writeFileSync } = await import('node:fs');
    const { buatPdf } = await import('../src/ekspor/pdf');
    const st = { id: 'b1', teks: 'Koperasi sekolah mencatat penjualan buku tulis selama empat hari. Hari Senin terjual 24 buku, Selasa 30 buku, Rabu 18 buku, dan Kamis 28 buku.\nHarga satu buku Rp4.500. Bendahara ingin mengetahui hasil penjualan dan hari dengan penjualan terbanyak.' };
    const pg = soalUji()
      .filter((x) => x.bentuk === 'pilihan_ganda')
      .slice(0, 2)
      .map((x) => ({ ...x, isi_json: { ...x.isi_json, stimulus: st } }));
    const kat = soalDari(kategoriGolden.benar[0].isi as Omit<IsiSoal, 'meta'>, { id: 'k1', urutan: 9 });
    const pk = paketUji();
    const d = bangunDokumen({ ...pk, parameter_json: { ...pk.parameter_json, skor_kesukaran: { mudah: { benar: 1, salah: 0 }, sedang: { benar: 2, salah: 0 }, sulit: { benar: 3, salah: 0 } } } }, [...pg, kat], profilUji(), OPSI);
    const blob = await buatPdf(d, {
      fontBiasa: readFileSync('public/fonts/LiberationSerif-Regular.ttf').toString('base64'),
      fontTebal: readFileSync('public/fonts/LiberationSerif-Bold.ttf').toString('base64'),
      fontMiring: readFileSync('public/fonts/LiberationSerif-Italic.ttf').toString('base64'),
      gambarSvg: async () => {},
    });
    const buf = Buffer.from(await blob.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    if (process.env.PDF_KELUAR) writeFileSync(process.env.PDF_KELUAR, buf);
  }, 60000);
});
