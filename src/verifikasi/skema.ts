import type { Bentuk, GambarSoal, HurufOpsi, IsiSoal, JenisUraian, Kesukaran, Level, Pernyataan, Verifikasi } from '../db/tipe';
import { HURUF_KANAN, hurufKunci, petaJodoh, teksJodoh } from '../db/tipe';
import { PERINTAH_RAWAN_ESCAPE } from '../matematika/teks';

export class GalatSkema extends Error {
  constructor(public readonly daftar: string[]) {
    super(daftar.join(' '));
  }
}

/** Ambil satu objek JSON dari keluaran model, termasuk bila dibungkus pagar kode. */
export function ekstrakJson(teks: string): unknown {
  let s = teks.trim();
  const pagar = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (pagar) s = pagar[1].trim();
  const awal = s.indexOf('{');
  const akhir = s.lastIndexOf('}');
  if (awal < 0 || akhir <= awal) throw new GalatSkema(['Keluaran model bukan objek JSON.']);
  // Model kadang menulis LaTeX dengan satu garis miring: \sqrt dan \left bukan escape JSON yang sah,
  // sedangkan \times, \frac, \right, dan \neq terbaca sebagai tab, form feed, CR, dan baris baru. Garis miringnya digandakan.
  const isi = s
    .slice(awal, akhir + 1)
    .replace(new RegExp(`\\\\(\\\\|["/]|u[0-9a-fA-F]{4}|n(?!(?:${PERINTAH_RAWAN_ESCAPE.n})(?![a-zA-Z]))|[bfrt](?![a-zA-Z]))|\\\\`, 'g'), (_, sah: string | undefined) => (sah ? '\\' + sah : '\\\\'));
  try {
    return JSON.parse(isi);
  } catch {
    throw new GalatSkema(['Keluaran model bukan JSON yang sah.']);
  }
}

const HURUF: HurufOpsi[] = ['A', 'B', 'C', 'D', 'E'];

function teksWajib(v: unknown, nama: string, galat: string[], maks = 2000): string {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string' || !v.trim()) {
    galat.push(`${nama} wajib berupa teks.`);
    return '';
  }
  if (v.length > maks) galat.push(`${nama} terlalu panjang.`);
  return v.trim();
}

function normalisasiHuruf(v: unknown): string {
  return String(v ?? '')
    .trim()
    .replace(/^[(\[]|[)\].:]$/g, '')
    .toUpperCase();
}

function normalisasiBenarSalah(v: unknown): string | null {
  if (v === true) return 'B';
  if (v === false) return 'S';
  const s = String(v ?? '').trim().toLowerCase();
  if (['b', 'benar', 'true', 'betul', 't'].includes(s)) return 'B';
  if (['s', 'salah', 'false', 'f'].includes(s)) return 'S';
  return null;
}

function bacaVerifikasi(v: unknown, galat: string[]): Verifikasi {
  const o = (v ?? {}) as Record<string, unknown>;
  const s = (x: unknown) => (typeof x === 'number' ? String(x) : typeof x === 'string' ? x.trim() : '');
  switch (o.tipe) {
    case 'ekspresi':
      if (!s(o.ekspresi) || !s(o.nilai)) galat.push('verifikasi ekspresi memerlukan ekspresi dan nilai.');
      return { tipe: 'ekspresi', ekspresi: s(o.ekspresi), nilai: s(o.nilai) };
    case 'perbandingan':
      if (!s(o.kiri) || !s(o.kanan) || !s(o.relasi)) galat.push('verifikasi perbandingan memerlukan kiri, relasi, dan kanan.');
      return { tipe: 'perbandingan', kiri: s(o.kiri), relasi: s(o.relasi), kanan: s(o.kanan) };
    case 'urutan': {
      const nilai = Array.isArray(o.nilai) ? o.nilai.map(s) : [];
      if (nilai.length < 2 || nilai.some((x) => !x)) galat.push('verifikasi urutan memerlukan daftar nilai (minimal 2).');
      const arah = o.arah === 'turun' ? 'turun' : 'naik';
      return { tipe: 'urutan', nilai, arah };
    }
    case 'per_opsi': {
      const opsi: Partial<Record<HurufOpsi, Pernyataan>> = {};
      const mentah = o.opsi && typeof o.opsi === 'object' ? (o.opsi as Record<string, unknown>) : {};
      for (const [k, x] of Object.entries(mentah)) {
        const h = normalisasiHuruf(k) as HurufOpsi;
        const p = (x ?? {}) as Record<string, unknown>;
        if (!HURUF.includes(h) || !s(p.kiri) || !s(p.kanan)) {
          galat.push(`verifikasi per_opsi untuk ${k} memerlukan kiri, relasi, dan kanan.`);
          continue;
        }
        opsi[h] = { kiri: s(p.kiri), relasi: s(p.relasi) || '=', kanan: s(p.kanan) };
      }
      if (!Object.keys(opsi).length) galat.push('verifikasi per_opsi memerlukan pernyataan untuk setiap opsi.');
      return { tipe: 'per_opsi', opsi };
    }
    case 'pasangan': {
      const kiri = Array.isArray(o.kiri) ? o.kiri.map(s) : [];
      const kanan = Array.isArray(o.kanan) ? o.kanan.map(s) : [];
      if (!kiri.length || !kanan.length || [...kiri, ...kanan].some((x) => !x)) galat.push('verifikasi pasangan memerlukan nilai untuk setiap butir kolom kiri dan kanan.');
      return { tipe: 'pasangan', kiri, kanan };
    }
    case 'tidak_ada':
      return { tipe: 'tidak_ada', alasan: s(o.alasan) };
    default:
      galat.push('verifikasi.tipe harus ekspresi, perbandingan, urutan, per_opsi, pasangan, atau tidak_ada.');
      return { tipe: 'tidak_ada' };
  }
}

