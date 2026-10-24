import { all, create, type MathJsInstance } from 'mathjs';

// mathjs dengan fungsi berbahaya dimatikan: ekspresi datang dari model, bukan dari kode kita.
const math: MathJsInstance = create(all, { number: 'number' });
const evaluasiAsli = math.evaluate.bind(math);
const dilarang = () => {
  throw new Error('Fungsi tidak diizinkan dalam ekspresi verifikasi.');
};
math.import(
  {
    import: dilarang,
    createUnit: dilarang,
    evaluate: dilarang,
    parse: dilarang,
    simplify: dilarang,
    derivative: dilarang,
    resolve: dilarang,
    reviver: dilarang,
  },
  { override: true },
);

export type Lingkup = Record<string, number | number[]>;
export type Lokal = 'id' | 'en';

function gantiBerulang(s: string, pola: RegExp, ganti: string): string {
  let lama: string;
  do {
    lama = s;
    s = s.replace(pola, ganti);
  } while (s !== lama);
  return s;
}

/** LaTeX dan kebiasaan tulis Indonesia ke sintaks mathjs. */
export function keSintaksMathjs(ekspresi: string): string {
  let s = ekspresi.trim().replace(/^\$+|\$+$/g, '').replace(/\$/g, '');
  s = s.replace(/\\left|\\right|\\displaystyle|\\,|\;|\\!|\\ /g, '');
  s = s.replace(/\\text\{([^{}]*)\}/g, '');
  // Bilangan campuran: 2\frac{1}{3} -> (2 + 1/3)
  s = s.replace(/(\d+)\s*\\[dtc]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)+($2)/($3))');
  s = gantiBerulang(s, /\\[dtc]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
  s = gantiBerulang(s, /\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)');
  s = s
    .replace(/\\times|×|\\cdot|·|∙/g, '*')
    .replace(/\\div|÷/g, '/')
    .replace(/−|–/g, '-')
    .replace(/\\pi|π/g, 'pi')
    .replace(/\^\s*\{?\\circ\}?|°/g, '')
    .replace(/\\%/g, '%')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3');
  // 12 : 4 berarti pembagian
  s = s.replace(/([\d)])\s*:\s*([\d(])/g, '$1/$2');
  // 3 x 4 dengan spasi berarti perkalian
  s = gantiBerulang(s, /(\d)\s+[xX]\s+(\d)/g, '$1*$2');
  // koma desimal
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  return s;
}

function cekHasil(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v && typeof v === 'object' && 'valueOf' in v) {
    const n = Number((v as { valueOf(): unknown }).valueOf());
    if (Number.isFinite(n)) return n;
  }
  throw new Error('Hasil ekspresi bukan bilangan.');
}

/** Hitung ulang ekspresi verifikasi. Melempar galat bila tidak dapat dihitung. */
export function evaluasi(ekspresi: string, lingkup: Lingkup = {}): number {
  if (!ekspresi || !ekspresi.trim()) throw new Error('Ekspresi kosong.');
  if (ekspresi.length > 400) throw new Error('Ekspresi terlalu panjang.');
  const ruang: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(lingkup)) ruang[k] = Array.isArray(v) ? math.matrix(v) : v;
  return cekHasil(evaluasiAsli(keSintaksMathjs(ekspresi), ruang));
}

const KATA_MATEMATIKA = new Set(['pi', 'sqrt']);

/** "12 cm" -> "12", "45 menit" -> "45", "90°" -> "90", "25%" tetap. */
function buangSatuan(s: string): string {
  const m = s.match(/^(.*?[\d})])\s*([a-zA-Z²³°][a-zA-Z²³°/\s.]*)$/u);
  if (!m) return s;
  const satuan = m[2].trim();
  if (KATA_MATEMATIKA.has(satuan.toLowerCase()) || m[1].endsWith('\\')) return s;
  return m[1];
}

