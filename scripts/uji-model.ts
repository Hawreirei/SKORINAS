// Golden set per model: minta model membuat butir dari TP acuan, lalu ukur
// (1) JSON sesuai skema, (2) kunci benar diloloskan pemeriksa, (3) varian salah-kunci ditolak.
// Kunci dibaca dari variabel lingkungan, tidak pernah dari repositori:
//   GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
// Jalankan: npm run uji-model -- [--penyedia gemini] [--model id] [--butir 12] [--tulis]
import { readFileSync, writeFileSync } from 'node:fs';
import { adaptorUntuk } from '../src/ai';
import type { Registri } from '../src/ai/tipe';
import type { Bentuk, HurufOpsi, IsiSoal, ParameterPaket, PenyediaId } from '../src/db/tipe';
import { SISTEM, susunPesan } from '../src/generasi/prompt';
import { rencanakanSlot } from '../src/generasi/rencana';
import { periksaSoal } from '../src/verifikasi';
import { bacaIsiSoal, ekstrakJson } from '../src/verifikasi/skema';

const ENV: Record<PenyediaId, string> = {
  gemini: 'GEMINI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};
const AMBANG = { json_sah: 0.95, benar_lolos: 0.9, salah_ditolak: 1 };

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const tulis = process.argv.includes('--tulis');
const jumlah = Number(arg('butir') ?? 12);
const jalurRegistri = 'public/models/registri.json';
const registri = JSON.parse(readFileSync(jalurRegistri, 'utf8')) as Registri;

const ACUAN: Pick<ParameterPaket, 'kelas' | 'fase' | 'cp' | 'tp'>[] = [
  { kelas: 4, fase: 'B', cp: '', tp: [{ id: 'a', rumusan: 'Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya.', sumber: 'resmi', versi: 'uji' }] },
  { kelas: 5, fase: 'C', cp: '', tp: [{ id: 'b', rumusan: 'Peserta didik dapat menghitung luas segitiga, jajar genjang, dan trapesium.', sumber: 'resmi', versi: 'uji' }] },
  { kelas: 3, fase: 'B', cp: '', tp: [{ id: 'c', rumusan: 'Peserta didik dapat menyelesaikan masalah uang dalam ribuan rupiah yang melibatkan penjumlahan dan pengurangan.', sumber: 'resmi', versi: 'uji' }] },
];

function mutan(isi: IsiSoal): IsiSoal[] {
  if (isi.bentuk === 'pilihan_ganda') return (Object.keys(isi.opsi ?? {}) as HurufOpsi[]).filter((h) => h !== isi.kunci).map((h) => ({ ...isi, kunci: h }));
  if (isi.bentuk === 'benar_salah') return [{ ...isi, kunci: isi.kunci === 'B' ? 'S' : 'B' }];
  if (isi.bentuk === 'isian_singkat') return [{ ...isi, kunci: isi.kunci.replace(/\d+/, (d) => String(Number(d) + 1)) }];
  return [];
}

async function ujiModel(penyedia: PenyediaId, model: string, kunci: string) {
  const a = adaptorUntuk(penyedia);
  let sah = 0;
  let lolos = 0;
  let dapatDihitung = 0;
  let salahTotal = 0;
  let salahDitolak = 0;
  const bentuk: Bentuk[] = ['pilihan_ganda', 'isian_singkat', 'benar_salah'];
  for (let i = 0; i < jumlah; i++) {
    const acuan = ACUAN[i % ACUAN.length];
    const param: ParameterPaket = { ...acuan, kurikulum_id: 'merdeka-2024', kurikulum_nama: 'Kurikulum Merdeka', kurikulum_versi: 'uji', mapel: 'Matematika', rumpun: 'matematika', n: 1, persen: [0, 100, 0], bentuk: [bentuk[i % bentuk.length]], bahasa: 'id', gaya: 'biasa', gambar: 'campuran', materi: '' };
    const slot = rencanakanSlot(param)[0];
    try {
      const j = await a.kirim({ kunci, model, sistem: SISTEM, pesan: susunPesan({ param, slot, pokokLain: [], alasanGagal: [] }), suhu: 0.7 });
      const isi = bacaIsiSoal(ekstrakJson(j.teks), { bentuk: slot.bentuk, level: slot.level, kesukaran: slot.kesukaran, tp: param.tp[0].rumusan });
      sah++;
      const k = { rumpun: 'matematika' as const, kelas: param.kelas, fase: param.fase, lokal: 'id' as const, literasi: false, pokokLain: [], gambarDiizinkan: true };
      const h = periksaSoal(isi, k);
      if (h.lolos) lolos++;
      if (h.lolos && h.status_mutu === 'terverifikasi_hitung') {
        dapatDihitung++;
        for (const m of mutan(isi)) {
          salahTotal++;
          if (!periksaSoal(m, k).lolos) salahDitolak++;
        }
      }
      process.stdout.write(h.lolos ? '.' : 'x');
    } catch (e) {
      process.stdout.write('!');
      if (process.env.RINCI) console.error('\n', (e as Error).message);
    }
  }
  const hasil = {
    json_sah: sah / jumlah,
    benar_lolos: sah ? lolos / sah : 0,
    salah_ditolak: salahTotal ? salahDitolak / salahTotal : 1,
    dapat_dihitung: dapatDihitung,
  };
  const ok = hasil.json_sah >= AMBANG.json_sah && hasil.benar_lolos >= AMBANG.benar_lolos && hasil.salah_ditolak >= AMBANG.salah_ditolak;
  console.log(`\n${penyedia}/${model}: JSON sah ${(hasil.json_sah * 100).toFixed(0)}%, lolos pemeriksa ${(hasil.benar_lolos * 100).toFixed(0)}%, salah-kunci ditolak ${(hasil.salah_ditolak * 100).toFixed(0)}% → ${ok ? 'LOLOS' : 'GAGAL'}`);
  return { ...hasil, ok };
}

const daftar = registri.penyedia.filter((p) => !arg('penyedia') || p.id === arg('penyedia'));
for (const p of daftar) {
  const kunci = process.env[ENV[p.id]];
  if (!kunci) {
    console.log(`Lewati ${p.nama}: ${ENV[p.id]} tidak diatur.`);
    continue;
  }
  for (const m of p.model.filter((x) => x.status !== 'usang' && (!arg('model') || x.id === arg('model')))) {
    const h = await ujiModel(p.id, m.id, kunci);
    m.golden = { status: h.ok ? 'lolos' : 'gagal', tanggal: new Date().toISOString().slice(0, 10), benar_lolos: h.benar_lolos, salah_ditolak: h.salah_ditolak, json_sah: h.json_sah };
    if (h.ok && m.status !== 'pratinjau') m.status = 'direkomendasikan';
    if (!h.ok && m.status === 'direkomendasikan') m.status = 'stabil';
  }
}
if (tulis) {
  registri.diperiksa_pada = new Date().toISOString().slice(0, 10);
  writeFileSync(jalurRegistri, JSON.stringify(registri, null, 2) + '\n');
  console.log(`Hasil ditulis ke ${jalurRegistri}.`);
} else console.log('Jalankan dengan --tulis untuk menyimpan hasil ke registri.');
