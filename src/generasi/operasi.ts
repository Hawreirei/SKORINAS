import { hitungBiaya } from '../ai';
import { modelDari, muatRegistri } from '../ai/registri';
import { db } from '../db/skema';
import type { IsiSoal, JenisUraian, LogSoal, Slot, Soal } from '../db/tipe';
import { sekarang, tanggalLokal, uuid } from '../db/util';
import { bangkitkanGambar } from '../gambar';
import { teksPolos } from '../matematika/teks';
import { periksaSoal, type HasilPeriksa } from '../verifikasi';
import { buatButir, type HasilButir } from './butir';
import { konteksPaket, modelAktif, pengirimDari, type ModelAktif } from './pengatur';

async function log(soal_id: string, aksi: LogSoal['aksi'], sebelum: unknown, sesudah: unknown) {
  await db.log_soal.add({ id: uuid(), soal_id, aksi, sebelum_json: sebelum, sesudah_json: sesudah, dibuat_pada: sekarang() });
}

async function ambilSoal(id: string): Promise<Soal> {
  const s = await db.soal.get(id);
  if (!s) throw new Error('Soal tidak ditemukan.');
  return s;
}

function slotDari(s: Soal): Slot {
  return { id: s.slot_id, urutan: s.urutan, tp_index: 0, kesukaran: s.kesukaran_rancangan, level: s.level_kognitif, bentuk: s.bentuk, status: 'berjalan', percobaan: 0, pengganti: false, galat: null, soal_id: s.id };
}

export interface Kandidat {
  hasil: HasilButir;
  model: ModelAktif;
  biaya: number | null;
}

/** Buat butir pengganti dengan kategori yang sama, tanpa menyimpan. Guru membandingkan lalu menerima atau mengembalikan. */
export async function buatKandidat(soalId: string, catatan: string | null, signal?: AbortSignal, saatMenunggu?: (ms: number, alasan: string) => void): Promise<Kandidat> {
  const s = await ambilSoal(soalId);
  if (s.terkunci) throw new Error('Soal terkunci. Buka kunci dulu.');
  const paket = await db.paket_soal.get(s.paket_id);
  if (!paket) throw new Error('Paket tidak ditemukan.');
  const m = await modelAktif();
  const kirim = pengirimDari(m, { saatMenunggu });
  const ctx = await konteksPaket(s.paket_id, s.id);
  const param = { ...paket.parameter_json, tp: [s.tp] };
  const reg = await muatRegistri().catch(() => null);
  const info = reg ? modelDari(reg, m.penyedia, m.model) : undefined;
  let biaya: number | null = 0;
  const hasil = await buatButir(
    kirim,
    { param, slot: slotDari(s), ...ctx, revisi: catatan !== null ? { lama: s.isi_json, catatan } : null, signal },
    async (p, lolos) => {
      const b = hitungBiaya(info, p.jawaban?.token_masuk ?? 0, p.jawaban?.token_keluar ?? 0);
      biaya = biaya === null || b === null ? null : biaya + b;
      await db.pemakaian_ai.add({ id: uuid(), tanggal: tanggalLokal(), dibuat_pada: sekarang(), penyedia: m.penyedia, model: m.model, token_masuk: p.jawaban?.token_masuk ?? 0, token_keluar: p.jawaban?.token_keluar ?? 0, perkiraan_biaya: b, lolos, paket_id: s.paket_id });
    },
  );
  if (hasil.henti) throw hasil.henti;
  return { hasil, model: m, biaya };
}

async function simpanGambar(s: Soal, isi: IsiSoal, svg: string | null) {
  await db.soal_gambar.where('soal_id').equals(s.id).delete();
  if (isi.gambar && svg) {
    const t = sekarang();
    await db.soal_gambar.add({ id: uuid(), soal_id: s.id, jalur: 'terprogram', templat: isi.gambar.templat, parameter_json: isi.gambar.parameter, svg, dibuat_pada: t, diubah_pada: t });
  }
}

