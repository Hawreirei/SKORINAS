// Teks soal: kalimat biasa dengan rumus LaTeX sebaris di antara $...$, $$...$$, \(...\), atau \[...\].
// Pecahan polos seperti 3/4 di luar rumus diubah menjadi pecahan bertumpuk.
// Satu pohon sintaks dipakai semua keluaran: KaTeX (layar), Office Math (Word), tata letak PDF, dan LaTeX.

/** Gaya huruf rumus: tegak (\text, \mathrm), tebal (\mathbf), atau nama fungsi tegak (\sin, \log, \lim). */
export type GayaHuruf = 'tegak' | 'tebal' | 'fungsi';

export type Simpul =
  | { t: 'teks'; s: string; mentah?: boolean; gaya?: GayaHuruf }
  | { t: 'pecahan'; atas: Simpul[]; bawah: Simpul[]; tanpaGaris?: boolean }
  | { t: 'pangkat'; basis: Simpul[]; atas: Simpul[] }
  | { t: 'indeks'; basis: Simpul[]; bawah: Simpul[] }
  | { t: 'akar'; isi: Simpul[]; derajat: Simpul[] | null }
  | { t: 'matriks'; kiri: string; kanan: string; baris: Simpul[][][] }
  /** \left( ... \right): tanda kurung setinggi isinya. String kosong berarti tanpa kurung (\left. atau \right.). */
  | { t: 'kurung'; kiri: string; kanan: string; isi: Simpul[] }
  /** \vec, \hat, \bar (aksen), \overline, \underline, dan \boxed. */
  | { t: 'hiasan'; jenis: 'aksen' | 'garis_atas' | 'garis_bawah' | 'kotak'; tanda: string; isi: Simpul[] }
  /** \sum, \prod, \int, dan sejenisnya beserta batas dan suku yang dikenainya. */
  | { t: 'besar'; op: string; bawah: Simpul[] | null; atas: Simpul[] | null; isi: Simpul[] }
  /** Tulisan di bawah atau di atas dasar: \lim_{x \to 0}, \overset{a}{b}, \underset{a}{b}. */
  | { t: 'batas'; basis: Simpul[]; bawah: Simpul[] | null; atas: Simpul[] | null };

export type Segmen = { jenis: 'teks'; s: string } | { jenis: 'mat'; latex: string; simpul: Simpul[] };

