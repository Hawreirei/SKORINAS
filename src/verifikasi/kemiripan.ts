import { teksPolos } from '../matematika/teks';

function trigram(s: string): Set<string> {
  // Harakat, tatwil, dan tanda diakritik diabaikan (NFKD memisahkannya dari huruf), juga hamzah pada alif (أ → ا).
  const polos = teksPolos(s).normalize('NFKD').replace(/[\p{M}\u0640]/gu, '');
  const t = ` ${polos.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
  const hasil = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) hasil.add(t.slice(i, i + 3));
  return hasil;
}

/** Kemiripan Jaccard trigram huruf, 0 sampai 1. */
export function kemiripan(a: string, b: string): number {
  const x = trigram(a);
  const y = trigram(b);
  if (!x.size || !y.size) return 0;
  let irisan = 0;
  for (const g of x) if (y.has(g)) irisan++;
  return irisan / (x.size + y.size - irisan);
}

export const AMBANG_KEMIRIPAN = 0.8;
