import type { Bentuk, IsiSoal, JenisIsian, ParameterPaket, Slot } from '../db/tipe';
import { BENTUK_LABEL } from '../db/tipe';
import { TEMPLAT } from '../gambar';
import { paketUntuk } from '../paket';
import { bagianPromptUjian, levelTkaButir } from '../ujian';

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
  "kunci": "...",            // pilihan_ganda: huruf; pilihan_ganda_kompleks: semua huruf benar dipisah koma, mis. "A,C"; benar_salah: "B" atau "S"; menjodohkan: "1-B, 2-A, 3-C"; isian_singkat: jawaban singkat; uraian: jawaban model lengkap
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
- {"tipe":"tidak_ada","alasan":"..."} bila jawaban tidak dapat dihitung (konsep, sifat, penalaran), atau bila opsi bukan satu bilangan atau satu tanda (mis. opsi berisi dua pecahan sekaligus). Soal ini akan ditelaah guru.
Opsi dan kunci bilangan boleh memakai satuan (mis. "112 cm²" atau "$112\\text{ cm}^2$"); satu opsi berisi satu bilangan.
Bila memakai gambar, ekspresi boleh memakai variabel gambar (lihat daftar templat), mis. "pecahan" atau "nilai[2] - nilai[1]" (indeks mulai 1).`;

const PETUNJUK_BENTUK: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihan ganda dengan tepat satu jawaban benar.',
  pilihan_ganda_kompleks: 'Pilihan ganda kompleks: sedikitnya dua opsi benar dan sedikitnya satu opsi salah. Pokok meminta siswa memilih semua jawaban yang benar (mis. "Pilihlah semua pernyataan yang benar."). Kunci berisi semua huruf benar.',
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
export function rincianBentuk(p: ParameterPaket, bentuk: Bentuk): string[] {
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
  if (bentuk === 'menjodohkan' && a?.jodoh) r.push(`Kolom kiri tepat ${a.jodoh.kiri} butir; kolom kanan ${a.jodoh.kiri + a.jodoh.pengecoh} butir (${a.jodoh.pengecoh ? `${a.jodoh.pengecoh} pengecoh` : 'tanpa pengecoh'}).`);
  if (bentuk === 'isian_singkat' && a?.isian && JENIS_ISIAN[a.isian]) r.push(JENIS_ISIAN[a.isian]);
  if (bentuk === 'uraian' && a?.uraian) r.push(a.uraian === 'hitungan' ? 'Soal meminta perhitungan: isi "jenis_uraian": "hitungan".' : 'Soal meminta alasan atau penjelasan, bukan hitungan: isi "jenis_uraian": "penjelasan".');
  if (bentuk === 'uraian' && p.skor_bentuk?.uraian) r.push(`Skor soal ini ${p.skor_bentuk.uraian}: jumlah skor dalam kurung pada rubrik harus ${p.skor_bentuk.uraian}.`);
  return r;
}

export interface KonteksPrompt {
  param: ParameterPaket;
  slot: Slot;
  pokokLain: string[];
  alasanGagal: string[];
  /** Untuk "Buat ulang": soal lama dan catatan guru. */
  revisi?: { lama: IsiSoal; catatan: string } | null;
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

  const rincian = rincianBentuk(p, slot.bentuk);
  bagian.push(`## Butir yang diminta
- Bentuk: ${BENTUK_LABEL[slot.bentuk]} ("${slot.bentuk}"). ${PETUNJUK_BENTUK[slot.bentuk]}${rincian.length ? ` ${rincian.join(' ')}` : ''}
- Kesukaran rancangan: ${slot.kesukaran}; level kognitif ${slot.level}.
- Gaya: ${GAYA[slot.gaya ?? p.gaya]}
- Bahasa: ${teksBahasa(p)}${p.konteks?.trim() ? `\n- Konteks atau tema yang diminta guru: ${p.konteks.trim()}` : ''}`);

  const ujian = bagianPromptUjian(p, slot.level);
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
    const contoh = paket.contohAcuan.filter((c) => c.bentuk === slot.bentuk).slice(0, 1);
    const pakai = contoh.length ? contoh : paket.contohAcuan.slice(0, 1);
    bagian.push(`## Contoh acuan (gaya, bukan untuk disalin)\n${pakai.map((c) => JSON.stringify(c)).join('\n')}`);
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
${p.cp.trim() ? `- Capaian pembelajaran: ${p.cp.trim()}\n` : ''}${indeksTp.map((i) => `- TP ${i + 1}: ${p.tp[i].rumusan}`).join('\n')}`);

  const bentuk = [...new Set(butir.map((b) => b.slot.bentuk))];
  bagian.push(`## Bentuk soal
