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

export interface BarisModel {
  id: string;
  label: string;
  status: StatusModel;
  tersedia: boolean | null;
  registri: ModelRegistri | null;
}

const URUT_STATUS: Record<StatusModel, number> = { direkomendasikan: 0, stabil: 1, pratinjau: 2, usang: 3 };

/**
 * Gabungkan registri bawaan dengan daftar langsung dari penyedia.
 * Model usang disembunyikan; model dari penyedia yang belum ada di registri berstatus pratinjau.
 * tersedia = null bila kunci belum diuji.
 */
export function gabungModel(p: PenyediaRegistri, langsung: ModelLangsung[] | null): BarisModel[] {
  const idLangsung = langsung ? new Set(langsung.map((m) => m.id)) : null;
  const baris: BarisModel[] = p.model
    .filter((m) => m.status !== 'usang')
    .map((m) => ({ id: m.id, label: m.label, status: m.status, tersedia: idLangsung ? idLangsung.has(m.id) || m.id === 'openrouter/free' : null, registri: m }));
  if (langsung) {
    const dikenal = new Set(p.model.map((m) => m.id));
    for (const m of langsung) {
      if (dikenal.has(m.id)) continue;
      baris.push({ id: m.id, label: m.nama, status: 'pratinjau', tersedia: true, registri: null });
    }
  }
  return baris.sort((a, b) => URUT_STATUS[a.status] - URUT_STATUS[b.status] || Number(b.tersedia ?? 0) - Number(a.tersedia ?? 0) || (a.registri ? 0 : 1) - (b.registri ? 0 : 1));
}
