import type { Bentuk, GambarSoal, HurufOpsi, IsiSoal, Kesukaran, Level, Verifikasi } from '../db/tipe';

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
  try {
    return JSON.parse(s.slice(awal, akhir + 1));
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
    case 'tidak_ada':
      return { tipe: 'tidak_ada', alasan: s(o.alasan) };
    default:
      galat.push('verifikasi.tipe harus ekspresi, perbandingan, urutan, atau tidak_ada.');
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
  let kunci = '';
  let rubrik: string[] | undefined;
  switch (harapan.bentuk) {
    case 'pilihan_ganda': {
      opsi = bacaOpsi(o.opsi, galat);
      kunci = normalisasiHuruf(o.kunci);
      if (!opsi[kunci as HurufOpsi]) galat.push('kunci harus salah satu huruf opsi.');
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
      break;
    }
  }
  const pembahasanMentah = Array.isArray(o.pembahasan) ? o.pembahasan : typeof o.pembahasan === 'string' ? [o.pembahasan] : [];
  const pembahasan = pembahasanMentah.map((x) => String(x).trim()).filter(Boolean);
  if (!pembahasan.length) galat.push('pembahasan wajib, minimal satu langkah.');
  const verifikasi = bacaVerifikasi(o.verifikasi, galat);
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
    kunci,
    ...(rubrik ? { rubrik } : {}),
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
