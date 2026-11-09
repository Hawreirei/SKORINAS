import ringkas from './data/kerangka-ringkas.json';

/**
 * Kerangka asesmen TKA resmi dari situs pusmendik (https://pusmendik.kemendikdasmen.go.id/tka/kerangka/), 76 mapel:
 * wajib SD, SMP, SMA dan semua mapel pilihan termasuk program keahlian SMK. Data diambil 9 November 2026; cara
 * mengulang ada di scripts/kerangka-tka/README.md.
 *
 * Berkas ini hanya memuat ringkasan (nama, definisi, muatan, kompetensi membaca) yang dipakai prompt. Matriks asesmen
 * lengkap (elemen, sub-elemen, butir, batasan) ada di ./data/kerangka-tka.json dan hanya dimuat layar Buat (cakupan.ts).
 */

export interface RingkasKerangka {
  nama: string;
  jenjang: 'SD' | 'SMP' | 'SMA';
  jenis: 'wajib' | 'pilihan';
  definisi: string;
  muatan: string;
  /** Mapel bahasa: kompetensi membaca (urut sesuai level) → subkompetensi. */
  baca?: Record<string, string[]>;
}

export const RINGKAS_KERANGKA = ringkas as Record<string, RingkasKerangka>;

/** Format ujian mapel wajib → kunci kerangka. */
const WAJIB: Record<string, string> = {
  'tka-sd-matematika': 'sd_wajib_matematika',
  'tkad-sd-matematika': 'sd_wajib_matematika',
  'tka-sd-bindo': 'sd_wajib_bahasa-indonesia',
  'tkad-sd-bindo': 'sd_wajib_bahasa-indonesia',
  'tka-smp-matematika': 'smp_wajib_matematika',
  'tkad-smp-matematika': 'smp_wajib_matematika',
  'tka-smp-bindo': 'smp_wajib_bahasa-indonesia',
  'tkad-smp-bindo': 'smp_wajib_bahasa-indonesia',
  'tka-sma-matematika': 'sma_wajib_matematika',
  'tka-sma-bindo': 'sma_wajib_bahasa-indonesia',
  'tka-sma-binggris': 'sma_wajib_bahasa-inggris',
};

/** Nama mapel dinormalkan: huruf kecil, tanpa awalan "SMK - ", nama lama dan singkatan diseragamkan. */
export function normalNamaMapel(m: string): string {
  return m
    .toLowerCase()
    .replace(/^\s*(teori kompetensi kejuruan|smk)\s*[-:–]\s*/, '')
    .replace(/\s*\((smk|smk dan mak|smk\/mak)\)\s*$/, '')
    .replace(/\blanjutan\b/, 'tingkat lanjut')
    .replace(/^ppkn\/pendidikan pancasila$|^ppkn$|^pendidikan pancasila$/, 'pendidikan pancasila dan kewarganegaraan')
    .replace(/^(produk\/projek|projek|produk) kreatif dan kewirausahaan$/, 'produk atau projek kreatif dan kewirausahaan')
    .replace(/\s+/g, ' ')
    .trim();
}

const PILIHAN = new Map(
  Object.entries(RINGKAS_KERANGKA)
    .filter(([, v]) => v.jenis === 'pilihan')
    .map(([k, v]) => [normalNamaMapel(v.nama), k] as const),
);

/** Kunci kerangka untuk format ujian (dan nama mapel bila format mapel pilihan); null bila tidak ada. */
export function kunciKerangka(formatId: string | null | undefined, mapel = ''): string | null {
  if (!formatId) return null;
  if (formatId === 'tka-sma-pilihan') return PILIHAN.get(normalNamaMapel(mapel)) ?? null;
  return WAJIB[formatId] ?? null;
}

/** Nama program keahlian SMK di kerangka pusmendik, mis. "SMK - Kuliner" (Teori Kompetensi Kejuruan). */
export const PROGRAM_KEAHLIAN_SMK = Object.values(RINGKAS_KERANGKA)
  .filter((v) => v.jenis === 'pilihan' && /^SMK - /.test(v.nama) && !/kreatif dan kewirausahaan/i.test(v.nama))
  .map((v) => v.nama);

/**
 * Panjang teks bacaan menurut bagian Muatan kerangka resmi, untuk mapel bahasa yang panjangnya berbeda dari bawaan
 * jenjang (kata; bahasa Korea dan Mandarin diperkirakan dari batas karakter dan kosakata HSK 1). Dipakai sebagai
 * panjang stimulus paket bila guru tidak mengatur sendiri.
 */
export const PANJANG_TEKS: Record<string, { min: number; maks: number }> = {
  'sma_wajib_bahasa-inggris': { min: 200, maks: 350 },
  'sma_pilihan_bahasa-indonesia-tingkat-lanjut': { min: 300, maks: 350 },
  'sma_pilihan_bahasa-inggris-tingkat-lanjut': { min: 300, maks: 400 },
  'sma_pilihan_bahasa-arab': { min: 25, maks: 60 },
  'sma_pilihan_bahasa-jepang': { min: 15, maks: 50 },
  'sma_pilihan_bahasa-jerman': { min: 20, maks: 100 },
  'sma_pilihan_bahasa-korea': { min: 15, maks: 50 },
  'sma_pilihan_bahasa-mandarin': { min: 10, maks: 40 },
  'sma_pilihan_bahasa-prancis': { min: 20, maks: 60 },
};
