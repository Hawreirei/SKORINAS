// Pemetaan bawaan Kurikulum Merdeka bila JSON kurikulum belum dimuat (mis. dalam uji).
// Sumber kebenaran tetap tabel fase di public/kurikulum.
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
