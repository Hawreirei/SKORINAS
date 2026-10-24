export function uuid(): string {
  return crypto.randomUUID();
}

export function sekarang(): number {
  return Date.now();
}

/** Tanggal lokal YYYY-MM-DD, dasar batas harian. */
export function tanggalLokal(t: number = Date.now()): string {
  const d = new Date(t);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
