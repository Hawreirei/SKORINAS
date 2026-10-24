export type JenisGalatAi = 'kunci' | 'batas' | 'jaringan' | 'model' | 'server' | 'dibatalkan' | 'lain';

/** Rincian batas pemakaian (HTTP 429). */
export interface InfoBatas {
  /** Lama tunggu yang diminta penyedia, dalam milidetik; null bila tidak disebut. */
  tungguMs: number | null;
  /** 'harian' bila kuota per hari habis: menunggu beberapa detik tidak menolong. */
  lingkup: 'menit' | 'harian' | 'tidak_diketahui';
}

export class GalatAi extends Error {
  constructor(
    public readonly jenis: JenisGalatAi,
    pesan: string,
    public readonly status?: number,
    public readonly batas?: InfoBatas,
    /** Pesan asli penyedia, untuk ditampilkan sebagai rincian. */
    public readonly rinci?: string,
  ) {
    super(pesan);
  }
}

/** "37s", "1.5s", "2m59.56s", "120" (detik) -> milidetik. */
export function uraiDurasi(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 1000);
  let ms = 0;
  let cocok = false;
  for (const m of t.matchAll(/(\d+(?:\.\d+)?)(ms|h|m|s)/g)) {
    cocok = true;
    const n = Number(m[1]);
    ms += m[2] === 'h' ? n * 3600000 : m[2] === 'm' ? n * 60000 : m[2] === 's' ? n * 1000 : n;
  }
  return cocok ? Math.round(ms) : null;
}

/**
 * Baca respons 429 dari berbagai penyedia: RetryInfo dan QuotaFailure (Gemini),
 * header retry-after dan x-ratelimit-reset-* (OpenAI, Groq, Mistral, OpenRouter, Anthropic).
 */
export function uraiBatas(badan: unknown, kepala: Headers, teks: string): InfoBatas {
  const err = (badan as { error?: { details?: Record<string, unknown>[]; message?: string } } | null)?.error;
  let tungguMs: number | null = null;
  let harian = false;
  let perMenit = false;
  for (const d of err?.details ?? []) {
    const tipe = String(d['@type'] ?? '');
    if (tipe.endsWith('RetryInfo')) tungguMs = uraiDurasi(String(d.retryDelay ?? ''));
    if (tipe.endsWith('QuotaFailure')) {
      for (const v of (d.violations as { quotaId?: string; quotaMetric?: string }[]) ?? []) {
        const id = `${v.quotaId ?? ''} ${v.quotaMetric ?? ''}`;
        if (/PerDay|per_day|daily/i.test(id)) harian = true;
        if (/PerMinute|per_minute/i.test(id)) perMenit = true;
      }
    }
  }
  tungguMs ??= uraiDurasi(kepala.get('retry-after')) ?? uraiDurasi(kepala.get('x-ratelimit-reset-requests')) ?? uraiDurasi(kepala.get('x-ratelimit-reset-tokens'));
  const m = teks.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  if (tungguMs === null && m) tungguMs = Math.round(Number(m[1]) * 1000);
  if (/per day|daily|perday/i.test(teks)) harian = true;
  if (/per minute|perminute|rate limit/i.test(teks)) perMenit = true;
  // Gemini tingkat gratis tanpa RetryInfo biasanya berarti kuota harian.
  const lingkup = harian && !perMenit ? 'harian' : perMenit || (tungguMs !== null && tungguMs <= 5 * 60000) ? 'menit' : harian ? 'harian' : 'tidak_diketahui';
  return { tungguMs, lingkup };
}

export async function galatDariRespons(r: Response, nama: string): Promise<GalatAi> {
  let rinci = '';
  let badan: unknown = null;
  try {
    const t = await r.text();
    try {
      badan = JSON.parse(t);
      const j = badan as { error?: { message?: string } | string; message?: string; detail?: string };
      rinci = (typeof j?.error === 'object' ? j.error?.message : j?.error) ?? j?.message ?? j?.detail ?? t;
    } catch {
      rinci = t;
    }
  } catch {
    /* abaikan */
  }
  rinci = String(rinci).slice(0, 500);
  if (r.status === 429) {
    const b = uraiBatas(badan, r.headers, rinci);
    const pesan =
      b.lingkup === 'harian'
        ? `Kuota harian ${nama} untuk model ini sudah habis.`
        : `Batas permintaan per menit ${nama} tercapai.`;
    return new GalatAi('batas', pesan, 429, b, rinci);
  }
  if (r.status === 401 || r.status === 403) return new GalatAi('kunci', `Kunci ${nama} ditolak. Periksa kunci atau izin model. ${rinci}`, r.status);
  if (r.status === 404) return new GalatAi('model', `Model tidak ditemukan di ${nama}. ${rinci}`, r.status);
  if (r.status === 400 || r.status === 422) return new GalatAi('model', `Permintaan ditolak ${nama}: ${rinci}`, r.status);
  if (r.status >= 500) return new GalatAi('server', `Server ${nama} sedang bermasalah (${r.status}).`, r.status);
  return new GalatAi('lain', `${nama} mengembalikan galat ${r.status}. ${rinci}`, r.status);
}

export async function ambil(url: string, init: RequestInit, nama: string): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(url, init);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new GalatAi('dibatalkan', 'Dibatalkan.');
    throw new GalatAi('jaringan', `Tidak dapat menghubungi ${nama}. Periksa koneksi internet, atau penyedia ini tidak mengizinkan panggilan langsung dari peramban.`);
  }
  if (!r.ok) throw await galatDariRespons(r, nama);
  return r;
}
