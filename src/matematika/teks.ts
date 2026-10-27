// Teks soal: kalimat biasa dengan rumus LaTeX sebaris di antara $...$ atau \(...\).
// Pecahan polos seperti 3/4 di luar rumus diubah menjadi pecahan bertumpuk.
// Satu pohon sintaks dipakai semua keluaran: KaTeX (layar), Office Math (Word), tata letak PDF, dan LaTeX.

export type Simpul =
  | { t: 'teks'; s: string; mentah?: boolean }
  | { t: 'pecahan'; atas: Simpul[]; bawah: Simpul[] }
  | { t: 'pangkat'; basis: Simpul[]; atas: Simpul[] }
  | { t: 'indeks'; basis: Simpul[]; bawah: Simpul[] }
  | { t: 'akar'; isi: Simpul[]; derajat: Simpul[] | null }
  | { t: 'matriks'; kiri: string; kanan: string; baris: Simpul[][][] };

export type Segmen = { jenis: 'teks'; s: string } | { jenis: 'mat'; latex: string; simpul: Simpul[] };

const SIMBOL: Record<string, string> = {
  times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  approx: '≈', equiv: '≡', pi: 'π', degree: '°', circ: '°', ldots: '…', dots: '…', cdots: '⋯', square: '□',
  Box: '□', angle: '∠', triangle: '△', alpha: 'α', beta: 'β', gamma: 'γ', theta: 'θ', lambda: 'λ', mu: 'μ',
  sigma: 'σ', Delta: 'Δ', infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', leftarrow: '←', perp: '⊥',
  parallel: '∥', cong: '≅', sim: '∼', in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩', emptyset: '∅',
  lt: '<', gt: '>', colon: ':', '%': '%', '{': '{', '}': '}', '$': '$', '#': '#', '&': '&', _: '_',
  ',': ' ', ';': ' ', ':': ' ', '!': '', quad: ' ', qquad: '  ', ' ': ' ', left: '', right: '', displaystyle: '',
  textstyle: '', mid: '|', vert: '|', cdotp: '·', bullet: '•', prime: '′', '\\': ' ', hline: '',
};

const PERINTAH_TEKS = new Set(['text', 'textrm', 'mathrm', 'textbf', 'mathbf', 'textit', 'mathit', 'mbox', 'operatorname', 'overline', 'underline', 'boxed']);
const PERINTAH_PECAHAN = new Set(['frac', 'dfrac', 'tfrac', 'cfrac']);

// Lingkungan matriks: tanda kurung kiri dan kanan.
const KURUNG_MATRIKS: Record<string, [string, string]> = {
  matrix: ['', ''], array: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'],
  vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''], smallmatrix: ['', ''], aligned: ['', ''],
};

class PenguraiLatex {
  private i = 0;
  constructor(private readonly s: string) {}

  urai(): Simpul[] {
    return this.daftar(null);
  }

  /** penutup '&' berarti isi sel matriks: berhenti sebelum &, \\\\, atau \\end. */
  private daftar(penutup: string | null): Simpul[] {
    const hasil: Simpul[] = [];
    while (this.i < this.s.length) {
      const c = this.s[this.i];
      if (penutup === '&' && (c === '&' || this.s.startsWith('\\\\', this.i) || /^\\end(?![a-zA-Z])/.test(this.s.slice(this.i, this.i + 5)))) {
        return gabungTeks(hasil);
      }
      if (penutup && c === penutup) {
        this.i++;
        return gabungTeks(hasil);
      }
      if (c === '^' || c === '_') {
        this.i++;
        const arg = this.argumen();
        const basis = ambilBasis(hasil);
        if (c === '^') hasil.push({ t: 'pangkat', basis, atas: arg });
        else hasil.push({ t: 'indeks', basis, bawah: arg });
        continue;
      }
      const atom = this.atom();
      if (atom) hasil.push(...atom);
    }
    return gabungTeks(hasil);
  }

  private argumen(): Simpul[] {
    this.lewatiSpasi();
    if (this.s[this.i] === '{') {
      this.i++;
      return this.daftar('}');
    }
    return this.atom() ?? [];
  }

  private lewatiSpasi() {
    while (this.s[this.i] === ' ') this.i++;
  }

  private namaLingkungan(): string {
    this.lewatiSpasi();
    const m = this.s.slice(this.i).match(/^\{([a-zA-Z]+\*?)\}/);
    if (!m) return '';
    this.i += m[0].length;
    return m[1].replace('*', '');
  }

