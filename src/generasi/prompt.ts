import type { Bentuk, IsiSoal, JenisIsian, ParameterPaket, Slot } from '../db/tipe';
import { BENTUK_LABEL } from '../db/tipe';
import { TEMPLAT } from '../gambar';
import { paketUntuk } from '../paket';
import { bagianPromptUjian, formatPaket, kompetensiBacaButir, levelTkaButir } from '../ujian';
import { panjangStimulus } from './variasi';

export const SISTEM = `Anda penulis butir soal asesmen untuk sekolah di Indonesia yang memakai Kurikulum Merdeka.
Kontrak keluaran:
- Keluarkan HANYA satu objek JSON sesuai skema. Tanpa teks lain, tanpa pagar kode.
- Dilarang menyalin soal atau teks dari buku, ujian, atau situs. Stimulus harus asli atau berasal dari materi yang ditempel guru.
- Konteks lokal Indonesia yang bebas stereotip; variasikan nama orang (berbagai daerah dan gender) dan tempat.
- Angka dan satuan konsisten antara pokok, opsi, gambar, dan pembahasan.
- Pengecoh mewakili kesalahan konsep yang nyata, bukan asal berbeda.
- Jangan menyebut huruf opsi (A, B, C, D) di pembahasan, karena urutan opsi dapat diacak.
- Jangan memakai opsi "semua benar", "semua salah", atau gabungan opsi seperti "A dan B".
- Kolom "verifikasi" adalah instruksi pemeriksaan yang akan dihitung ulang oleh kode. Isi dengan jujur dan tepat.`;

const KONTRAK_SATU = '- Keluarkan HANYA satu objek JSON sesuai skema. Tanpa teks lain, tanpa pagar kode.';

/**
 * Sistem untuk permintaan berisi banyak butir (F-38). Satu permintaan menghasilkan beberapa butir agar
 * kuota harian penyedia cukup untuk beberapa paket; tiap butir tetap diperiksa sendiri oleh kode.
 */
export const SISTEM_KELOMPOK = SISTEM.replace(
  KONTRAK_SATU,
  `- Keluarkan HANYA satu objek JSON {"butir": [...]} berisi semua butir yang diminta, satu objek per butir sesuai skema, berurutan menurut nomor. Tanpa teks lain, tanpa pagar kode.
- Setiap butir berdiri sendiri dan tidak boleh mirip dengan butir lain dalam permintaan ini: konteks, angka, nama, dan bentuk pertanyaan berbeda.`,
);

const SKEMA = `{
  "bentuk": "<bentuk>",
  "pokok": "teks soal; rumus sebaris di antara $...$",
  "opsi": {"A": "...", "B": "...", "C": "...", "D": "..."},   // hanya pilihan_ganda dan pilihan_ganda_kompleks
  "pasangan": {"kiri": ["...", "..."], "kanan": ["...", "..."]},   // hanya menjodohkan: kolom kiri bernomor 1, 2, ...; kolom kanan berhuruf A, B, ...
  "pernyataan": ["...", "..."],   // hanya pilihan_ganda_kategori: pernyataan yang digolongkan ke salah satu kategori
  "kunci": "...",            // pilihan_ganda: huruf; pilihan_ganda_kompleks: semua huruf benar dipisah koma, mis. "A,C"; benar_salah: "B" atau "S"; menjodohkan: "1-B, 2-A, 3-C"; pilihan_ganda_kategori: satu huruf per pernyataan dipisah "-", B untuk kategori pertama dan S untuk kategori kedua, mis. "B-S-B-S"; isian_singkat: jawaban singkat; uraian: jawaban model lengkap
  "rubrik": ["kriteria (skor)", "..."],   // hanya uraian
  "jenis_uraian": "penjelasan" atau "hitungan",   // hanya uraian: penjelasan bila meminta alasan atau pernyataan, hitungan bila meminta perhitungan
  "pembahasan": ["langkah 1", "langkah 2"],
  "verifikasi": <lihat aturan verifikasi>,
  "gambar": null atau {"templat": "<id templat>", "parameter": {...}},
  "terjemahan": null atau {"pokok": "...", "opsi": {...}},  // hanya bila diminta dwibahasa
  "meta": {"tp": "<rumusan TP>", "indikator": "Disajikan ..., peserta didik dapat ...", "level": "<C1–C6>", "kesukaran": "<mudah|sedang|sulit>"}
}`;

