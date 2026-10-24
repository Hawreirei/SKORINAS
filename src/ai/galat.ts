export type JenisGalatAi = 'kunci' | 'batas' | 'jaringan' | 'model' | 'server' | 'dibatalkan' | 'lain';

export class GalatAi extends Error {
  constructor(
    public readonly jenis: JenisGalatAi,
    pesan: string,
    public readonly status?: number,
  ) {
    super(pesan);
  }
}

export async function galatDariRespons(r: Response, nama: string): Promise<GalatAi> {
  let rinci = '';
  try {
    const t = await r.text();
    try {
      const j = JSON.parse(t);
      rinci = j?.error?.message ?? j?.message ?? j?.detail ?? t;
    } catch {
      rinci = t;
    }
  } catch {
    /* abaikan */
  }
  rinci = String(rinci).slice(0, 300);
  if (r.status === 401 || r.status === 403) return new GalatAi('kunci', `Kunci ${nama} ditolak. Periksa kunci atau izin model. ${rinci}`, r.status);
  if (r.status === 429) return new GalatAi('batas', `Batas pemakaian ${nama} tercapai. Tunggu sebentar atau pakai model cadangan. ${rinci}`, r.status);
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
