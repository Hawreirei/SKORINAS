import { adaptorUntuk, hitungBiaya } from '../ai';
import { GalatAi } from '../ai/galat';
import { batasEfektif, pembatas, awalHariKuota } from '../ai/laju';
import { modelDari, muatRegistri } from '../ai/registri';
import { db } from '../db/skema';
import { ambilProfil } from '../db/profil';
import type { HurufOpsi, PaketSoal, ParameterPaket, PekerjaanGenerasi, PenyediaId, Slot, Soal } from '../db/tipe';
import { sekarang, tanggalLokal, uuid } from '../db/util';
import { teksPolos } from '../matematika/teks';
import { buatButir, type HasilButir, type Pengirim, type Percobaan } from './butir';
import { rencanakanSlot } from './rencana';

export interface ModelAktif {
  penyedia: PenyediaId;
  model: string;
  kunci: string;
}

export async function modelAktif(pakaiCadangan = false): Promise<ModelAktif> {
  const prof = await ambilProfil();
  const penyedia = pakaiCadangan ? prof.penyedia_cadangan : prof.penyedia_utama;
  const model = pakaiCadangan ? prof.model_cadangan : prof.model_utama;
  if (!penyedia || !model) throw new GalatAi('kunci', pakaiCadangan ? 'Model cadangan belum dipilih di Pengaturan AI.' : 'Pilih penyedia dan model utama di Pengaturan AI.');
  const k = await db.kunci_api.get(penyedia);
  if (!k?.kunci) throw new GalatAi('kunci', 'Kunci API untuk penyedia ini belum dipasang di Pengaturan AI.');
  return { penyedia, model, kunci: k.kunci };
}

/**
 * Pengirim ke model, dijaga pembatas laju: tidak melewati batas per menit dan per hari model itu.
 * saatMenunggu dipanggil dengan ms > 0 sebelum menunggu dan dengan 0 setelahnya.
 */
export function pengirimDari(m: ModelAktif, opsi: { saatMenunggu?: (ms: number, alasan: string) => void } = {}): Pengirim {
  const a = adaptorUntuk(m.penyedia);
  return async (sistem, pesan, signal) => {
    const [prof, reg] = await Promise.all([ambilProfil(), muatRegistri().catch(() => null)]);
    let menunggu = false;
    await pembatas.izin(m.penyedia, m.model, batasEfektif(prof, reg, m.penyedia, m.model), {
      signal,
      namaPenyedia: namaPenyedia(m.penyedia),
      saatMenunggu: (ms, alasan) => {
        menunggu = true;
        opsi.saatMenunggu?.(ms, alasan);
      },
    });
    if (menunggu) opsi.saatMenunggu?.(0, '');
    return a.kirim({ kunci: m.kunci, model: m.model, sistem, pesan, signal });
  };
}

export async function jumlahLolosHariIni(): Promise<number> {
  return db.pemakaian_ai.where('tanggal').equals(tanggalLokal()).filter((p) => p.lolos).count();
}

/** Buat paket dan rencana butir. Generasi dimulai terpisah lewat pengatur.mulai(). */
export async function buatPaket(param: ParameterPaket, judul: string): Promise<string> {
  // TP ditulis guru di formulir; tiap TP diberi id agar soal dan kisi-kisi dapat merujuknya.
  const tp = param.tp.map((x) => ({ ...x, id: x.id || uuid(), sumber: x.sumber ?? ('guru' as const), versi: x.versi ?? 1 }));
  const p: ParameterPaket = { ...param, tp };
  const slot = rencanakanSlot(p);
  const t = sekarang();
  const paket: PaketSoal = { id: uuid(), judul: judul.trim() || tp[0]?.rumusan.slice(0, 80) || 'Paket soal', parameter_json: p, status: 'membuat', penyedia: null, model: null, dibuat_pada: t, diubah_pada: t, dihapus_pada: null };
  const kerja: PekerjaanGenerasi = { id: uuid(), paket_id: paket.id, status: 'menunggu', slot, percobaan: 0, galat: null, mulai: null, selesai: null, dibuat_pada: t, diubah_pada: t };
  await db.transaction('rw', db.paket_soal, db.pekerjaan_generasi, async () => {
    await db.paket_soal.add(paket);
    await db.pekerjaan_generasi.add(kerja);
  });
  return paket.id;
}