export const SIMBOL: Record<string, string> = {
  // operasi dan relasi
  times: '×', div: '÷', cdot: '·', cdotp: '·', centerdot: '·', pm: '±', mp: '∓', ast: '∗', star: '⋆', bullet: '•', circ: '∘',
  oplus: '⊕', otimes: '⊗', setminus: '∖', backslash: '\\', le: '≤', leq: '≤', leqslant: '≤', ge: '≥', geq: '≥', geqslant: '≥',
  ne: '≠', neq: '≠', approx: '≈', equiv: '≡', cong: '≅', sim: '∼', simeq: '≃', doteq: '≐', propto: '∝', ll: '≪', gg: '≫',
  lt: '<', gt: '>', nless: '≮', ngtr: '≯', nleq: '≰', ngeq: '≱', mid: '∣', nmid: '∤', parallel: '∥', perp: '⊥',
  // himpunan dan logika
  in: '∈', notin: '∉', ni: '∋', owns: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇', subsetneq: '⊊',
  nsubseteq: '⊈', cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', complement: '∁', forall: '∀', exists: '∃', nexists: '∄',
  neg: '¬', lnot: '¬', wedge: '∧', land: '∧', vee: '∨', lor: '∨', therefore: '∴', because: '∵', top: '⊤', bot: '⊥',
  // panah
  to: '→', rightarrow: '→', longrightarrow: '⟶', leftarrow: '←', gets: '←', longleftarrow: '⟵', leftrightarrow: '↔',
  Rightarrow: '⇒', implies: '⇒', Longrightarrow: '⟹', Leftarrow: '⇐', impliedby: '⇐', Leftrightarrow: '⇔', iff: '⇔',
  Longleftrightarrow: '⟺', mapsto: '↦', uparrow: '↑', downarrow: '↓', nearrow: '↗', searrow: '↘', rightleftharpoons: '⇌',
  // geometri
  angle: '∠', measuredangle: '∡', triangle: '△', square: '□', Box: '□', blacksquare: '■', diamond: '⋄', bigcirc: '○',
  degree: '°', textdegree: '°', frown: '⌢', smile: '⌣',
  // huruf Yunani
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ',
  vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ',
  sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // lain-lain
  infty: '∞', partial: '∂', nabla: '∇', ell: 'ℓ', hbar: 'ħ', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', prime: '′', checkmark: '✓',
  surd: '√', dagger: '†', S: '§', P: '¶', ldots: '…', dots: '…', dotsc: '…', dotsb: '⋯', cdots: '⋯', vdots: '⋮', ddots: '⋱',
  langle: '⟨', rangle: '⟩', lvert: '|', rvert: '|', vert: '|', lVert: '‖', rVert: '‖', Vert: '‖', '|': '‖',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', lbrace: '{', rbrace: '}', lbrack: '[', rbrack: ']',
  colon: ':', '%': '%', '{': '{', '}': '}', '$': '$', '#': '#', '&': '&', _: '_', '/': '/',
  // Spasi LaTeX menjadi spasi Unicode: spasi biasa di dalam rumus tidak berarti dan dibuang saat ditata.
  ',': '\u2009', ';': '\u2005', ':': '\u2005', '>': '\u2005', '!': '', quad: '\u2003', qquad: '\u2003\u2003', ' ': '\u00A0',
  enspace: '\u2002', thinspace: '\u2009', medspace: '\u2005', thickspace: '\u2004', negthinspace: '', '\\': ' ', newline: ' ', hline: '', displaystyle: '', textstyle: '',
  scriptstyle: '', limits: '', nolimits: '', middle: '', big: '', Big: '', bigg: '', Bigg: '', bigl: '', bigr: '',
  Bigl: '', Bigr: '', biggl: '', biggr: '', Biggl: '', Biggr: '', strut: '', mathstrut: '', nonumber: '', notag: '',
};

/** Nama fungsi yang ditulis tegak; yang ada di BATAS menaruh indeksnya di bawah (lim, maks). */
const FUNGSI = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'cosec', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth',
  'log', 'ln', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det', 'gcd', 'deg', 'dim', 'ker', 'arg', 'Pr', 'hom',
]);
const BATAS = new Set(['lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf']);

export const OPERATOR_BESAR: Record<string, string> = {
  sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮', bigcup: '⋃', bigcap: '⋂', bigoplus: '⊕', bigotimes: '⊗',
};

const AKSEN: Record<string, string> = {
  vec: '\u20D7', hat: '\u0302', widehat: '\u0302', bar: '\u0305', dot: '\u0307', ddot: '\u0308', tilde: '\u0303',
  widetilde: '\u0303', acute: '\u0301', grave: '\u0300', check: '\u030C', breve: '\u0306', overrightarrow: '→',
  overleftarrow: '←', overleftrightarrow: '↔', overarc: '⌒', wideparen: '⌒', arc: '⌒',
};

export const HURUF_GANDA: Record<string, string> = { N: 'ℕ', Z: 'ℤ', Q: 'ℚ', R: 'ℝ', C: 'ℂ', P: 'ℙ', H: 'ℍ' };

// \not di depan relasi.
export const TIDAK: Record<string, string> = { '=': '≠', '∈': '∉', '⊂': '⊄', '⊆': '⊈', '≡': '≢', '<': '≮', '>': '≯', '≤': '≰', '≥': '≱', '|': '∤', '∃': '∄' };

