import type { AturBentuk, BahasaSoal, BarisRincian, Bentuk, CaraBenarSalah, GayaPembahasan, GayaSoal, Kesukaran, Level, ModeGambar, ParameterPaket, TpDipakai, UjianDipakai } from '../db/tipe';
import { GAYA, kesukaranDariLevel, LEVEL } from '../db/tipe';
import { bagiKomposisi } from '../generasi/komposisi';
import { bentukDipakai, galatKomposisi, rencanakanSlot, URUTAN_BENTUK } from '../generasi/rencana';
import { faseDariKelas } from '../kurikulum/fase';
import { rumpunDariMapel } from '../paket';
import { bagiPorsi, formatUjian, isianUjian } from '../ujian';
import { cakupanFormat, pilihCakupan, rumusanCakupan, type Cakupan } from '../ujian/cakupan';
import { kunciKerangka, PANJANG_TEKS } from '../ujian/kerangka';
import { SKOR_BAWAAN } from './rencana-buat';

/**
 * Isian layar Buat dan perubahannya (opsi lanjutan v2, F-36). Dipisah dari komponen agar dapat diuji:
 * isian ↔ parameter paket, format ujian, pembagian ulang jumlah, susunan per baris, dan galat per kartu.
 */
export interface Isian {
  kelas: number;
  mapel: string;
  cp: string;
  tpTeks: string;
  tpAsal: TpDipakai[];
  n: number;
  persen: [number, number, number];
  bentuk: Bentuk[];
  bahasa: BahasaSoal;
  gaya: GayaSoal;
  gambar: ModeGambar;
  materi: string;
  cara_bs: CaraBenarSalah;
  jumlahBentuk: Partial<Record<Bentuk, number>> | null;
  sebaranLevel: Partial<Record<Level, number>> | null;
  jumlahTp: number[] | null;
  opsiPg: 3 | 4 | 5 | null;
  skorBentuk: Partial<Record<Bentuk, number>> | null;
  ujian: UjianDipakai | null;
  rincian: BarisRincian[] | null;
  aturBentuk: AturBentuk;
  skorSalah: Partial<Record<Bentuk, number>> | null;
  durasi: number | null;
  jumlahGaya: Partial<Record<GayaSoal, number>> | null;
  bahasaLain: string;
  konteks: string;
  /** Aturan tambahan untuk AI, satu aturan per baris. */
  aturanTeks: string;
  wajibStimulus: boolean;
  // ---- Pengaturan mendalam (F-40) ----
  soalPerBacaan: number | null;
  skorKesukaran: Record<Kesukaran, { benar: number; salah: number }> | null;
  cakupanPilih: { butir: string[] | null; porsi: Record<string, number> | null } | null;
  /** Daftar variasi sendiri sebagai teks, satu per baris. */
  temaTeks: string;
  tokohTeks: string;
  stimulusTeks: string;
  panjangStimulus: { min: number; maks: number } | null;
  petunjukBagian: Partial<Record<Bentuk, string>> | null;
  urutanBentuk: Bentuk[] | null;
  gayaPembahasan: GayaPembahasan | null;
}

export const ATUR_BENTUK_KOSONG: AturBentuk = { pgk_benar: null, jodoh: null, isian: null, uraian: null };

export function isianKosong(): Isian {
  return {
    kelas: 0,
    mapel: '',
    cp: '',
    tpTeks: '',
    tpAsal: [],
    n: 10,
    persen: [30, 50, 20],
    bentuk: ['pilihan_ganda'],
    bahasa: 'id',
    gaya: 'biasa',
    gambar: 'terprogram',
    materi: '',
    cara_bs: 'centang',
    jumlahBentuk: null,
    sebaranLevel: null,
    jumlahTp: null,
    opsiPg: null,
    skorBentuk: null,
    ujian: null,
    rincian: null,
    aturBentuk: ATUR_BENTUK_KOSONG,
    skorSalah: null,
    durasi: null,
    jumlahGaya: null,
    bahasaLain: '',
    konteks: '',
    aturanTeks: '',
    wajibStimulus: false,
    soalPerBacaan: null,
    skorKesukaran: null,
    cakupanPilih: null,
    temaTeks: '',
    tokohTeks: '',
    stimulusTeks: '',
    panjangStimulus: null,
    petunjukBagian: null,
    urutanBentuk: null,
    gayaPembahasan: null,
  };
}