async function soalAktif(paketId: string): Promise<Soal[]> {
  return (await db.soal.where('paket_id').equals(paketId).toArray()).filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak');
}

export async function konteksPaket(paketId: string, kecuali?: string): Promise<{ pokokLain: string[]; kunciTerpakai: Partial<Record<HurufOpsi, number>> }> {
  const daftar = (await soalAktif(paketId)).filter((s) => s.id !== kecuali);
  const kunciTerpakai: Partial<Record<HurufOpsi, number>> = {};
  for (const s of daftar) if (s.bentuk === 'pilihan_ganda') kunciTerpakai[s.isi_json.kunci as HurufOpsi] = (kunciTerpakai[s.isi_json.kunci as HurufOpsi] ?? 0) + 1;
  return { pokokLain: daftar.map((s) => teksPolos(s.isi_json.pokok)), kunciTerpakai };
}

function pencatat(m: ModelAktif, paketId: string, biaya: { total: number | null }) {
  return async (p: Percobaan, lolos: boolean) => {
    const reg = await muatRegistri().catch(() => null);
    const info = reg ? modelDari(reg, m.penyedia, m.model) : undefined;
    const masuk = p.jawaban?.token_masuk ?? 0;
    const keluar = p.jawaban?.token_keluar ?? 0;
    const b = hitungBiaya(info, masuk, keluar);
    biaya.total = biaya.total === null || b === null ? null : biaya.total + b;
    await db.pemakaian_ai.add({ id: uuid(), tanggal: tanggalLokal(), dibuat_pada: sekarang(), penyedia: m.penyedia, model: m.model, token_masuk: masuk, token_keluar: keluar, perkiraan_biaya: b, lolos, paket_id: paketId });
  };
}

/** Simpan butir hasil generasi sebagai soal baru (atau soal ditolak untuk jejak). */
async function simpanSoal(paket: PaketSoal, slot: Slot, h: HasilButir, m: ModelAktif, biaya: number | null, ditolak: boolean): Promise<string | null> {
  const isi = h.isi;
  if (!isi) return null;
  const t = sekarang();
  const tp = paket.parameter_json.tp[slot.tp_index];
  const soal: Soal = {
    id: uuid(),
    paket_id: paket.id,
    slot_id: slot.id,
    urutan: slot.urutan,
    tp_id: tp.id,
    tp,
    indikator_id: null,
    bentuk: slot.bentuk,
    level_kognitif: slot.level,
    kesukaran_rancangan: slot.kesukaran,
    isi_json: isi,
    status_mutu: ditolak ? 'ditolak' : h.periksa!.status_mutu,
    status_telaah: ditolak ? 'ditolak' : 'draf',
    catatan_mutu: ditolak ? h.percobaan.flatMap((p) => p.alasan) : [h.periksa!.hitung.hasil === 'lolos' ? `Dihitung ulang: ${h.periksa!.hitung.alasan}` : '', ...h.periksa!.catatan].filter(Boolean),
    sumber_dicek: false,
    terkunci: false,
    versi: 1,
    penyedia: m.penyedia,
    model: m.model,
    biaya_usd: biaya,
    dibuat_pada: t,
    diubah_pada: t,
    dihapus_pada: null,
  };
  await db.soal.add(soal);
  if (!ditolak && isi.gambar && h.periksa?.svg) {
    await db.soal_gambar.add({ id: uuid(), soal_id: soal.id, jalur: 'terprogram', templat: isi.gambar.templat, parameter_json: isi.gambar.parameter, svg: h.periksa.svg, dibuat_pada: t, diubah_pada: t });
  }
  return soal.id;
}