/** Isi diambil apa adanya sebagai teks (bukan rumus). */
const PERINTAH_TEKS: Record<string, GayaHuruf | undefined> = { text: 'tegak', textrm: 'tegak', textup: 'tegak', textnormal: 'tegak', mbox: 'tegak', hbox: 'tegak', textsf: 'tegak', texttt: 'tegak', textbf: 'tebal', textit: undefined, emph: undefined };
/** Isi diurai sebagai rumus lalu diberi gaya. */
const PERINTAH_GAYA: Record<string, GayaHuruf | null> = {
  mathrm: 'tegak', mathup: 'tegak', mathsf: 'tegak', mathtt: 'tegak', operatorname: 'fungsi', mathbf: 'tebal', boldsymbol: 'tebal',
  bm: 'tebal', pmb: 'tebal', mathit: null, mathcal: null, mathscr: null, mathfrak: null, displaystyle: null,
};
const PERINTAH_PECAHAN = new Set(['frac', 'dfrac', 'tfrac', 'cfrac']);
const PERINTAH_BINOM = new Set(['binom', 'dbinom', 'tbinom']);
// Perintah yang argumennya dibuang: \hspace{1cm}, \color{red}, \label{x}.
const BUANG_ARGUMEN = new Set(['hspace', 'vspace', 'color', 'label', 'tag', 'kern', 'mkern', 'hskip', 'vskip']);
const RELASI = /^[=<>≤≥≠≈≡≅∼∝⇒⇔→←⟶⟹,;]$/;

// Lingkungan matriks: tanda kurung kiri dan kanan.
const KURUNG_MATRIKS: Record<string, [string, string]> = {
  matrix: ['', ''], array: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'],
  vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''], smallmatrix: ['', ''], aligned: ['', ''],
};
// Persamaan rata: isi tiap baris digabung menjadi satu sel agar tidak ada sel yang diawali "=".
const LINGKUNGAN_RATA = new Set(['aligned', 'align', 'alignat', 'alignedat', 'gathered', 'gather', 'split', 'eqnarray', 'flalign', 'multline']);

type Penutup = null | '}' | '&' | 'right';

class PenguraiLatex {
  private i = 0;
  constructor(private readonly s: string) {}

  urai(): Simpul[] {
    return this.daftar(null);
  }

  /** Berhenti di penutup: '}' dan \right dilewati, sedangkan '&' (sel matriks) berhenti sebelum &, \\, atau \end. */
  private selesai(penutup: Penutup): boolean {
    const c = this.s[this.i];
    if (penutup === '}' && c === '}') {
      this.i++;
      return true;
    }
    if (penutup === '&') return c === '&' || this.s.startsWith('\\\\', this.i) || /^\\end(?![a-zA-Z])/.test(this.s.slice(this.i, this.i + 5));
    if (penutup === 'right' && /^\\right(?![a-zA-Z])/.test(this.s.slice(this.i, this.i + 7))) {
      this.i += 6;
      return true;
    }
    return false;
  }

  private daftar(penutup: Penutup): Simpul[] {
    const hasil: Simpul[] = [];
    // Jumlah simpul dari grup {...} terakhir, agar {x+1}^2 memakai seluruh grup sebagai dasar.
    let grup: number | null = null;
    while (this.i < this.s.length) {
      if (this.selesai(penutup)) return rapikan(hasil);
      const c = this.s[this.i];
      if (c === '^' || c === '_') {
        this.i++;
        const arg = this.argumen();
        const akhir = hasil[hasil.length - 1];
        const g = grup;
        grup = null;
        if (akhir?.t === 'besar' && !(c === '^' ? akhir.atas : akhir.bawah)) {
          if (c === '^') akhir.atas = arg;
          else akhir.bawah = arg;
          continue;
        }
        if (akhir?.t === 'batas' && c === '_' && !akhir.bawah) {
          akhir.bawah = arg;
          continue;
        }
        if (c === '_' && g === null && akhir?.t === 'teks' && akhir.gaya === 'fungsi' && BATAS.has(akhir.s)) {
          hasil.pop();
          hasil.push({ t: 'batas', basis: [akhir], bawah: arg, atas: null });
          continue;
        }
        if (c === '^' && arg.length === 1 && arg[0].t === 'teks' && (arg[0].s === '∘' || arg[0].s === '°')) {
          // 60^\circ adalah derajat, bukan pangkat.
          hasil.push({ t: 'teks', s: '°' });
          continue;
        }
        const basis = g !== null ? hasil.splice(hasil.length - g) : ambilBasis(hasil);
        hasil.push(c === '^' ? { t: 'pangkat', basis, atas: arg } : { t: 'indeks', basis, bawah: arg });
        continue;
      }
      const sebelum = hasil.length;
      const dariGrup = c === '{';
      const atom = this.atom();
      if (atom) hasil.push(...atom);
      grup = dariGrup ? hasil.length - sebelum : null;
    }
    return rapikan(hasil);
  }

