import { readFileSync } from 'node:fs';

/** Token warna asli di src/index.css untuk mode terang (:root) dan gelap (.dark). */
const css = readFileSync('src/index.css', 'utf8');

export const MODE = [
  ['terang', ':root'],
  ['gelap', '.dark'],
] as const;

export function tokenMode(pemilih: string): Record<string, string> {
  const m = css.match(new RegExp(`^${pemilih.replace('.', '\\.')} \\{([^}]*)\\}`, 'm'))!;
  return Object.fromEntries([...m[1].matchAll(/(--gs-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((x) => [x[1], x[2]]));
}

const luminans = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Rasio kontras WCAG 2 antara dua warna hex. */
export function kontras(a: string, b: string): number {
  const [t, g] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (t + 0.05) / (g + 0.05);
}