export function isianDariParameter(p: ParameterPaket): Isian {
  return {
    kelas: p.kelas,
    mapel: p.mapel,
    cp: p.cp,
    // TP dari cakupan format ujian tidak dikembalikan ke isian: paket berikutnya memilih cakupan baru.
    tpTeks: p.tp.filter((t) => t.sumber !== 'ujian').map((t) => t.rumusan).join('\n'),
    tpAsal: p.tp,
    n: p.n,
    persen: p.persen,
    bentuk: p.bentuk,
    bahasa: p.bahasa,
    gaya: p.gaya,
    gambar: p.gambar,
    materi: p.materi,
    cara_bs: p.cara_bs ?? 'centang',
    jumlahBentuk: p.jumlah_bentuk ?? null,
    sebaranLevel: p.sebaran_level ?? null,
    jumlahTp: p.tp.some((t) => t.sumber === 'ujian') ? null : (p.jumlah_tp ?? null),
    opsiPg: p.opsi_pg ?? null,
    skorBentuk: p.skor_bentuk ?? null,
    ujian: p.ujian ?? null,
    rincian: p.rincian ?? null,
    aturBentuk: { ...ATUR_BENTUK_KOSONG, ...p.atur_bentuk },
    skorSalah: p.skor_salah ?? null,
    durasi: p.durasi_menit ?? null,
    jumlahGaya: p.jumlah_gaya ?? null,
    bahasaLain: p.bahasa_lain ?? '',
    konteks: p.konteks ?? '',
    aturanTeks: (p.aturan_tambahan ?? []).join('\n'),
    wajibStimulus: p.wajib_stimulus ?? false,
    soalPerBacaan: p.soal_per_bacaan ?? null,
    skorKesukaran: p.skor_kesukaran ?? null,
    cakupanPilih: p.cakupan_pilih ?? null,
    temaTeks: (p.variasi_sendiri?.tema ?? []).join('\n'),
    tokohTeks: (p.variasi_sendiri?.tokoh ?? []).join('\n'),
    stimulusTeks: (p.variasi_sendiri?.stimulus ?? []).join('\n'),
    panjangStimulus: p.panjang_stimulus ?? null,
    petunjukBagian: p.petunjuk_bagian ?? null,
    urutanBentuk: p.urutan_bentuk ?? null,
    gayaPembahasan: p.gaya_pembahasan ?? null,
  };
}

