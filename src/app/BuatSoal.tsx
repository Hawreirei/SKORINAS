import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Bentuk, BahasaSoal, CaraBenarSalah, GayaSoal, Level, ModeGambar, ParameterPaket, Preset, TpDipakai } from '../db/tipe';
import { BENTUK_LABEL, LEVEL } from '../db/tipe';
import { sekarang, tanggalLokal, uuid } from '../db/util';
import { bagiKomposisi, geserPersen } from '../generasi/komposisi';
import { buatPaket, jumlahLolosHariIni, pengatur } from '../generasi/pengatur';
import { bentukDipakai, galatKomposisi, rencanakanSlot, ringkasBentuk, URUTAN_BENTUK } from '../generasi/rencana';
import { faseDariKelas } from '../kurikulum/fase';
import { nilaiTp } from '../kurikulum/pemeriksa-tp';
import { paketUntuk, rumpunDariMapel } from '../paket';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { usePesan } from '../komponen/Pesan';
import { BagianLipat, IsianAngka, IsianPanjang, IsianTeks, Pemberitahuan, Pilihan, PilihanBanyak, PilihanDaftar, Sakelar } from '../komponen/Formulir';
import { Kartu } from '../komponen/Status';
import { Panah, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { batasEfektif, permintaanHariIni } from '../ai/laju';
import { modelDari } from '../ai/registri';
import { bacaDraf, bagiRata, hapusDraf, hitungRencana, levelDariPersen, MAKS_SOAL, MIN_SOAL, simpanDraf, SKOR_BAWAAN } from './rencana-buat';
import { formatBiaya } from './ringkas';

const MAKS_TP = 500;
const MAKS_KATA_MATERI = 3000;

interface Isian {
  kelas: number;
  mapel: string;
  cp: string;
  tpTeks: string;
  tpAsal: TpDipakai[];
  n: number;
  persen: [number, number, number];
  bentuk: Bentuk[];
  bahasa: BahasaSoal;
  gaya: GayaSoal;
  gambar: ModeGambar;
  materi: string;
  cara_bs: CaraBenarSalah;
  jumlahBentuk: Partial<Record<Bentuk, number>> | null;
  sebaranLevel: Partial<Record<Level, number>> | null;
  jumlahTp: number[] | null;
  opsiPg: 4 | 5 | null;
  skorBentuk: Partial<Record<Bentuk, number>> | null;
}

function isianKosong(): Isian {
  return {
    kelas: 0,
    mapel: '',
    cp: '',
    tpTeks: '',
    tpAsal: [],
    n: 10,
    persen: [30, 50, 20],
    bentuk: ['pilihan_ganda'],
    bahasa: 'id',
    gaya: 'biasa',
    gambar: 'terprogram',
    materi: '',
    cara_bs: 'centang',
    jumlahBentuk: null,
    sebaranLevel: null,
    jumlahTp: null,
    opsiPg: null,
    skorBentuk: null,
  };
}

function isianDariParameter(p: ParameterPaket): Isian {
  return {
    kelas: p.kelas,
    mapel: p.mapel,
    cp: p.cp,
    tpTeks: p.tp.map((t) => t.rumusan).join('\n'),
    tpAsal: p.tp,
    n: p.n,
    persen: p.persen,
    bentuk: p.bentuk,
    bahasa: p.bahasa,
    gaya: p.gaya,
    gambar: p.gambar,
    materi: p.materi,
    cara_bs: p.cara_bs ?? 'centang',
    jumlahBentuk: p.jumlah_bentuk ?? null,
    sebaranLevel: p.sebaran_level ?? null,
    jumlahTp: p.jumlah_tp ?? null,
    opsiPg: p.opsi_pg ?? null,
    skorBentuk: p.skor_bentuk ?? null,
  };
}

function barisTp(teks: string): string[] {
  return teks
    .split('\n')
    .map((t) => t.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** TP yang dipakai: baris TP; bila kosong, CP; bila keduanya kosong, mapel sebagai topik. */
function tpUntuk(f: Isian): string[] {
  const tp = barisTp(f.tpTeks);
  if (tp.length) return tp;
  if (f.cp.trim()) return [f.cp.trim()];
  return f.mapel.trim() ? [`Materi ${f.mapel.trim()} kelas ${f.kelas}`] : [];
}

/** Jumlah per bentuk hanya untuk bentuk yang dicentang. */
function jumlahBentukDipakai(f: Isian): Partial<Record<Bentuk, number>> | null {
  return f.jumlahBentuk ? Object.fromEntries(URUTAN_BENTUK.filter((b) => f.bentuk.includes(b)).map((b) => [b, f.jumlahBentuk![b] ?? 0])) : null;
}

function keParameter(f: Isian): ParameterPaket {
  const tp: TpDipakai[] = tpUntuk(f).map((rumusan) => {
    const asal = f.tpAsal.find((t) => t.rumusan === rumusan);
    return { id: asal?.id ?? '', rumusan, sumber: 'guru', versi: 1 };
  });
  const jumlah_bentuk = jumlahBentukDipakai(f);
  const bentuk = bentukDipakai({ bentuk: f.bentuk, jumlah_bentuk });
  return {
    kelas: f.kelas,
    fase: faseDariKelas(f.kelas),
    mapel: f.mapel.trim(),
    rumpun: rumpunDariMapel(f.mapel),
    cp: f.cp.trim(),
    tp,
    n: f.n,
    persen: f.persen,
    bentuk,
    bahasa: f.bahasa,
    gaya: f.gaya,
    gambar: f.gambar,
    materi: f.materi,
    cara_bs: f.cara_bs,
    jumlah_bentuk,
    sebaran_level: f.sebaranLevel,
    // Jumlah per TP hanya berlaku bila TP ditulis guru, sejajar baris TP.
    jumlah_tp: f.jumlahTp && f.jumlahTp.length === tp.length && barisTp(f.tpTeks).length > 1 ? f.jumlahTp : null,
    opsi_pg: f.opsiPg,
    skor_bentuk: f.skorBentuk ? Object.fromEntries(bentuk.map((b) => [b, f.skorBentuk![b] ?? SKOR_BAWAAN[b]])) : null,
  };
}

const KOMPOSISI = [
  { nilai: 'bawaan', label: 'Bawaan', persen: [30, 50, 20], akibat: 'Seimbang untuk penilaian harian.' },
  { nilai: 'mudah', label: 'Lebih mudah', persen: [50, 40, 10], akibat: 'Cocok untuk latihan atau remedial.' },
  { nilai: 'sulit', label: 'Lebih sulit', persen: [20, 50, 30], akibat: 'Lebih banyak soal penalaran; pembuatan bisa lebih lama karena soal lebih sering dicek ulang.' },
] as const satisfies readonly { nilai: string; label: string; persen: readonly [number, number, number]; akibat: string }[];
type NilaiKomposisi = (typeof KOMPOSISI)[number]['nilai'] | 'sendiri';

const samaPersen = (a: readonly number[], b: readonly number[]) => a.every((x, i) => x === b[i]);

const NAMA_LEVEL: Record<Level, string> = { C1: 'Mengingat', C2: 'Memahami', C3: 'Menerapkan', C4: 'Menganalisis', C5: 'Mengevaluasi', C6: 'Mencipta' };

/** Satu baris jumlah: nama di kiri, tombol kurang, angka yang dapat diketik, dan tombol tambah di kanan. */
function BarisJumlah({ id, label, ket, nilai, ubah, maks = MAKS_SOAL, min = 0 }: { id: string; label: ReactNode; ket?: ReactNode; nilai: number; ubah: (n: number) => void; maks?: number; min?: number }) {
  const atur = (n: number) => ubah(Math.max(min, Math.min(maks, n)));
  const nama = typeof label === 'string' ? label : id;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-garis py-2 last:border-b-0">
      <label htmlFor={id} className="min-w-0 text-base">
        <span className="font-bold text-tinta">{label}</span>
        {ket ? <span className="block text-redup">{ket}</span> : null}
      </label>
      <span className="flex shrink-0 items-center gap-2">
        <Langkah label={`Kurangi ${nama}`} onClick={() => atur(nilai - 1)} disabled={nilai <= min} />
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className="bidang !min-h-11 w-16 text-center text-[18px] font-extrabold tabular-nums"
          value={nilai}
          onFocus={(e) => e.target.select()}
          onChange={(e) => atur(Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0)}
        />
        <Langkah label={`Tambah ${nama}`} onClick={() => atur(nilai + 1)} disabled={nilai >= maks} />
      </span>
    </div>
  );
}

/** Total jumlah yang diatur terhadap jumlah soal, dengan tombol untuk membagi ulang. */
function TotalJumlah({ total, n, bagi, labelBagi, samakan }: { total: number; n: number; bagi: () => void; labelBagi: string; samakan: (n: number) => void }) {
  const pas = total === n;
  const bisaDisamakan = !pas && total >= MIN_SOAL && total <= MAKS_SOAL;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <p className={`text-base font-bold tabular-nums ${pas ? 'text-baik' : 'text-buruk'}`} aria-live="polite">
        {pas ? `Total ${total} soal, sudah pas.` : `Total ${total} dari ${n} soal${total < n ? `, kurang ${n - total}` : `, lebih ${total - n}`}.`}
      </p>
      <span className="flex flex-wrap gap-x-5">
        {bisaDisamakan ? (
          <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={() => samakan(total)}>
            Jadikan jumlah soal {total}
          </button>
        ) : null}
        <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={bagi}>
          {labelBagi}
        </button>
      </span>
    </div>
  );
}

/** Kelompok isian di dalam Pengaturan lanjutan: judul kecil, satu kalimat penjelas, lalu isinya. */
function SubBagian({ judul, ket, children }: { judul: string; ket?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-t border-garis pt-6 first:border-t-0 first:pt-0">
      <h3 id={id} className="text-[18px] font-extrabold text-judul">
        {judul}
      </h3>
      {ket ? <p className="mt-0.5 text-base text-redup">{ket}</p> : null}
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  );
}

function Langkah({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="size-11 shrink-0 rounded-lg border border-garis-kuat bg-kartu text-2xl font-bold text-utama hover:border-utama disabled:opacity-30">
      {label.startsWith('Kurangi') ? '−' : '+'}
    </button>
  );
}

/** Isi draf layar Buat yang disimpan per perangkat. */
interface Draf {
  f: Isian;
  judul: string;
  presetId: string | null;
  simpanPreset: boolean;
  namaPreset: string;
}

type BidangWajib = 'kelas' | 'mapel' | 'jumlah' | 'nama-preset';

export default function BuatSoal() {
  useJudulHalaman('Buat soal');
  const [cari] = useSearchParams();
  const navigasi = useNavigate();
  const pesan = usePesan();
  const konfirmasi = useKonfirmasi();
  const profil = useProfil();
  const preset = useLiveQuery(() => db.preset.orderBy('terakhir_dipakai').reverse().toArray(), []);
  const mapelLama = useLiveQuery(async () => [...new Set((await db.paket_soal.toArray()).map((p) => p.parameter_json.mapel).filter(Boolean))].slice(0, 30), []);
  const kunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const { data: registri } = useRegistri();
  const terpakai = useLiveQuery(() => (profil.penyedia_utama && profil.model_utama ? permintaanHariIni(profil.penyedia_utama, profil.model_utama) : Promise.resolve(0)), [profil.penyedia_utama, profil.model_utama]);
  // Riwayat pemakaian untuk perkiraan biaya: rata-rata token per permintaan dan biaya hari ini.
  const riwayat = useLiveQuery(async () => {
    const semua = await db.pemakaian_ai.orderBy('tanggal').reverse().limit(200).toArray();
    const hariIni = semua.filter((x) => x.tanggal === tanggalLokal());
    const biayaHariIni = hariIni.reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
    const tokenRata = semua.length ? { masuk: semua.reduce((a, x) => a + x.token_masuk, 0) / semua.length, keluar: semua.reduce((a, x) => a + x.token_keluar, 0) / semua.length } : null;
    return { biayaHariIni, tokenRata };
  }, []);
  const [f, setF] = useState<Isian>(isianKosong);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [simpanPreset, setSimpanPreset] = useState(false);
  const [namaPreset, setNamaPreset] = useState('');
  const [judul, setJudul] = useState('');
  const [aturSendiri, setAturSendiri] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string[]>([]);
  const [tersentuh, setTersentuh] = useState<Partial<Record<BidangWajib, boolean>>>({});
  const [dicoba, setDicoba] = useState(false);
  const [rincianHp, setRincianHp] = useState(false);
  const [drafSiap, setDrafSiap] = useState(false);
  const ubah = (u: Partial<Isian>) => setF((x) => ({ ...x, ...u }));
  const sentuh = (b: BidangWajib) => setTersentuh((t) => ({ ...t, [b]: true }));
  // Jumlah soal diketik bebas; angka baru dipakai bila sah, dan dirapikan saat kolom ditinggalkan.
  const [teksN, setTeksN] = useState(String(f.n));
  useEffect(() => setTeksN(String(f.n)), [f.n]);
  const nSah = /^\d+$/.test(teksN.trim()) && Number(teksN) >= MIN_SOAL && Number(teksN) <= MAKS_SOAL;

  // Muat isian awal: ?ulang= dan ?preset= didahulukan, selain itu draf yang tersimpan di perangkat ini.
  useEffect(() => {
    const ulang = cari.get('ulang');
    if (ulang) {
      void db.paket_soal.get(ulang).then((pk) => {
        if (pk) {
          setF(isianDariParameter(pk.parameter_json));
          setJudul(`${pk.judul} (2)`);
        }
        setDrafSiap(true);
      });
      return;
    }
    if (!cari.get('preset')) {
      const d = bacaDraf<Draf>();
      if (d?.f) {
        setF({ ...isianKosong(), ...d.f });
        setJudul(d.judul ?? '');
        setPresetId(d.presetId ?? null);
        setSimpanPreset(!!d.simpanPreset);
        setNamaPreset(d.namaPreset ?? '');
      }
    }
    setDrafSiap(true);
  }, [cari]);

  useEffect(() => {
    const id = cari.get('preset');
    if (!id || !preset) return;
    const p = preset.find((x) => x.id === id);
    if (p && presetId !== id) muatPreset(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari, preset]);

  useEffect(() => {
    if (drafSiap) simpanDraf({ f, judul, presetId, simpanPreset, namaPreset } satisfies Draf);
  }, [drafSiap, f, judul, presetId, simpanPreset, namaPreset]);

  function muatPreset(p: Preset | null) {
    if (!p) {
      setPresetId(null);
      setF(isianKosong());
      setNamaPreset('');
      setSimpanPreset(false);
      return;
    }
    setPresetId(p.id);
    setF(isianDariParameter(p.parameter_json));
    setNamaPreset(p.nama);
    setSimpanPreset(false);
  }

  function kosongkan() {
    hapusDraf();
    muatPreset(null);
    setJudul('');
    setTersentuh({});
    setDicoba(false);
    setGalat([]);
  }

  const daftarTp = useMemo(() => barisTp(f.tpTeks), [f.tpTeks]);
  const saranTp = useMemo(() => daftarTp.map((t) => ({ t, n: nilaiTp(t) })).filter((x) => x.n.nilai !== 'baik'), [daftarTp]);
  const kuota = bagiKomposisi(f.n, f.persen);
  const bentukTerpilih = URUTAN_BENTUK.filter((b) => f.bentuk.includes(b));
  const aturTp = daftarTp.length > 1;
  const paramSusunan = { n: f.n, persen: f.persen, bentuk: bentukTerpilih, tp: tpUntuk(f).map((rumusan) => ({ id: '', rumusan })), jumlah_bentuk: jumlahBentukDipakai(f), sebaran_level: f.sebaranLevel, jumlah_tp: aturTp ? f.jumlahTp : null };
  const galatSusunan = galatKomposisi(paramSusunan).filter((g) => !g.startsWith('Pilih minimal'));
  // Banyak soal per bentuk menurut rencana, untuk skor maksimal. Kosong bila susunan belum sah.
  const perBentuk = useMemo(() => {
    try {
      return rencanakanSlot(paramSusunan).reduce<Partial<Record<Bentuk, number>>>((a, x) => ({ ...a, [x.bentuk]: (a[x.bentuk] ?? 0) + 1 }), {});
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(paramSusunan)]);
  const kuotaTampil = f.sebaranLevel ? [(f.sebaranLevel.C1 ?? 0) + (f.sebaranLevel.C2 ?? 0), (f.sebaranLevel.C3 ?? 0) + (f.sebaranLevel.C4 ?? 0), (f.sebaranLevel.C5 ?? 0) + (f.sebaranLevel.C6 ?? 0)] : kuota;
  const teksBentuk = ringkasBentuk({ bentuk: bentukTerpilih, jumlah_bentuk: jumlahBentukDipakai(f) });
  const adaPg = f.bentuk.includes('pilihan_ganda') || f.bentuk.includes('pilihan_ganda_kompleks');
  const skorMaks = f.skorBentuk && perBentuk ? bentukTerpilih.reduce((a, b) => a + (perBentuk[b] ?? 0) * (f.skorBentuk![b] ?? SKOR_BAWAAN[b]), 0) : null;

  // Daftar TP berubah: jumlah per TP dibagi ulang agar tetap sejajar baris TP.
  useEffect(() => {
    if (f.jumlahTp && f.jumlahTp.length !== daftarTp.length) ubah({ jumlahTp: daftarTp.length > 1 ? bagiRata(f.n, daftarTp.length) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTp.length]);
  const kataMateri = f.materi.trim() ? f.materi.trim().split(/\s+/).length : 0;
  const siapAi = kunci !== undefined && (kunci ?? []).some((k) => k.kunci && k.penyedia === profil.penyedia_utama) && !!profil.model_utama;
  const belumSiapAi = kunci !== undefined && !siapAi;
  const rumpun = rumpunDariMapel(f.mapel);
  const dicekOtomatis = !!paketUntuk(rumpun)?.pemeriksa;
  const batasModel = profil.penyedia_utama && profil.model_utama ? batasEfektif(profil, registri ?? null, profil.penyedia_utama, profil.model_utama) : null;
  const model = registri && profil.penyedia_utama && profil.model_utama ? modelDari(registri, profil.penyedia_utama, profil.model_utama) : undefined;
  const rencana = hitungRencana({
    n: f.n,
    rpm: batasModel?.rpm ?? null,
    rpd: batasModel?.rpd ?? null,
    terpakaiHariIni: terpakai ?? 0,
    adaCadangan: !!profil.model_cadangan,
    model,
    tokenRata: riwayat?.tokenRata ?? null,
    biayaHariIni: riwayat?.biayaHariIni ?? null,
    batasBiayaUsd: profil.batas_biaya_usd,
  });

  // Galat per isian: tampil setelah isian ditinggalkan atau setelah tombol Buat ditekan.
  const galatBidang: Record<BidangWajib, string | null> = {
    kelas: f.kelas ? null : 'Pilih kelas.',
    mapel: f.mapel.trim() ? null : 'Isi topik atau mata pelajaran.',
    jumlah: nSah ? null : `Ketik angka ${MIN_SOAL} sampai ${MAKS_SOAL}.`,
    'nama-preset': simpanPreset && !namaPreset.trim() ? 'Beri nama pengaturan tersimpan.' : null,
  };
  const tampilGalat = (b: BidangWajib) => ((tersentuh[b] || dicoba) && galatBidang[b]) || undefined;
  const galatLain = [
    daftarTp.length > MAKS_TP ? `Maksimal ${MAKS_TP} TP.` : null,
    !f.bentuk.length ? 'Pilih minimal satu bentuk soal di Pengaturan lanjutan.' : null,
    ...galatSusunan,
    kataMateri > MAKS_KATA_MATERI ? `Teks materi maksimal ${MAKS_KATA_MATERI} kata (sekarang ${kataMateri}).` : null,
  ].filter((x): x is string => !!x);
  const kurang = [!f.kelas && 'Pilih kelas', !f.mapel.trim() && 'Isi topik atau mapel', !nSah && `Ketik jumlah soal ${MIN_SOAL} sampai ${MAKS_SOAL}`].filter((x): x is string => !!x);

  async function simpanSebagaiPreset(param: ParameterPaket) {
    const t = sekarang();
    const sama = (preset ?? []).find((p) => p.nama.trim().toLowerCase() === namaPreset.trim().toLowerCase());
    const id = sama?.id ?? uuid();
    await db.preset.put({ id, nama: namaPreset.trim(), parameter_json: param, terakhir_dipakai: t, dibuat_pada: sama?.dibuat_pada ?? t, diubah_pada: t });
    setPresetId(id);
    return id;
  }

  /** Arahkan fokus ke isian wajib pertama yang belum sah. */
  function fokusGalatPertama() {
    const pertama = (['kelas', 'mapel', 'jumlah', 'nama-preset'] as const).find((b) => galatBidang[b]);
    if (pertama) document.getElementById(pertama)?.focus();
  }

  async function buat() {
    if (!siapAi) {
      navigasi('/pengaturan/ai');
      return;
    }
    setDicoba(true);
    setGalat(galatLain);
    if (Object.values(galatBidang).some(Boolean) || galatLain.length) {
      fokusGalatPertama();
      return;
    }
    if (pengatur.ambil().berjalan) {
      setGalat(['Paket lain sedang dibuat. Tunggu sampai selesai atau jeda dulu.']);
      return;
    }
    setMengirim(true);
    try {
      const hariIni = await jumlahLolosHariIni();
      if (hariIni + f.n > profil.batas_harian) pesan(`Perhatian: batas harian ${profil.batas_harian} soal; hari ini sudah ${hariIni}. Pembuatan akan dijeda saat batas tercapai.`);
      const param = keParameter(f);
      const idPreset = simpanPreset ? await simpanSebagaiPreset(param) : presetId;
      if (!simpanPreset && presetId) await db.preset.update(presetId, { terakhir_dipakai: sekarang() });
      const id = await buatPaket(param, judul || `${param.mapel} kelas ${param.kelas}`.slice(0, 80));
      if (simpanPreset && idPreset) {
        // Pengaturan tersimpan memakai id TP yang baru diberikan agar paket berikutnya merujuk TP yang sama.
        const paket = await db.paket_soal.get(id);
        if (paket) await db.preset.update(idPreset, { parameter_json: paket.parameter_json });
      }
      hapusDraf();
      setDrafSiap(false);
      navigasi(`/soal/${id}`);
      void pengatur.mulai(id);
    } catch (e) {
      setGalat([(e as Error).message]);
    } finally {
      setMengirim(false);
    }
  }

  async function hanyaSimpanPreset() {
    sentuh('nama-preset');
    const g = [...galatLain, ...(['kelas', 'mapel', 'jumlah'] as const).map((b) => galatBidang[b]).filter((x): x is string => !!x)];
    if (!namaPreset.trim()) {
      document.getElementById('nama-preset')?.focus();
      return;
    }
    setGalat(g);
    if (g.length) return;
    await simpanSebagaiPreset(keParameter(f));
    pesan('Pengaturan disimpan.');
  }

  const komposisiCepat = KOMPOSISI.find((k) => samaPersen(k.persen, f.persen));
  const nilaiKomposisi: NilaiKomposisi = aturSendiri || !komposisiCepat ? 'sendiri' : komposisiCepat.nilai;
  const nTampil = nSah ? Number(teksN) : f.n;
  const ringkasan = [f.kelas ? `Kelas ${f.kelas}` : 'Kelas belum dipilih', f.mapel.trim() || 'mapel belum diisi', `${nTampil} soal`].join(' · ');
  const labelUtama = !siapAi ? 'Pasang kunci AI dulu' : mengirim ? 'Menyiapkan…' : `Buat ${nTampil} soal`;

  const isiRencana = (
    <>
      <p className="text-base font-bold text-tinta tabular-nums">{ringkasan}</p>
      <p className="mt-1 text-base text-redup tabular-nums">
        {kuotaTampil[0]} mudah · {kuotaTampil[1]} sedang · {kuotaTampil[2]} sulit
      </p>
      <p className="text-base text-redup tabular-nums">{teksBentuk}</p>
      {skorMaks !== null ? <p className="text-base text-redup tabular-nums">Skor maksimal {skorMaks}</p> : null}
      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-garis pt-4 text-base tabular-nums">
        <dt className="text-redup">Permintaan AI</dt>
        <dd className="text-right font-semibold">
          {rencana.permintaanMin}–{rencana.permintaanMaks}
        </dd>
        {rencana.menit ? (
          <>
            <dt className="text-redup">Perkiraan waktu</dt>
            <dd className="text-right font-semibold">sekitar {rencana.menit} menit</dd>
          </>
        ) : null}
        {rencana.sisaKuota !== null ? (
          <>
            <dt className="text-redup">Sisa kuota hari ini</dt>
            <dd className="text-right font-semibold">
              {rencana.sisaKuota} dari {batasModel?.rpd}
            </dd>
          </>
        ) : null}
        {rencana.biayaMaks !== null ? (
          <>
            <dt className="text-redup">Perkiraan biaya</dt>
            <dd className="text-right font-semibold">{rencana.biayaMaks === 0 ? 'gratis' : `${formatBiaya(rencana.biayaMin)}–${formatBiaya(rencana.biayaMaks)}`}</dd>
          </>
        ) : null}
      </dl>
      {rencana.menit ? <p className="mt-2 text-base text-redup">Lebih lama karena batas {batasModel?.rpm} permintaan per menit; GenSoal memberi jeda sendiri.</p> : null}
      {f.mapel.trim() ? <p className="mt-3 text-base text-isi">{dicekOtomatis ? 'Kunci soal hitungan dicek otomatis.' : 'Kunci soal mapel ini tidak dicek otomatis.'}</p> : null}
      {kurang.length ? (
        <div className="mt-4">
          <p className="text-base font-bold text-tinta">Masih kurang:</p>
          <ul className="mt-1 list-disc pl-5 text-base text-isi">
            {kurang.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {rencana.kuotaKurang && !profil.model_cadangan ? (
        <Pemberitahuan nada="awas" className="mt-4">
          Sisa kuota AI hari ini {rencana.sisaKuota} permintaan, kurang dari {f.n} soal. Pembuatan akan dijeda di tengah. Kurangi jumlah soal atau pasang model cadangan di{' '}
          <Link to="/pengaturan/ai" className="font-bold underline">
            Pengaturan AI
          </Link>
          .
        </Pemberitahuan>
      ) : rencana.kuotaKurang ? (
        <p className="mt-3 text-base text-isi">Sisa kuota tidak cukup; sisanya dibuat dengan model cadangan.</p>
      ) : null}
      {rencana.lewatBatasBiaya ? (
        <Pemberitahuan nada="galat" className="mt-4">
          Perkiraan biaya hari ini akan melewati batas peringatan US${profil.batas_biaya_usd.toLocaleString('id-ID')} yang Anda atur di Pengaturan AI.
        </Pemberitahuan>
      ) : null}
      {galat.length ? (
        <Pemberitahuan nada="galat" className="mt-4">
          <ul className={galat.length > 1 ? 'list-disc pl-5' : ''}>
            {galat.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </Pemberitahuan>
      ) : null}
    </>
  );

  return (
    <div>
      <div className="mx-auto grid max-w-[1240px] gap-x-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 pb-10 pt-8 sm:pt-10 lg:pb-16">
          <KepalaHalaman judul="Buat soal" subjudul="Cukup isi kelas, mapel, dan jumlah soal. Sisanya sudah terisi otomatis." />

          {belumSiapAi ? (
            <Pemberitahuan nada="info" className="mt-6">
              Pasang kunci AI dulu agar GenSoal dapat membuat soal. Isian di bawah tetap tersimpan di perangkat ini.{' '}
              <Link to="/pengaturan/ai" className="font-bold underline">
                Buka Pengaturan AI
              </Link>
            </Pemberitahuan>
          ) : null}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            {preset && preset.length ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
                <PilihanDaftar
                  id="preset"
                  label="Pakai pengaturan tersimpan"
                  className="min-w-0 flex-1 sm:max-w-sm"
                  value={presetId ?? ''}
                  onChange={(e) => muatPreset(preset.find((p) => p.id === e.target.value) ?? null)}
                >
                  <option value="">Tidak (isian kosong)</option>
                  {preset.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </PilihanDaftar>
                {presetId ? (
                  <button
                    type="button"
                    className="min-h-12 px-2 text-base font-bold text-buruk hover:underline"
                    onClick={async () => {
                      const nama = preset.find((p) => p.id === presetId)?.nama ?? '';
                      if (!(await konfirmasi({ judul: `Hapus pengaturan tersimpan "${nama}"?`, pesan: 'Isian ini tidak lagi dapat dipilih. Paket soal yang sudah dibuat tidak terpengaruh.', aksi: 'Hapus pengaturan', bahaya: true }))) return;
                      await db.preset.delete(presetId);
                      muatPreset(null);
                    }}
                  >
                    Hapus pengaturan ini…
                  </button>
                ) : null}
              </div>
            ) : (
              <span />
            )}
            <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={kosongkan}>
              Kosongkan isian
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <Kartu aria-labelledby="judul-soal">
              <h2 id="judul-soal" className="text-[20px] font-extrabold text-judul">
                Soal yang dibuat
              </h2>
              <div className="mt-4 grid items-start gap-4 sm:grid-cols-[160px_minmax(0,1fr)_128px]">
                <PilihanDaftar id="kelas" label="Kelas" value={f.kelas} galat={tampilGalat('kelas')} onBlur={() => sentuh('kelas')} onChange={(e) => ubah({ kelas: Number(e.target.value) })}>
                  <option value={0} disabled>
                    Pilih kelas
                  </option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </PilihanDaftar>
                <IsianTeks
                  id="mapel"
                  label="Topik atau mata pelajaran"
                  list="daftar-mapel"
                  value={f.mapel}
                  galat={tampilGalat('mapel')}
                  onBlur={() => sentuh('mapel')}
                  onChange={(e) => ubah({ mapel: e.target.value })}
                  placeholder="mis. Matematika"
                  autoComplete="off"
                />
                <IsianAngka
                  id="jumlah"
                  label="Jumlah soal"
                  petunjuk={`${MIN_SOAL}–${MAKS_SOAL}`}
                  value={teksN}
                  galat={tampilGalat('jumlah')}
                  kelasIsian="text-center !text-[20px] font-extrabold text-judul"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const s = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setTeksN(s);
                    const n = Number(s);
                    if (s && n >= MIN_SOAL && n <= MAKS_SOAL) ubah({ n });
                  }}
                  onBlur={() => {
                    sentuh('jumlah');
                    if (!teksN.trim()) return;
                    const n = Math.max(MIN_SOAL, Math.min(MAKS_SOAL, Number(teksN) || f.n));
                    ubah({ n });
                    setTeksN(String(n));
                  }}
                />
              </div>
              <datalist id="daftar-mapel">
                {(mapelLama ?? []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Kartu>

            <Kartu aria-labelledby="judul-cp">
              <h2 id="judul-cp" className="text-[20px] font-extrabold text-judul">
                CP dan TP <span className="text-base font-semibold text-redup">(boleh kosong)</span>
              </h2>
              <IsianPanjang id="cp" label="Capaian pembelajaran (CP)" className="mt-4" rows={2} value={f.cp} onChange={(e) => ubah({ cp: e.target.value })} />
              <IsianPanjang
                id="tp"
                label="Tujuan pembelajaran (TP), satu TP satu baris"
                className="mt-5"
                rows={Math.min(10, Math.max(3, daftarTp.length + 1))}
                value={f.tpTeks}
                onChange={(e) => ubah({ tpTeks: e.target.value })}
                placeholder="Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya."
                petunjuk={daftarTp.length ? `${daftarTp.length} TP · jumlah soal dibagi ke tiap TP.` : f.cp.trim() ? 'Tanpa TP: soal dibuat dari CP.' : 'Tanpa CP dan TP: soal dibuat dari topik atau mapel.'}
              />
              {saranTp.length ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-base font-bold text-awas">Saran rumusan untuk {saranTp.length} TP (tidak wajib)</summary>
                  <ul className="mt-2 space-y-2 text-base leading-normal">
                    {saranTp.map(({ t, n }, i) => (
                      <li key={i}>
                        <span className="text-isi">{t}</span>
                        <span className="block text-redup">{n.alasan.join(' ')}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Kartu>

            <BagianLipat
              judul="Pengaturan lanjutan"
              ingat="buat-lanjutan"
              ringkasan={[
                f.sebaranLevel ? LEVEL.filter((l) => (f.sebaranLevel![l] ?? 0) > 0).map((l) => `${f.sebaranLevel![l]} ${l}`).join(' · ') : `${kuota[0]} mudah · ${kuota[1]} sedang · ${kuota[2]} sulit`,
                teksBentuk,
                f.opsiPg && adaPg ? `${f.opsiPg} opsi` : null,
                f.skorBentuk ? 'dengan skor' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            >
              <div className="space-y-8">
                <SubBagian judul="Susunan soal" ket="Bentuk, jumlah, dan tingkat kesukaran soal dalam paket.">
                  <div>
                    <PilihanBanyak label="Bentuk soal" nilai={f.bentuk} ubah={(bentuk) => ubah({ bentuk })} opsi={URUTAN_BENTUK.map((b) => ({ nilai: b, label: BENTUK_LABEL[b] }))} />
                    {!f.bentuk.length ? <p className="mt-2 text-base font-bold text-buruk">Pilih minimal satu bentuk soal.</p> : null}
                    {f.bentuk.includes('pilihan_ganda_kompleks') || f.bentuk.includes('menjodohkan') ? (
                      <p className="mt-2 text-base text-redup">
                        {[f.bentuk.includes('pilihan_ganda_kompleks') ? 'Pilihan ganda kompleks: jawaban benar lebih dari satu.' : null, f.bentuk.includes('menjodohkan') ? 'Menjodohkan: siswa menarik garis dari kolom kiri ke kolom kanan.' : null].filter(Boolean).join(' ')}
                      </p>
                    ) : null}
                    {f.bentuk.length ? (
                      <Sakelar
                        className="mt-3"
                        label="Atur jumlah per bentuk soal"
                        petunjuk={f.jumlahBentuk ? undefined : 'Bila mati, soal dibagi rata ke bentuk yang dipilih.'}
                        checked={!!f.jumlahBentuk}
                        ubah={(nyala) => ubah({ jumlahBentuk: nyala ? Object.fromEntries(bentukTerpilih.map((b, i) => [b, bagiRata(f.n, bentukTerpilih.length)[i]])) : null })}
                      />
                    ) : null}
                    {f.jumlahBentuk && f.bentuk.length ? (
                      <div className="mt-2 pl-8">
                        {bentukTerpilih.map((b) => (
                          <BarisJumlah key={b} id={`jumlah-${b}`} label={BENTUK_LABEL[b]} nilai={f.jumlahBentuk![b] ?? 0} ubah={(n) => ubah({ jumlahBentuk: { ...f.jumlahBentuk, [b]: n } })} />
                        ))}
                        <TotalJumlah
                          total={bentukTerpilih.reduce((a, b) => a + (f.jumlahBentuk![b] ?? 0), 0)}
                          n={f.n}
                          samakan={(n) => ubah({ n })}
                          labelBagi="Bagi rata"
                          bagi={() => ubah({ jumlahBentuk: Object.fromEntries(bentukTerpilih.map((b, i) => [b, bagiRata(f.n, bentukTerpilih.length)[i]])) })}
                        />
                      </div>
                    ) : null}
                    {f.bentuk.includes('benar_salah') ? (
                      <Pilihan
                        className="mt-4 sm:max-w-lg"
                        label="Cara menjawab benar-salah"
                        nilai={f.cara_bs}
                        ubah={(cara_bs) => ubah({ cara_bs })}
                        opsi={[
                          { nilai: 'centang', label: 'Centang kotak', keterangan: 'Benar / Salah' },
                          { nilai: 'lingkari', label: 'Lingkari', keterangan: 'B / S' },
                        ]}
                      />
                    ) : null}
                  </div>

                  <div>
                    {f.sebaranLevel ? null : (
                      <>
                        <Pilihan
                          label="Tingkat kesukaran"
                          nilai={nilaiKomposisi}
                          ubah={(v) => {
                            if (v === 'sendiri') return setAturSendiri(true);
                            setAturSendiri(false);
                            ubah({ persen: [...KOMPOSISI.find((k) => k.nilai === v)!.persen] });
                          }}
                          opsi={[...KOMPOSISI.map((k) => ({ nilai: k.nilai, label: k.label })), { nilai: 'sendiri' as const, label: 'Atur sendiri' }]}
                        />
                        <p className="mt-2 text-base text-redup tabular-nums">
                          {kuota[0]} mudah ({f.persen[0]}%) · {kuota[1]} sedang ({f.persen[1]}%) · {kuota[2]} sulit ({f.persen[2]}%).{' '}
                          {nilaiKomposisi === 'sendiri' ? 'Jumlah persen selalu 100%.' : KOMPOSISI.find((k) => k.nilai === nilaiKomposisi)?.akibat}
                        </p>
                        {nilaiKomposisi === 'sendiri' ? (
                          <div className="mt-2">
                            {(['Mudah', 'Sedang', 'Sulit'] as const).map((nama, i) => (
                              <div key={nama} className="flex items-center justify-between gap-3 border-b border-garis py-2 last:border-b-0">
                                <span className="text-base font-bold">{nama}</span>
                                <span className="flex items-center gap-2 sm:gap-3">
                                  <Langkah label={`Kurangi persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] - 5) })} disabled={f.persen[i] <= 0} />
                                  <span className="min-w-14 text-center text-[20px] font-extrabold tabular-nums" aria-live="polite">
                                    {f.persen[i]}%
                                  </span>
                                  <Langkah label={`Tambah persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] + 5) })} disabled={f.persen[i] >= 100} />
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                    <Sakelar
                      className={f.sebaranLevel ? '' : 'mt-3'}
                      label="Atur per level kognitif (C1–C6)"
                      petunjuk={f.sebaranLevel ? 'C1–C2 dihitung mudah, C3–C4 sedang, C5–C6 sulit.' : 'Tentukan sendiri jumlah soal tiap level, menggantikan tingkat kesukaran di atas.'}
                      checked={!!f.sebaranLevel}
                      ubah={(nyala) => ubah({ sebaranLevel: nyala ? levelDariPersen(f.n, f.persen) : null })}
                    />
                    {f.sebaranLevel ? (
                      <div className="mt-2 pl-8">
                        {LEVEL.map((l) => (
                          <BarisJumlah key={l} id={`level-${l}`} label={l} ket={NAMA_LEVEL[l]} nilai={f.sebaranLevel![l] ?? 0} ubah={(n) => ubah({ sebaranLevel: { ...f.sebaranLevel, [l]: n } })} />
                        ))}
                        <TotalJumlah
                          total={LEVEL.reduce((a, l) => a + (f.sebaranLevel![l] ?? 0), 0)}
                          n={f.n}
                          samakan={(n) => ubah({ n })}
                          labelBagi="Ambil dari tingkat kesukaran"
                          bagi={() => ubah({ sebaranLevel: levelDariPersen(f.n, f.persen) })}
                        />
                      </div>
                    ) : null}
                  </div>

                  {aturTp ? (
                    <div>
                      <Sakelar
                        label="Atur jumlah soal per TP"
                        petunjuk={f.jumlahTp ? undefined : `Bila mati, ${f.n} soal dibagi rata ke ${daftarTp.length} TP.`}
                        checked={!!f.jumlahTp}
                        ubah={(nyala) => ubah({ jumlahTp: nyala ? bagiRata(f.n, daftarTp.length) : null })}
                      />
                      {f.jumlahTp && f.jumlahTp.length === daftarTp.length ? (
                        <div className="mt-2 pl-8">
                          {daftarTp.map((t, i) => (
                            <BarisJumlah
                              key={i}
                              id={`jumlah-tp-${i}`}
                              label={`TP ${i + 1}`}
                              ket={<span className="line-clamp-2">{t}</span>}
                              nilai={f.jumlahTp![i] ?? 0}
                              ubah={(n) => ubah({ jumlahTp: f.jumlahTp!.map((x, j) => (j === i ? n : x)) })}
                            />
                          ))}
                          <TotalJumlah total={f.jumlahTp.reduce((a, b) => a + b, 0)} n={f.n} samakan={(n) => ubah({ n })} labelBagi="Bagi rata" bagi={() => ubah({ jumlahTp: bagiRata(f.n, daftarTp.length) })} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </SubBagian>

                <SubBagian judul="Isi soal" ket="Bahasa, gaya, gambar, opsi jawaban, dan skor.">
                  {adaPg ? (
                    <Pilihan
                      className="sm:max-w-xl"
                      label="Banyak opsi pilihan ganda"
                      nilai={f.opsiPg ? String(f.opsiPg) : 'otomatis'}
                      ubah={(v) => ubah({ opsiPg: v === 'otomatis' ? null : (Number(v) as 4 | 5) })}
                      opsi={[
                        { nilai: 'otomatis', label: 'Otomatis', keterangan: f.kelas ? `${f.kelas >= 10 ? 5 : 4} opsi` : 'Sesuai kelas' },
                        { nilai: '4', label: '4 opsi', keterangan: 'A–D' },
                        { nilai: '5', label: '5 opsi', keterangan: 'A–E' },
                      ]}
                    />
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <PilihanDaftar id="bahasa" label="Bahasa soal" value={f.bahasa} onChange={(e) => ubah({ bahasa: e.target.value as BahasaSoal })} petunjuk={f.bahasa === 'dwibahasa' ? 'Setiap soal ditulis dalam dua bahasa.' : undefined}>
                      <option value="id">Indonesia</option>
                      <option value="en">Inggris</option>
                      <option value="dwibahasa">Dwibahasa</option>
                    </PilihanDaftar>
                    <PilihanDaftar id="gaya" label="Gaya soal" value={f.gaya} onChange={(e) => ubah({ gaya: e.target.value as GayaSoal })}>
                      <option value="biasa">Biasa</option>
                      <option value="numerasi">Numerasi</option>
                      <option value="literasi">Literasi</option>
                      <option value="hots">HOTS</option>
                    </PilihanDaftar>
                    <PilihanDaftar id="gambar" label="Soal bergambar" value={f.gambar} onChange={(e) => ubah({ gambar: e.target.value as ModeGambar })} petunjuk={f.gambar === 'mati' ? undefined : 'Gambar dihitung dari isi soal, bukan ditebak AI.'}>
                      <option value="terprogram">Pakai gambar bila membantu</option>
                      <option value="campuran">Sesekali saja</option>
                      <option value="mati">Tanpa gambar</option>
                    </PilihanDaftar>
                  </div>

                  <div>
                    <Sakelar
                      label="Cantumkan skor per soal"
                      petunjuk={f.skorBentuk ? 'Skor tercetak di petunjuk tiap bagian, dan pedoman penskoran ikut berkas kunci jawaban.' : 'Skor tercetak di lembar soal dan pedoman penskoran di kunci jawaban.'}
                      checked={!!f.skorBentuk}
                      ubah={(nyala) => ubah({ skorBentuk: nyala ? Object.fromEntries(URUTAN_BENTUK.map((b) => [b, SKOR_BAWAAN[b]])) : null })}
                    />
                    {f.skorBentuk && f.bentuk.length ? (
                      <div className="mt-2 pl-8">
                        {bentukTerpilih.map((b) => (
                          <BarisJumlah
                            key={b}
                            id={`skor-${b}`}
                            label={BENTUK_LABEL[b]}
                            ket={perBentuk?.[b] ? `${perBentuk[b]} soal × ${f.skorBentuk![b] ?? SKOR_BAWAAN[b]} = ${(perBentuk[b] ?? 0) * (f.skorBentuk![b] ?? SKOR_BAWAAN[b])}` : undefined}
                            nilai={f.skorBentuk![b] ?? SKOR_BAWAAN[b]}
                            min={1}
                            maks={100}
                            ubah={(n) => ubah({ skorBentuk: { ...f.skorBentuk, [b]: n } })}
                          />
                        ))}
                        {skorMaks !== null ? <p className="mt-2 text-base font-bold text-tinta tabular-nums">Skor maksimal {skorMaks}{f.bentuk.includes('uraian') ? '. Rubrik uraian disusun sesuai skornya.' : '.'}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </SubBagian>

                <SubBagian judul="Materi dan judul">
                  <IsianPanjang
                    id="materi"
                    label={`Teks materi (boleh kosong · ${kataMateri}/${MAKS_KATA_MATERI} kata)`}
                    rows={3}
                    value={f.materi}
                    onChange={(e) => ubah({ materi: e.target.value })}
                    placeholder="Tempel bahan bacaan bila soal harus berdasar teks tertentu."
                    petunjuk="Teks ini dikirim ke penyedia AI pilihan Anda. Jangan menempel data siswa."
                    galat={kataMateri > MAKS_KATA_MATERI ? `Teks materi maksimal ${MAKS_KATA_MATERI} kata.` : undefined}
                  />

                  <IsianTeks
                    id="judul"
                    label="Judul paket"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="mis. Penilaian harian pecahan"
                    petunjuk={`Bila kosong: ${f.mapel.trim() ? `${f.mapel.trim()} kelas ${f.kelas || '…'}` : 'mapel dan kelas'}.`}
                  />
                </SubBagian>

                <div className="border-t border-garis pt-5">
                  <Sakelar label="Simpan pengaturan ini" petunjuk="Lain kali cukup pilih namanya di atas formulir." checked={simpanPreset} ubah={setSimpanPreset} />
                  {simpanPreset ? (
                    <div className="mt-3 flex flex-wrap items-start gap-3 pl-8">
                      <IsianTeks
                        id="nama-preset"
                        label="Nama pengaturan tersimpan"
                        className="min-w-0 flex-1 sm:max-w-xs"
                        value={namaPreset}
                        galat={tampilGalat('nama-preset')}
                        onBlur={() => sentuh('nama-preset')}
                        onChange={(e) => setNamaPreset(e.target.value)}
                        placeholder={`${f.mapel || 'Mapel'} K${f.kelas || ''}`}
                      />
                      <Tombol varian="hantu" className="sm:mt-9" onClick={hanyaSimpanPreset}>
                        Simpan tanpa membuat soal
                      </Tombol>
                    </div>
                  ) : null}
                </div>
              </div>
            </BagianLipat>
          </div>
        </div>

        <aside aria-label="Rencana" className="hidden pb-16 pt-10 lg:block">
          <Kartu pita="kuning" className="sticky top-[calc(var(--tinggi-kepala,76px)+1.5rem)]">
            <h2 className="text-[20px] font-extrabold text-judul">Rencana</h2>
            <div className="mt-3">{isiRencana}</div>
            <Tombol ukuran="besar" className="mt-5 w-full" onClick={buat} disabled={mengirim}>
              {labelUtama} <Panah />
            </Tombol>
            <Tombol varian="bahaya" className="mt-3 w-full" onClick={() => navigasi('/')}>
              Batal
            </Tombol>
          </Kartu>
        </aside>
      </div>

      {/* Ponsel dan tablet: ringkasan rencana yang dapat dibuka, dengan tombol utama selalu terlihat. */}
      <div className="tanpa-cetak sticky bottom-0 z-10 border-t border-garis bg-kartu shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
        {rincianHp ? (
          <div id="rincian-rencana" className="max-h-[50vh] overflow-auto border-b border-garis px-4 py-3 sm:px-8">
            {isiRencana}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 px-4 pt-2 sm:px-8">
          <span className="min-w-0 truncate text-base text-redup tabular-nums">{ringkasan}</span>
          <button type="button" className="shrink-0 text-base font-bold text-utama hover:underline" aria-expanded={rincianHp} aria-controls="rincian-rencana" onClick={() => setRincianHp((b) => !b)}>
            {rincianHp ? 'Tutup rincian' : 'Rincian'}
          </button>
        </div>
        <div className="flex gap-3 px-4 pb-3 pt-2 sm:px-8">
          <Tombol varian="bahaya" onClick={() => navigasi('/')} className="flex-1">
            Batal
          </Tombol>
          <Tombol ukuran="besar" onClick={buat} disabled={mengirim} className="flex-[2]">
            {labelUtama} <Panah />
          </Tombol>
        </div>
      </div>
    </div>
  );
}