${bentuk
  .map((b) => {
    const rincian = rincianBentuk(p, b);
    return `- ${BENTUK_LABEL[b]} ("${b}"): ${PETUNJUK_BENTUK[b]}${rincian.length ? ` ${rincian.join(' ')}` : ''}`;
  })
  .join('\n')}
- Bahasa: ${teksBahasa(p)}${p.konteks?.trim() ? `\n- Konteks atau tema yang diminta guru: ${p.konteks.trim()}` : ''}`);

  const ujian = bagianPromptUjian(p, null);
  if (ujian) bagian.push(ujian);

  const tambahan = (p.aturan_tambahan ?? []).map((a) => a.trim()).filter(Boolean);
  if (tambahan.length) bagian.push(`## Aturan tambahan dari guru (wajib diikuti)\n${tambahan.slice(0, 40).map((a) => `- ${a.slice(0, 500)}`).join('\n')}`);

  if (paket?.aturanPenulisan.length) bagian.push(`## Aturan penulisan ${paket.nama}\n${paket.aturanPenulisan.map((a) => `- ${a}`).join('\n')}`);

  bagian.push(bagianGambar(p));

  bagian.push(`## Skema JSON satu butir\n${SKEMA.replace('{\n', '{\n  "nomor": <nomor butir dari daftar>,\n').replace('<bentuk>', 'bentuk butir itu')}\n\n${ATURAN_VERIFIKASI}`);

  if (paket?.contohAcuan.length) {
    const contoh = bentuk.map((b) => paket.contohAcuan.find((c) => c.bentuk === b)).filter((c) => c !== undefined);
    const pakai = (contoh.length ? contoh : paket.contohAcuan.slice(0, 1)).slice(0, 3);
    bagian.push(`## Contoh acuan (gaya, bukan untuk disalin)\n${pakai.map((c) => JSON.stringify(c)).join('\n')}`);
  }

  if (p.materi.trim()) bagian.push(`## Materi dari guru (boleh dipakai sebagai stimulus)\n"""\n${p.materi.trim().slice(0, 24000)}\n"""`);

  if (k.pokokLain.length) bagian.push(`## Soal lain dalam paket (jangan mirip)\n${k.pokokLain.slice(-12).map((s) => `- ${s.slice(0, 160)}`).join('\n')}`);

  const daftar = butir.map((b, i) => {
    const s = b.slot;
    const tka = levelTkaButir(p, s.level);
    const baris = `${i + 1}. Bentuk "${s.bentuk}"; kesukaran ${s.kesukaran}; level ${s.level}${tka ? ` (level TKA "${tka}")` : ''}; gaya: ${GAYA[s.gaya ?? p.gaya]} TP ${s.tp_index + 1}.`;
    return b.alasanGagal.length ? `${baris}\n   Percobaan sebelumnya ditolak pemeriksa: ${b.alasanGagal.join(' ')} Perbaiki masalah tersebut dan pastikan kunci benar menurut hitungan.` : baris;
  });
  bagian.push(`## Daftar butir yang diminta (${butir.length} butir)\n${daftar.join('\n')}`);

  bagian.push(
    `Keluarkan {"butir": [...]} dengan tepat ${butir.length} objek, satu untuk setiap nomor di daftar. Isi "nomor" sesuai daftar, meta.tp dengan rumusan TP butir itu, serta meta.level dan meta.kesukaran sesuai butirnya. Keluarkan JSON saja.`,
  );
  return bagian.join('\n\n');
}