  /** \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}, juga bmatrix, vmatrix, array, dan cases. */
  private matriks(): Simpul {
    const nama = this.namaLingkungan();
    if (nama === 'array') {
      // Lewati penentu kolom, misalnya {cc|c}.
      this.lewatiSpasi();
      if (this.s[this.i] === '{') {
        const tutup = this.s.indexOf('}', this.i);
        this.i = tutup < 0 ? this.s.length : tutup + 1;
      }
    }
    const [kiri, kanan] = KURUNG_MATRIKS[nama] ?? ['', ''];
    const baris: Simpul[][][] = [];
    let sel: Simpul[][] = [];
    while (this.i < this.s.length) {
      sel.push(rapikanSel(this.daftar('&')));
      if (this.s[this.i] === '&') {
        this.i++;
        continue;
      }
      baris.push(sel);
      sel = [];
      if (this.s.startsWith('\\\\', this.i)) {
        this.i += 2;
        continue;
      }
      if (this.s.startsWith('\\end', this.i)) {
        this.i += 4;
        this.namaLingkungan();
      }
      break;
    }
    // Baris kosong di akhir (dari \\\\ sebelum \\end) dibuang.
    while (baris.length && baris[baris.length - 1].every((x) => !simpulKePolos(x).trim())) baris.pop();
    return { t: 'matriks', kiri, kanan, baris };
  }

  private atom(): Simpul[] | null {
    const c = this.s[this.i];
    if (c === undefined) return null;
    if (c === '{') {
      this.i++;
      return this.daftar('}');
    }
    if (c === '}') {
      this.i++;
      return [];
    }
    if (c === '\\') {
      this.i++;
      let nama = '';
      if (/[a-zA-Z]/.test(this.s[this.i] ?? '')) {
        while (/[a-zA-Z]/.test(this.s[this.i] ?? '')) nama += this.s[this.i++];
      } else {
        nama = this.s[this.i++] ?? '';
      }
      if (nama === 'begin') return [this.matriks()];
      if (nama === 'end') {
        this.namaLingkungan();
        return [];
      }
      if (PERINTAH_PECAHAN.has(nama)) {
        const atas = this.argumen();
        const bawah = this.argumen();
        return [{ t: 'pecahan', atas, bawah }];
      }
      if (nama === 'sqrt') {
        let derajat: Simpul[] | null = null;
        this.lewatiSpasi();
        if (this.s[this.i] === '[') {
          const tutup = this.s.indexOf(']', this.i);
          derajat = new PenguraiLatex(this.s.slice(this.i + 1, tutup < 0 ? undefined : tutup)).urai();
          this.i = tutup < 0 ? this.s.length : tutup + 1;
        }
        return [{ t: 'akar', isi: this.argumen(), derajat }];
      }
      if (PERINTAH_TEKS.has(nama)) {
        this.lewatiSpasi();
        if (this.s[this.i] === '{') {
          const awal = ++this.i;
          let dalam = 1;
          while (this.i < this.s.length && dalam > 0) {
            if (this.s[this.i] === '{') dalam++;
            else if (this.s[this.i] === '}') dalam--;
            this.i++;
          }
          const isi = this.s.slice(awal, this.i - 1);
          return nama === 'text' || nama === 'textrm' || nama === 'mbox' ? [{ t: 'teks', s: isi }] : new PenguraiLatex(isi).urai();
        }
        return [];
      }
      if (nama in SIMBOL) return [{ t: 'teks', s: SIMBOL[nama] }];
      return [{ t: 'teks', s: '\\' + nama, mentah: true }];
    }
    this.i++;
    if (c === '~') return [{ t: 'teks', s: ' ' }];
    return [{ t: 'teks', s: c }];
  }
}

/** Spasi di tepi sel matriks tidak berarti dalam LaTeX; dibuang agar Word tidak menampilkannya. */
function rapikanSel(sel: Simpul[]): Simpul[] {
  const hasil = [...sel];
  const awal = hasil[0];
  if (awal?.t === 'teks' && !awal.mentah) hasil[0] = { t: 'teks', s: awal.s.trimStart() };
  const akhir = hasil[hasil.length - 1];
  if (akhir?.t === 'teks' && !akhir.mentah) hasil[hasil.length - 1] = { t: 'teks', s: akhir.s.trimEnd() };
  return hasil.filter((x) => x.t !== 'teks' || x.s !== '');
}

function ambilBasis(hasil: Simpul[]): Simpul[] {
  const akhir = hasil.pop();
  if (!akhir) return [];
  if (akhir.t === 'teks' && !akhir.mentah && akhir.s.length > 1) {
    // Ambil hanya token terakhir (angka utuh atau satu huruf) sebagai basis.
    const m = akhir.s.match(/(\d+(?:[.,]\d+)?|.)$/u);
    const tok = m ? m[1] : akhir.s.slice(-1);
    const sisa = akhir.s.slice(0, akhir.s.length - tok.length);
    if (sisa) hasil.push({ t: 'teks', s: sisa });
    return [{ t: 'teks', s: tok }];
  }
  return [akhir];
}

