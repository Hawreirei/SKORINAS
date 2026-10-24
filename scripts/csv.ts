/** Pengurai CSV kecil (RFC 4180): tanda kutip ganda, koma di dalam kutip, baris baru di dalam kutip. */
export function uraiCsv(teks: string): Record<string, string>[] {
  const baris: string[][] = [];
  let kolom: string[] = [];
  let sel = '';
  let kutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (kutip) {
      if (c === '"' && teks[i + 1] === '"') {
        sel += '"';
        i++;
      } else if (c === '"') kutip = false;
      else sel += c;
    } else if (c === '"') kutip = true;
    else if (c === ',') {
      kolom.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i++;
      kolom.push(sel);
      if (kolom.some((x) => x !== '')) baris.push(kolom);
      kolom = [];
      sel = '';
    } else sel += c;
  }
  if (sel !== '' || kolom.length) {
    kolom.push(sel);
    baris.push(kolom);
  }
  const [kepala, ...isi] = baris;
  return isi.map((b, n) => {
    if (b.length !== kepala.length) throw new Error(`Baris ${n + 2}: ${b.length} kolom, seharusnya ${kepala.length}.`);
    return Object.fromEntries(kepala.map((k, i) => [k.trim(), b[i].trim()]));
  });
}
