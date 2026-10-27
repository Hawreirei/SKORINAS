// Teks Arab (soal Bahasa Arab, ayat dan hadis di PAI): pengenalan arah tulisan untuk Word, PDF, LaTeX, dan layar,
// serta penyambung huruf untuk PDF. jsPDF tidak dapat menyambung huruf yang berharakat dan tidak menata arah,
// jadi huruf diubah ke bentuk sajian (awal, tengah, akhir, tunggal) di sini; harakat ditempatkan oleh pdf-tata.

const HURUF = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';

/** Satu karakter Arab (huruf, harakat, tanda baca, atau angka Arab). */
export const POLA_ARAB = new RegExp(`[${HURUF}]`);

/**
 * Rangkaian teks Arab: kata-kata Arab beserta spasi, angka, dan tanda baca di antaranya. Dipakai untuk
 * menandai bagian kanan-ke-kiri di Word, LaTeX, dan layar.
 */
export const RANGKAIAN_ARAB = new RegExp(`[${HURUF}]+(?:[\\s\\d.,:;!?()«»"'\\-]*[${HURUF}]+)*`, 'g');

/** Harakat dan tanda Al-Qur'an: tidak berlebar, menempel pada huruf sebelumnya. */
export const TANDA_ARAB = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u08D3-\u08FF]/;

export function adaArab(s: string): boolean {
  return POLA_ARAB.test(s);
}

/** Paragraf berarah kanan-ke-kiri bila huruf Arabnya lebih banyak daripada huruf Latin (rumus $...$ tidak dihitung). */
export function dominanArab(s: string): boolean {
  if (!adaArab(s)) return false;
  const tanpaRumus = s.replace(/\$[^$]*\$/g, ' ');
  const arab = tanpaRumus.match(/[\u0620-\u064A\u066E-\u06D3\u06FA-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g)?.length ?? 0;
  const latin = tanpaRumus.match(/[A-Za-z\u00C0-\u024F]/g)?.length ?? 0;
  return arab > latin;
}

/** Potong teks menjadi bagian Arab dan bukan Arab, berurutan. */
export function pisahArab(s: string): { s: string; arab: boolean }[] {
  const hasil: { s: string; arab: boolean }[] = [];
  let akhir = 0;
  for (const m of s.matchAll(RANGKAIAN_ARAB)) {
    const idx = m.index ?? 0;
    if (idx > akhir) hasil.push({ s: s.slice(akhir, idx), arab: false });
    hasil.push({ s: m[0], arab: true });
    akhir = idx + m[0].length;
  }
  if (akhir < s.length) hasil.push({ s: s.slice(akhir), arab: false });
  return hasil;
}

// Bentuk sajian Unicode: [tunggal, akhir, awal, tengah]. Huruf yang hanya bersambung ke kanan (ا د ر و …) punya dua bentuk.
const BENTUK: Record<number, number[]> = {
  0x0621: [0xfe80], 0x0622: [0xfe81, 0xfe82], 0x0623: [0xfe83, 0xfe84], 0x0624: [0xfe85, 0xfe86], 0x0625: [0xfe87, 0xfe88],
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], 0x0627: [0xfe8d, 0xfe8e], 0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], 0x0629: [0xfe93, 0xfe94],
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], 0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], 0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], 0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], 0x062f: [0xfea9, 0xfeaa], 0x0630: [0xfeab, 0xfeac],
  0x0631: [0xfead, 0xfeae], 0x0632: [0xfeaf, 0xfeb0], 0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], 0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], 0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], 0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], 0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], 0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], 0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], 0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], 0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], 0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], 0x0648: [0xfeed, 0xfeee], 0x0649: [0xfeef, 0xfef0], 0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  // Huruf tambahan (Pegon, Persia, Urdu).
  0x0671: [0xfb50, 0xfb51], 0x0679: [0xfb66, 0xfb67, 0xfb68, 0xfb69], 0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59],
  0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d], 0x0688: [0xfb88, 0xfb89], 0x0691: [0xfb8c, 0xfb8d], 0x0698: [0xfb8a, 0xfb8b],
  0x06a4: [0xfb6a, 0xfb6b, 0xfb6c, 0xfb6d], 0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91], 0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95],
  0x06ba: [0xfb9e, 0xfb9f], 0x06be: [0xfbaa, 0xfbab, 0xfbac, 0xfbad], 0x06c1: [0xfba6, 0xfba7, 0xfba8, 0xfba9],
  0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff], 0x06d2: [0xfbae, 0xfbaf],
};