function bacaOpsi(v: unknown, galat: string[], nama = 'opsi'): Partial<Record<HurufOpsi, string>> {
  const hasil: Partial<Record<HurufOpsi, string>> = {};
  if (Array.isArray(v)) {
    v.forEach((x, i) => {
      if (i < HURUF.length) hasil[HURUF[i]] = teksWajib(x, `${nama} ${HURUF[i]}`, galat, 400);
    });
    return hasil;
  }
  if (!v || typeof v !== 'object') {
    galat.push(`${nama} wajib untuk pilihan ganda.`);
    return hasil;
  }
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const h = normalisasiHuruf(k) as HurufOpsi;
    if (!HURUF.includes(h)) {
      galat.push(`Kunci opsi tidak dikenal: ${k}.`);
      continue;
    }
    hasil[h] = teksWajib(x, `${nama} ${h}`, galat, 400);
  }
  const ada = HURUF.filter((h) => hasil[h] !== undefined);
  if (ada.join('') !== HURUF.slice(0, ada.length).join('')) galat.push(`${nama} harus berurutan mulai dari A.`);
  return hasil;
}

/** Kunci pilihan ganda kompleks dari "A, C", ["A","C"], atau {"A":true,...}; dikembalikan sebagai "A,C". */
function kunciKompleks(v: unknown): string {
  if (Array.isArray(v)) return hurufKunci(v.map((x) => normalisasiHuruf(x)).join(',')).join(',');
  if (v && typeof v === 'object')
    return hurufKunci(
      Object.entries(v as Record<string, unknown>)
        .filter(([, x]) => x === true)
        .map(([k]) => k)
        .join(','),
    ).join(',');
  return hurufKunci(String(v ?? '').replace(/\b(dan|and)\b/gi, ',')).join(',');
}

function daftarTeks(v: unknown, nama: string, galat: string[]): string[] {
  if (!Array.isArray(v)) {
    galat.push(`${nama} wajib berupa daftar.`);
    return [];
  }
  return v.map((x, i) => teksWajib(x, `${nama} ${i + 1}`, galat, 300));
}

