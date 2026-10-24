import type { Rumpun } from '../db/tipe';
import { paketMatematika } from './matematika';
import type { PaketMapel } from './tipe';

function paketTanpaPemeriksa(rumpun: Rumpun, nama: string, aturan: string[], risikoTinggi = false): PaketMapel {
  return {
    rumpun,
    nama,
    aturanPenulisan: aturan,
    contohAcuan: [],
    templatGambar: [],
    statusLolos: 'perlu_telaah',
    pemeriksa: null,
    risikoTinggi,
  };
}

// Pemeriksa selain Matematika menyusul pada V1. Sampai saat itu soal rumpun lain berstatus perlu_telaah.
export const PAKET: Record<Rumpun, PaketMapel> = {
  matematika: paketMatematika,
  ipa: paketTanpaPemeriksa('ipa', 'IPA', ['Besaran dan satuan ditulis lengkap dan konsisten.', 'Rumus ditulis dalam LaTeX sebaris di antara tanda $.']),
  bahasa: paketTanpaPemeriksa('bahasa', 'Bahasa', [
    'Stimulus (teks bacaan) harus asli atau diambil dari materi yang ditempel guru; jangan menyalin teks terbitan.',
    'Kunci harus dapat ditemukan atau disimpulkan dari stimulus.',
    'Panjang dan kosakata stimulus sesuai jenjang.',
  ]),
  ips: paketTanpaPemeriksa('ips', 'IPS', ['Fakta, tanggal, dan nama harus dapat dirujuk ke bahan ajar resmi; sebutkan rujukannya di pembahasan.'], true),
  pancasila_agama: paketTanpaPemeriksa(
    'pancasila_agama',
    'Pancasila dan Agama',
    ['Kutip sumber (pasal, ayat, atau bahan ajar) di pembahasan.', 'Hindari tafsiran yang diperdebatkan; gunakan rumusan bahan ajar resmi.'],
    true,
  ),
  seni_pjok_informatika: paketTanpaPemeriksa('seni_pjok_informatika', 'Seni, PJOK, Informatika', ['Soal kinerja disertai rubrik yang dapat diamati.']),
};

export function paketUntuk(rumpun: Rumpun | null): PaketMapel | null {
  return rumpun ? PAKET[rumpun] : null;
}

// Mapel diketik guru, jadi rumpun (penentu pemeriksa jawaban) ditebak dari namanya.
// Urutan penting: "Matematika" diperiksa sebelum kata umum lain.
const POLA_RUMPUN: [Rumpun, RegExp][] = [
  ['matematika', /matemati|\bmtk\b|\bmath/i],
  ['ipa', /\bipas?\b|fisika|kimia|biologi|sains|science|ilmu pengetahuan alam/i],
  ['pancasila_agama', /pancasila|\bppkn\b|\bpkn\b|agama|budi pekerti|kewarganegaraan|akidah|fikih|fiqih|quran|hadis|hadits|sejarah kebudayaan islam/i],
  ['ips', /\bips\b|sejarah|geografi|ekonomi|sosiologi|antropologi|ilmu pengetahuan sosial/i],
  ['bahasa', /bahasa|english|inggris|arab|jawa|sunda|mandarin|literasi/i],
  ['seni_pjok_informatika', /seni|musik|tari|rupa|teater|\bpjok\b|jasmani|olahraga|informatika|prakarya|\btik\b|koding/i],
];

export function rumpunDariMapel(mapel: string): Rumpun | null {
  const m = mapel.trim();
  if (!m) return null;
  return POLA_RUMPUN.find(([, pola]) => pola.test(m))?.[0] ?? null;
}