export async function terimaKandidat(soalId: string, k: Kandidat, aksi: 'ganti' | 'buat_ulang'): Promise<void> {
  const s = await ambilSoal(soalId);
  if (!k.hasil.ok || !k.hasil.isi || !k.hasil.periksa) throw new Error('Kandidat tidak lolos pemeriksaan.');
  const p = k.hasil.periksa;
  const baru: Soal = {
    ...s,
    isi_json: k.hasil.isi,
    status_mutu: p.status_mutu,
    status_telaah: 'draf',
    sumber_dicek: false,
    catatan_mutu: [p.hitung.hasil === 'lolos' ? `Dihitung ulang: ${p.hitung.alasan}` : '', ...p.catatan].filter(Boolean),
    versi: s.versi + 1,
    penyedia: k.model.penyedia,
    model: k.model.model,
    biaya_usd: s.biaya_usd === null || k.biaya === null ? null : s.biaya_usd + k.biaya,
    diubah_pada: sekarang(),
  };
  await db.soal.put(baru);
  await simpanGambar(baru, baru.isi_json, p.svg);
  await log(s.id, aksi, s.isi_json, baru.isi_json);
}

/** Periksa ulang isi yang disunting guru dengan pemeriksa yang sama. */
export async function periksaSuntingan(soalId: string, isi: IsiSoal): Promise<HasilPeriksa> {
  const s = await ambilSoal(soalId);
  const paket = await db.paket_soal.get(s.paket_id);
  if (!paket) throw new Error('Paket tidak ditemukan.');
  const p = paket.parameter_json;
  const lain = (await konteksPaket(s.paket_id, s.id)).pokokLain;
  return periksaSoal(isi, {
    rumpun: p.rumpun,
    kelas: p.kelas,
    fase: p.fase,
    lokal: p.bahasa === 'en' ? 'en' : 'id',
    literasi: p.gaya === 'literasi',
    pokokLain: lain,
    gambarDiizinkan: true,
    opsiPg: p.opsi_pg ? { jumlah: p.opsi_pg, wajib: false } : null,
  });
}

/** Simpan suntingan guru. Ditolak bila hitung ulang membuktikan kunci salah. */
export async function simpanSuntingan(soalId: string, isi: IsiSoal): Promise<HasilPeriksa> {
  const s = await ambilSoal(soalId);
  if (s.terkunci) throw new Error('Soal terkunci. Buka kunci dulu.');
  const h = await periksaSuntingan(soalId, isi);
  if (!h.lolos) return h;
  const baru: Soal = {
    ...s,
    isi_json: isi,
    status_mutu: h.status_mutu,
    status_telaah: 'draf',
    sumber_dicek: false,
    catatan_mutu: ['Disunting guru.', h.hitung.hasil === 'lolos' ? `Dihitung ulang: ${h.hitung.alasan}` : '', ...h.catatan].filter(Boolean),
    versi: s.versi + 1,
    diubah_pada: sekarang(),
  };
  await db.soal.put(baru);
  await simpanGambar(baru, isi, h.svg ?? (isi.gambar ? bangkitkanGambar(isi.gambar).svg : null));
  await log(s.id, 'sunting', s.isi_json, isi);
  return h;
}

/** Guru mengubah tanda jenis jawaban uraian. Hanya tata letak tempat jawaban yang berubah, jadi status tidak diulang. */
export async function aturJenisUraian(soalId: string, jenis: JenisUraian): Promise<void> {
  const s = await ambilSoal(soalId);
  if (s.bentuk !== 'uraian' || s.isi_json.jenis_uraian === jenis) return;
  await db.soal.update(soalId, { isi_json: { ...s.isi_json, jenis_uraian: jenis }, diubah_pada: sekarang() });
  await log(soalId, 'jenis_uraian', s.isi_json.jenis_uraian ?? null, jenis);
}

export async function aturKunci(soalId: string, terkunci: boolean): Promise<void> {
  await db.soal.update(soalId, { terkunci, diubah_pada: sekarang() });
  await log(soalId, terkunci ? 'kunci' : 'buka_kunci', !terkunci, terkunci);
}

export async function hapusSoal(soalId: string): Promise<void> {
  await db.soal.update(soalId, { dihapus_pada: sekarang() });
  await log(soalId, 'hapus', null, null);
}

export async function pulihkanSoal(soalId: string): Promise<void> {
  await db.soal.update(soalId, { dihapus_pada: null });
  await log(soalId, 'pulihkan', null, null);
}

export async function hapusPaket(paketId: string): Promise<void> {
  await db.paket_soal.update(paketId, { dihapus_pada: sekarang() });
}

export async function pulihkanPaket(paketId: string): Promise<void> {
  await db.paket_soal.update(paketId, { dihapus_pada: null });
}

export function ringkasPokok(s: Soal): string {
  return teksPolos(s.isi_json.pokok).slice(0, 120);
}