const ATURAN_VERIFIKASI = `Aturan verifikasi (pilih satu tipe). Ekspresi memakai sintaks mathjs: titik desimal, tanpa pemisah ribuan, pecahan a/b, persen boleh 25%, fungsi lcm(a, b), gcd(a, b), sqrt(x), max(a, b, ...), min(a, b, ...); beri spasi setelah koma argumen.
- {"tipe":"ekspresi","ekspresi":"3/4 + 1/8","nilai":"7/8"}
  pilihan_ganda: opsi kunci bernilai sama dengan hasil, opsi lain tidak. isian_singkat: kunci bernilai sama dengan hasil.
  benar_salah: "nilai" adalah angka yang DISEBUT dalam pernyataan pada pokok, bukan hasil yang benar. Kunci "B" bila ekspresi memang bernilai "nilai", "S" bila tidak. Contoh pernyataan salah "Luas trapesium itu 60 cm²": {"ekspresi":"(8 + 12) / 2 * 5","nilai":"60"}, kunci "S".
  uraian: jawaban akhir.
- {"tipe":"perbandingan","kiri":"5/8","relasi":"<","kanan":"3/4"}  relasi salah satu dari = < > <= >= !=
  pilihan_ganda: HANYA bila semua opsi berupa tanda perbandingan (<, >, =). Bila opsi berupa bilangan (mis. "Pecahan yang paling besar adalah ...."), JANGAN pakai perbandingan: pakai ekspresi yang hasilnya sama dengan opsi kunci, mis. {"tipe":"ekspresi","ekspresi":"max(2/3, 3/4, 5/8)","nilai":"3/4"}, atau per_opsi. Ekspresi berisi tanda < atau > dengan nilai "true" tidak sah.
  isian_singkat: kunci berupa tanda perbandingan, atau salah satu bilangan yang dibandingkan; bila jawabannya kata atau nama (mis. "Fitri"), pakai tidak_ada. benar_salah: pokok menyatakan kiri relasi kanan apa adanya.
- {"tipe":"urutan","nilai":["2/3","3/4","5/6"],"arah":"naik"}  untuk soal mengurutkan; kunci memuat daftar yang sama, dipisah koma atau titik koma.
- {"tipe":"per_opsi","opsi":{"A":{"kiri":"3/4","relasi":">","kanan":"2/3"},"B":{"kiri":"0.5 + 0.25","relasi":"=","kanan":"0.7"}, ...}}  satu pernyataan per opsi (semua opsi) yang menerjemahkan isi opsi itu.
  pilihan_ganda_kompleks: opsi benar tepat yang pernyataannya benar.
  pilihan_ganda: tepat satu pernyataan benar, yaitu milik opsi kunci. Pakai bila opsi berupa kalimat atau pernyataan perbandingan ("Tali Dayu lebih pendek dari tali Lani" → {"kiri":"3/4","relasi":"<","kanan":"5/6"}), atau bila opsi bilangan diuji syarat pada pokok ("pecahan yang lebih besar dari 3/5": A {"kiri":"1/2","relasi":">","kanan":"3/5"}, B {"kiri":"7/10","relasi":">","kanan":"3/5"}, ...).
  pilihan_ganda_kompleks juga boleh memakai tipe "ekspresi" bila setiap opsi berupa bilangan: opsi benar tepat yang bernilai sama dengan hasil.
- {"tipe":"pasangan","kiri":["3 * 4","20 - 5","6 + 7"],"kanan":["13","12","15","14"]}  khusus menjodohkan: nilai tiap butir kolom kiri dan kanan berurutan; pasangan benar bernilai sama dan tunggal.
- {"tipe":"per_pernyataan","pernyataan":[{"kiri":"3/4","relasi":">","kanan":"2/3"},{"kiri":"12 * 15","relasi":"=","kanan":"170"}]}  khusus pilihan_ganda_kategori: satu pernyataan hitung per pernyataan soal, berurutan; pernyataan yang benar berkategori pertama (B), yang salah berkategori kedua (S).
- {"tipe":"tidak_ada","alasan":"..."} bila jawaban tidak dapat dihitung (konsep, sifat, penalaran), atau bila opsi bukan satu bilangan atau satu tanda (mis. opsi berisi dua pecahan sekaligus). Soal ini akan ditelaah guru.
Opsi dan kunci bilangan boleh memakai satuan (mis. "112 cm²" atau "$112\\text{ cm}^2$"); satu opsi berisi satu bilangan.
Bila memakai gambar, ekspresi boleh memakai variabel gambar (lihat daftar templat), mis. "pecahan" atau "nilai[2] - nilai[1]" (indeks mulai 1).`;

