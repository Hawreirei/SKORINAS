import { ambil, GalatAi } from '../galat';
import type { Adaptor } from '../tipe';

const DASAR = 'https://generativelanguage.googleapis.com/v1beta';

export const gemini: Adaptor = {
  id: 'gemini',
  async kirim(p) {
    const r = await ambil(
      `${DASAR}/models/${encodeURIComponent(p.model)}:generateContent`,
      {
        method: 'POST',
        signal: p.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': p.kunci },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: p.sistem }] },
          contents: [{ role: 'user', parts: [{ text: p.pesan }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: p.suhu ?? 0.7 },
        }),
      },
      'Gemini',
    );
    const j = await r.json();
    const teks = (j?.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? '').join('');
    if (!teks) throw new GalatAi('model', `Gemini tidak mengembalikan teks (${j?.candidates?.[0]?.finishReason ?? j?.promptFeedback?.blockReason ?? 'tanpa alasan'}).`);
    return {
      teks,
      token_masuk: j?.usageMetadata?.promptTokenCount ?? 0,
      token_keluar: (j?.usageMetadata?.candidatesTokenCount ?? 0) + (j?.usageMetadata?.thoughtsTokenCount ?? 0),
      sisa_kuota: null,
    };
  },
  async daftarModel(kunci, signal) {
    const r = await ambil(`${DASAR}/models?pageSize=1000`, { signal, headers: { 'x-goog-api-key': kunci } }, 'Gemini');
    const j = await r.json();
    return (j?.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: { name: string; displayName?: string }) => ({ id: m.name.replace(/^models\//, ''), nama: m.displayName ?? m.name }));
  },
};
