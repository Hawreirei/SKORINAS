// Pemetaan kelas ke fase Kurikulum Merdeka. Aplikasi tidak membawa data kurikulum (rancangan v0.4);
// fase hanya dipakai untuk konteks prompt dan batas keterbacaan, bukan untuk memilih CP atau TP.
const FASE_BAWAAN: [string, number, number][] = [
  ['A', 1, 2],
  ['B', 3, 4],
  ['C', 5, 6],
  ['D', 7, 9],
  ['E', 10, 10],
  ['F', 11, 12],
];

export function faseDariKelas(kelas: number, tabel: { kode: string; kelas_dari: number; kelas_sampai: number }[] = FASE_BAWAAN.map(([kode, kelas_dari, kelas_sampai]) => ({ kode, kelas_dari, kelas_sampai }))): string {
  return tabel.find((f) => kelas >= f.kelas_dari && kelas <= f.kelas_sampai)?.kode ?? '?';
}
