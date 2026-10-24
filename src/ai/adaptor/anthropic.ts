import { ambil, GalatAi } from '../galat';
import type { Adaptor } from '../tipe';

const DASAR = 'https://api.anthropic.com/v1';

function kepala(kunci: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-api-key': kunci,
    'anthropic-version': '2023-06-01',
    // Wajib untuk panggilan langsung dari peramban dengan kunci milik pengguna sendiri.
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

export const anthropic: Adaptor = {
  id: 'anthropic',
  async kirim(p) {
    const r = await ambil(
      `${DASAR}/messages`,
      {
        method: 'POST',
        signal: p.signal,
        headers: kepala(p.kunci),
        body: JSON.stringify({
          model: p.model,
          max_tokens: 4096,
          system: p.sistem,
          messages: [{ role: 'user', content: p.pesan }],
        }),
      },
      'Anthropic',
    );
    const j = await r.json();
    const teks = (j?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    if (!teks) throw new GalatAi('model', `Anthropic tidak mengembalikan teks (${j?.stop_reason ?? 'tanpa alasan'}).`);
    const sisa = r.headers.get('anthropic-ratelimit-requests-remaining');
    return { teks, token_masuk: j?.usage?.input_tokens ?? 0, token_keluar: j?.usage?.output_tokens ?? 0, sisa_kuota: sisa ? `${sisa} permintaan` : null };
  },
  async daftarModel(kunci, signal) {
    const r = await ambil(`${DASAR}/models?limit=100`, { signal, headers: kepala(kunci) }, 'Anthropic');
    const j = await r.json();
    return (j?.data ?? []).map((m: { id: string; display_name?: string }) => ({ id: m.id, nama: m.display_name ?? m.id }));
  },
};