  private argumen(): Simpul[] {
    this.lewatiSpasi();
    if (this.s[this.i] === '{') {
      this.i++;
      return this.daftar('}');
    }
    return this.atom() ?? [];
  }

  /** Isi {...} apa adanya, tanpa diurai. */
  private argumenMentah(): string {
    this.lewatiSpasi();
    if (this.s[this.i] !== '{') {
      // Tanpa kurung kurawal: satu karakter atau satu perintah.
      const m = this.s.slice(this.i).match(/^(\\[a-zA-Z]+|\\?.)/);
      this.i += m ? m[0].length : 0;
      return m ? m[0] : '';
    }
    const awal = ++this.i;
    let dalam = 1;
    while (this.i < this.s.length && dalam > 0) {
      if (this.s[this.i] === '\\') this.i++;
      else if (this.s[this.i] === '{') dalam++;
      else if (this.s[this.i] === '}') dalam--;
      this.i++;
    }
    return this.s.slice(awal, Math.max(awal, this.i - 1));
  }

  private lewatiSpasi() {
    while (this.s[this.i] === ' ' || this.s[this.i] === '\n') this.i++;
  }

  /** Tanda kurung setelah \left, \right, atau \bigl: (, [, \{, \langle, |, atau . (tanpa kurung). */
  private pembatas(): string {
    this.lewatiSpasi();
    const c = this.s[this.i];
    if (c === undefined) return '';
    if (c === '\\') {
      const m = this.s.slice(this.i).match(/^\\([a-zA-Z]+|.)/);
      if (!m) return '';
      this.i += m[0].length;
      return SIMBOL[m[1]] ?? m[1];
    }
    this.i++;
    return c === '.' ? '' : c;
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
    if (LINGKUNGAN_RATA.has(nama)) return { t: 'matriks', kiri, kanan, baris: baris.map((b) => [gabungTeks(b.flat())]) };
    return { t: 'matriks', kiri, kanan, baris };
  }

