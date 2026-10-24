import type { Level } from '../db/tipe';

// Pemeriksa kualitas TP: memberi saran, tidak pernah memblokir.
// Empat hal: kata kerja dapat diamati, satu kompetensi per TP, lingkup materi jelas, level kognitif dapat ditentukan.

const KATA_KERJA: Record<Level, string[]> = {
  C1: ['menyebutkan', 'membaca', 'menulis', 'mengenal', 'mengenali', 'menunjukkan', 'mendaftar', 'menghafal', 'menamai', 'mengingat', 'mengidentifikasi', 'menirukan', 'meniru'],
  C2: ['menjelaskan', 'mengelompokkan', 'membandingkan', 'mengurutkan', 'mengubah', 'menyatakan', 'mendeskripsikan', 'menafsirkan', 'menginterpretasi', 'mencontohkan', 'mengklasifikasikan', 'memperkirakan', 'mengestimasi', 'merangkum', 'membedakan', 'menerjemahkan', 'menyajikan'],
  C3: ['menghitung', 'menentukan', 'menggunakan', 'menyelesaikan', 'menerapkan', 'mengukur', 'menjumlahkan', 'mengurangkan', 'mengalikan', 'membagi', 'melengkapi', 'melanjutkan', 'menggambar', 'mendemonstrasikan', 'melakukan', 'mempraktikkan', 'menyusun', 'mengurai'],
  C4: ['menganalisis', 'menguraikan', 'menyimpulkan', 'menelaah', 'membuktikan', 'mendiagnosis', 'menemukan', 'mengorganisasikan', 'menghubungkan', 'mengaitkan'],
  C5: ['menilai', 'mengevaluasi', 'mengkritik', 'memutuskan', 'memilih', 'mempertimbangkan', 'membenarkan', 'memprediksi', 'menguji', 'memvalidasi', 'menyanggah'],
  C6: ['merancang', 'menciptakan', 'membuat', 'mengembangkan', 'merumuskan', 'mengonstruksi', 'mengkonstruksi', 'memodifikasi', 'menggubah', 'memproduksi'],
};

const KATA_SAMAR = ['memahami', 'mengetahui', 'mengerti', 'menguasai', 'menghayati', 'menyadari', 'mengapresiasi', 'menghargai', 'meyakini', 'mengenal konsep', 'belajar', 'memiliki pemahaman', 'mempelajari'];

export interface PenilaianTp {
  nilai: 'baik' | 'cukup' | 'lemah';
  alasan: string[];
  level: Level | null;
  kataKerja: string[];
}

function kataDasar(teks: string): string[] {
  return teks
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function nilaiTp(rumusan: string): PenilaianTp {
  const alasan: string[] = [];
  const kata = kataDasar(rumusan);
  const teks = kata.join(' ');
  const ditemukan: { kata: string; level: Level; posisi: number }[] = [];
  (Object.entries(KATA_KERJA) as [Level, string[]][]).forEach(([level, daftar]) => {
    for (const k of daftar) {
      const posisi = kata.indexOf(k);
      if (posisi >= 0) ditemukan.push({ kata: k, level, posisi });
    }
  });
  ditemukan.sort((a, b) => a.posisi - b.posisi);
  const samar = KATA_SAMAR.filter((k) => teks.includes(k));

  if (!ditemukan.length) alasan.push(samar.length ? `Kata kerja "${samar[0]}" tidak dapat diamati; pakai mis. menghitung, membandingkan, menjelaskan.` : 'Belum ada kata kerja yang dapat diamati.');
  else if (samar.length) alasan.push(`Hindari kata "${samar[0]}"; cukup kata kerja yang dapat diamati.`);

  // Dua kata kerja operasional yang dihubungkan "dan"/"serta" biasanya dua kompetensi.
  const operasional = ditemukan.filter((d, i, a) => a.findIndex((x) => x.kata === d.kata) === i);
  if (operasional.length >= 2) {
    const antara = kata.slice(operasional[0].posisi + 1, operasional[1].posisi);
    if (antara.some((k) => k === 'dan' || k === 'serta' || k === 'atau') && antara.length <= 3)
      alasan.push('Tampaknya memuat lebih dari satu kompetensi; pertimbangkan memecahnya menjadi dua TP.');
  }

  const setelahKerja = ditemukan.length ? kata.slice(ditemukan[0].posisi + 1) : kata;
  const pengisi = new Set(['dan', 'yang', 'dengan', 'dari', 'pada', 'di', 'ke', 'untuk', 'secara', 'tentang', 'suatu', 'sebuah', 'tepat', 'benar', 'baik']);
  const isiMateri = setelahKerja.filter((k) => !pengisi.has(k));
  if (isiMateri.length < 2) alasan.push('Lingkup materi belum jelas; sebutkan materi dan batasannya (mis. "dua pecahan berpenyebut berbeda").');

  const level = ditemukan.length ? ditemukan[0].level : null;
  if (ditemukan.length && !level) alasan.push('Tingkat kognitif belum dapat ditentukan.');

  const lemah = !ditemukan.length || isiMateri.length < 2;
  const nilai: PenilaianTp['nilai'] = lemah ? 'lemah' : alasan.length ? 'cukup' : 'baik';
  return { nilai, alasan, level, kataKerja: ditemukan.map((d) => d.kata) };
}
