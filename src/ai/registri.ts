import type { PenyediaId } from '../db/tipe';
import type { ModelLangsung, ModelRegistri, PenyediaRegistri, Registri, StatusModel } from './tipe';

let cache: Promise<Registri> | null = null;

export function muatRegistri(): Promise<Registri> {
  cache ??= fetch(`${import.meta.env.BASE_URL}models/registri.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Registri model tidak dapat dimuat.');
      return r.json() as Promise<Registri>;
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function penyediaDari(r: Registri, id: PenyediaId): PenyediaRegistri | undefined {
  return r.penyedia.find((p) => p.id === id);
}

export function modelDari(r: Registri, penyedia: PenyediaId, model: string): ModelRegistri | undefined {
  return penyediaDari(r, penyedia)?.model.find((m) => m.id === model);
}

/**
 * Kegunaan model. GenSoal hanya memakai model teks: soal ditulis sebagai teks, dan gambar soal
 * digambar GenSoal sendiri dari templat, bukan oleh AI.
 */
export type JenisModel = 'teks' | 'gambar' | 'suara' | 'lain';

/** Tebak jenis model dari id-nya. Daftar langsung penyedia memuat juga model gambar, suara, embedding, dan sebagainya. */
export function jenisModel(id: string): JenisModel {
  const s = id.toLowerCase();
  if (/embed|moderation|rerank|guard|ocr|aqa|robotics|computer-use|search|deep-research|davinci|babbage/.test(s)) return 'lain';
  if (/tts|whisper|transcri|audio|speech|voxtral|realtime|live|playai|orpheus|lyria/.test(s)) return 'suara';
  if (/image|imagen|dall-e|veo|sora|flux|stable-diffusion|sdxl|recraft|seedream/.test(s)) return 'gambar';
  return 'teks';
}

export interface BarisModel {
  id: string;
  label: string;
  status: StatusModel;
  tersedia: boolean | null;
  registri: ModelRegistri | null;
  jenis: JenisModel;
  /** Tampil di pilihan utama. Selebihnya hanya muncul bila guru membuka model lain. */
  disarankan: boolean;
}

const URUT_STATUS: Record<StatusModel, number> = { direkomendasikan: 0, stabil: 1, pratinjau: 2, usang: 3 };

/**
 * Gabungkan registri bawaan dengan daftar langsung dari penyedia.
 * Model usang disembunyikan; model dari penyedia yang belum ada di registri berstatus pratinjau.
 * tersedia = null bila kunci belum diuji.
 * Disarankan: model teks dari registri yang direkomendasikan atau stabil. Bila penyedia hanya punya model
 * pratinjau di registri (mis. OpenRouter), model pratinjau registri itulah yang disarankan.
 */
export function gabungModel(p: PenyediaRegistri, langsung: ModelLangsung[] | null): BarisModel[] {
  const idLangsung = langsung ? new Set(langsung.map((m) => m.id)) : null;
  const baris: BarisModel[] = p.model
    .filter((m) => m.status !== 'usang')
    .map((m) => ({ id: m.id, label: m.label, status: m.status, tersedia: idLangsung ? idLangsung.has(m.id) || m.id === 'openrouter/free' : null, registri: m, jenis: jenisModel(m.id), disarankan: false }));
  if (langsung) {
    const dikenal = new Set(p.model.map((m) => m.id));
    for (const m of langsung) {
      if (dikenal.has(m.id)) continue;
      baris.push({ id: m.id, label: m.nama, status: 'pratinjau', tersedia: true, registri: null, jenis: jenisModel(m.id), disarankan: false });
    }
  }
  const layak = baris.filter((b) => b.registri && b.jenis === 'teks' && b.tersedia !== false);
  const teruji = layak.filter((b) => b.status !== 'pratinjau');
  for (const b of teruji.length ? teruji : layak) b.disarankan = true;
  return baris.sort((a, b) => Number(b.disarankan) - Number(a.disarankan) || URUT_STATUS[a.status] - URUT_STATUS[b.status] || Number(b.tersedia ?? 0) - Number(a.tersedia ?? 0) || (a.registri ? 0 : 1) - (b.registri ? 0 : 1));
}
