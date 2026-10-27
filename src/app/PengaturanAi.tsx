import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { adaptorUntuk } from '../ai';
import { batasEfektif, kunciModel, permintaanHariIni } from '../ai/laju';
import { GalatAi } from '../ai/galat';
import { gabungModel, penyediaDari, type BarisModel, type JenisModel } from '../ai/registri';
import type { PenyediaRegistri, StatusModel } from '../ai/tipe';
import { db } from '../db/skema';
import { simpanProfil } from '../db/profil';
import type { KunciApi, PenyediaId } from '../db/tipe';
import { tanggalLokal } from '../db/util';
import { BANTUAN } from '../bantuan/daftar';
import { BagianLipat, IsianAngka, Pemberitahuan, PilihanDaftar } from '../komponen/Formulir';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { usePesan } from '../komponen/Pesan';
import { BarisBahaya, Kartu, Label, ZonaBerbahaya } from '../komponen/Status';
import { Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { formatBiaya } from './ringkas';

const LABEL_STATUS: Record<StatusModel, string> = { direkomendasikan: 'direkomendasikan', stabil: 'stabil', pratinjau: 'pratinjau', usang: 'usang' };

/** Kelompok di daftar "Semua model": model teks disarankan, model teks lain, lalu jenis yang tidak dipakai. */
const KELOMPOK: { judul: string; ket: string; cocok: (m: BarisModel) => boolean }[] = [
  { judul: 'Teks · disarankan', ket: 'Dipakai untuk menulis soal.', cocok: (m) => m.disarankan },
  { judul: 'Teks · lainnya', ket: 'Dapat dipilih lewat "Tampilkan model lain", tetapi belum diuji untuk membuat soal.', cocok: (m) => !m.disarankan && m.jenis === 'teks' },
  ...(
    [
      ['gambar', 'Gambar dan video', 'Tidak dipakai. Gambar soal dibuat GenSoal sendiri.'],
      ['suara', 'Suara', 'Tidak dipakai.'],
      ['lain', 'Lainnya', 'Untuk pencarian, penyaringan, dan keperluan lain. Tidak dipakai.'],
    ] as [JenisModel, string, string][]
  ).map(([jenis, judul, ket]) => ({ judul, ket, cocok: (m: BarisModel) => m.jenis === jenis })),
];

function modelTersedia(p: PenyediaRegistri, k: KunciApi | undefined): BarisModel[] {
  if (k?.status !== 'berfungsi') return [];
  return gabungModel(p, k.model_tersedia.map((id) => ({ id, nama: id }))).filter((m) => m.tersedia);
}

function Langkah({ nomor, judul, children, redup = false }: { nomor: number; judul: string; children: ReactNode; redup?: boolean }) {
  return (
    <Kartu className={redup ? 'opacity-60' : ''}>
      <h2 className="text-[20px] font-extrabold text-judul">
        <span className="text-utama">{nomor}.</span> {judul}
      </h2>
      <div className="mt-4">{children}</div>
    </Kartu>
  );
}

export default function PengaturanAi() {
  useJudulHalaman('Pengaturan AI');
  const { data: reg, galat: galatReg } = useRegistri();
  const profil = useProfil();
  const pesan = usePesan();
  const konfirmasi = useKonfirmasi();
  const daftarKunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const pemakaian = useLiveQuery(() => db.pemakaian_ai.where('tanggal').equals(tanggalLokal()).toArray(), []);
  const [pilih, setPilih] = useState<PenyediaId | null>(null);
  const [teksKunci, setTeksKunci] = useState('');
  const [lihat, setLihat] = useState(false);
  const [menguji, setMenguji] = useState(false);
  const [gantiKunci, setGantiKunci] = useState(false);
  const [lihatLain, setLihatLain] = useState(false);
  const aktif: PenyediaId = pilih ?? profil.penyedia_utama ?? 'gemini';
  const kunci = daftarKunci?.find((k) => k.penyedia === aktif);
  const modelDipilih = profil.penyedia_utama === aktif ? profil.model_utama ?? '' : '';
  const terpakaiHariIni = useLiveQuery(() => (modelDipilih ? permintaanHariIni(aktif, modelDipilih) : Promise.resolve(0)), [aktif, modelDipilih]);

  useEffect(() => {
    setTeksKunci(kunci?.kunci ?? '');
    setLihat(false);
  }, [aktif, kunci?.kunci]);

  if (galatReg) return <div className="px-4 py-20 sm:px-16">Registri model tidak dapat dimuat: {galatReg}</div>;
  if (!reg) return <div className="px-4 py-20 text-center text-redup">Memuat…</div>;

  const p = penyediaDari(reg, aktif)!;
  const tersedia = modelTersedia(p, kunci);
  const semuaModel = gabungModel(p, kunci?.status === 'berfungsi' ? kunci.model_tersedia.map((id) => ({ id, nama: id })) : null);
  const disarankan = tersedia.filter((m) => m.disarankan);
  const teksLain = tersedia.filter((m) => !m.disarankan && m.jenis === 'teks');
  const dipilihLain = teksLain.some((m) => m.id === modelDipilih);
  // Tanpa model disarankan (penyedia hanya mengirim model yang belum dikenal), model lain langsung tampil.
  const tampilLain = lihatLain || dipilihLain || !disarankan.length;
  const siap = !!(profil.penyedia_utama && profil.model_utama && daftarKunci?.some((k) => k.penyedia === profil.penyedia_utama && k.status === 'berfungsi'));
  const namaUtama = profil.penyedia_utama ? penyediaDari(reg, profil.penyedia_utama) : undefined;
  const labelUtama = namaUtama?.model.find((m) => m.id === profil.model_utama)?.label ?? profil.model_utama;
  const batas = modelDipilih ? batasEfektif(profil, reg, aktif, modelDipilih) : null;
  const ubahBatas = (u: Partial<{ rpm: number | null; rpd: number | null }>) => {
    if (!modelDipilih || !batas) return;
    void simpanProfil({ batas_model: { ...profil.batas_model, [kunciModel(aktif, modelDipilih)]: { ...batas, ...u } } });
  };

  // Model cadangan boleh dari penyedia mana pun yang kuncinya berfungsi.
  // Hanya model disarankan, ditambah pilihan tersimpan bila dulu memilih model lain.
  const pilihanCadangan = reg.penyedia.flatMap((x) =>
    modelTersedia(x, daftarKunci?.find((k) => k.penyedia === x.id))
      .filter((m) => m.disarankan || (profil.penyedia_cadangan === x.id && profil.model_cadangan === m.id))
      .map((m) => ({ penyedia: x, m })),
  );

  async function simpanDanUji() {
    const k = teksKunci.trim();
    if (!k) return;
    setMenguji(true);
    await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: null, status: 'belum', pesan: '', model_tersedia: [] });
    try {
      const model = await adaptorUntuk(aktif).daftarModel(k);
      await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: Date.now(), status: 'berfungsi', pesan: `Kunci berfungsi · ${model.length} model tersedia`, model_tersedia: model.map((m) => m.id) });
      // Pilih model terbaik secara otomatis bila belum ada model utama di penyedia ini.
      if (profil.penyedia_utama !== aktif || !profil.model_utama) {
        const saran = gabungModel(p, model).find((m) => m.tersedia && m.disarankan);
        if (saran) await simpanProfil({ penyedia_utama: aktif, model_utama: saran.id });
      }
      pesan('Kunci berfungsi. GenSoal siap dipakai.');
      setGantiKunci(false);
      setPilih(null);
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: Date.now(), status: 'gagal', pesan: g.message, model_tersedia: [] });
    } finally {
      setMenguji(false);
    }
  }

  async function hapusKunci() {
    if (!(await konfirmasi({ judul: `Hapus kunci ${p.nama}?`, pesan: `Kunci dihapus dari peramban ini. GenSoal tidak dapat membuat soal dengan ${p.nama} sampai kuncinya dipasang lagi.`, aksi: 'Hapus kunci', bahaya: true }))) return;
    await db.kunci_api.delete(aktif);
    if (profil.penyedia_utama === aktif) await simpanProfil({ penyedia_utama: null, model_utama: null });
    if (profil.penyedia_cadangan === aktif) await simpanProfil({ penyedia_cadangan: null, model_cadangan: null });
  }

  const lolosHariIni = pemakaian?.filter((x) => x.lolos).length ?? 0;
  const biayaHariIni = (pemakaian ?? []).reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
  const lewatBatasBiaya = biayaHariIni !== null && biayaHariIni > profil.batas_biaya_usd;

  const ringkas = siap && !gantiKunci;
  const opsiModel = (m: BarisModel) => (
    <option key={m.id} value={m.id}>
      {m.label}
      {m.registri && m.status !== 'stabil' ? ` (${LABEL_STATUS[m.status]})` : ''}
      {m.registri?.catatan ? ` · ${m.registri.catatan}` : ''}
    </option>
  );
  const pilihModel = (
    <div>
      <PilihanDaftar id="model-utama" label="Model yang dipakai" petunjuk="Pilihan pertama biasanya sudah tepat. Setiap soal tetap dihitung ulang oleh GenSoal, model mana pun yang dipakai." value={modelDipilih} onChange={(e) => simpanProfil({ penyedia_utama: aktif, model_utama: e.target.value })}>
        {!modelDipilih ? <option value="">Pilih model…</option> : null}
        {tampilLain ? (
          <>
            {disarankan.length ? <optgroup label="Disarankan">{disarankan.map(opsiModel)}</optgroup> : null}
            <optgroup label="Model teks lain (belum diuji)">{teksLain.map(opsiModel)}</optgroup>
          </>
        ) : (
          disarankan.map(opsiModel)
        )}
      </PilihanDaftar>
      {dipilihLain ? (
        <Pemberitahuan nada="awas" className="mt-3">
          Model ini belum diuji untuk membuat soal. Soalnya bisa kurang sesuai TP; pilih model yang disarankan bila hasilnya kurang baik.
        </Pemberitahuan>
      ) : null}
      {teksLain.length && disarankan.length && !dipilihLain ? (
        <button type="button" className="mt-2 min-h-11 text-base font-bold text-utama hover:underline" aria-expanded={lihatLain} aria-controls="model-utama" onClick={() => setLihatLain((l) => !l)}>
          {lihatLain ? 'Sembunyikan model lain' : `Tampilkan model lain (${teksLain.length})`}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="mx-auto max-w-[800px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman
        judul="Pengaturan AI"
        subjudul={ringkas ? 'GenSoal sudah terhubung ke penyedia AI. Kunci hanya tersimpan di peramban ini.' : 'Tempel kunci API dari satu penyedia AI, lalu GenSoal siap membuat soal. Kunci hanya tersimpan di peramban ini dan tidak ikut berkas cadangan.'}
      />

      <div className="mt-6 space-y-6">
        {ringkas ? (
          <Kartu pita="baik" aria-label="Penyedia AI">
            <Pemberitahuan nada="berhasil">
              Siap dipakai · <strong className="font-bold">{namaUtama?.nama}</strong>
            </Pemberitahuan>
            <div className="mt-5">{pilihModel}</div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Tombol varian="garis" onClick={() => setGantiKunci(true)}>
                Ganti penyedia atau kunci
              </Tombol>
            </div>
            <p className="mt-4 text-base leading-relaxed text-redup">
              {p.peringatan_biaya} {p.peringatan_privasi}
            </p>
          </Kartu>
        ) : (
          <>
            {!siap ? (
              <Pemberitahuan nada="awas">Belum siap. Ikuti tiga langkah di bawah.</Pemberitahuan>
            ) : (
              <button type="button" className="min-h-11 text-base font-bold text-utama hover:underline" onClick={() => { setGantiKunci(false); setPilih(null); }}>
                ← Kembali tanpa mengganti
              </button>
            )}
            <Langkah nomor={1} judul="Pilih penyedia">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {reg.penyedia.map((x) => {
                  const k = daftarKunci?.find((y) => y.penyedia === x.id);
                  const dipilih = aktif === x.id;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setPilih(x.id)}
                      aria-pressed={dipilih}
                      className={`flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-lg border px-4 py-2 text-left transition-colors ${dipilih ? 'border-utama-isi bg-utama-isi text-di-tinta' : 'border-garis-kuat bg-kartu hover:border-utama'}`}
                    >
                      <span className="text-[17px] font-bold">{x.nama}</span>
                      <span className={`text-base ${dipilih ? '' : 'text-redup'}`}>
                        {x.tingkat_gratis ? 'Gratis' : 'Berbayar'}
                        {k?.status === 'berfungsi' ? ' · kunci ✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-base text-redup">Baru mulai? Google Gemini gratis tanpa kartu kredit.</p>
            </Langkah>

            <Langkah nomor={2} judul={`Tempel kunci ${p.nama}`}>
              <p className="text-base text-isi">
                Belum punya kunci? Buat di{' '}
                <a href={p.situs_kunci} target="_blank" rel="noreferrer noopener" className="font-bold text-utama underline">
                  {new URL(p.situs_kunci).host}
                </a>
                , salin, lalu tempel di sini.
              </p>
              <Label htmlFor="kunci" className="mt-4">
                Kunci API
              </Label>
              <div className="mt-2 flex flex-wrap gap-3">
                <div className="relative min-w-0 flex-1 basis-64">
                  <input
                    id="kunci"
                    type={lihat ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={teksKunci}
                    onChange={(e) => setTeksKunci(e.target.value)}
                    placeholder={p.awalan_kunci ? `${p.awalan_kunci}…` : 'Tempel kunci di sini'}
                    aria-invalid={kunci?.status === 'gagal' ? true : undefined}
                    aria-describedby={kunci && kunci.status !== 'belum' ? 'kunci-hasil' : undefined}
                    className={`bidang !pr-24 font-mono text-base ${kunci?.status === 'gagal' ? '!border-buruk' : ''}`}
                  />
                  <button type="button" onClick={() => setLihat((l) => !l)} aria-pressed={lihat} className="absolute inset-y-0 right-0 px-4 font-bold text-utama hover:underline">
                    {lihat ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
                <Tombol onClick={simpanDanUji} disabled={menguji || !teksKunci.trim()} className="w-full sm:w-auto">
                  {menguji ? 'Menguji…' : 'Simpan dan uji'}
                </Tombol>
              </div>
              {kunci && kunci.status !== 'belum' && !menguji ? (
                <div id="kunci-hasil" className="mt-4">
                  {kunci.status === 'berfungsi' ? <Pemberitahuan nada="berhasil">Kunci berfungsi · {disarankan.length ? `${disarankan.length} model disarankan` : `${teksLain.length} model tersedia`}.</Pemberitahuan> : <Pemberitahuan nada="galat">{kunci.pesan}</Pemberitahuan>}
                </div>
              ) : null}
              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer py-2 text-base font-bold text-utama">Cara mendapatkan kunci</summary>
                <ol className="mt-2 list-decimal pl-5 text-base leading-[1.7] text-isi">
                  {BANTUAN['kunci-api'].langkah.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ol>
              </details>
              <p className="mt-4 text-base leading-relaxed text-redup">
                {p.peringatan_biaya} {p.peringatan_privasi}
              </p>
            </Langkah>

            <Langkah nomor={3} judul="Pilih model" redup={!tersedia.length}>
              {tersedia.length ? pilihModel : <p className="text-base text-isi">Model muncul setelah kunci berfungsi.</p>}
            </Langkah>
          </>
        )}

        <BagianLipat judul="Pengaturan lanjutan" ringkasan="Model cadangan, batas pemakaian, dan batas harian." ingat="ai-lanjutan">
          <div className="space-y-8">
            {tersedia.length ? (
              <PilihanDaftar
                id="model-cadangan"
                label="Model cadangan (opsional)"
                petunjuk="Dipakai otomatis bila kuota harian model utama habis di tengah pembuatan. Paling aman memilih penyedia lain, mis. Groq atau OpenRouter yang juga gratis."
                value={profil.penyedia_cadangan && profil.model_cadangan ? `${profil.penyedia_cadangan}|${profil.model_cadangan}` : ''}
                onChange={(e) => {
                  const [penyedia, ...model] = e.target.value.split('|');
                  void simpanProfil(e.target.value ? { penyedia_cadangan: penyedia as PenyediaId, model_cadangan: model.join('|') } : { penyedia_cadangan: null, model_cadangan: null });
                }}
              >
                <option value="">Tidak ada</option>
                {pilihanCadangan.map(({ penyedia, m }) => (
                  <option key={`${penyedia.id}|${m.id}`} value={`${penyedia.id}|${m.id}`}>
                    {penyedia.nama} · {m.label}
                  </option>
                ))}
              </PilihanDaftar>
            ) : null}

            {batas ? (
              <fieldset>
                <legend className="text-base font-bold text-tinta">Batas pemakaian {labelUtama && modelDipilih === profil.model_utama ? labelUtama : 'model ini'}</legend>
                <p className="mt-1 text-base text-redup">
                  Samakan dengan angka di dasbor penyedia{aktif === 'gemini' ? ' (aistudio.google.com → Usage and billing)' : ''}. GenSoal menunggu sendiri agar tidak melewatinya.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <IsianAngkaSimpan id="rpm" label="Per menit (RPM)" petunjuk="Kosongkan bila tidak dibatasi." nilai={batas.rpm} bolehKosong simpan={(rpm) => ubahBatas({ rpm })} />
                  <IsianAngkaSimpan
                    id="rpd"
                    label="Per hari (RPD)"
                    petunjuk={<span className="tabular-nums">Terpakai hari ini: {terpakaiHariIni ?? 0}{batas.rpd ? ` dari ${batas.rpd}` : ''} permintaan.</span>}
                    nilai={batas.rpd}
                    bolehKosong
                    simpan={(rpd) => ubahBatas({ rpd })}
                  />
                </div>
              </fieldset>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <IsianAngkaSimpan id="batas" label="Batas harian soal" petunjuk="Pembuatan dijeda setelah sebanyak ini soal lolos dalam sehari." nilai={profil.batas_harian} simpan={(n) => simpanProfil({ batas_harian: Math.min(5000, n ?? 1) })} />
              <IsianAngkaSimpan id="biaya" label="Peringatan biaya harian (US$)" petunjuk="Hanya peringatan di layar Buat; pembuatan tidak dihentikan." nilai={profil.batas_biaya_usd} desimal simpan={(n) => simpanProfil({ batas_biaya_usd: n ?? 0 })} />
            </div>
            <div>
              <p className="text-base text-redup tabular-nums">
                Hari ini: {lolosHariIni} soal lolos · {(pemakaian ?? []).length} permintaan · {formatBiaya(biayaHariIni)}. Hanya soal yang lolos verifikasi yang mengurangi batas harian.
              </p>
              {lewatBatasBiaya ? <Pemberitahuan nada="awas" className="mt-3">Perkiraan biaya hari ini melewati batas peringatan yang Anda atur.</Pemberitahuan> : null}
            </div>

            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-base font-bold text-redup">Semua model {p.nama}</summary>
              <p className="mt-1 text-base text-redup">Hanya model teks yang dapat menulis soal. Model gambar, suara, dan lainnya tidak ditampilkan di pilihan model.</p>
              {KELOMPOK.map((k) => {
                const isi = semuaModel.filter(k.cocok);
                if (!isi.length) return null;
                return (
                  <section key={k.judul} className="mt-5">
                    <h3 className="text-base font-bold text-tinta">
                      {k.judul} <span className="font-normal text-redup tabular-nums">({isi.length})</span>
                    </h3>
                    <p className="text-base text-redup">{k.ket}</p>
                    <ul className="mt-2 border-t border-garis text-base">
                      {isi.map((m) => (
                        <li key={m.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-garis py-3">
                          <span className={m.tersedia === false ? 'break-all text-redup' : 'break-all'}>{m.label}</span>
                          <span className="text-base text-redup">
                            {m.jenis !== 'teks' ? '' : m.registri ? LABEL_STATUS[m.status] : 'belum diuji'}
                            {m.tersedia === false ? ' · tidak tersedia' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </details>
          </div>
        </BagianLipat>

        {kunci ? (
          <ZonaBerbahaya>
            <BarisBahaya
              judul={`Hapus kunci ${p.nama}`}
              ket={`Kunci dihapus dari peramban ini. Soal tidak dapat dibuat dengan ${p.nama} sampai kuncinya dipasang lagi.`}
              aksi={
                <Tombol varian="bahaya" onClick={hapusKunci} className="w-full sm:w-auto">
                  Hapus kunci…
                </Tombol>
              }
            />
          </ZonaBerbahaya>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Isian angka yang tersimpan langsung selama nilainya sah. Teks tetap milik isian, sehingga guru dapat
 * menghapus lalu mengetik ulang; saat fokus lepas, isian menampilkan nilai tersimpan.
 */
function IsianAngkaSimpan({ id, label, petunjuk, nilai, simpan, bolehKosong = false, desimal = false }: { id: string; label: string; petunjuk: ReactNode; nilai: number | null; simpan: (n: number | null) => void; bolehKosong?: boolean; desimal?: boolean }) {
  const tampil = (n: number | null) => (n === null ? '' : desimal ? String(n).replace('.', ',') : String(n));
  const [teks, setTeks] = useState(tampil(nilai));
  const fokus = useRef(false);
  // Nilai dapat berubah dari luar (mis. pindah model); jangan menimpa ketikan yang sedang berlangsung.
  useEffect(() => {
    if (!fokus.current) setTeks(tampil(nilai));
  }, [nilai]);
  const baca = (t: string): number | null | undefined => {
    if (t.trim() === '') return bolehKosong ? null : undefined;
    const n = Number(t.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return undefined;
    return desimal ? n : Math.max(1, Math.round(n));
  };
  const hasil = baca(teks);
  return (
    <IsianAngka
      id={id}
      label={label}
      petunjuk={petunjuk}
      galat={hasil === undefined ? (bolehKosong ? 'Isi dengan angka, atau kosongkan.' : 'Isi dengan angka.') : undefined}
      inputMode={desimal ? 'decimal' : 'numeric'}
      placeholder={bolehKosong ? 'tanpa batas' : undefined}
      kelasIsian="tabular-nums"
      value={teks}
      onChange={(e) => {
        setTeks(e.target.value);
        const n = baca(e.target.value);
        if (n !== undefined) simpan(n);
      }}
      onFocus={() => (fokus.current = true)}
      onBlur={() => {
        fokus.current = false;
        setTeks(tampil(nilai));
      }}
    />
  );
}
