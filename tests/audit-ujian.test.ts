import { describe, expect, it } from 'vitest';
import { isianDariUjian, isianKosong, keParameter } from '../src/app/isian-buat';
import type { IsiSoal } from '../src/db/tipe';
import { faseDariKelas } from '../src/kurikulum/fase';
import { paketUntuk } from '../src/paket';
import { contohAcuan, susunPesan, susunPesanKelompok } from '../src/generasi/prompt';
import { kelompokkanBacaan } from '../src/generasi/bacaan';
import { rencanakanSlot } from '../src/generasi/rencana';
import { beriVariasi } from '../src/generasi/variasi';
import { FORMAT_UJIAN, formatUjian } from '../src/ujian';
import { cakupanFormat, kuotaElemen, rumusanCakupan } from '../src/ujian/cakupan';
import { RINGKAS_KERANGKA } from '../src/ujian/kerangka';
import { periksaSoal } from '../src/verifikasi';

// Audit semua format ujian (permintaan pemilik, 8 November 2026): tanpa CP dan TP guru, setiap format harus
// menyebar soal ke cakupan materinya, dan setiap prompt (satu butir maupun kelompok) harus membawa TP butirnya.

function acakTetap(benih: number): () => number {
  let s = benih;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

/** Isian layar Buat dari format; mapel pilihan TKA SMA diisi tiap mapel dari daftar sarannya. */
function isianFormat(): { id: string; mapel: string }[] {
  // Teori Kompetensi Kejuruan (SMK) mengikuti program keahlian: tanpa cakupan, guru mengisi TP.
  return FORMAT_UJIAN.flatMap((u) => (u.mapel ? [{ id: u.id, mapel: u.mapel }] : (u.saranMapel ?? []).filter((m) => !/kompetensi kejuruan/i.test(m)).map((m) => ({ id: u.id, mapel: m }))));
}

describe('audit format ujian: cakupan materi', () => {
  it('kerangka resmi pusmendik: 76 mapel, TKA SD Matematika memuat semua butir matriks resmi', () => {
    expect(Object.keys(RINGKAS_KERANGKA)).toHaveLength(76);
    const sd = cakupanFormat('tka-sd-matematika')!.butir.map((b) => b.butir.replace(/ \(batasan:.*$/, ''));
    for (const b of ['Pecahan senilai menggunakan gambar dan simbol matematika', 'Kelipatan, faktor, KPK, dan FPB bilangan asli', 'Laju perubahan (kecepatan)', 'Penaksiran ukuran', 'Penyajian data (gambar, piktogram, diagram batang, dan tabel frekuensi)'])
      expect(sd).toContain(b);
    // Butir dari baris tambalan (halaman resmi terpotong) tetap ada.
    expect(cakupanFormat('tka-sma-matematika')!.butir.some((b) => b.sub === 'Peluang')).toBe(true);
    expect(Object.keys(cakupanFormat('tka-sma-pilihan', 'Kimia')!.porsi)).toEqual(['Kimia Dasar', 'Kimia Analitik', 'Kimia Fisik', 'Kimia Organik']);
  });

  it('setiap format (termasuk tiap mapel pilihan TKA SMA dan tiap bidang OSN) punya cakupan materi', () => {
    const tanpa = isianFormat().filter((x) => !cakupanFormat(x.id, x.mapel));
    expect(tanpa).toEqual([]);
  });

  it('setiap elemen berporsi punya butir, dan butir tidak kembar', () => {
    for (const x of isianFormat()) {
      const c = cakupanFormat(x.id, x.mapel)!;
      for (const e of Object.keys(c.porsi)) expect(c.butir.some((b) => b.elemen === e), `${x.id} ${x.mapel}: ${e}`).toBe(true);
      const r = c.butir.map(rumusanCakupan);
      expect(new Set(r).size, `${x.id} ${x.mapel}`).toBe(r.length);
    }
  });

  it('daftar mapel pilihan: 19 mapel Kepmendikdasmen 56/2026 ditambah 50 program keahlian SMK (Teori Kompetensi Kejuruan) dari kerangka pusmendik', () => {
    const saran = formatUjian('tka-sma-pilihan')!.saranMapel!;
    expect(saran).toHaveLength(69);
    expect(saran.filter((m) => m.startsWith('SMK - '))).toHaveLength(50);
    expect(saran).toContain('SMK - Kuliner');
    expect(cakupanFormat('tka-sma-pilihan', 'Kuliner')).toEqual(cakupanFormat('tka-sma-pilihan', 'SMK - Kuliner'));
    expect(saran).toContain('Matematika Lanjutan');
    expect(saran).toContain('PPKn/Pendidikan Pancasila');
    expect(saran).toContain('Produk/Projek Kreatif dan Kewirausahaan');
    expect(cakupanFormat('tka-sma-pilihan', 'Teori Kompetensi Kejuruan')).toBeNull();
    // Nama lama tetap dikenali.
    expect(cakupanFormat('tka-sma-pilihan', 'Matematika Tingkat Lanjut')).toEqual(cakupanFormat('tka-sma-pilihan', 'Matematika Lanjutan'));
  });

  it('atribut resmi Kepmendikdasmen 56/2026: durasi, skala nilai, numerasi dan literasi AN, rambu penulisan', () => {
    const menit = (id: string) => formatUjian(id)!.asli.menit;
    expect([menit('tka-sd-matematika'), menit('tka-sd-bindo'), menit('tka-smp-matematika'), menit('tka-smp-bindo')]).toEqual([75, 75, 75, 75]);
    expect([menit('tka-sma-bindo'), menit('tka-sma-matematika'), menit('tka-sma-binggris'), menit('tka-sma-pilihan')]).toEqual([60, 70, 50, 50]);
    expect(formatUjian('tka-sd-matematika')!.penilaian).toContain('0–100');
    expect(formatUjian('tka-sma-matematika')!.penilaian).toContain('200–800');
    for (const id of ['tka-sd-matematika', 'tka-smp-matematika', 'tka-sma-matematika']) expect(formatUjian(id)!.aturan.join(' '), id).toContain('numerasi Asesmen Nasional');
    for (const id of ['tka-sd-bindo', 'tka-smp-bindo', 'tka-sma-bindo']) expect(formatUjian(id)!.aturan.join(' '), id).toContain('literasi membaca Asesmen Nasional');
    // Elemen Matematika SD tanpa aljabar dan peluang.
    expect(formatUjian('tka-sd-matematika')!.aturan.join(' ')).toContain('Elemen Matematika TKA SD: Bilangan, Geometri dan Pengukuran, serta Data');
    expect(formatUjian('tka-sd-matematika')!.aturan.join(' ')).not.toContain('Data dan Peluang');
    for (const u of FORMAT_UJIAN.filter((x) => x.keluarga !== 'OSN')) expect(u.aturan.join(' '), u.id).toContain('nama tokoh yang masih hidup');
  });

  it('nama mapel pilihan tidak peka huruf besar dan spasi', () => {
    expect(cakupanFormat('tka-sma-pilihan', '  fisika ')).toEqual(cakupanFormat('tka-sma-pilihan', 'Fisika'));
    expect(cakupanFormat('tka-sma-pilihan', 'Mapel tak dikenal')).toBeNull();
  });

  it('TKA SD Matematika 30 soal tersebar ke Bilangan, Geometri dan Pengukuran, dan Data (bukan hanya pecahan)', () => {
    const k = kuotaElemen(cakupanFormat('tka-sd-matematika')!, 30);
    expect(k.map((e) => [e.elemen, e.soal])).toEqual([
      ['Bilangan', 15],
      ['Geometri dan Pengukuran', 9],
      ['Data', 6],
    ]);
    const p = keParameter(isianDariUjian({ ...isianKosong(), mapel: '' }, 'tka-sd-matematika'), acakTetap(3));
    const pecahan = p.tp.filter((t) => /pecahan|desimal|persen/i.test(t.rumusan)).reduce((a, t) => a + (p.jumlah_tp![p.tp.indexOf(t)] ?? 0), 0);
    expect(pecahan).toBeLessThanOrEqual(10);
    expect(p.tp.some((t) => t.rumusan.startsWith('Geometri dan Pengukuran ›'))).toBe(true);
    expect(p.tp.some((t) => t.rumusan.startsWith('Data ›'))).toBe(true);
  });
});

describe('audit format ujian: dari isian sampai prompt', () => {
  for (const x of isianFormat()) {
    it(`${x.id}${formatUjian(x.id)!.mapel ? '' : ` (${x.mapel})`}: TP dari cakupan, slot memakai banyak TP, prompt membawa TP`, () => {
      const f = isianDariUjian({ ...isianKosong(), mapel: x.mapel }, x.id);
      const p = keParameter({ ...f, mapel: x.mapel }, acakTetap(7));
      expect(p.tp.length).toBeGreaterThan(1);
      expect(p.tp.every((t) => t.sumber === 'ujian')).toBe(true);
      expect(p.jumlah_tp?.reduce((a, b) => a + b, 0)).toBe(p.n);

      const slot = kelompokkanBacaan(beriVariasi(rencanakanSlot(p), p, acakTetap(5)), p.soal_per_bacaan);
      expect(slot).toHaveLength(p.n);
      // Bacaan bersama: satu TP per bacaan, bergiliran atas semua TP; banyak bacaan bisa lebih sedikit dari TP.
      const tpTerpakai = new Set(slot.map((s) => s.tp_index)).size;
      const bacaan = new Set(slot.map((s) => s.kelompok).filter(Boolean)).size;
      expect(tpTerpakai).toBe(p.soal_per_bacaan ? Math.min(p.tp.length, bacaan + slot.filter((s) => !s.kelompok).length) : p.tp.length);

      // Satu butir.
      const s0 = slot[0];
      const satu = susunPesan({ param: p, slot: s0, pokokLain: [], alasanGagal: [] });
      expect(satu).toContain(p.tp[s0.tp_index].rumusan);
      expect(satu).toContain(formatUjian(x.id)!.nama);

      // Kelompok berbentuk sama, seperti pengatur.
      const sama = slot.filter((s) => s.bentuk === s0.bentuk).slice(0, 5);
      const kel = susunPesanKelompok({ param: p, butir: sama.map((s) => ({ slot: s, alasanGagal: [], bacaan: s.kelompok ? { id: s.kelompok, teks: 'Bacaan uji.' } : null })), pokokLain: [] });
      for (const s of sama) expect(kel).toContain(`TP ${s.tp_index + 1}: ${p.tp[s.tp_index].rumusan}`);

      if (p.wajib_stimulus) {
        expect(satu).toMatch(/## (Stimulus \(wajib\)|Bacaan bersama)/);
        expect(kel).toMatch(/## (Stimulus \(wajib|Bacaan bersama)/);
        const tanpaBacaan = sama.filter((s) => !s.kelompok && s.bentuk !== 'menjodohkan');
        for (const s of tanpaBacaan) expect(kel).toContain(`bentuk stimulus: ${s.variasi!.stimulus}`);
      }
    });
  }

  it('kelompok TKA: tiap butir mendapat tema, bentuk stimulus, dan tokoh sendiri', () => {
    const p = keParameter(isianDariUjian({ ...isianKosong(), mapel: '' }, 'tka-sd-matematika'), acakTetap(2));
    const slot = beriVariasi(rencanakanSlot(p), p, acakTetap(4)).filter((s) => s.bentuk === 'pilihan_ganda').slice(0, 5);
    const kel = susunPesanKelompok({ param: p, butir: slot.map((s) => ({ slot: s, alasanGagal: [] })), pokokLain: [] });
    for (const s of slot) {
      expect(kel).toContain(`tema "${s.variasi!.tema}"`);
      expect(kel).toContain(`tokoh utama bernama ${s.variasi!.tokoh}`);
    }
    expect(kel).toContain('Setiap butir mengukur TP yang disebut pada barisnya sendiri');
  });

  it('kelompok bahasa TKA: bacaan bersama ditulis sekali, butirnya hanya bertanya, kompetensi membaca per butir', () => {
    const p = keParameter(isianDariUjian({ ...isianKosong(), mapel: '' }, 'tka-smp-bindo'), acakTetap(2));
    const slot = kelompokkanBacaan(beriVariasi(rencanakanSlot(p), p, acakTetap(4)), p.soal_per_bacaan).slice(0, 3);
    expect(new Set(slot.map((s) => s.kelompok)).size).toBe(1);
    const kel = susunPesanKelompok({ param: p, butir: slot.map((s) => ({ slot: s, alasanGagal: [], bacaan: { id: s.kelompok!, teks: 'Teks bacaan uji tentang kebun teh.' } })), pokokLain: [] });
    expect(kel.split('Teks bacaan uji tentang kebun teh.')).toHaveLength(2);
    expect(kel).toContain('Memakai Bacaan A; "pokok" hanya pertanyaan.');
    expect(kel).toMatch(/Kompetensi membaca: (Pemahaman Tekstual|Pemahaman Inferensial|Evaluasi dan Apresiasi): /);
    expect(kel).not.toContain('## Stimulus (wajib');
  });
});

describe('contoh acuan Matematika', () => {
  const paket = paketUntuk('matematika')!;

  it('beragam topik: tidak didominasi pecahan', () => {
    const pecahan = paket.contohAcuan.filter((c) => /frac|pecahan/.test(c.pokok ?? '')).length;
    expect(pecahan / paket.contohAcuan.length).toBeLessThan(0.4);
  });

  it('dipakai bergiliran menurut nomor butir', () => {
    const a = contohAcuan(paket.contohAcuan, 'pilihan_ganda', 1);
    const b = contohAcuan(paket.contohAcuan, 'pilihan_ganda', 2);
    expect(a).not.toBe(b);
    expect(contohAcuan(paket.contohAcuan, 'pilihan_ganda', 0).bentuk).toBe('pilihan_ganda');
  });

  it('setiap contoh yang dapat dihitung lolos pemeriksa (contoh tidak boleh mengajarkan kunci salah)', () => {
    for (const c of paket.contohAcuan) {
      const isi = { ...(c as IsiSoal), meta: { tp: 'acuan', indikator: 'Indikator acuan', level: 'C3', kesukaran: 'sedang' } } as IsiSoal;
      const h = periksaSoal(isi, { rumpun: 'matematika', kelas: 6, fase: faseDariKelas(6), lokal: 'id', literasi: false, pokokLain: [], gambarDiizinkan: true });
      if (isi.verifikasi.tipe === 'tidak_ada') continue;
      expect(h.lolos && h.hitung?.hasil, `${c.bentuk}: ${c.pokok?.slice(0, 40)} ${JSON.stringify(h)}`).toBe('lolos');
    }
  });
});