const PETUNJUK_BENTUK: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihan ganda dengan tepat satu jawaban benar.',
  pilihan_ganda_kompleks: 'Pilihan ganda kompleks: sedikitnya dua opsi benar dan sedikitnya satu opsi salah. Pokok meminta siswa memilih semua jawaban yang benar (mis. "Pilihlah semua pernyataan yang benar."). Kunci berisi semua huruf benar.',
  pilihan_ganda_kategori:
    'PG kompleks kategori (model TKA): pokok berisi stimulus lalu perintah "Tentukan <kategori pertama> atau <kategori kedua> untuk setiap pernyataan berikut!"; "pernyataan" berisi pernyataan tentang stimulus yang masing-masing tepat masuk satu kategori, dan kedua kategori sama-sama muncul. Jangan menulis pernyataan di dalam pokok. Kunci satu huruf per pernyataan (B kategori pertama, S kategori kedua).',
  menjodohkan: 'Menjodohkan (tarik garis): pokok berupa perintah singkat; "pasangan.kiri" berisi 3 sampai 5 pernyataan atau soal pendek (kecuali diatur lain di bawah), "pasangan.kanan" berisi jawabannya ditambah 1 pengecoh, diacak (urutan kanan tidak sejajar dengan kiri). Setiap butir kiri tepat satu pasangan.',
  isian_singkat: 'Isian singkat: jawaban satu bilangan, kata, atau tanda. Pokok diakhiri titik-titik "....".',
  benar_salah: 'Benar-salah: pokok berupa satu pernyataan (bukan pertanyaan). Kunci "B" atau "S".',
  uraian: 'Uraian: soal cerita atau penalaran dengan jawaban model lengkap dan rubrik penskoran. Isi "jenis_uraian": "penjelasan" bila siswa diminta memberi alasan atau pernyataan (dijawab pada garis), "hitungan" bila siswa diminta menghitung (dijawab pada kotak cara pengerjaan dan jawaban akhir).',
};

const GAYA: Record<ParameterPaket['gaya'], string> = {
  biasa: 'Soal biasa yang langsung mengukur indikator.',
  numerasi: 'Soal numerasi: konteks kehidupan sehari-hari, data atau situasi nyata yang menuntut penalaran bilangan.',
  literasi: 'Soal literasi: diawali stimulus bacaan singkat yang asli; jawaban ditemukan atau disimpulkan dari stimulus.',
  hots: 'Soal HOTS: menuntut analisis, evaluasi, atau kreasi; hindari soal hafalan.',
};

const GAYA_PEMBAHASAN: Record<NonNullable<ParameterPaket['gaya_pembahasan']>, string> = {
  singkat: 'singkat, 1 sampai 3 langkah inti saja.',
  langkah: 'langkah demi langkah dengan kalimat pendek untuk siswa yang belajar sendiri; satu langkah satu butir, tanpa melompati hitungan.',
  dddj: 'berformat Diketahui–Ditanya–Dijawab: butir pertama diawali "Diketahui:", butir kedua "Ditanya:", lalu "Dijawab:" diikuti langkah penyelesaian, dan butir terakhir diawali "Jadi,".',
};

function teksBahasa(p: Pick<ParameterPaket, 'bahasa' | 'bahasa_lain'>): string {
  switch (p.bahasa) {
    case 'en':
      return 'Write the item in English suitable for the grade level. Use a decimal point and comma thousands separators in the item text.';
    case 'dwibahasa':
      return 'Tulis soal dalam bahasa Indonesia, lalu isi "terjemahan" dengan versi bahasa Inggris dari pokok dan opsi.';
    case 'lain': {
      const nama = p.bahasa_lain?.trim() || 'yang diminta guru';
      return `Tulis pokok, opsi, kunci, dan pembahasan dalam bahasa ${nama} yang sesuai jenjang; nama kolom JSON tetap seperti skema. Desimal dan ribuan mengikuti kebiasaan Indonesia (2,5 dan 12.500).`;
    }
    default:
      return 'Tulis soal dalam bahasa Indonesia baku sesuai jenjang.';
  }
}

/** Banyak opsi pilihan ganda: diatur guru (3–5), atau 5 untuk kelas 10–12 dan 4 untuk lainnya. */
export function jumlahOpsiPg(p: Pick<ParameterPaket, 'kelas' | 'opsi_pg'>): 3 | 4 | 5 {
  return p.opsi_pg ?? (p.kelas >= 10 ? 5 : 4);
}

const HURUF_AKHIR = { 3: 'C', 4: 'D', 5: 'E' } as const;

const JENIS_ISIAN: Record<JenisIsian, string> = {
  bebas: '',
  bilangan: 'Jawaban isian berupa satu bilangan (boleh pecahan atau desimal, dengan satuan bila perlu).',
  bilangan_bulat: 'Jawaban isian berupa satu bilangan bulat tanpa satuan.',
  kata: 'Jawaban isian berupa satu kata atau istilah, bukan bilangan.',
};

