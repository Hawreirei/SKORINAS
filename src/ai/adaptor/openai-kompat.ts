import type { PenyediaId } from '../../db/tipe';
import { ambil, GalatAi } from '../galat';
import type { Adaptor } from '../tipe';

interface Opsi {
  id: PenyediaId;
  nama: string;
  dasar: string;
  jsonMode: boolean;
  suhu: boolean;
  headerTambahan?: Record<string, string>;
}

/** Adaptor untuk penyedia berantarmuka chat/completions ala OpenAI: OpenRouter, Groq, Mistral, OpenAI. */
export function buatAdaptorKompat(o: Opsi): Adaptor {
  return {
    id: o.id,
    async kirim(p) {
      const badan: Record<string, unknown> = {
        model: p.model,
        messages: [
          { role: 'system', content: p.sistem },
          { role: 'user', content: p.pesan },
        ],
      };
      if (o.jsonMode) badan.response_format = { type: 'json_object' };
      if (o.suhu) badan.temperature = p.suhu ?? 0.7;
      const r = await ambil(
        `${o.dasar}/chat/completions`,
        {
          method: 'POST',
          signal: p.signal,
          headers: { 'content-type': 'application/json', authorization: `Bearer ${p.kunci}`, ...o.headerTambahan },
          body: JSON.stringify(badan),
        },
        o.nama,
      );
      const j = await r.json();
      const isi = j?.choices?.[0]?.message?.content;
      const teks = Array.isArray(isi) ? isi.map((x: { text?: string }) => x.text ?? '').join('') : (isi ?? '');
      if (!teks) throw new GalatAi('model', `${o.nama} tidak mengembalikan teks.`);
      const sisa = r.headers.get('x-ratelimit-remaining-requests') ?? r.headers.get('x-ratelimit-remaining');
      return {
        teks,
        token_masuk: j?.usage?.prompt_tokens ?? 0,
        token_keluar: j?.usage?.completion_tokens ?? 0,
        sisa_kuota: sisa ? `${sisa} permintaan` : null,
      };
    },
    async daftarModel(kunci, signal) {
      const r = await ambil(`${o.dasar}/models`, { signal, headers: { authorization: `Bearer ${kunci}`, ...o.headerTambahan } }, o.nama);
      const j = await r.json();
      return (j?.data ?? []).map((m: { id: string; name?: string }) => ({ id: m.id, nama: m.name ?? m.id }));
    },
  };
}

export const openrouter = buatAdaptorKompat({
  id: 'openrouter',
  nama: 'OpenRouter',
  dasar: 'https://openrouter.ai/api/v1',
  jsonMode: true,
  suhu: true,
  headerTambahan: { 'X-Title': 'GenSoal' },
});
export const groq = buatAdaptorKompat({ id: 'groq', nama: 'Groq', dasar: 'https://api.groq.com/openai/v1', jsonMode: true, suhu: true });
export const mistral = buatAdaptorKompat({ id: 'mistral', nama: 'Mistral', dasar: 'https://api.mistral.ai/v1', jsonMode: true, suhu: true });
// Model penalaran OpenAI tidak menerima temperature; biarkan bawaan.
export const openai = buatAdaptorKompat({ id: 'openai', nama: 'OpenAI', dasar: 'https://api.openai.com/v1', jsonMode: true, suhu: false });