function normalisasiAngka(angka: string, lokal: Lokal): string {
  if (lokal === 'en') return /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(angka) ? angka.replace(/,/g, '') : angka;
  if (angka.includes('.') && angka.includes(',')) return angka.replace(/\./g, '').replace(',', '.');
  if (/^\d{1,3}(\.\d{3})+$/.test(angka)) return angka.replace(/\./g, '');
  return angka.replace(',', '.');
}

/**
 * Angka dari teks jawaban (opsi, kunci isian). Menerima pecahan LaTeX, bilangan campuran,
 * Rp, satuan di belakang, dan format ribuan sesuai bahasa soal.
 * Mengembalikan null bila teks bukan bilangan.
 */
export function angkaDariTeks(teks: string, lokal: Lokal = 'id'): number | null {
  let s = teks.trim().replace(/\$/g, '').replace(/\\text\{([^{}]*)\}/g, '$1').trim();
  if (!s) return null;
  s = s.replace(/^rp\.?\s*/i, '').replace(/^(=|≈)\s*/, '');
  s = buangSatuan(s);
  if (!s) return null;
  s = s.replace(/\d[\d.,]*\d|\d/g, (angka) => normalisasiAngka(angka, lokal));
  // bilangan campuran polos: 2 1/3
  s = s.replace(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/, '($1+$2/$3)');
  if (!/^[\s\d.+\-−*/()^\\{}a-z×÷·:%]+$/i.test(s)) return null;
  if (/[a-z]{2,}/i.test(s.replace(/\\[a-z]+|sqrt|pi/gi, ''))) return null;
  try {
    return evaluasi(s);
  } catch {
    return null;
  }
}

export function samaNilai(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

const RELASI: Record<string, (a: number, b: number) => boolean> = {
  '=': samaNilai,
  '==': samaNilai,
  '<': (a, b) => a < b && !samaNilai(a, b),
  '>': (a, b) => a > b && !samaNilai(a, b),
  '<=': (a, b) => a < b || samaNilai(a, b),
  '>=': (a, b) => a > b || samaNilai(a, b),
  '!=': (a, b) => !samaNilai(a, b),
};

const ALIAS_RELASI: Record<string, string> = {
  '≤': '<=', '\\le': '<=', '\\leq': '<=', '≥': '>=', '\\ge': '>=', '\\geq': '>=', '≠': '!=', '\\ne': '!=', '\\neq': '!=',
  'lebih dari': '>', 'lebih besar dari': '>', 'kurang dari': '<', 'lebih kecil dari': '<', 'sama dengan': '=',
  'greater than': '>', 'less than': '<', 'equal to': '=', 'equals': '=',
};

export function normalisasiRelasi(r: string): string | null {
  const s = r.trim().replace(/\$/g, '').trim().toLowerCase();
  if (s in RELASI) return s;
  if (s in ALIAS_RELASI) return ALIAS_RELASI[s];
  const asli = r.trim().replace(/\$/g, '').trim();
  if (asli in ALIAS_RELASI) return ALIAS_RELASI[asli];
  return null;
}

export function ujiRelasi(a: number, relasi: string, b: number): boolean {
  const r = normalisasiRelasi(relasi);
  if (!r) throw new Error(`Relasi tidak dikenal: ${relasi}`);
  return RELASI[r](a, b);
}

/** Pecah teks daftar seperti "2/3, 3/4, 5/6" atau "$\frac23 < \frac34$" menjadi bilangan. */
export function daftarAngkaDariTeks(teks: string, lokal: Lokal = 'id'): number[] | null {
  const bersih = teks.replace(/\$/g, '');
  const bagian = bersih.split(/\s*(?:;|<|>|≤|≥|\\lt|\\gt|\\le|\\ge|,\s+|\s+dan\s+|\s+and\s+)\s*/).filter((x) => x.trim());
  if (bagian.length < 2) return null;
  const hasil: number[] = [];
  for (const b of bagian) {
    const n = angkaDariTeks(b, lokal);
    if (n === null) return null;
    hasil.push(n);
  }
  return hasil;
}