/** Rincian tambahan untuk bentuk butir ini dari pengaturan guru (opsi, jawaban benar, pasangan, jenis jawaban, skor). */
export function rincianBentuk(p: ParameterPaket, bentuk: Bentuk, kesukaran?: Slot['kesukaran']): string[] {
  const a = p.atur_bentuk;
  const r: string[] = [];
  if (bentuk === 'pilihan_ganda' || bentuk === 'pilihan_ganda_kompleks') {
    const n = jumlahOpsiPg(p);
    r.push(`Gunakan ${n} opsi (A–${HURUF_AKHIR[n]}).`);
  }
  if (bentuk === 'pilihan_ganda_kompleks' && a?.pgk_benar) {
    const { min, maks } = a.pgk_benar;
    r.push(min === maks ? `Tepat ${min} opsi benar.` : `Banyak opsi benar ${min} sampai ${maks}.`);
  }
  if (bentuk === 'pilihan_ganda_kategori') {
    const k = a?.kategori;
    const [x, y] = k?.label ?? ['Benar', 'Salah'];
    r.push(`Kategori pertama "${x}", kategori kedua "${y}"; tulis tepat ${k?.pernyataan ?? 4} pernyataan.`);
  }
  if (bentuk === 'menjodohkan' && a?.jodoh) r.push(`Kolom kiri tepat ${a.jodoh.kiri} butir; kolom kanan ${a.jodoh.kiri + a.jodoh.pengecoh} butir (${a.jodoh.pengecoh ? `${a.jodoh.pengecoh} pengecoh` : 'tanpa pengecoh'}).`);
  if (bentuk === 'isian_singkat' && a?.isian && JENIS_ISIAN[a.isian]) r.push(JENIS_ISIAN[a.isian]);
  if (bentuk === 'uraian' && a?.uraian) r.push(a.uraian === 'hitungan' ? 'Soal meminta perhitungan: isi "jenis_uraian": "hitungan".' : 'Soal meminta alasan atau penjelasan, bukan hitungan: isi "jenis_uraian": "penjelasan".');
  const skorUraian = p.skor_kesukaran && kesukaran ? p.skor_kesukaran[kesukaran]?.benar : p.skor_bentuk?.uraian;
  if (bentuk === 'uraian' && skorUraian) r.push(`Skor soal ini ${skorUraian}: jumlah skor dalam kurung pada rubrik harus ${skorUraian}.`);
  return r;
}

/**
 * Stimulus wajib dan variasi butir (F-39): setiap soal diawali cerita, teks, atau situasi yang dibutuhkan untuk
 * menjawab, dengan tema, bentuk stimulus, dan tokoh yang ditetapkan per butir agar soal satu paket tidak seragam.
 * Aturan umum stimulus wajib untuk bentuk-bentuk ini (tanpa variasi butir).
 */
function aturanStimulus(p: Pick<ParameterPaket, 'kelas' | 'rumpun' | 'materi'> & Partial<Pick<ParameterPaket, 'panjang_stimulus'>>, bentuk: Bentuk[]): string[] {
  const bahasa = p.rumpun === 'bahasa';
  const { sasaran } = panjangStimulus(p.kelas, bahasa, p.panjang_stimulus);
  const aturan = [
    bahasa
      ? `Awali "pokok" dengan teks bacaan asli sekitar ${sasaran[0]}–${sasaran[1]} kata sesuai jenis teks pada tujuan pembelajaran, lalu tulis pertanyaan tentang teks itu di paragraf terakhir.`
      : `Awali "pokok" dengan stimulus asli berupa cerita atau situasi nyata sekitar ${sasaran[0]}–${sasaran[1]} kata (sedikitnya dua kalimat) yang memuat semua data untuk menjawab, lalu tulis pertanyaan di kalimat terakhir.`,
    'Jawaban hanya dapat diperoleh dengan mengolah informasi dalam stimulus; stimulus bukan hiasan, dan pertanyaan tidak boleh dapat dijawab tanpa membacanya.',
    'Jangan membuka dengan "Perhatikan cerita berikut" tanpa cerita, dan jangan menulis judul atau label "Stimulus:".',
    'Pisahkan stimulus dan pertanyaan dengan baris baru. Data berbentuk tabel ditulis sebagai daftar singkat di dalam teks; diagram memakai gambar terprogram bila tersedia.',
  ];
  if (bentuk.includes('benar_salah')) aturan.push('Untuk benar-salah: setelah stimulus, tulis satu pernyataan tentang isi stimulus yang dinilai Benar atau Salah.');
  if (p.materi.trim()) aturan.push('Bila materi dari guru dipakai, stimulus boleh berupa kutipan atau ringkasannya.');
  return aturan;
}