export interface StatusPengatur {
  paketId: string | null;
  berjalan: boolean;
  slotAktif: number | null;
  pesan: string | null;
  jenisGalat: GalatAi['jenis'] | null;
  /** Pesan asli penyedia untuk galat terakhir. */
  rinci: string | null;
  /** Sedang menunggu batas per menit penyedia pulih. */
  menunggu: { sampai: number; alasan: string } | null;
  /** Catatan selama berjalan, mis. beralih ke model cadangan. */
  catatan: string | null;
}

/** Tunggu batas per menit paling lama sekian; lebih dari itu dianggap kuota habis. */
export const MAKS_TUNGGU_MS = 2 * 60_000;
const TUNGGU_BAWAAN_MS = 30_000;
const MAKS_TUNGGU_BERUNTUN = 8;

export type Tunda = (ms: number, signal: AbortSignal) => Promise<void>;

const tundaBawaan: Tunda = (ms, signal) =>
  new Promise((selesai, gagal) => {
    const t = setTimeout(selesai, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      gagal(new GalatAi('dibatalkan', 'Dijeda.'));
    });
  });

/** Kuota harian Gemini pulih tengah malam waktu Pasifik; tampilkan dalam jam perangkat. */
export function waktuResetGemini(kini = new Date()): string {
  const reset = new Date(awalHariKuota('gemini', kini) + 24 * 3600_000);
  return reset.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function namaPenyedia(id: PenyediaId): string {
  return { gemini: 'Google Gemini', openrouter: 'OpenRouter', groq: 'Groq', mistral: 'Mistral', openai: 'OpenAI', anthropic: 'Anthropic' }[id];
}

/** Pesan jeda yang dapat dipahami guru, beserta langkah berikutnya. */
export function pesanBatasHabis(g: GalatAi, m: ModelAktif, adaCadangan: boolean): string {
  const harian = g.batas?.lingkup === 'harian';
  const nama = namaPenyedia(m.penyedia);
  const awal = harian ? `Kuota harian ${nama} untuk model ${m.model} sudah habis.` : `Batas pemakaian ${nama} masih tercapai setelah ditunggu.`;
  const pulih = harian && m.penyedia === 'gemini' ? ` Kuota gratis Gemini pulih sekitar pukul ${waktuResetGemini()}.` : '';
  const saran = adaCadangan
    ? ' Model cadangan juga sudah mencapai batas. Tekan Lanjutkan nanti.'
    : ' Pasang model cadangan (sebaiknya penyedia lain) di Pengaturan AI, langkah 03, lalu tekan Lanjutkan. Soal yang sudah jadi tetap tersimpan.';
  return awal + pulih + saran;
}

type Pendengar = (s: StatusPengatur) => void;

/** Satu pengatur generasi per tab. Butir dikerjakan berurutan dan disimpan satu per satu. */
class PengaturGenerasi {
  private status: StatusPengatur = { paketId: null, berjalan: false, slotAktif: null, pesan: null, jenisGalat: null, rinci: null, menunggu: null, catatan: null };
  private pendengar = new Set<Pendengar>();
  private kendali: AbortController | null = null;

  ambil(): StatusPengatur {
    return this.status;
  }

  dengar(f: Pendengar): () => void {
    this.pendengar.add(f);
    return () => this.pendengar.delete(f);
  }

  private ubah(s: Partial<StatusPengatur>) {
    this.status = { ...this.status, ...s };
    for (const f of this.pendengar) f(this.status);
  }

  jeda() {
    this.kendali?.abort();
  }

  async mulai(paketId: string, opsi: { pakaiCadangan?: boolean; pengirim?: Pengirim; model?: ModelAktif; cadangan?: { model: ModelAktif; pengirim?: Pengirim } | null; tunda?: Tunda } = {}): Promise<void> {
    if (this.status.berjalan) {
      if (this.status.paketId === paketId) return;
      throw new Error('Paket lain sedang dibuat. Tunggu atau jeda dulu.');
    }
    const kendali = new AbortController();
    this.kendali = kendali;
    const tunda = opsi.tunda ?? tundaBawaan;
    this.ubah({ paketId, berjalan: true, pesan: null, jenisGalat: null, rinci: null, slotAktif: null, menunggu: null, catatan: null });
    let kerja = await db.pekerjaan_generasi.where('paket_id').equals(paketId).first();
    try {
      const paket = await db.paket_soal.get(paketId);
      if (!paket || !kerja) throw new Error('Paket tidak ditemukan.');
      const saatMenunggu = (ms: number, alasan: string) => this.ubah({ menunggu: ms > 0 ? { sampai: Date.now() + ms, alasan } : null });
      const utama: ModelAktif = opsi.model ?? (await modelAktif(opsi.pakaiCadangan));
      let aktif = { m: utama, kirim: opsi.pengirim ?? pengirimDari(utama, { saatMenunggu }), cadangan: !!opsi.pakaiCadangan };
      // Model cadangan dipakai otomatis bila kuota model utama habis (F-18).
      let cadangan: { m: ModelAktif; kirim: Pengirim } | null = null;
      if (!opsi.pakaiCadangan) {
        const c = opsi.cadangan !== undefined ? opsi.cadangan : await modelAktif(true).then((model) => ({ model, pengirim: undefined as Pengirim | undefined }), () => null);
        if (c && !(c.model.penyedia === utama.penyedia && c.model.model === utama.model)) cadangan = { m: c.model, kirim: c.pengirim ?? pengirimDari(c.model, { saatMenunggu }) };
      }
      const prof = await ambilProfil();
      kerja = { ...kerja, status: 'berjalan', galat: null, mulai: kerja.mulai ?? sekarang(), diubah_pada: sekarang() };
      await db.pekerjaan_generasi.put(kerja);
      await db.paket_soal.update(paketId, { status: 'membuat', penyedia: aktif.m.penyedia, model: aktif.m.model, diubah_pada: sekarang() });

      /** Satu putaran buatButir yang sabar terhadap batas penyedia: tunggu bila per menit, pindah ke cadangan bila habis. */
      const buatSabar = async (slot: Slot, biaya: { total: number | null }): Promise<HasilButir> => {
        let beruntun = 0;
        for (;;) {
          const h = await buatButir(aktif.kirim, { param: paket.parameter_json, slot, ...(await konteksPaket(paketId)), signal: kendali.signal }, pencatat(aktif.m, paketId, biaya));
          const g = h.henti;
          if (!g || g.jenis !== 'batas') return h;
          const tunggu = g.batas?.tungguMs ?? TUNGGU_BAWAAN_MS;
          if (g.batas?.lingkup !== 'harian' && tunggu <= MAKS_TUNGGU_MS && beruntun < MAKS_TUNGGU_BERUNTUN) {
            beruntun++;
            const ms = tunggu + 1000;
            this.ubah({ menunggu: { sampai: Date.now() + ms, alasan: g.message }, rinci: g.rinci ?? null });
            await tunda(ms, kendali.signal);
            this.ubah({ menunggu: null });
            continue;
          }
          if (cadangan && !aktif.cadangan) {
            const lama = aktif.m;
            aktif = { m: cadangan.m, kirim: cadangan.kirim, cadangan: true };
            beruntun = 0;
            this.ubah({ catatan: `${g.message} Dilanjutkan dengan model cadangan ${namaPenyedia(aktif.m.penyedia)} · ${aktif.m.model} (sebelumnya ${lama.model}).` });
            await db.paket_soal.update(paketId, { penyedia: aktif.m.penyedia, model: aktif.m.model });
            continue;
          }
          return { ...h, henti: new GalatAi('batas', pesanBatasHabis(g, aktif.m, !!cadangan), 429, g.batas, g.rinci) };
        }
      };

      for (const slot of kerja.slot) {
        if (slot.status === 'lolos' || slot.status === 'gagal') continue;
        if (kendali.signal.aborted) throw new GalatAi('dibatalkan', 'Dijeda.');
        if ((await jumlahLolosHariIni()) >= prof.batas_harian)
          throw new GalatAi('batas', `Batas harian GenSoal (${prof.batas_harian} soal) tercapai. Ubah batas di Pengaturan AI → Pengaturan lanjutan, atau lanjutkan besok.`);
        this.ubah({ slotAktif: slot.urutan });
        slot.status = 'berjalan';
        await db.pekerjaan_generasi.update(kerja.id, { slot: kerja.slot, diubah_pada: sekarang() });

        const biaya = { total: 0 as number | null };
        let h = await buatSabar(slot, biaya);
        slot.percobaan += h.percobaan.length;
        kerja.percobaan += h.percobaan.length;
        if (h.henti) {
          slot.status = 'menunggu';
          throw h.henti;
        }
        if (!h.ok) {
          // Tiga percobaan gagal: tandai ditolak lalu ganti dengan satu putaran pengganti.
          await simpanSoal(paket, slot, h, aktif.m, biaya.total, true);
          slot.pengganti = true;
          h = await buatSabar(slot, biaya);
          slot.percobaan += h.percobaan.length;
          kerja.percobaan += h.percobaan.length;
          if (h.henti) {
            slot.status = 'menunggu';
            throw h.henti;
          }
          if (!h.ok) await simpanSoal(paket, slot, h, aktif.m, biaya.total, true);
        }
        if (h.ok) {
          slot.soal_id = await simpanSoal(paket, slot, h, aktif.m, biaya.total, false);
          slot.status = 'lolos';
          slot.galat = null;
        } else {
          slot.status = 'gagal';
          slot.galat = h.percobaan.at(-1)?.alasan.join(' ') ?? 'Gagal dibuat.';
        }
        await db.pekerjaan_generasi.update(kerja.id, { slot: kerja.slot, percobaan: kerja.percobaan, diubah_pada: sekarang() });
      }
      await db.pekerjaan_generasi.update(kerja.id, { status: 'selesai', selesai: sekarang(), diubah_pada: sekarang() });
      await db.paket_soal.update(paketId, { status: 'siap', diubah_pada: sekarang() });
      this.ubah({ berjalan: false, slotAktif: null, pesan: null, jenisGalat: null, rinci: null, menunggu: null });
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      if (kerja) {
        for (const s of kerja.slot) if (s.status === 'berjalan') s.status = 'menunggu';
        await db.pekerjaan_generasi.update(kerja.id, { status: 'dijeda', slot: kerja.slot, galat: g.jenis === 'dibatalkan' ? null : g.message, diubah_pada: sekarang() });
      }
      await db.paket_soal.update(paketId, { status: 'dijeda', diubah_pada: sekarang() });
      const batal = g.jenis === 'dibatalkan';
      this.ubah({ berjalan: false, slotAktif: null, menunggu: null, pesan: batal ? null : g.message, jenisGalat: batal ? null : g.jenis, rinci: batal ? null : (g.rinci ?? null) });
    } finally {
      if (this.kendali === kendali) this.kendali = null;
    }
  }
}

export const pengatur = new PengaturGenerasi();

/** Saat aplikasi dibuka: pekerjaan yang tertinggal berstatus berjalan (tab ditutup) dijadikan dijeda. */
export async function pulihkanPekerjaanTertinggal(): Promise<void> {
  const daftar = await db.pekerjaan_generasi.where('status').equals('berjalan').toArray();
  for (const k of daftar) {
    for (const s of k.slot) if (s.status === 'berjalan') s.status = 'menunggu';
    await db.pekerjaan_generasi.update(k.id, { status: 'dijeda', slot: k.slot, galat: 'Pembuatan terhenti karena tab ditutup. Tekan Lanjutkan; soal yang sudah jadi tetap tersimpan.' });
    await db.paket_soal.update(k.paket_id, { status: 'dijeda' });
  }
}