/** Kunci menjodohkan dari "1-B, 2-A", ["B","A"], atau {"1":"B","2":"A"}; dikembalikan sebagai "1-B, 2-A". */
function kunciJodoh(v: unknown, jumlahKiri: number): number[] {
  if (Array.isArray(v)) return Array.from({ length: jumlahKiri }, (_, i) => HURUF_KANAN.indexOf(normalisasiHuruf(v[i])));
  if (v && typeof v === 'object') return petaJodoh(Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}-${normalisasiHuruf(x)}`).join(', '), jumlahKiri);
  return petaJodoh(String(v ?? ''), jumlahKiri);
}

function bacaGambar(v: unknown, galat: string[]): GambarSoal | null {
  if (v === null || v === undefined || v === false) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.templat !== 'string' || !o.parameter || typeof o.parameter !== 'object') {
    galat.push('gambar harus null atau {templat, parameter}.');
    return null;
  }
  return { templat: o.templat, parameter: o.parameter as Record<string, unknown>, alt: typeof o.alt === 'string' ? o.alt : undefined };
}

export interface HarapanSkema {
  bentuk: Bentuk;
  level: Level;
  kesukaran: Kesukaran;
  tp: string;
}

/** Validasi keluaran model terhadap skema isi_json. Melempar GalatSkema berisi semua masalah. */
export function bacaIsiSoal(mentah: unknown, harapan: HarapanSkema): IsiSoal {
  const galat: string[] = [];
  if (!mentah || typeof mentah !== 'object' || Array.isArray(mentah)) throw new GalatSkema(['Keluaran harus satu objek JSON.']);
  const o = mentah as Record<string, unknown>;
  if (o.bentuk !== harapan.bentuk) galat.push(`bentuk harus "${harapan.bentuk}".`);
  const pokok = teksWajib(o.pokok, 'pokok', galat);
  let opsi: IsiSoal['opsi'];
  let pasangan: IsiSoal['pasangan'];
  let kunci = '';
  let rubrik: string[] | undefined;
  let jenis_uraian: JenisUraian | undefined;
  switch (harapan.bentuk) {
    case 'pilihan_ganda': {
      opsi = bacaOpsi(o.opsi, galat);
      kunci = normalisasiHuruf(o.kunci);
      if (!opsi[kunci as HurufOpsi]) galat.push('kunci harus salah satu huruf opsi.');
      break;
    }
    case 'pilihan_ganda_kompleks': {
      opsi = bacaOpsi(o.opsi, galat);
      kunci = kunciKompleks(o.kunci);
      const huruf = kunci ? kunci.split(',') : [];
      if (huruf.some((h) => !opsi![h as HurufOpsi])) galat.push('kunci harus huruf-huruf opsi yang ada.');
      if (huruf.length < 2) galat.push('Pilihan ganda kompleks memerlukan sedikitnya dua jawaban benar.');
      else if (huruf.length >= Object.keys(opsi).length) galat.push('Pilihan ganda kompleks harus memiliki sedikitnya satu opsi yang salah.');
      break;
    }
    case 'menjodohkan': {
      const p = (o.pasangan ?? {}) as Record<string, unknown>;
      const kiri = daftarTeks(p.kiri, 'pasangan.kiri', galat);
      const kanan = daftarTeks(p.kanan, 'pasangan.kanan', galat);
      pasangan = { kiri, kanan };
      if (kiri.length < 3 || kiri.length > 6) galat.push(`Kolom kiri harus berisi 3 sampai 6 butir, bukan ${kiri.length}.`);
      if (kanan.length < kiri.length || kanan.length > Math.min(kiri.length + 2, HURUF_KANAN.length)) galat.push('Kolom kanan harus sama banyak dengan kolom kiri atau lebih satu sampai dua butir pengecoh.');
      const peta = kunciJodoh(o.kunci, kiri.length);
      if (peta.some((j) => j < 0 || j >= kanan.length)) galat.push('kunci harus memasangkan setiap butir kolom kiri dengan satu huruf kolom kanan, mis. "1-B, 2-A".');
      else if (new Set(peta).size !== peta.length) galat.push('Setiap butir kolom kanan hanya boleh dipasangkan sekali.');
      kunci = teksJodoh(peta);
      break;
    }
    case 'benar_salah': {
      const k = normalisasiBenarSalah(o.kunci);
      if (!k) galat.push('kunci benar-salah harus "B" atau "S".');
      kunci = k ?? '';
      break;
    }
    case 'isian_singkat':
      kunci = teksWajib(o.kunci, 'kunci', galat, 300);
      break;
    case 'uraian': {
      kunci = teksWajib(o.kunci, 'kunci', galat, 3000);
      const r = Array.isArray(o.rubrik) ? o.rubrik : typeof o.rubrik === 'string' ? [o.rubrik] : [];
      rubrik = r.map((x) => String(x).trim()).filter(Boolean);
      if (!rubrik.length) galat.push('rubrik wajib untuk soal uraian.');
      // Penanda jenis jawaban tidak memblokir: bila model lupa, tebak dari verifikasi. Guru dapat mengubahnya di layar Periksa.
      const j = String(o.jenis_uraian ?? '').trim().toLowerCase();
      jenis_uraian = j === 'penjelasan' || j === 'hitungan' ? j : undefined;
      break;
    }
  }
  const pembahasanMentah = Array.isArray(o.pembahasan) ? o.pembahasan : typeof o.pembahasan === 'string' ? [o.pembahasan] : [];
  const pembahasan = pembahasanMentah.map((x) => String(x).trim()).filter(Boolean);
  if (!pembahasan.length) galat.push('pembahasan wajib, minimal satu langkah.');
  const verifikasi = bacaVerifikasi(o.verifikasi, galat);
  if (harapan.bentuk === 'uraian' && !jenis_uraian) jenis_uraian = verifikasi.tipe === 'tidak_ada' ? 'penjelasan' : 'hitungan';
  const gambar = bacaGambar(o.gambar, galat);
  const meta = (o.meta ?? {}) as Record<string, unknown>;
  const indikator = typeof meta.indikator === 'string' ? meta.indikator.trim() : '';
  if (indikator.length < 8) galat.push('meta.indikator wajib diisi.');
  let terjemahan: IsiSoal['terjemahan'] = null;
  if (o.terjemahan && typeof o.terjemahan === 'object') {
    const t = o.terjemahan as Record<string, unknown>;
    const g2: string[] = [];
    terjemahan = { pokok: teksWajib(t.pokok, 'terjemahan.pokok', g2), opsi: t.opsi ? bacaOpsi(t.opsi, g2, 'terjemahan.opsi') : undefined };
    if (g2.length) terjemahan = null;
  }
  if (galat.length) throw new GalatSkema(galat);
  return {
    bentuk: harapan.bentuk,
    pokok,
    ...(opsi ? { opsi } : {}),
    ...(pasangan ? { pasangan } : {}),
    kunci,
    ...(rubrik ? { rubrik } : {}),
    ...(jenis_uraian ? { jenis_uraian } : {}),
    pembahasan,
    verifikasi,
    gambar,
    terjemahan,
    meta: {
      tp: harapan.tp,
      indikator,
      // Level dan kesukaran mengikuti rancangan paket, bukan klaim model.
      level: harapan.level,
      kesukaran: harapan.kesukaran,
    },
  };
}

export const HURUF_OPSI = HURUF;