/** Tema, bentuk stimulus, dan tokoh butir ini. Konteks dari guru didahulukan atas tema rotasi; TKAD memakai nama tokoh khas daerahnya. */
function teksVariasi(p: Pick<ParameterPaket, 'konteks' | 'ujian'>, v: NonNullable<Slot['variasi']>): string {
  const konteksGuru = p.konteks?.trim();
  const daerah = formatPaket(p)?.keluarga === 'TKAD';
  return [
    konteksGuru ? `tema di dalam konteks "${konteksGuru}" dengan sisi yang berbeda dari soal lain` : `tema "${v.tema}"`,
    `bentuk stimulus: ${v.stimulus}`,
    daerah ? 'tokoh bernama khas daerah soal, berbeda dari soal lain' : `tokoh utama bernama ${v.tokoh} (tokoh lain boleh ditambah dengan nama yang berbeda dari soal lain)`,
  ].join('; ');
}

export function bagianStimulus(p: Pick<ParameterPaket, 'wajib_stimulus' | 'kelas' | 'rumpun' | 'materi' | 'konteks' | 'ujian'> & Partial<Pick<ParameterPaket, 'panjang_stimulus'>>, slot: Pick<Slot, 'bentuk' | 'variasi'>): string {
  if (!p.wajib_stimulus || slot.bentuk === 'menjodohkan') return '';
  const aturan = aturanStimulus(p, [slot.bentuk]);
  if (slot.variasi) aturan.push(`Variasi butir ini (wajib, agar berbeda dari soal lain dalam paket): ${teksVariasi(p, slot.variasi)}.`);
  return `## Stimulus (wajib)\n${aturan.map((a) => `- ${a}`).join('\n')}`;
}

export interface KonteksPrompt {
  param: ParameterPaket;
  slot: Slot;
  pokokLain: string[];
  alasanGagal: string[];
  /** Untuk "Buat ulang": soal lama dan catatan guru. */
  revisi?: { lama: IsiSoal; catatan: string } | null;
  /** Bacaan bersama kelompok butir ini (F-40); pokok hanya berisi pertanyaan. */
  bacaan?: string | null;
}