export function barisTp(teks: string): string[] {
  return teks
    .split('\n')
    .map((t) => t.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** TP yang dipakai: baris TP; bila kosong, CP; bila keduanya kosong, mapel sebagai topik. */
export function tpUntuk(f: Isian): string[] {
  const tp = barisTp(f.tpTeks);
  if (tp.length) return tp;
  if (f.cp.trim()) return [f.cp.trim()];
  return f.mapel.trim() ? [`Materi ${f.mapel.trim()} kelas ${f.kelas}`] : [];
}

/** Jumlah per bentuk hanya untuk bentuk yang dicentang. */
export function jumlahBentukDipakai(f: Isian): Partial<Record<Bentuk, number>> | null {
  return f.jumlahBentuk ? Object.fromEntries(URUTAN_BENTUK.filter((b) => f.bentuk.includes(b)).map((b) => [b, f.jumlahBentuk![b] ?? 0])) : null;
}

/** Bentuk yang benar-benar dipakai isian ini (dari susunan per baris, jumlah per bentuk, atau centang). */
export function bentukIsian(f: Isian): Bentuk[] {
  return bentukDipakai({ bentuk: f.bentuk, jumlah_bentuk: jumlahBentukDipakai(f), rincian: f.rincian });
}

/** Aturan tambahan dari teks, satu per baris, tanpa baris kosong dan tanda daftar di awal. */
export function aturanDariTeks(teks: string): string[] {
  return barisTp(teks);
}

/** Rincian tiap bentuk yang berlaku: hanya bagian untuk bentuk yang dipakai; null bila semuanya bawaan. */
function aturBentukDipakai(f: Isian, bentuk: Bentuk[]): AturBentuk | null {
  const a: AturBentuk = {
    pgk_benar: bentuk.includes('pilihan_ganda_kompleks') ? f.aturBentuk.pgk_benar : null,
    jodoh: bentuk.includes('menjodohkan') ? f.aturBentuk.jodoh : null,
    isian: bentuk.includes('isian_singkat') && f.aturBentuk.isian !== 'bebas' ? f.aturBentuk.isian : null,
    uraian: bentuk.includes('uraian') ? f.aturBentuk.uraian : null,
    kategori: bentuk.includes('pilihan_ganda_kategori') ? (f.aturBentuk.kategori ?? null) : null,
  };
  return Object.values(a).some((x) => x !== null) ? a : null;
}

/** Masukan rencana butir dari isian, untuk galat dan pratinjau jumlah. */
export function masukanRencana(f: Isian) {
  const tp = tpUntuk(f).map((rumusan) => ({ id: '', rumusan }));
  const aturTp = barisTp(f.tpTeks).length > 1;
  return {
    n: f.n,
    persen: f.persen,
    bentuk: URUTAN_BENTUK.filter((b) => f.bentuk.includes(b)),
    tp: tp.length ? tp : [{ id: '', rumusan: '' }],
    jumlah_bentuk: jumlahBentukDipakai(f),
    sebaran_level: f.sebaranLevel,
    jumlah_tp: aturTp ? f.jumlahTp : null,
    rincian: f.rincian,
    jumlah_gaya: f.jumlahGaya,
  };
}

/** Cakupan format ujian yang dipakai bila guru mengosongkan CP dan TP; null bila tidak berlaku. */
export function cakupanIsian(f: Pick<Isian, 'tpTeks' | 'cp' | 'ujian' | 'mapel'>): Cakupan | null {
  return !barisTp(f.tpTeks).length && !f.cp.trim() ? cakupanFormat(f.ujian?.id, f.mapel) : null;
}

export function keParameter(f: Isian, acak: () => number = Math.random): ParameterPaket {
  const cakupanAsli = cakupanIsian(f);
  const cakupan = cakupanAsli ? terapkanPilihanCakupan(cakupanAsli, f.cakupanPilih) : null;
  const pilihan = cakupan ? pilihCakupan(cakupan, f.n, acak) : null;
  const tp: TpDipakai[] = pilihan
    ? pilihan.rumusan.map((rumusan) => ({ id: '', rumusan, sumber: 'ujian', versi: 1 }))
    : tpUntuk(f).map((rumusan) => {
        const asal = f.tpAsal.find((t) => t.rumusan === rumusan);
        return { id: asal?.id ?? '', rumusan, sumber: 'guru', versi: 1 };
      });
  const jumlah_bentuk = f.rincian ? null : jumlahBentukDipakai(f);
  const bentuk = bentukDipakai({ bentuk: f.bentuk, jumlah_bentuk, rincian: f.rincian });
  const skor = (x: Partial<Record<Bentuk, number>> | null, bawaan: (b: Bentuk) => number) => (x ? Object.fromEntries(bentuk.map((b) => [b, x[b] ?? bawaan(b)])) : null);
  const skorSalah = f.skorBentuk && f.skorSalah ? skor(f.skorSalah, () => 0) : null;
  return {
    kelas: f.kelas,
    fase: faseDariKelas(f.kelas),
    mapel: f.mapel.trim(),
    rumpun: rumpunDariMapel(f.mapel),
    cp: f.cp.trim(),
    tp,
    n: f.n,
    persen: f.persen,
    bentuk,
    bahasa: f.bahasa,
    gaya: f.jumlahGaya ? (GAYA.find((g) => (f.jumlahGaya![g] ?? 0) > 0) ?? f.gaya) : f.gaya,
    gambar: f.gambar,
    materi: f.materi,
    cara_bs: f.cara_bs,
    jumlah_bentuk,
    sebaran_level: f.rincian ? null : f.sebaranLevel,
    // Jumlah per TP hanya berlaku bila TP ditulis guru, sejajar baris TP.
    // Cakupan format ujian: jumlah per butir cakupan mengikuti porsi elemennya.
    jumlah_tp: f.rincian ? null : pilihan ? (pilihan.rumusan.length > 1 ? pilihan.jumlah : null) : f.jumlahTp && f.jumlahTp.length === tp.length && barisTp(f.tpTeks).length > 1 ? f.jumlahTp : null,
    opsi_pg: f.opsiPg,
    skor_bentuk: skor(f.skorBentuk, (b) => SKOR_BAWAAN[b]),
    ujian: f.ujian && formatUjian(f.ujian.id) ? { id: f.ujian.id, daerah: f.ujian.daerah.trim() } : null,
    rincian: f.rincian ? f.rincian.filter((r) => r.jumlah > 0) : null,
    atur_bentuk: aturBentukDipakai(f, bentuk),
    skor_salah: skorSalah && Object.values(skorSalah).some((x) => (x ?? 0) > 0) ? skorSalah : null,
    durasi_menit: f.durasi && f.durasi > 0 ? f.durasi : null,
    jumlah_gaya: f.jumlahGaya ? Object.fromEntries(GAYA.filter((g) => (f.jumlahGaya![g] ?? 0) > 0).map((g) => [g, f.jumlahGaya![g]!])) : null,
    bahasa_lain: f.bahasa === 'lain' ? f.bahasaLain.trim() : '',
    konteks: f.konteks.trim(),
    aturan_tambahan: aturanDariTeks(f.aturanTeks),
    wajib_stimulus: f.wajibStimulus,
    soal_per_bacaan: f.soalPerBacaan && f.soalPerBacaan >= 2 ? f.soalPerBacaan : null,
    skor_kesukaran: f.skorKesukaran,
    cakupan_pilih: cakupanAsli ? f.cakupanPilih : null,
    variasi_sendiri: (() => {
      const v = { tema: aturanDariTeks(f.temaTeks), tokoh: aturanDariTeks(f.tokohTeks), stimulus: aturanDariTeks(f.stimulusTeks) };
      return v.tema.length || v.tokoh.length || v.stimulus.length ? v : null;
    })(),
    // Panjang teks kerangka resmi untuk mapel bahasa tertentu (mis. Bahasa Jepang paling banyak 50 kata) bila guru tidak mengatur.
    panjang_stimulus: f.panjangStimulus ?? PANJANG_TEKS[kunciKerangka(f.ujian?.id, f.mapel) ?? ''] ?? null,
    petunjuk_bagian: f.petunjukBagian && Object.values(f.petunjukBagian).some((x) => x?.trim()) ? Object.fromEntries(Object.entries(f.petunjukBagian).filter(([, x]) => x?.trim()).map(([b, x]) => [b, x!.trim()])) : null,
    urutan_bentuk: f.urutanBentuk,
    gaya_pembahasan: f.gayaPembahasan,
  };
}

/** Terapkan pilihan guru pada cakupan format: hanya butir yang dicentang dan porsi elemen yang diatur. */
export function terapkanPilihanCakupan(c: Cakupan, pilih: Isian['cakupanPilih']): Cakupan {
  if (!pilih) return c;
  const butir = pilih.butir ? c.butir.filter((b) => pilih.butir!.includes(rumusanCakupan(b))) : c.butir;
  const porsi = Object.fromEntries(Object.entries({ ...c.porsi, ...pilih.porsi }).filter(([e, x]) => x > 0 && butir.some((b) => b.elemen === e)));
  return Object.keys(porsi).length ? { porsi, butir } : c;
}

/** Isian dari format ujian: menimpa kelas, jumlah soal, bentuk, level, opsi, rincian bentuk, skor, waktu, gaya, bahasa, gambar, dan aturan tambahan. */
export function isianDariUjian(f: Isian, id: string): Isian {
  const u = formatUjian(id);
  if (!u) return { ...f, ujian: null };
  const x = isianUjian(u);
  return {
    ...f,
    kelas: x.kelas,
    mapel: x.mapel ?? (u.saranMapel?.some((m) => m === f.mapel.trim()) ? f.mapel : ''),
    n: x.n,
    bentuk: x.bentuk,
    jumlahBentuk: x.jumlah_bentuk,
    sebaranLevel: x.sebaran_level,
    rincian: null,
    persen: [30, 50, 20],
    opsiPg: x.opsi_pg,
    aturBentuk: { ...ATUR_BENTUK_KOSONG, ...x.atur_bentuk },
    skorBentuk: x.skor_bentuk,
    skorSalah: null,
    durasi: x.durasi_menit,
    gaya: x.gaya,
    jumlahGaya: null,
    bahasa: x.bahasa,
    gambar: x.gambar,
    aturanTeks: x.aturan_tambahan.join('\n'),
    wajibStimulus: x.wajib_stimulus,
    soalPerBacaan: x.soal_per_bacaan,
    cakupanPilih: null,
    ujian: { id, daerah: f.ujian?.daerah ?? '' },
  };
}

function samaJumlah(a: Partial<Record<string, number>>, b: Partial<Record<string, number>>): boolean {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => (a[k] ?? 0) === (b[k] ?? 0));
}

/**
 * Jumlah soal berubah. Saat format ujian dipakai, jumlah per bentuk dan per level dibagi ulang menurut porsinya
 * (selama guru belum mengubahnya, dari porsi format agar pembulatan tidak bergeser). Campuran gaya selalu
 * dibagi ulang menurut porsinya sendiri. Susunan per baris tidak diubah: totalnya ditandai bila tidak pas.
 */
export function ubahJumlah(f: Isian, n: number): Isian {
  if (n === f.n) return f;
  const hasil: Isian = { ...f, n, jumlahGaya: f.jumlahGaya ? bagiPorsi(f.jumlahGaya, n, GAYA) : null };
  const u = formatUjian(f.ujian?.id);
  if (!u) return hasil;
  const asal = isianUjian(u, f.n);
  const bentuk = f.jumlahBentuk && samaJumlah(f.jumlahBentuk, asal.jumlah_bentuk) ? u.porsiBentuk : f.jumlahBentuk;
  const level = f.sebaranLevel && samaJumlah(f.sebaranLevel, asal.sebaran_level) ? u.porsiLevel : f.sebaranLevel;
  return {
    ...hasil,
    jumlahBentuk: bentuk ? bagiPorsi(bentuk, n, URUTAN_BENTUK) : null,
    sebaranLevel: level ? bagiPorsi(level, n, LEVEL) : null,
  };
}

/** Susunan per baris dari pengaturan sekarang: satu baris per pasangan bentuk dan level, TP bergiliran. */
export function rincianDariIsian(f: Isian): BarisRincian[] {
  let slot;
  try {
    slot = rencanakanSlot({ ...masukanRencana(f), rincian: null, jumlah_gaya: null });
  } catch {
    const b = bentukIsian(f)[0] ?? 'pilihan_ganda';
    return [{ bentuk: b, level: 'C3', tp: null, jumlah: f.n }];
  }
  const peta = new Map<string, BarisRincian>();
  for (const s of slot) {
    const k = `${s.bentuk}|${s.level}`;
    const r = peta.get(k) ?? { bentuk: s.bentuk, level: s.level, tp: null, jumlah: 0 };
    r.jumlah++;
    peta.set(k, r);
  }
  return [...peta.values()];
}

/** Kuota mudah, sedang, sulit yang akan dibuat (untuk ringkasan). */
export function kuotaKesukaran(f: Isian): [number, number, number] {
  const hitung = (pasangan: [Level, number][]) => {
    const k: [number, number, number] = [0, 0, 0];
    for (const [l, n] of pasangan) k[['mudah', 'sedang', 'sulit'].indexOf(kesukaranDariLevel(l))] += n;
    return k;
  };
  if (f.rincian) return hitung(f.rincian.map((r) => [r.level, r.jumlah]));
  if (f.sebaranLevel) return hitung(LEVEL.map((l) => [l, f.sebaranLevel![l] ?? 0]));
  return bagiKomposisi(f.n, f.persen) as [number, number, number];
}

const jumlah = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Galat per kartu opsi lanjutan; kosong bila sah. Dipakai untuk tanda "Perlu diperbaiki" dan daftar galat. */
export function galatKartu(f: Isian) {
  const m = masukanRencana(f);
  const susunan: string[] = [];
  const kesukaran: string[] = [];
  const rincianBentuk: string[] = [];
  const gaya: string[] = [];
  if (f.rincian) susunan.push(...galatKomposisi({ ...m, jumlah_gaya: null }));
  else {
    if (!f.bentuk.length) susunan.push('Pilih minimal satu bentuk soal.');
    if (m.jumlah_bentuk && jumlah(Object.values(m.jumlah_bentuk).map((x) => x ?? 0)) !== f.n) susunan.push(...galatKomposisi({ ...m, sebaran_level: null, jumlah_tp: null, jumlah_gaya: null }));
    if (!f.sebaranLevel && jumlah(f.persen) !== 100) kesukaran.push(`Jumlah persen kesukaran ${jumlah(f.persen)}%, harus 100%.`);
    kesukaran.push(...galatKomposisi({ ...m, jumlah_bentuk: null, jumlah_gaya: null }).filter((g) => !g.startsWith('Pilih minimal')));
  }
  const pg = f.aturBentuk.pgk_benar;
  if (pg && bentukIsian(f).includes('pilihan_ganda_kompleks')) {
    const opsi = f.opsiPg ?? (f.kelas >= 10 ? 5 : 4);
    if (pg.min > pg.maks) rincianBentuk.push('Banyak jawaban benar paling sedikit tidak boleh melebihi paling banyak.');
    if (pg.maks >= opsi) rincianBentuk.push(`Pilihan ganda kompleks dengan ${opsi} opsi paling banyak ${opsi - 1} jawaban benar.`);
  }
  if (f.jumlahGaya) gaya.push(...galatKomposisi({ ...m, jumlah_bentuk: null, sebaran_level: null, jumlah_tp: null, rincian: null }));
  if (f.bahasa === 'lain' && !f.bahasaLain.trim()) gaya.push('Tulis nama bahasa soal.');
  if (cakupanIsian(f) && f.cakupanPilih?.butir && !f.cakupanPilih.butir.length) susunan.push('Centang sedikitnya satu butir cakupan materi.');
  if (cakupanIsian(f) && f.cakupanPilih?.porsi && Object.values({ ...cakupanIsian(f)!.porsi, ...f.cakupanPilih.porsi }).every((x) => !x)) susunan.push('Porsi cakupan materi tidak boleh nol semua.');
  const kat = f.aturBentuk.kategori;
  if (kat && bentukIsian(f).includes('pilihan_ganda_kategori') && (!kat.label[0].trim() || !kat.label[1].trim() || kat.label[0].trim().toLowerCase() === kat.label[1].trim().toLowerCase()))
    rincianBentuk.push('Isi dua nama kategori yang berbeda untuk PG kompleks kategori.');
  return { susunan, kesukaran, rincianBentuk, gaya };
}
