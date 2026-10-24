import type { Bentuk, IsiSoal, ParameterPaket, Slot } from '../db/tipe';
import { BENTUK_LABEL } from '../db/tipe';
import { TEMPLAT } from '../gambar';
import { paketUntuk } from '../paket';

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

const SKEMA = `{
  "bentuk": "<bentuk>",
  "pokok": "teks soal; rumus sebaris di antara $...$",
  "opsi": {"A": "...", "B": "...", "C": "...", "D": "..."},   // hanya pilihan_ganda
  "kunci": "...",            // pilihan_ganda: huruf; benar_salah: "B" atau "S"; isian_singkat: jawaban singkat; uraian: jawaban model lengkap
  "rubrik": ["kriteria (skor)", "..."],   // hanya uraian
  "pembahasan": ["langkah 1", "langkah 2"],
  "verifikasi": <lihat aturan verifikasi>,
  "gambar": null atau {"templat": "<id templat>", "parameter": {...}},
  "terjemahan": null atau {"pokok": "...", "opsi": {...}},  // hanya bila diminta dwibahasa
  "meta": {"tp": "<rumusan TP>", "indikator": "Disajikan ..., peserta didik dapat ...", "level": "<C1–C6>", "kesukaran": "<mudah|sedang|sulit>"}
}`;

const ATURAN_VERIFIKASI = `Aturan verifikasi (pilih satu tipe). Ekspresi memakai sintaks mathjs: titik desimal, tanpa pemisah ribuan, pecahan a/b, persen boleh 25%, fungsi lcm(a, b), gcd(a, b), sqrt(x); beri spasi setelah koma argumen.
- {"tipe":"ekspresi","ekspresi":"3/4 + 1/8","nilai":"7/8"}
  pilihan_ganda: opsi kunci bernilai sama dengan hasil, opsi lain tidak. isian_singkat: kunci bernilai sama dengan hasil.
  benar_salah: pokok menyatakan bahwa ekspresi bernilai "nilai"; kunci "B" bila benar, "S" bila salah.
  uraian: jawaban akhir.
- {"tipe":"perbandingan","kiri":"5/8","relasi":"<","kanan":"3/4"}  relasi salah satu dari = < > <= >= !=
  pilihan_ganda: opsi berupa tanda perbandingan; benar_salah: pokok menyatakan kiri relasi kanan.
- {"tipe":"urutan","nilai":["2/3","3/4","5/6"],"arah":"naik"}  untuk soal mengurutkan; kunci memuat daftar yang sama, dipisah koma atau titik koma.
- {"tipe":"tidak_ada","alasan":"..."} bila jawaban tidak dapat dihitung (konsep, sifat, penalaran). Soal ini akan ditelaah guru.
Bila memakai gambar, ekspresi boleh memakai variabel gambar (lihat daftar templat), mis. "pecahan" atau "nilai[2] - nilai[1]" (indeks mulai 1).`;

const PETUNJUK_BENTUK: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihan ganda dengan tepat satu jawaban benar.',
  isian_singkat: 'Isian singkat: jawaban satu bilangan, kata, atau tanda. Pokok diakhiri titik-titik "....".',
  benar_salah: 'Benar-salah: pokok berupa satu pernyataan (bukan pertanyaan). Kunci "B" atau "S".',
  uraian: 'Uraian: soal cerita atau penalaran dengan jawaban model lengkap dan rubrik penskoran.',
};

const GAYA: Record<ParameterPaket['gaya'], string> = {
  biasa: 'Soal biasa yang langsung mengukur indikator.',
  numerasi: 'Soal numerasi: konteks kehidupan sehari-hari, data atau situasi nyata yang menuntut penalaran bilangan.',
  literasi: 'Soal literasi: diawali stimulus bacaan singkat yang asli; jawaban ditemukan atau disimpulkan dari stimulus.',
  hots: 'Soal HOTS: menuntut analisis, evaluasi, atau kreasi; hindari soal hafalan.',
};

const BAHASA: Record<ParameterPaket['bahasa'], string> = {
  id: 'Tulis soal dalam bahasa Indonesia baku sesuai jenjang.',
  en: 'Write the item in English suitable for the grade level. Use a decimal point and comma thousands separators in the item text.',
  dwibahasa: 'Tulis soal dalam bahasa Indonesia, lalu isi "terjemahan" dengan versi bahasa Inggris dari pokok dan opsi.',
};

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

  bagian.push(`## Konteks kurikulum
- Kurikulum: ${p.kurikulum_nama}${p.kurikulum_dasar ? ` (${p.kurikulum_dasar})` : ''}
- Kelas ${p.kelas}, fase ${p.fase}
- Mata pelajaran: ${p.mapel}${paket ? ` (rumpun ${paket.nama})` : ''}
${p.cp.trim() ? `- Capaian pembelajaran: ${p.cp.trim()}` : ''}
- Tujuan pembelajaran: ${tp.rumusan}`);

  bagian.push(`## Butir yang diminta
- Bentuk: ${BENTUK_LABEL[slot.bentuk]} ("${slot.bentuk}"). ${PETUNJUK_BENTUK[slot.bentuk]}${slot.bentuk === 'pilihan_ganda' ? ` Gunakan ${p.kelas >= 10 ? '5 opsi (A–E)' : '4 opsi (A–D)'}.` : ''}
- Kesukaran rancangan: ${slot.kesukaran}; level kognitif ${slot.level}.
- Gaya: ${GAYA[p.gaya]}
- Bahasa: ${BAHASA[p.bahasa]}`);

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