export function susunPesan(k: KonteksPrompt): string {
  const { param: p, slot } = k;
  const tp = p.tp[slot.tp_index];
  const paket = paketUntuk(p.rumpun);
  const gambarBoleh = p.gambar !== 'mati' && (paket?.templatGambar.length ?? 0) > 0;
  const bagian: string[] = [];

  bagian.push(`## Konteks pembelajaran (diisi guru)
- Kelas ${p.kelas}, fase ${p.fase}
- Mata pelajaran: ${p.mapel}${paket ? ` (rumpun ${paket.nama})` : ''}
${p.cp.trim() ? `- Capaian pembelajaran: ${p.cp.trim()}` : ''}
- Tujuan pembelajaran: ${tp.rumusan}`);

  const rincian = rincianBentuk(p, slot.bentuk, slot.kesukaran);
  bagian.push(`## Butir yang diminta
- Bentuk: ${BENTUK_LABEL[slot.bentuk]} ("${slot.bentuk}"). ${PETUNJUK_BENTUK[slot.bentuk]}${rincian.length ? ` ${rincian.join(' ')}` : ''}
- Kesukaran rancangan: ${slot.kesukaran}; level kognitif ${slot.level}.
- Gaya: ${GAYA[slot.gaya ?? p.gaya]}
- Bahasa: ${teksBahasa(p)}${p.gaya_pembahasan ? `\n- Pembahasan: ${GAYA_PEMBAHASAN[p.gaya_pembahasan]}` : ''}${p.konteks?.trim() ? `\n- Konteks atau tema yang diminta guru: ${p.konteks.trim()}` : ''}`);

  if (k.bacaan) {
    bagian.push(`## Bacaan bersama (sudah ditulis, dipakai beberapa soal)
"""
${k.bacaan}
"""
- Jangan menulis ulang bacaan di "pokok": "pokok" hanya berisi pertanyaan atau perintah tentang bacaan ini.
- Jawaban harus diperoleh dari bacaan. Tanyakan bagian, data, atau aspek yang berbeda dari soal lain dengan bacaan yang sama (lihat daftar soal lain).`);
  } else {
    const stimulus = bagianStimulus(p, slot);
    if (stimulus) bagian.push(stimulus);
  }

  const ujian = bagianPromptUjian(p, slot.level, slot.urutan);
  if (ujian) bagian.push(ujian);

  const tambahan = (p.aturan_tambahan ?? []).map((a) => a.trim()).filter(Boolean);
  if (tambahan.length) bagian.push(`## Aturan tambahan dari guru (wajib diikuti)\n${tambahan.slice(0, 40).map((a) => `- ${a.slice(0, 500)}`).join('\n')}`);

  if (paket?.aturanPenulisan.length) bagian.push(`## Aturan penulisan ${paket.nama}\n${paket.aturanPenulisan.map((a) => `- ${a}`).join('\n')}`);

  if (gambarBoleh && paket) {
    const daftar = TEMPLAT.filter((t) => paket.templatGambar.includes(t.id))
      .map((t) => `- ${t.id} (${t.dipakai}). Parameter: ${t.parameter}. Contoh: ${JSON.stringify(t.contoh)}`)
      .join('\n');
    const variabel =
      'Variabel gambar untuk ekspresi: garis_bilangan → nilai (titik "?"), titik[], lompatan[]; pecahan_batang/pecahan_lingkaran → pecahan, diarsir, penyebut, batang[]; bangun_datar → luas, keliling, sisi[]; grid_luas → luas, total_sel; diagram_batang → nilai[], total, maks, min, rata; piktogram → nilai[], jumlah[], total; jam_analog → jam, menit, total_menit; blok_nilai_tempat → nilai, ratusan, puluhan, satuan; penggaris → panjang, mulai, akhir.';
    bagian.push(
      `## Gambar terprogram\n${p.gambar === 'terprogram' ? 'Pakai gambar bila membantu siswa memahami soal.' : 'Gambar opsional; pakai hanya bila perlu.'} Gambar digambar oleh kode dari parameter, jadi jangan mendeskripsikan gambar yang tidak dapat dibuat templat. Templat tersedia:\n${daftar}\n${variabel}`,
    );
  } else bagian.push('## Gambar\nJangan memakai gambar: isi "gambar": null.');

  bagian.push(`## Skema JSON\n${SKEMA.replace('<bentuk>', slot.bentuk)}\n\n${ATURAN_VERIFIKASI}`);

  if (paket?.contohAcuan.length) {
    const contoh = contohAcuan(paket.contohAcuan, slot.bentuk, slot.urutan);
    bagian.push(`## Contoh acuan (gaya, bukan untuk disalin; topik soal mengikuti TP di atas)\n${JSON.stringify(contoh)}`);
  }

  if (p.materi.trim()) bagian.push(`## Materi dari guru (boleh dipakai sebagai stimulus)\n"""\n${p.materi.trim().slice(0, 24000)}\n"""`);

  if (k.pokokLain.length) bagian.push(`## Soal lain dalam paket (jangan mirip)\n${k.pokokLain.slice(-12).map((s) => `- ${s.slice(0, 160)}`).join('\n')}`);

  if (k.revisi) bagian.push(`## Soal lama yang perlu dibuat ulang\n${JSON.stringify(k.revisi.lama)}\nPerubahan yang diminta guru: ${k.revisi.catatan || 'buat versi baru dengan kategori yang sama.'}`);

  if (k.alasanGagal.length) bagian.push(`## Percobaan sebelumnya ditolak pemeriksa\n${k.alasanGagal.map((a) => `- ${a}`).join('\n')}\nPerbaiki masalah tersebut. Pastikan kunci benar menurut hitungan.`);

  bagian.push(`Isi meta.tp dengan: ${JSON.stringify(tp.rumusan)}, meta.level "${slot.level}", meta.kesukaran "${slot.kesukaran}". Keluarkan JSON saja.`);
  return bagian.join('\n\n');
}

/** Bagian gambar: daftar templat bila gambar boleh, atau larangan memakai gambar. */
function bagianGambar(p: ParameterPaket): string {
  const paket = paketUntuk(p.rumpun);
  const gambarBoleh = p.gambar !== 'mati' && (paket?.templatGambar.length ?? 0) > 0;
  if (!gambarBoleh || !paket) return '## Gambar\nJangan memakai gambar: isi "gambar": null.';
  const daftar = TEMPLAT.filter((t) => paket.templatGambar.includes(t.id))
    .map((t) => `- ${t.id} (${t.dipakai}). Parameter: ${t.parameter}. Contoh: ${JSON.stringify(t.contoh)}`)
    .join('\n');
  const variabel =
    'Variabel gambar untuk ekspresi: garis_bilangan → nilai (titik "?"), titik[], lompatan[]; pecahan_batang/pecahan_lingkaran → pecahan, diarsir, penyebut, batang[]; bangun_datar → luas, keliling, sisi[]; grid_luas → luas, total_sel; diagram_batang → nilai[], total, maks, min, rata; piktogram → nilai[], jumlah[], total; jam_analog → jam, menit, total_menit; blok_nilai_tempat → nilai, ratusan, puluhan, satuan; penggaris → panjang, mulai, akhir.';
  return `## Gambar terprogram\n${p.gambar === 'terprogram' ? 'Pakai gambar bila membantu siswa memahami soal.' : 'Gambar opsional; pakai hanya bila perlu.'} Gambar digambar oleh kode dari parameter, jadi jangan mendeskripsikan gambar yang tidak dapat dibuat templat. Templat tersedia:\n${daftar}\n${variabel}`;
}

