import type { HurufOpsi } from '../db/tipe';
import { keTikz } from '../gambar/tikz';
import { escLatex, keLatex } from '../matematika/latex';
import { opsiPerBaris, type ButirDok, type DokumenSoal } from './model';

function lebarGambarCm(b: ButirDok): number {
  if (!b.gambar) return 0;
  const rasio = b.gambar.lebar / b.gambar.tinggi;
  return Math.min(11, Math.max(4, rasio > 2.5 ? 11 : rasio > 1.4 ? 8 : 5));
}

function butirKeTex(b: ButirDok, d: DokumenSoal): string {
  const isi = b.soal.isi_json;
  // Jaga pokok, gambar, dan opsi tetap satu halaman.
  const ruang = 3 + (isi.opsi ? Math.ceil(Object.keys(isi.opsi).length / opsiPerBaris(b, Object.keys(isi.opsi).length)) * 2 : 1) + (b.gambar ? Math.round((lebarGambarCm(b) * b.gambar.tinggi) / b.gambar.lebar / 0.6) : 0);
  const baris: string[] = [`${b.sederhana ? '' : `\\needspace{${Math.min(ruang, 30)}\\baselineskip}`}\\item ${keLatex(isi.pokok)}`];
  if (isi.bentuk === 'benar_salah') baris[0] += ` \\hfill ${d.inggris ? 'T\\quad F' : 'B\\quad S'}`;
  if (isi.terjemahan?.pokok) baris.push(`\\\\{\\itshape ${keLatex(isi.terjemahan.pokok)}}`);
  if (b.gambar) baris.push(`\\par\\smallskip\\begin{center}\n${keTikz(b.gambar, lebarGambarCm(b))}\n\\end{center}`);
  if (isi.bentuk === 'pilihan_ganda' && isi.opsi) {
    const huruf = Object.keys(isi.opsi).sort() as HurufOpsi[];
    const perBaris = opsiPerBaris(b, huruf.length);
    if (perBaris > 1) {
      const lebar = (0.98 / perBaris).toFixed(3);
      const sel = huruf.map((h, i) => `${h}.~${keLatex(isi.opsi![h] ?? '')}${(i + 1) % perBaris === 0 || i === huruf.length - 1 ? ' \\\\' : ' &'}`);
      baris.push(`\\par\\smallskip\\noindent{\\renewcommand{\\arraystretch}{1.9}\\begin{tabular}{@{}*{${perBaris}}{p{${lebar}\\linewidth}@{}}}\n${sel.join('\n')}\n\\end{tabular}}`);
    } else {
      const opsi = huruf.map((h) => `\\item ${keLatex(isi.opsi![h] ?? '')}`);
      baris.push(`\\begin{enumerate}[itemsep=0pt,label=\\Alph*.,leftmargin=*]\n${opsi.join('\n')}\n\\end{enumerate}`);
    }
  }
  if (b.kotakJawaban) baris.push(`\\kotakjawaban[${isi.bentuk === 'uraian' ? '5cm' : '2.5cm'}]`);
  if (b.sederhana) {
    // Di dalam dua kolom, pokok dan opsi dibungkus agar tidak terpisah kolom.
    const [kepala, ...sisa] = baris;
    return `\\item \\begin{minipage}[t]{\\linewidth}${kepala.replace(/^\\item /, '')}\n${sisa.join('\n')}\n\\end{minipage}`;
  }
  return baris.join('\n');
}

function daftarButir(butir: ButirDok[], d: DokumenSoal): string {
  // Butir sederhana yang berurutan masuk dua kolom; sisanya selebar halaman.
  const blok: string[] = [];
  let i = 0;
  while (i < butir.length) {
    const sederhana = butir[i].sederhana;
    const kelompok: ButirDok[] = [];
    while (i < butir.length && butir[i].sederhana === sederhana) kelompok.push(butir[i++]);
    const isi = `\\begin{enumerate}[label=\\arabic*.,start=${kelompok[0].nomor},leftmargin=*,itemsep=0.8em]\n${kelompok.map((b) => butirKeTex(b, d)).join('\n\n')}\n\\end{enumerate}`;
    blok.push(sederhana && kelompok.length > 1 ? `\\begin{multicols}{2}\n${isi}\n\\end{multicols}` : isi);
  }
  return blok.join('\n');
}

/** Kepala berkas kunci jawaban dan kisi-kisi. */
function kepalaLampiran(d: DokumenSoal, judulBerkas: string): string {
  return `\\begin{center}{\\bfseries ${judulBerkas}}\\\\${d.kop ? ` ${escLatex(d.kop.sekolah.toUpperCase())}\\\\` : ''} ${escLatex(d.judul)} · ${escLatex(d.mapel)} · ${escLatex(d.inggris ? 'Grade' : 'Kelas')} ${d.kelas}\\end{center}`;
}

