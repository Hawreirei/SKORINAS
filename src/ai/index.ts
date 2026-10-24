import type { PenyediaId } from '../db/tipe';
import { anthropic } from './adaptor/anthropic';
import { gemini } from './adaptor/gemini';
import { groq, mistral, openai, openrouter } from './adaptor/openai-kompat';
import type { Adaptor, ModelRegistri } from './tipe';

export const ADAPTOR: Record<PenyediaId, Adaptor> = { gemini, openrouter, groq, mistral, openai, anthropic };

export function adaptorUntuk(id: PenyediaId): Adaptor {
  return ADAPTOR[id];
}

/** Biaya dalam USD dari token dan harga registri. null bila harga belum diketahui. */
export function hitungBiaya(model: ModelRegistri | undefined, masuk: number, keluar: number): number | null {
  if (!model) return null;
  if (model.tingkat === 'gratis' && !model.harga) return 0;
  if (!model.harga) return null;
  return (masuk * model.harga.masuk + keluar * model.harga.keluar) / 1_000_000;
}