export interface ButirDiminta {
  slot: Slot;
  /** Alasan penolakan percobaan sebelumnya untuk butir ini; kosong bila percobaan pertama. */
  alasanGagal: string[];
  /** Bacaan bersama kelompok slot ini (F-40), sudah dibuat sebelum permintaan. */
  bacaan?: { id: string; teks: string } | null;
}

export interface KonteksKelompok {
  param: ParameterPaket;
  butir: ButirDiminta[];
  pokokLain: string[];
}

/**
 * Pesan untuk beberapa butir sekaligus (F-38). Konteks bersama (CP, aturan, skema, materi) dikirim sekali;
 * tiap butir punya baris sendiri berisi bentuk, kesukaran, level, gaya, TP, dan alasan penolakan sebelumnya.
 */
export function susunPesanKelompok(k: KonteksKelompok): string {
  const { param: p, butir } = k;
  const paket = paketUntuk(p.rumpun);
  const bagian: string[] = [];
  const indeksTp = [...new Set(butir.map((b) => b.slot.tp_index))].sort((a, b) => a - b);

  bagian.push(`## Konteks pembelajaran (diisi guru)
- Kelas ${p.kelas}, fase ${p.fase}
- Mata pelajaran: ${p.mapel}${paket ? ` (rumpun ${paket.nama})` : ''}
${p.cp.trim() ? `- Capaian pembelajaran: ${p.cp.trim()}\n` : ''}${indeksTp.map((i) => `- TP ${i + 1}: ${p.tp[i].rumusan}`).join('\n')}
- Setiap butir mengukur TP yang disebut pada barisnya sendiri; materi dan konteks butir mengikuti TP itu, bukan TP butir lain.`);

  const bentuk = [...new Set(butir.map((b) => b.slot.bentuk))];
  bagian.push(`## Bentuk soal
${bentuk
  .map((b) => {
    const rincian = rincianBentuk(p, b);
    return `- ${BENTUK_LABEL[b]} ("${b}"): ${PETUNJUK_BENTUK[b]}${rincian.length ? ` ${rincian.join(' ')}` : ''}`;
  })
  .join('\n')}
- Bahasa: ${teksBahasa(p)}${p.gaya_pembahasan ? `\n- Pembahasan: ${GAYA_PEMBAHASAN[p.gaya_pembahasan]}` : ''}${p.konteks?.trim() ? `\n- Konteks atau tema yang diminta guru: ${p.konteks.trim()}` : ''}`);

  // Bacaan bersama (F-40): tiap bacaan ditulis sekali; butir yang memakainya hanya berisi pertanyaan.
  const bacaan = new Map<string, { label: string; teks: string }>();
  for (const b of butir) if (b.bacaan?.teks && !bacaan.has(b.bacaan.id)) bacaan.set(b.bacaan.id, { label: `Bacaan ${String.fromCharCode(65 + bacaan.size)}`, teks: b.bacaan.teks });
  if (bacaan.size) {
    bagian.push(`## Bacaan bersama (sudah ditulis, dipakai beberapa butir)
${[...bacaan.values()].map((x) => `### ${x.label}\n"""\n${x.teks}\n"""`).join('\n\n')}
- Butir yang memakai bacaan: jangan menulis ulang bacaan di "pokok"; "pokok" hanya berisi pertanyaan atau perintah tentang bacaan itu.
- Jawaban harus diperoleh dari bacaan. Butir dengan bacaan yang sama menanyakan bagian, data, atau aspek yang berbeda.`);
  }

  // Stimulus wajib (F-39) untuk butir yang tidak memakai bacaan bersama; variasi tiap butir disebut di daftar.
  const perluStimulus = (b: ButirDiminta) => p.wajib_stimulus && b.slot.bentuk !== 'menjodohkan' && !b.bacaan?.teks;
  const berstimulus = butir.filter(perluStimulus);
  if (berstimulus.length) {
    const aturan = aturanStimulus(p, [...new Set(berstimulus.map((b) => b.slot.bentuk))]);
    aturan.push('Setiap butir menulis stimulusnya sendiri dengan tema, bentuk stimulus, dan tokoh yang disebut pada barisnya di daftar butir; jangan memakai cerita, tokoh, atau angka yang sama antarbutir.');
    bagian.push(`## Stimulus (wajib${bacaan.size ? ' untuk butir tanpa bacaan bersama' : ''})\n${aturan.map((a) => `- ${a}`).join('\n')}`);
  }

  const ujian = bagianPromptUjian(p, null);
  if (ujian) bagian.push(ujian);

  const tambahan = (p.aturan_tambahan ?? []).map((a) => a.trim()).filter(Boolean);
  if (tambahan.length) bagian.push(`## Aturan tambahan dari guru (wajib diikuti)\n${tambahan.slice(0, 40).map((a) => `- ${a.slice(0, 500)}`).join('\n')}`);

  if (paket?.aturanPenulisan.length) bagian.push(`## Aturan penulisan ${paket.nama}\n${paket.aturanPenulisan.map((a) => `- ${a}`).join('\n')}`);

  bagian.push(bagianGambar(p));

  bagian.push(`## Skema JSON satu butir\n${SKEMA.replace('{\n', '{\n  "nomor": <nomor butir dari daftar>,\n').replace('<bentuk>', 'bentuk butir itu')}\n\n${ATURAN_VERIFIKASI}`);

  if (paket?.contohAcuan.length) {
    const putar = butir[0]?.slot.urutan ?? 0;
    const pakai = bentuk.map((b, i) => contohAcuan(paket.contohAcuan, b, putar + i)).slice(0, 3);
    bagian.push(`## Contoh acuan (gaya, bukan untuk disalin; topik soal mengikuti TP masing-masing butir)\n${pakai.map((c) => JSON.stringify(c)).join('\n')}`);
  }

  if (p.materi.trim()) bagian.push(`## Materi dari guru (boleh dipakai sebagai stimulus)\n"""\n${p.materi.trim().slice(0, 24000)}\n"""`);

  if (k.pokokLain.length) bagian.push(`## Soal lain dalam paket (jangan mirip)\n${k.pokokLain.slice(-12).map((s) => `- ${s.slice(0, 160)}`).join('\n')}`);

  const daftar = butir.map((b, i) => {
    const s = b.slot;
    const tka = levelTkaButir(p, s.level);
    const baca = kompetensiBacaButir(p, s.level, s.urutan);
    const umum = new Set(rincianBentuk(p, s.bentuk));
    const khusus = rincianBentuk(p, s.bentuk, s.kesukaran).filter((r) => !umum.has(r));
    const tambahan: string[] = [];
    if (b.bacaan?.teks) tambahan.push(`Memakai ${bacaan.get(b.bacaan.id)?.label}; "pokok" hanya pertanyaan.`);
    else if (perluStimulus(b) && s.variasi) tambahan.push(`Stimulus: ${teksVariasi(p, s.variasi)}.`);
    if (baca) tambahan.push(`Kompetensi membaca: ${baca}`);
    tambahan.push(...khusus);
    const baris = `${i + 1}. Bentuk "${s.bentuk}"; kesukaran ${s.kesukaran}; level ${s.level}${tka ? ` (level TKA "${tka}")` : ''}; gaya: ${GAYA[s.gaya ?? p.gaya]} TP ${s.tp_index + 1}.${tambahan.length ? ` ${tambahan.join(' ')}` : ''}`;
    return b.alasanGagal.length ? `${baris}\n   Percobaan sebelumnya ditolak pemeriksa: ${b.alasanGagal.join(' ')} Perbaiki masalah tersebut dan pastikan kunci benar menurut hitungan.` : baris;
  });
  bagian.push(`## Daftar butir yang diminta (${butir.length} butir)\n${daftar.join('\n')}`);

  bagian.push(
    `Keluarkan {"butir": [...]} dengan tepat ${butir.length} objek, satu untuk setiap nomor di daftar. Isi "nomor" sesuai daftar, meta.tp dengan rumusan TP butir itu, serta meta.level dan meta.kesukaran sesuai butirnya. Keluarkan JSON saja.`,
  );
  return bagian.join('\n\n');
}

/**
 * Contoh acuan bergiliran: contoh berbentuk sama dipilih menurut nomor butir agar semua soal tidak meniru satu
 * contoh (penyebab paket Matematika yang hanya berisi pecahan).
 */
export function contohAcuan<T extends { bentuk?: Bentuk }>(daftar: T[], bentuk: Bentuk, putar: number): T {
  const sama = daftar.filter((c) => c.bentuk === bentuk);
  const pilih = sama.length ? sama : daftar;
  return pilih[((putar % pilih.length) + pilih.length) % pilih.length];
}