  private perintah(nama: string): Simpul[] {
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
    if (PERINTAH_BINOM.has(nama)) {
      const atas = this.argumen();
      const bawah = this.argumen();
      return [{ t: 'kurung', kiri: '(', kanan: ')', isi: [{ t: 'pecahan', atas, bawah, tanpaGaris: true }] }];
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
    if (nama === 'left') {
      const kiri = this.pembatas();
      const isi = this.daftar('right');
      return [{ t: 'kurung', kiri, kanan: this.pembatas(), isi }];
    }
    if (nama === 'right') {
      // \right tanpa pasangan \left: tulis tanda kurungnya saja.
      const k = this.pembatas();
      return k ? [{ t: 'teks', s: k }] : [];
    }
    if (nama in PERINTAH_TEKS) {
      const isi = this.argumenMentah().replace(/\\([%&$#_{} ])/g, '$1').replace(/~/g, ' ');
      const gaya = PERINTAH_TEKS[nama];
      return isi ? [gaya ? { t: 'teks', s: isi, gaya } : { t: 'teks', s: isi }] : [];
    }
    if (nama in PERINTAH_GAYA) {
      if (nama === 'operatorname' && this.s[this.i] === '*') this.i++;
      const gaya = PERINTAH_GAYA[nama];
      const isi = this.argumen();
      return gaya ? beriGaya(isi, gaya) : isi;
    }
    if (nama === 'mathbb' || nama === 'Bbb' || nama === 'mathbbm') {
      const isi = this.argumenMentah();
      return [{ t: 'teks', s: [...isi].map((h) => HURUF_GANDA[h] ?? h).join(''), ...(/^[NZQRCPH]*$/.test(isi) ? {} : { gaya: 'tebal' as const }) }];
    }
    if (nama in AKSEN) return [{ t: 'hiasan', jenis: 'aksen', tanda: AKSEN[nama], isi: this.argumen() }];
    if (nama === 'overline') return [{ t: 'hiasan', jenis: 'garis_atas', tanda: '', isi: this.argumen() }];
    if (nama === 'underline') return [{ t: 'hiasan', jenis: 'garis_bawah', tanda: '', isi: this.argumen() }];
    if (nama === 'boxed' || nama === 'fbox' || nama === 'framebox') return [{ t: 'hiasan', jenis: 'kotak', tanda: '', isi: this.argumen() }];
    if (nama === 'overset' || nama === 'stackrel' || nama === 'underset') {
      const tanda = this.argumen();
      const basis = this.argumen();
      return [{ t: 'batas', basis, atas: nama === 'underset' ? null : tanda, bawah: nama === 'underset' ? tanda : null }];
    }
    if (nama in OPERATOR_BESAR) return [{ t: 'besar', op: OPERATOR_BESAR[nama], bawah: null, atas: null, isi: [] }];
    if (FUNGSI.has(nama)) return [{ t: 'teks', s: nama, gaya: 'fungsi' }];
    if (nama === 'pmod' || nama === 'pod') return [{ t: 'teks', s: '\u2005(' }, { t: 'teks', s: 'mod', gaya: 'fungsi' }, ...this.argumen(), { t: 'teks', s: ')' }];
    if (nama === 'bmod' || nama === 'mod') return [{ t: 'teks', s: '\u2005' }, { t: 'teks', s: 'mod', gaya: 'fungsi' }];
    if (nama === 'not') {
      const berikut = this.atom() ?? [];
      const n = berikut[0];
      if (n?.t === 'teks' && !n.mentah) return [{ t: 'teks', s: TIDAK[n.s] ?? n.s + '\u0338' }];
      return berikut;
    }
    if (nama === 'textcolor') {
      this.argumenMentah();
      return this.argumen();
    }
    if (nama === 'phantom' || nama === 'hphantom' || nama === 'vphantom') {
      this.argumenMentah();
      return nama === 'vphantom' ? [] : [{ t: 'teks', s: '\u2002' }];
    }
    if (BUANG_ARGUMEN.has(nama)) {
      if (this.s[this.i] === '*') this.i++;
      this.argumenMentah();
      return nama === 'hspace' || nama === 'hskip' ? [{ t: 'teks', s: '\u2003' }] : [];
    }
    if (nama in SIMBOL) return SIMBOL[nama] ? [{ t: 'teks', s: SIMBOL[nama] }] : [];
    // Perintah tak dikenal (juga \over dan \choose yang diproses di rapikan): ditulis tanpa garis miring.
    return [{ t: 'teks', s: '\\' + nama, mentah: true }];
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
      return this.perintah(nama);
    }
    this.i++;
    if (c === '~') return [{ t: 'teks', s: '\u00A0' }];
    if (c === "'") return [{ t: 'teks', s: '′' }];
    return [{ t: 'teks', s: c }];
  }
}

function beriGaya(daftar: Simpul[], gaya: GayaHuruf): Simpul[] {
  return daftar.map((n) => (n.t === 'teks' && !n.mentah ? { ...n, gaya } : n));
}

/**
 * Garis tegak berpasangan |x - 3| menjadi tanda mutlak (kurung | |); garis tegak tunggal seperti pada P(A|B)
 * atau {x | x > 0} menjadi ∣ (bersyarat), agar tidak dibaca "atau" oleh penyunting rumus lain.
 */
function garisTegak(daftar: Simpul[]): Simpul[] {
  const posisi = daftar.flatMap((n, i) => (n.t === 'teks' && !n.mentah && !n.gaya && n.s === '|' ? [i] : []));
  if (!posisi.length) return daftar;
  const hasil: Simpul[] = [];
  let k = 0;
  for (let i = 0; i < daftar.length; i++) {
    const buka = posisi[k];
    if (i === buka && k + 1 < posisi.length) {
      const tutup = posisi[k + 1];
      hasil.push({ t: 'kurung', kiri: '|', kanan: '|', isi: rapikan(daftar.slice(i + 1, tutup)) });
      i = tutup;
      k += 2;
    } else if (i === buka) {
      hasil.push({ t: 'teks', s: '∣' });
      k++;
    } else hasil.push(daftar[i]);
  }
  return hasil;
}

/** Rapikan hasil satu tingkat: \over dan \choose, suku yang dikenai \sum atau \int, lalu gabungkan teks. */
function rapikan(daftar: Simpul[]): Simpul[] {
  daftar = garisTegak(daftar);
  const infiks = daftar.findIndex((n) => n.t === 'teks' && n.mentah && /^\\(over|choose|atop|brack|brace)$/.test(n.s));
  if (infiks >= 0) {
    const jenis = (daftar[infiks] as { s: string }).s;
    const atas = rapikan(daftar.slice(0, infiks));
    const bawah = rapikan(daftar.slice(infiks + 1));
    if (jenis === '\\over') return [{ t: 'pecahan', atas, bawah }];
    const pecahan: Simpul = { t: 'pecahan', atas, bawah, tanpaGaris: true };
    if (jenis === '\\atop') return [pecahan];
    const [kiri, kanan] = jenis === '\\choose' ? ['(', ')'] : jenis === '\\brack' ? ['[', ']'] : ['{', '}'];
    return [{ t: 'kurung', kiri, kanan, isi: [pecahan] }];
  }
  const hasil: Simpul[] = [];
  for (let i = 0; i < daftar.length; i++) {
    const n = daftar[i];
    if (n.t === 'besar' && !n.isi.length) {
      // Suku yang dikenai operator: sampai relasi (=, <, …) atau operator besar berikutnya.
      let j = i + 1;
      while (j < daftar.length) {
        const m = daftar[j];
        if (m.t === 'besar' || (m.t === 'teks' && !m.gaya && RELASI.test(m.s.trim()))) break;
        j++;
      }
      const isi = gabungTeks(daftar.slice(i + 1, j));
      if (isi[0]?.t === 'teks' && !isi[0].gaya) isi[0] = { ...isi[0], s: isi[0].s.trimStart() };
      hasil.push({ ...n, isi: isi.filter((x) => x.t !== 'teks' || x.s !== '') });
      i = j - 1;
      continue;
    }
    hasil.push(n);
  }
  return gabungTeks(hasil);
}

/** Spasi di tepi sel matriks tidak berarti dalam LaTeX; dibuang agar Word tidak menampilkannya. */
function rapikanSel(sel: Simpul[]): Simpul[] {
  const hasil = [...sel];
  const awal = hasil[0];
  if (awal?.t === 'teks' && !awal.mentah) hasil[0] = { ...awal, s: awal.s.trimStart() };
  const akhir = hasil[hasil.length - 1];
  if (akhir?.t === 'teks' && !akhir.mentah) hasil[hasil.length - 1] = { ...akhir, s: akhir.s.trimEnd() };
  return hasil.filter((x) => x.t !== 'teks' || x.s !== '');
}

function ambilBasis(hasil: Simpul[]): Simpul[] {
  const polos = (n: Simpul | undefined): n is Extract<Simpul, { t: 'teks' }> => n?.t === 'teks' && !n.mentah && !n.gaya;
  if (!polos(hasil[hasil.length - 1])) {
    const akhir = hasil.pop();
    return akhir ? [akhir] : [];
  }
  // Teks polos di ujung digabung dulu agar 10^3 memakai 10, bukan 0.
  let awal = hasil.length;
  while (awal > 0 && polos(hasil[awal - 1])) awal--;
  const s = hasil
    .splice(awal)
    .map((n) => (n as { s: string }).s)
    .join('');
  // Dasar: kurung (x+1) utuh, angka utuh, atau satu huruf.
  let tok = s.match(/(\d+(?:[.,]\d+)?|.)$/u)?.[1] ?? '';
  if (tok === ')') {
    let dalam = 0;
    for (let k = s.length - 1; k >= 0; k--) {
      if (s[k] === ')') dalam++;
      else if (s[k] === '(' && --dalam === 0) {
        tok = s.slice(k);
        break;
      }
    }
  }
  const sisa = s.slice(0, s.length - tok.length);
  if (sisa) hasil.push({ t: 'teks', s: sisa });
  return tok ? [{ t: 'teks', s: tok }] : [];
}

function gabungTeks(daftar: Simpul[]): Simpul[] {
  const hasil: Simpul[] = [];
  for (const s of daftar) {
    const akhir = hasil[hasil.length - 1];
    if (s.t === 'teks' && akhir?.t === 'teks' && !s.mentah && !akhir.mentah && s.gaya === akhir.gaya && s.gaya !== 'fungsi') {
      hasil[hasil.length - 1] = { ...akhir, s: akhir.s + s.s };
    } else hasil.push(s);
  }
  return hasil;
}

export function uraiLatex(latex: string): Simpul[] {
  return new PenguraiLatex(latex).urai();
}

// $$...$$, $...$, \(...\), \[...\], atau LaTeX yang lupa diberi pembatas: lingkungan \begin..\end dan
// perintah seperti \frac{1}{2} beserta argumen, pangkat, dan indeksnya.
const POLA_RUMUS = new RegExp(
  [
    String.raw`(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$`,
    String.raw`(?<!\\)\$((?:\\\$|[^$])+?)(?<!\\)\$`,
    String.raw`\\\(([\s\S]+?)\\\)`,
    String.raw`\\\[([\s\S]+?)\\\]`,
    String.raw`(\\begin\{([a-zA-Z]+\*?)\}[\s\S]*?\\end\{\6\}|(?<!\\)\\(?!begin|end)[a-zA-Z]+\*?(?:\s*\[[^\]]*\])?(?:\s*\{(?:[^{}]|\{[^{}]*\})*\})*(?:\s*[\^_](?:\{[^{}]*\}|\\[a-zA-Z]+|[A-Za-z0-9]))*)`,
  ].join('|'),
  'g',
);

/**
 * Perintah LaTeX berawalan t atau n yang dapat rusak oleh escape JSON, untuk dipulihkan di luar rumus.
 * Nama pendek seperti \ne dan \ni sengaja tidak dimasukkan: baris baru diikuti "e." atau "i." adalah butir daftar.
 * Di dalam $...$ semua dipulihkan (lihat pulihkanRumus) karena baris baru tidak bermakna di rumus.
 */
export const PERINTAH_RAWAN_ESCAPE = {
  t: 'imes|heta|ext[a-z]*|frac|riangle|au|an|anh|o|ilde|op|herefore|binom|extstyle',
  n: 'eq|ot|otin|abla|eg|leq|geq|less|gtr|subseteq|mid|exists|ewline|ormalsize',
} as const;

/**
 * Perbaiki LaTeX yang rusak karena garis miring terbaca sebagai escape JSON:
 * "\times" menjadi tab + "imes", "\frac" menjadi form feed + "rac", "\begin" menjadi backspace + "egin".
 */
export function pulihkanLatex(teks: string): string {
  return teks
    .replace(/\x08(?=[a-zA-Z])/g, '\\b')
    .replace(/\f(?=[a-zA-Z])/g, '\\f')
    .replace(/\r(?=[a-zA-Z])/g, '\\r')
    .replace(new RegExp(`\\t(?=(?:${PERINTAH_RAWAN_ESCAPE.t})(?![a-zA-Z]))`, 'g'), '\\t')
    .replace(new RegExp(`\\n(?=(?:${PERINTAH_RAWAN_ESCAPE.n})(?![a-zA-Z]))`, 'g'), '\\n');
}

const ESCAPE_KE_HURUF: Record<string, string> = { '\n': 'n', '\t': 't', '\r': 'r', '\f': 'f', '\x08': 'b' };

/** Di dalam rumus, karakter kendali diikuti huruf selalu berasal dari perintah LaTeX yang rusak (\ne, \nu, \tau). */
function pulihkanRumus(latex: string): string {
  return latex.replace(/[\n\t\r\f\x08](?=[a-zA-Z])/g, (c) => '\\' + ESCAPE_KE_HURUF[c]);
}

// Perintah yang dikenali sebagai rumus walau tidak diberi pembatas $; perintah lain di kalimat dibiarkan.
const PERINTAH_DIKENAL = new Set([
  ...Object.keys(SIMBOL), ...FUNGSI, ...Object.keys(OPERATOR_BESAR), ...Object.keys(AKSEN), ...Object.keys(PERINTAH_TEKS),
  ...Object.keys(PERINTAH_GAYA), ...PERINTAH_PECAHAN, ...PERINTAH_BINOM, ...BUANG_ARGUMEN, 'sqrt', 'left', 'right', 'mathbb', 'Bbb',
  'mathbbm', 'overline', 'underline', 'boxed', 'fbox', 'framebox', 'overset', 'stackrel', 'underset', 'pmod', 'pod', 'bmod', 'mod',
  'not', 'textcolor', 'phantom', 'hphantom', 'vphantom',
].filter((n) => /^[a-zA-Z]+$/.test(n)));

// Di luar rumus: pecahan polos 3/4, serta pangkat dan indeks polos seperti x^2, 10^{-3}, dan x_1.
const POLA_POLOS = /(?<![\d/.,\w])(\d+)\s?\/\s?(\d+)(?![\d/,.]?\d)|(?<![\\A-Za-z_])((?:[A-Za-z]|(?<!\d)\d+(?:[.,]\d+)?|\))[\^_](?:\{[^{}]*\}|-?\d+|[A-Za-z]))/g;

/** Escape LaTeX di kalimat biasa: \% menjadi %, \\ menjadi baris baru. */
function bersihkanTeks(s: string): string {
  // \n yang tersisa (bukan perintah yang dikenal) adalah baris baru yang garis miringnya tergandakan.
  return s.replace(/\\\\/g, '\n').replace(/\\n/g, '\n').replace(/\\([%&$#_{}])/g, '$1');
}

/** Pecah teks menjadi segmen kalimat dan rumus. */
export function uraiTeks(teks: string, pecahanOtomatis = true): Segmen[] {
  teks = pulihkanLatex(teks);
  const hasil: Segmen[] = [];
  const dorongTeks = (s: string) => {
    s = bersihkanTeks(s);
    if (!s) return;
    if (!pecahanOtomatis) {
      hasil.push({ jenis: 'teks', s });
      return;
    }
    let akhir = 0;
    for (const m of s.matchAll(POLA_POLOS)) {
      const idx = m.index ?? 0;
      if (idx > akhir) hasil.push({ jenis: 'teks', s: s.slice(akhir, idx) });
      const latex = m[3] ?? `\\frac{${m[1]}}{${m[2]}}`;
      hasil.push({ jenis: 'mat', latex, simpul: uraiLatex(latex) });
      akhir = idx + m[0].length;
    }
    if (akhir < s.length) hasil.push({ jenis: 'teks', s: s.slice(akhir) });
  };
  let akhir = 0;
  const pola = new RegExp(POLA_RUMUS);
  for (let m = pola.exec(teks); m; m = pola.exec(teks)) {
    const idx = m.index;
    if (m[2] !== undefined && /^\d/.test(m[2]) && /\s$/.test(m[2])) {
      // "$5 dan $10": tanda dolar mata uang, bukan pembatas rumus. Tanda $ kedua milik harga berikutnya.
      pola.lastIndex = idx + 1;
      continue;
    }
    const perintah = m[5]?.match(/^\\([a-zA-Z]+)/)?.[1];
    if (perintah && perintah !== 'begin' && !PERINTAH_DIKENAL.has(perintah)) {
      // Garis miring di kalimat yang bukan perintah rumus (mis. \nDiketahui): tetap teks.
      pola.lastIndex = idx + 1;
      continue;
    }
    dorongTeks(teks.slice(akhir, idx));
    const latex = pulihkanRumus(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').trim();
    if (latex) hasil.push({ jenis: 'mat', latex, simpul: uraiLatex(latex) });
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
        case 'kurung':
          return `${n.kiri}${simpulKePolos(n.isi)}${n.kanan}`;
        case 'hiasan':
          return n.jenis === 'aksen' && n.tanda.length === 1 && n.tanda.charCodeAt(0) < 0x2000 ? `${simpulKePolos(n.isi)}${n.tanda}` : simpulKePolos(n.isi);
        case 'besar':
          return `${n.op}${n.bawah ? `_${simpulKePolos(n.bawah)}` : ''}${n.atas ? `^${simpulKePolos(n.atas)}` : ''} ${simpulKePolos(n.isi)}`;
        case 'batas':
          return `${simpulKePolos(n.basis)}${n.bawah ? `_${simpulKePolos(n.bawah)}` : ''}${n.atas ? `^${simpulKePolos(n.atas)}` : ''}`;
      }
    })
    .join('');
}

export function adaRumus(teks: string): boolean {
  return uraiTeks(teks).some((g) => g.jenis === 'mat');
}