/** Berkas .tex untuk dikompilasi sendiri (satu berkas: lembar soal, kunci jawaban, atau kisi-kisi): 14 pt, dua kolom untuk soal sederhana, kotak jawaban di bawah soal cerita. */
export function buatTex(d: DokumenSoal): string {
  const en = d.inggris;
  const L = (id: string, inggris: string) => escLatex(en ? inggris : id);
  const bagian: string[] = [];
  bagian.push(`% Kompilasi dengan pdflatex (Overleaf atau TeX lokal).
\\documentclass[14pt,a4paper]{extarticle}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[${en ? 'english' : 'indonesian'}]{babel}
\\usepackage{lmodern}
\\usepackage{textcomp}
\\usepackage[a4paper,margin=2cm]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{multicol}
\\usepackage{enumitem}
\\usepackage{array,longtable}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta}
\\usepackage{needspace}
% Pecahan bertumpuk berukuran penuh agar mudah dibaca siswa.
\\renewcommand{\\frac}[2]{\\dfrac{#1}{#2}}
\\linespread{1.15}
\\setlength{\\parindent}{0pt}
\\setlength{\\columnsep}{1cm}
\\newcommand{\\kotakjawaban}[1][4cm]{\\par\\smallskip\\noindent\\fbox{\\parbox[t][#1][t]{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule\\relax}{\\footnotesize ${L('Jawaban:', 'Answer:')}}}\\par}
\\pagestyle{plain}
\\begin{document}`);

  if (d.berkas === 'soal') {
    if (d.kop) {
      bagian.push(`\\begin{center}
  {\\large\\bfseries ${escLatex(d.kop.sekolah.toUpperCase())}}\\\\
  ${d.kop.baris.map((b) => `${escLatex(b)}\\\\`).join('\n')}
  ${d.kop.alamat ? `{\\small ${escLatex(d.kop.alamat)}}` : ''}
  \\end{center}
  \\vspace{-0.5em}\\hrule height 1pt\\vspace{0.8em}`);
    }
    bagian.push(`\\begin{center}{\\bfseries ${escLatex(d.judul)}}\\\\ ${escLatex(d.mapel)} · ${L('Kelas', 'Grade')} ${d.kelas}\\end{center}`);
    if (d.identitas.length) {
      const n = d.identitas.length;
      const lebar = (i: number) => (n === 1 ? 0.98 : i === 0 ? 0.44 : 0.52 / (n - 1)).toFixed(3);
      bagian.push(`\\noindent ${d.identitas.map((f, i) => `\\parbox[b]{${lebar(i)}\\linewidth}{${escLatex(f)}: \\hrulefill}`).join('\\hfill')}\\par\\medskip`);
    }
    for (const b of d.bagian) {
      bagian.push(`\\subsection*{${escLatex(b.judul)}}\n{\\itshape ${escLatex(b.petunjuk)}}\\par\\smallskip\n${daftarButir(b.butir, d)}`);
    }
  }
  if (d.berkas === 'kunci') {
    const pendek = d.kunci.filter((k) => !k.rubrik?.length);
    const panjang = d.kunci.filter((k) => k.rubrik?.length);
    bagian.push(`${kepalaLampiran(d, L('KUNCI JAWABAN', 'ANSWER KEY'))}
${pendek.length ? `\\begin{multicols}{2}\n\\begin{itemize}[leftmargin=*,itemsep=2pt]\n${pendek.map((k) => `\\item[${k.nomor}.] ${keLatex(k.teks)}`).join('\n')}\n\\end{itemize}\n\\end{multicols}` : ''}
${panjang
  .map((k) => `\\paragraph{${k.nomor}.} ${keLatex(k.teks)}\\par\n${L('Rubrik', 'Rubric')}:\n\\begin{itemize}[itemsep=0pt]\n${k.rubrik!.map((r) => `\\item ${keLatex(r)}`).join('\n')}\n\\end{itemize}`)
  .join('\n')}`);
    // Pembahasan ikut berkas kunci jawaban, mulai di halaman baru.
    if (d.opsi.pembahasan) {
      bagian.push(`\\newpage
\\section*{${L('Pembahasan', 'Worked Solutions')}}
${d.pembahasan.map((p) => `\\paragraph{${p.nomor}.}\n\\begin{itemize}[itemsep=0pt]\n${p.langkah.map((l) => `\\item ${keLatex(l)}`).join('\n')}\n\\end{itemize}`).join('\n')}`);
    }
  }
  if (d.berkas === 'kisi') {
    bagian.push(`${kepalaLampiran(d, L('KISI-KISI', 'TEST BLUEPRINT'))}
{\\small ${L('Fase', 'Phase')} ${escLatex(d.fase)} · ${escLatex(d.kurikulumLabel)}}\\par\\smallskip
{\\footnotesize\\setlength{\\tabcolsep}{4pt}
\\begin{longtable}{|p{0.6cm}|p{4.0cm}|p{4.9cm}|p{1.0cm}|p{1.8cm}|p{2.0cm}|}
\\hline
\\textbf{No} & \\textbf{TP} & \\textbf{${L('Indikator', 'Indicator')}} & \\textbf{Level} & \\textbf{${L('Kesukaran', 'Difficulty')}} & \\textbf{${L('Bentuk', 'Type')}}\\\\ \\hline
\\endhead
${d.kisi.map((k) => `${k.nomor} & ${keLatex(k.tp)}${k.tp_kode ? ` {\\scriptsize(${escLatex(k.tp_kode)})}` : ''} & ${keLatex(k.indikator)} & ${k.level} & ${escLatex(k.kesukaran)} & ${escLatex(k.bentuk)}\\\\ \\hline`).join('\n')}
\\end{longtable}}`);
  }
  bagian.push('\\end{document}\n');
  return bagian.join('\n\n');
}
