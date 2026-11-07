import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Bentuk, ParameterPaket, Preset } from '../db/tipe';
import { GAYA, GAYA_LABEL } from '../db/tipe';
import { sekarang, tanggalLokal, uuid } from '../db/util';
import { buatPaket, jumlahLolosHariIni, pengatur } from '../generasi/pengatur';
import { rencanakanSlot, ringkasBentuk } from '../generasi/rencana';
import { nilaiTp } from '../kurikulum/pemeriksa-tp';
import { paketUntuk, rumpunDariMapel } from '../paket';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { usePesan } from '../komponen/Pesan';
import { IsianAngka, IsianPanjang, IsianTeks, Pemberitahuan, PilihanDaftar } from '../komponen/Formulir';
import { Kartu } from '../komponen/Status';
import { Panah, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { batasEfektif, permintaanHariIni } from '../ai/laju';
import { modelDari } from '../ai/registri';
import { bacaDraf, bagiRata, hapusDraf, hitungRencana, MAKS_SOAL, MIN_SOAL, simpanDraf, SKOR_BAWAAN } from './rencana-buat';
import { formatBiaya } from './ringkas';
import { cakupanFormat } from '../ujian/cakupan';
import { FORMAT_UJIAN, formatUjian, KELUARGA_LABEL, ringkasUjian, type KeluargaUjian } from '../ujian';
import { barisTp, bentukIsian, cakupanIsian, galatKartu, isianDariParameter, isianDariUjian, isianKosong, keParameter, kuotaKesukaran, masukanRencana, ubahJumlah, type Isian } from './isian-buat';
import OpsiLanjutanBuat from './OpsiLanjutanBuat';

const MAKS_TP = 500;
const MAKS_KATA_MATERI = 3000;
const KELUARGA: KeluargaUjian[] = ['TKA', 'TKAD', 'OSN'];

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

  const ujianKini = formatUjian(f.ujian?.id);
  const cakupan = cakupanFormat(f.ujian?.id);
  const judulBawaan = ujianKini ? `Latihan ${ujianKini.mapel ? ujianKini.nama : `${ujianKini.nama.replace(' · Mapel pilihan', '')} · ${f.mapel.trim() || 'mapel pilihan'}`}` : `${f.mapel.trim()} kelas ${f.kelas || '…'}`;

  function pakaiUjian(id: string) {
    setF((x) => (id ? isianDariUjian(x, id) : { ...x, ujian: null }));
  }

  const daftarTp = useMemo(() => barisTp(f.tpTeks), [f.tpTeks]);
  const saranTp = useMemo(() => daftarTp.map((t) => ({ t, n: nilaiTp(t) })).filter((x) => x.n.nilai !== 'baik'), [daftarTp]);
  const rencanaMasuk = masukanRencana(f);
  const kartuGalat = galatKartu(f);
  const dipakai = bentukIsian(f);
  // Banyak soal per bentuk menurut rencana, untuk skor maksimal. Kosong bila susunan belum sah.
  const perBentuk = useMemo(() => {
    try {
      return rencanakanSlot(rencanaMasuk).reduce<Partial<Record<Bentuk, number>>>((a, x) => ({ ...a, [x.bentuk]: (a[x.bentuk] ?? 0) + 1 }), {});
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rencanaMasuk)]);
  const kuotaTampil = kuotaKesukaran(f);
  const teksBentuk = f.rincian ? ringkasBentuk({ bentuk: f.bentuk, rincian: f.rincian }) : ringkasBentuk({ bentuk: rencanaMasuk.bentuk, jumlah_bentuk: rencanaMasuk.jumlah_bentuk });
  const skorMaks = f.skorKesukaran
    ? kuotaTampil[0] * f.skorKesukaran.mudah.benar + kuotaTampil[1] * f.skorKesukaran.sedang.benar + kuotaTampil[2] * f.skorKesukaran.sulit.benar
    : f.skorBentuk && perBentuk
      ? dipakai.reduce((a, b) => a + (perBentuk[b] ?? 0) * (f.skorBentuk![b] ?? SKOR_BAWAAN[b]), 0)
      : null;
  const teksGaya = f.jumlahGaya ? GAYA.filter((g) => (f.jumlahGaya![g] ?? 0) > 0).map((g) => `${f.jumlahGaya![g]} ${GAYA_LABEL[g].toLowerCase()}`).join(' · ') : null;

  // Daftar TP berubah: jumlah per TP dibagi ulang agar tetap sejajar baris TP.
  useEffect(() => {
    if (f.jumlahTp && f.jumlahTp.length !== daftarTp.length) ubah({ jumlahTp: daftarTp.length > 1 ? bagiRata(f.n, daftarTp.length) : null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daftarTp.length]);
  const kataMateri = f.materi.trim() ? f.materi.trim().split(/\s+/).length : 0;
  const galatMateri = kataMateri > MAKS_KATA_MATERI;
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
  // Opsi lanjutan dibuka sendiri bila tombol Buat ditekan saat ada isian di dalamnya yang perlu diperbaiki.
  const galatOpsi = [...kartuGalat.susunan, ...kartuGalat.kesukaran, ...kartuGalat.rincianBentuk, ...kartuGalat.gaya];
  const bukaKarenaGalat = (dicoba && (galatOpsi.length > 0 || galatMateri)) || !!tampilGalat('nama-preset');
  const galatLain = [
    daftarTp.length > MAKS_TP ? `Maksimal ${MAKS_TP} TP.` : null,
    ...galatOpsi.map((g) => (g === 'Pilih minimal satu bentuk soal.' ? 'Pilih minimal satu bentuk soal di opsi lanjutan.' : g)),
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
    // Nama pengaturan tersimpan bisa berada di kartu yang baru dibuka, jadi fokus menunggu kartu tampil.
    if (pertama) setTimeout(() => document.getElementById(pertama)?.focus(), 50);
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
      const id = await buatPaket(param, (judul.trim() || judulBawaan).slice(0, 80));
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

  const nTampil = nSah ? Number(teksN) : f.n;
  const ringkasan = [f.kelas ? `Kelas ${f.kelas}` : 'Kelas belum dipilih', f.mapel.trim() || 'mapel belum diisi', `${nTampil} soal`].join(' · ');
  const labelUtama = !siapAi ? 'Pasang kunci AI dulu' : mengirim ? 'Menyiapkan…' : `Buat ${nTampil} soal`;

  const isiRencana = (
    <>
      <p className="text-base font-bold text-tinta tabular-nums">{ringkasan}</p>
      {ujianKini ? <p className="mt-1 text-base text-isi">Format {ujianKini.nama}</p> : null}
      <p className="mt-1 text-base text-redup tabular-nums">
        {kuotaTampil[0]} mudah · {kuotaTampil[1]} sedang · {kuotaTampil[2]} sulit
      </p>
      <p className="text-base text-redup tabular-nums">{teksBentuk}</p>
      {teksGaya ? <p className="text-base text-redup tabular-nums">Gaya: {teksGaya}</p> : null}
      {f.durasi ? <p className="text-base text-redup tabular-nums">Waktu {f.durasi} menit</p> : null}
      {f.wajibStimulus ? <p className="text-base text-redup">{f.soalPerBacaan ? `Satu bacaan untuk ${f.soalPerBacaan} soal` : 'Setiap soal diawali cerita'}</p> : f.soalPerBacaan ? <p className="text-base text-redup">Satu bacaan untuk {f.soalPerBacaan} soal</p> : null}
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
              <div className={`mt-4 grid items-start gap-4 ${ujianKini?.keluarga === 'TKAD' ? 'sm:grid-cols-2' : 'sm:max-w-md'}`}>
                <PilihanDaftar id="ujian" label="Format ujian (boleh kosong)" value={ujianKini?.id ?? ''} onChange={(e) => pakaiUjian(e.target.value)}>
                  <option value="">Soal biasa</option>
                  {KELUARGA.map((k) => (
                    <optgroup key={k} label={KELUARGA_LABEL[k]}>
                      {FORMAT_UJIAN.filter((u) => u.keluarga === k).map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nama}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </PilihanDaftar>
                {ujianKini?.keluarga === 'TKAD' ? (
                  <IsianTeks
                    id="daerah"
                    label="Daerah (untuk soal bernuansa lokal)"
                    value={f.ujian?.daerah ?? ''}
                    onChange={(e) => ubah({ ujian: { id: ujianKini.id, daerah: e.target.value } })}
                    placeholder="mis. Kabupaten Tegal"
                    autoComplete="off"
                  />
                ) : null}
              </div>
              {ujianKini ? (
                <Pemberitahuan nada="info" className="mt-4">
                  <p>
                    <span className="font-bold">{ujianKini.nama}.</span> {ringkasUjian(ujianKini)} {ujianKini.bentukResmi}
                  </p>
                  <p className="mt-1">Penilaian: {ujianKini.penilaian}</p>
                  <p className="mt-1">
                    {[
                      'Kelas, jumlah soal, bentuk soal, dan level sudah disesuaikan; semuanya masih bisa diubah.',
                      cakupan ? `Bila CP dan TP dikosongkan, soal disebar ke ${cakupan.butir.length} butir cakupan materi ujian ini.` : null,
                      f.wajibStimulus ? 'Setiap soal diawali cerita atau bacaan dengan tema dan tokoh yang berbeda-beda.' : null,
                      !ujianKini.mapel ? 'Isi mapel pilihan pada kolom mapel.' : null,
                      ujianKini.asli.soal && ujianKini.asli.soal > MAKS_SOAL ? `Satu paket paling banyak ${MAKS_SOAL} soal; buat dua paket untuk ${ujianKini.asli.soal} soal.` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                </Pemberitahuan>
              ) : null}
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
                    if (s && n >= MIN_SOAL && n <= MAKS_SOAL) setF((x) => ubahJumlah(x, n));
                  }}
                  onBlur={() => {
                    sentuh('jumlah');
                    if (!teksN.trim()) return;
                    const n = Math.max(MIN_SOAL, Math.min(MAKS_SOAL, Number(teksN) || f.n));
                    setF((x) => ubahJumlah(x, n));
                    setTeksN(String(n));
                  }}
                />
              </div>
              <datalist id="daftar-mapel">
                {[...new Set([...(ujianKini?.saranMapel ?? []), ...(mapelLama ?? [])])].map((m) => (
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
                petunjuk={
                  daftarTp.length
                    ? `${daftarTp.length} TP · jumlah soal dibagi ke tiap TP.`
                    : f.cp.trim()
                      ? 'Tanpa TP: soal dibuat dari CP.'
                      : cakupanIsian(f) && ujianKini
                        ? `Tanpa CP dan TP: soal disebar ke cakupan materi ${ujianKini.nama} (elemen dan butirnya tercatat di kisi-kisi).`
                        : 'Tanpa CP dan TP: soal dibuat dari topik atau mapel.'
                }
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

            <OpsiLanjutanBuat
              f={f}
              ubah={ubah}
              ubahN={(n) => setF((x) => ubahJumlah(x, n))}
              galat={kartuGalat}
              dicoba={dicoba}
              paksaBuka={bukaKarenaGalat}
              perBentuk={perBentuk}
              skorMaks={skorMaks}
              ujianKini={ujianKini}
              cakupan={cakupanIsian(f)}
              kataMateri={kataMateri}
              maksKataMateri={MAKS_KATA_MATERI}
              judul={judul}
              setJudul={setJudul}
              judulBawaan={ujianKini || f.mapel.trim() ? judulBawaan : 'mapel dan kelas'}
              simpanPreset={simpanPreset}
              setSimpanPreset={setSimpanPreset}
              namaPreset={namaPreset}
              setNamaPreset={setNamaPreset}
              galatNamaPreset={tampilGalat('nama-preset')}
              sentuhNamaPreset={() => sentuh('nama-preset')}
              hanyaSimpanPreset={hanyaSimpanPreset}
            />
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