function gabungTeks(daftar: Simpul[]): Simpul[] {
  const hasil: Simpul[] = [];
  for (const s of daftar) {
    const akhir = hasil[hasil.length - 1];
    if (s.t === 'teks' && akhir?.t === 'teks' && !s.mentah && !akhir.mentah) {
      hasil[hasil.length - 1] = { t: 'teks', s: akhir.s + s.s };
    } else hasil.push(s);
  }
  return hasil;
}

export function uraiLatex(latex: string): Simpul[] {
  return new PenguraiLatex(latex).urai();
}

// $...$, \(...\), atau LaTeX yang lupa diberi pembatas: lingkungan \begin..\end dan perintah seperti \frac{1}{2}.
const POLA_RUMUS = /\$([^$]+)\$|\\\((.+?)\\\)|(\\begin\{([a-zA-Z]+\*?)\}[\s\S]*?\\end\{\4\}|\\(?:[dtc]?frac|sqrt|times|div|cdot|pm|le|leq|ge|geq|ne|neq|approx|pi|circ|degree|alpha|beta|theta)(?![a-zA-Z])(?:\[[^\]]*\])?(?:\s*\{[^{}]*\})*)/g;

/**
 * Perbaiki LaTeX yang rusak karena garis miring terbaca sebagai escape JSON:
 * "\times" menjadi tab + "imes", "\frac" menjadi form feed + "rac", "\begin" menjadi backspace + "egin".
 */
export function pulihkanLatex(teks: string): string {
  return teks
    .replace(/\x08(?=[a-zA-Z])/g, '\\b')
    .replace(/\f(?=[a-zA-Z])/g, '\\f')
    .replace(/\r(?=[a-zA-Z])/g, '\\r')
    .replace(/\t(?=(?:imes|heta|ext[a-z]*|frac|riangle|au|an|o|ilde|op)(?![a-zA-Z]))/g, '\\t')
    .replace(/\n(?=(?:eq|e|ot|otin)(?![a-zA-Z]))/g, '\\n');
}

const POLA_PECAHAN_POLOS = /(?<![\d/.,\w])(\d+)\s?\/\s?(\d+)(?![\d/,.]?\d)/g;

/** Pecah teks menjadi segmen kalimat dan rumus. */
export function uraiTeks(teks: string, pecahanOtomatis = true): Segmen[] {
  teks = pulihkanLatex(teks);
  const hasil: Segmen[] = [];
  const dorongTeks = (s: string) => {
    if (!s) return;
    if (!pecahanOtomatis) {
      hasil.push({ jenis: 'teks', s });
      return;
    }
    let akhir = 0;
    for (const m of s.matchAll(POLA_PECAHAN_POLOS)) {
      const idx = m.index ?? 0;
      if (idx > akhir) hasil.push({ jenis: 'teks', s: s.slice(akhir, idx) });
      const latex = `\\frac{${m[1]}}{${m[2]}}`;
      hasil.push({ jenis: 'mat', latex, simpul: uraiLatex(latex) });
      akhir = idx + m[0].length;
    }
    if (akhir < s.length) hasil.push({ jenis: 'teks', s: s.slice(akhir) });
  };
  let akhir = 0;
  for (const m of teks.matchAll(POLA_RUMUS)) {
    const idx = m.index ?? 0;
    dorongTeks(teks.slice(akhir, idx));
    const latex = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    hasil.push({ jenis: 'mat', latex, simpul: uraiLatex(latex) });
    akhir = idx + m[0].length;
  }
  dorongTeks(teks.slice(akhir));
  return hasil;
}

/** Teks polos tanpa rumus, untuk alt, pencarian, dan kemiripan. */
export function teksPolos(teks: string): string {
  return uraiTeks(teks, false)
    .map((g) => (g.jenis === 'teks' ? g.s : simpulKePolos(g.simpul)))
    .join('');
}

export function simpulKePolos(daftar: Simpul[]): string {
  return daftar
    .map((n) => {
      switch (n.t) {
        case 'teks':
          return n.mentah ? n.s.slice(1) : n.s;
        case 'pecahan':
          return `${simpulKePolos(n.atas)}/${simpulKePolos(n.bawah)}`;
        case 'pangkat':
          return `${simpulKePolos(n.basis)}^${simpulKePolos(n.atas)}`;
        case 'indeks':
          return `${simpulKePolos(n.basis)}_${simpulKePolos(n.bawah)}`;
        case 'akar':
          return `√(${simpulKePolos(n.isi)})`;
        case 'matriks':
          return `${n.kiri}${n.baris.map((b) => b.map(simpulKePolos).join(' ')).join('; ')}${n.kanan}`;
      }
    })
    .join('');
}

export function adaRumus(teks: string): boolean {
  return uraiTeks(teks).some((g) => g.jenis === 'mat');
}