// Lam-alif: [tunggal, akhir] menurut alif yang mengikuti lam.
const LAM_ALIF: Record<number, [number, number]> = { 0x0622: [0xfef5, 0xfef6], 0x0623: [0xfef7, 0xfef8], 0x0625: [0xfef9, 0xfefa], 0x0627: [0xfefb, 0xfefc] };
const TATWIL = 0x0640;

function bisaKeKiri(c: number): boolean {
  return c === TATWIL || (BENTUK[c]?.length ?? 0) === 4;
}

function bisaKeKanan(c: number): boolean {
  return c === TATWIL || (BENTUK[c]?.length ?? 0) >= 2;
}

/** Satu huruf (atau tanda lain) beserta harakat yang menempel padanya, dalam urutan logis. */
export interface Gugus {
  glif: string;
  tanda: string[];
  /** Huruf, harakat, atau angka Arab; selain itu (tanda baca, angka Latin) tidak disambung. */
  arab: boolean;
}

/** Sambung huruf Arab ke bentuk sajiannya. Harakat dilewati saat menentukan sambungan dan ikut gugus hurufnya. */
export function sambungArab(kata: string): Gugus[] {
  const kar = [...kata];
  const tanda = (c: string) => TANDA_ARAB.test(c);
  // Huruf bukan-harakat sebelum dan sesudah posisi i.
  const tetangga = (i: number, arah: 1 | -1): number | null => {
    for (let j = i + arah; j >= 0 && j < kar.length; j += arah) if (!tanda(kar[j])) return kar[j].codePointAt(0)!;
    return null;
  };
  const hasil: Gugus[] = [];
  for (let i = 0; i < kar.length; i++) {
    const c = kar[i];
    if (tanda(c)) {
      const akhir = hasil[hasil.length - 1];
      if (akhir) akhir.tanda.push(c);
      else hasil.push({ glif: '', tanda: [c], arab: true });
      continue;
    }
    const k = c.codePointAt(0)!;
    const sebelum = tetangga(i, -1);
    const sesudah = tetangga(i, 1);
    const sambungKanan = sebelum !== null && bisaKeKiri(sebelum) && bisaKeKanan(k);
    if (k === 0x0644 && sesudah !== null && sesudah in LAM_ALIF) {
      // Lam diikuti alif menjadi satu ligatur; harakat lam dan alif ikut gugus ligatur.
      hasil.push({ glif: String.fromCodePoint(LAM_ALIF[sesudah][sambungKanan ? 1 : 0]), tanda: [], arab: true });
      let j = i + 1;
      while (j < kar.length && tanda(kar[j])) hasil[hasil.length - 1].tanda.push(kar[j++]);
      // Lewati alifnya.
      i = j;
      while (i + 1 < kar.length && tanda(kar[i + 1])) hasil[hasil.length - 1].tanda.push(kar[++i]);
      continue;
    }
    const bentuk = BENTUK[k];
    if (!bentuk) {
      hasil.push({ glif: c, tanda: [], arab: POLA_ARAB.test(c) });
      continue;
    }
    const sambungKiri = sesudah !== null && bisaKeKiri(k) && bisaKeKanan(sesudah);
    const pilih = sambungKanan && sambungKiri ? 3 : sambungKanan ? 1 : sambungKiri ? 2 : 0;
    hasil.push({ glif: String.fromCodePoint(bentuk[Math.min(pilih, bentuk.length - 1)] ?? bentuk[0]), tanda: [], arab: true });
  }
  return hasil;
}

const CERMIN: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '«': '»', '»': '«', '<': '>', '>': '<' };

/**
 * Urutan gambar dari kiri ke kanan untuk satu kata Arab: gugus dibalik, kecuali angka dan huruf Latin yang tetap
 * berurutan; tanda kurung dicerminkan.
 */
export function urutanVisual(gugus: Gugus[]): Gugus[] {
  const kiriKanan = (g: Gugus) => !g.tanda.length && /^[0-9A-Za-z٠-٩۰-۹.,]$/.test(g.glif);
  const hasil: Gugus[] = [];
  let i = gugus.length - 1;
  while (i >= 0) {
    if (kiriKanan(gugus[i])) {
      let j = i;
      while (j > 0 && kiriKanan(gugus[j - 1])) j--;
      hasil.push(...gugus.slice(j, i + 1));
      i = j - 1;
    } else {
      const g = gugus[i--];
      hasil.push(CERMIN[g.glif] ? { ...g, glif: CERMIN[g.glif] } : g);
    }
  }
  return hasil;
}
