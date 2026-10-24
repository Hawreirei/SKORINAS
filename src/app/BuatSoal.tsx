import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Bentuk, BahasaSoal, GayaSoal, ModeGambar, ParameterPaket, Preset, Rumpun, TpDipakai } from '../db/tipe';
import { BENTUK_LABEL, RUMPUN_LABEL } from '../db/tipe';
import { sekarang, uuid } from '../db/util';
import { bagiKomposisi, geserPersen } from '../generasi/komposisi';
import { buatPaket, jumlahLolosHariIni, pengatur } from '../generasi/pengatur';
import { URUTAN_BENTUK } from '../generasi/rencana';
import { faseDariKelas } from '../kurikulum/fase';
import { mapelUntukFase } from '../kurikulum/muat';
import { nilaiTp } from '../kurikulum/pemeriksa-tp';
import type { KurikulumResmi } from '../kurikulum/tipe';
import { PanelBantuan } from '../komponen/Bantuan';
import { Dialog } from '../komponen/Dialog';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Label, Peringatan, Titik } from '../komponen/Status';
import { Chip, Panah, Tombol } from '../komponen/Tombol';
import { kemiripan } from '../verifikasi/kemiripan';
import { useIndeksKurikulum, useJudulHalaman, useProfil } from './kait';
import { PemilihTpResmi, type TpTerpilih } from './PemilihTpResmi';

const KUSTOM = 'kustom';
const MAKS_TP = 500;
const MAKS_KATA_MATERI = 3000;

interface Isian {
  kurikulumId: string;
  namaKustom: string;
  kelas: number;
  mapel: string;
  rumpun: Rumpun | null;
  cp: string;
  tpTeks: string;
  tpResmi: TpTerpilih[];
  tpAsal: TpDipakai[];
  n: number;
  persen: [number, number, number];
  bentuk: Bentuk[];
  bahasa: BahasaSoal;
  gaya: GayaSoal;
  gambar: ModeGambar;
  materi: string;
}

function isianKosong(kurikulumId = 'merdeka-2024'): Isian {
  return {
    kurikulumId,
    namaKustom: 'Kurikulum sekolah',
    kelas: 4,
    mapel: kurikulumId === KUSTOM ? '' : 'Matematika',
    rumpun: kurikulumId === KUSTOM ? null : 'matematika',
    cp: '',
    tpTeks: '',
    tpResmi: [],
    tpAsal: [],
    n: 10,
    persen: [30, 50, 20],
    bentuk: ['pilihan_ganda'],
    bahasa: 'id',
    gaya: 'biasa',
    gambar: 'terprogram',
    materi: '',
  };
}

function isianDariParameter(p: ParameterPaket): Isian {
  return {
    kurikulumId: p.kurikulum_id,
    namaKustom: p.kurikulum_id === KUSTOM ? p.kurikulum_nama : 'Kurikulum sekolah',
    kelas: p.kelas,
    mapel: p.mapel,
    rumpun: p.rumpun,
    cp: p.cp,
    tpTeks: p.tp.map((t) => t.rumusan).join('\n'),
    tpResmi: p.tp.filter((t) => t.sumber === 'resmi').map((t) => ({ id: t.id, kode: t.kode ?? '', rumusan: t.rumusan })),
    tpAsal: p.tp,
    n: p.n,
    persen: p.persen,
    bentuk: p.bentuk,
    bahasa: p.bahasa,
    gaya: p.gaya,
    gambar: p.gambar,
    materi: p.materi,
  };
}

function barisTp(teks: string): string[] {
  return teks
    .split('\n')
    .map((t) => t.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function keParameter(f: Isian, kur: KurikulumResmi | undefined): ParameterPaket {
  const kustom = f.kurikulumId === KUSTOM || !kur;
  const fase = kur ? kur.fase.find((x) => f.kelas >= x.kelas_dari && f.kelas <= x.kelas_sampai)?.kode ?? '?' : faseDariKelas(f.kelas);
  const tp: TpDipakai[] = barisTp(f.tpTeks).map((rumusan, i) => {
    const resmi = f.tpResmi.find((t) => t.rumusan === rumusan);
    if (resmi && !kustom) return { id: resmi.id, kode: resmi.kode, rumusan, sumber: 'resmi', versi: kur!.versi };
    const asal = f.tpAsal.find((t) => t.rumusan === rumusan) ?? f.tpAsal[i];
    let induk: TpTerpilih | undefined;
    let terbaik = 0.5;
    for (const r of f.tpResmi) {
      const k = kemiripan(r.rumusan, rumusan);
      if (k > terbaik) {
        terbaik = k;
        induk = r;
      }
    }
    return { id: asal && asal.sumber === 'kustom' ? asal.id : '', rumusan, sumber: 'kustom', versi: asal?.sumber === 'kustom' ? asal.versi : 1, induk_id: induk?.id ?? null };
  });
  return {
    kurikulum_id: kustom ? KUSTOM : kur!.id,
    kurikulum_nama: kustom ? f.namaKustom.trim() || 'Kurikulum sekolah' : kur!.nama,
    kurikulum_versi: kustom ? '1' : kur!.versi,
    kurikulum_dasar: kustom ? undefined : kur!.dasar_hukum,
    kelas: f.kelas,
    fase,
    mapel: f.mapel.trim(),
    rumpun: f.rumpun,
    cp: f.cp.trim(),
    tp,
    n: f.n,
    persen: f.persen,
    bentuk: URUTAN_BENTUK.filter((b) => f.bentuk.includes(b)),
    bahasa: f.bahasa,
    gaya: f.gaya,
    gambar: f.gambar,
    materi: f.materi,
  };
}

function Bagian({ nomor, judul, keterangan, children }: { nomor: string; judul: string; keterangan?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-garis py-9 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <div className="mono text-redup">{nomor}</div>
        <h2 className="mt-2 text-xl font-normal">{judul}</h2>
        {keterangan ? <p className="mt-2.5 text-sm leading-normal text-redup">{keterangan}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Langkah({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="size-11 rounded-[2px] border border-garis-kuat bg-latar text-xl font-light hover:border-tinta disabled:opacity-30">
      {label.startsWith('Kurangi') ? '−' : '+'}
    </button>
  );
}

export default function BuatSoal() {
  useJudulHalaman('Buat soal');
  const [cari] = useSearchParams();
  const navigasi = useNavigate();
  const pesan = usePesan();
  const profil = useProfil();
  const { data: indeks, galat: galatIndeks } = useIndeksKurikulum();
  const preset = useLiveQuery(() => db.preset.orderBy('terakhir_dipakai').reverse().toArray(), []);
  const kunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const [f, setF] = useState<Isian>(() => isianKosong(cari.get('mulai') === KUSTOM ? KUSTOM : 'merdeka-2024'));
  const [presetId, setPresetId] = useState<string | null>(null);
  const [simpanPreset, setSimpanPreset] = useState(false);
  const [namaPreset, setNamaPreset] = useState('');
  const [judul, setJudul] = useState('');
  const [pilihTp, setPilihTp] = useState(false);
  const [bantuan, setBantuan] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string[]>([]);
  const ubah = (u: Partial<Isian>) => setF((x) => ({ ...x, ...u }));

  const kurResmi = indeks?.kurikulum.filter((k) => k.aktif) ?? [];
  const kur = kurResmi.find((k) => k.id === f.kurikulumId);
  const kustom = f.kurikulumId === KUSTOM;
  const fase = kur ? kur.fase.find((x) => f.kelas >= x.kelas_dari && f.kelas <= x.kelas_sampai)?.kode ?? '?' : faseDariKelas(f.kelas);
  const daftarMapel = kur ? mapelUntukFase(kur, fase) : [];
  const mapelResmi = daftarMapel.find((m) => m.nama === f.mapel);

  useEffect(() => {
    const ulang = cari.get('ulang');
    if (!ulang) return;
    void db.paket_soal.get(ulang).then((pk) => {
      if (!pk) return;
      setF(isianDariParameter(pk.parameter_json));
      setJudul(`${pk.judul} (2)`);
    });
  }, [cari]);

  useEffect(() => {
    const id = cari.get('preset');
    if (!id || !preset) return;
    const p = preset.find((x) => x.id === id);
    if (p && presetId !== id) muatPreset(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cari, preset]);

  function muatPreset(p: Preset | null) {
    if (!p) {
      setPresetId(null);
      setF(isianKosong(f.kurikulumId));
      setNamaPreset('');
      setSimpanPreset(false);
      return;
    }
    setPresetId(p.id);
    setF(isianDariParameter(p.parameter_json));
    setNamaPreset(p.nama);
    setSimpanPreset(false);
  }

  const daftarTp = useMemo(() => barisTp(f.tpTeks), [f.tpTeks]);
  const penilaian = useMemo(() => daftarTp.map((t) => ({ t, n: nilaiTp(t) })), [daftarTp]);
  const jumlahLemah = penilaian.filter((p) => p.n.nilai === 'lemah').length;
  const jumlahBaik = penilaian.filter((p) => p.n.nilai === 'baik').length;
  const kuota = bagiKomposisi(f.n, f.persen);
  const kataMateri = f.materi.trim() ? f.materi.trim().split(/\s+/).length : 0;
  const adaKunci = (kunci ?? []).some((k) => k.kunci && k.penyedia === profil.penyedia_utama);

  // Mapel resmi menentukan rumpun; mapel yang belum dibuka tidak dapat dipilih pada kurikulum resmi.
  useEffect(() => {
    if (kustom || !kur) return;
    const m = mapelUntukFase(kur, fase).find((x) => x.nama === f.mapel);
    if (!m || !m.paket_aktif) {
      const pertama = mapelUntukFase(kur, fase).find((x) => x.paket_aktif);
      if (pertama) ubah({ mapel: pertama.nama, rumpun: pertama.rumpun });
    } else if (m.rumpun !== f.rumpun) ubah({ rumpun: m.rumpun });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kustom, kur, fase, f.mapel]);

  function periksa(): string[] {
    const g: string[] = [];
    if (!f.mapel.trim()) g.push('Isi mata pelajaran.');
    if (!daftarTp.length) g.push('Tulis minimal satu TP.');
    if (daftarTp.length > MAKS_TP) g.push(`Maksimal ${MAKS_TP} TP.`);
    if (!f.bentuk.length) g.push('Pilih minimal satu bentuk soal.');
    if (kataMateri > MAKS_KATA_MATERI) g.push(`Teks materi maksimal ${MAKS_KATA_MATERI} kata (sekarang ${kataMateri}).`);
    if (simpanPreset && !namaPreset.trim()) g.push('Beri nama preset.');
    return g;
  }

  async function simpanSebagaiPreset(param: ParameterPaket) {
    const t = sekarang();
    const sama = (preset ?? []).find((p) => p.nama.trim().toLowerCase() === namaPreset.trim().toLowerCase());
    const id = sama?.id ?? uuid();
    await db.preset.put({ id, nama: namaPreset.trim(), parameter_json: param, terakhir_dipakai: t, dibuat_pada: sama?.dibuat_pada ?? t, diubah_pada: t });
    setPresetId(id);
    return id;
  }

  async function generate() {
    const g = periksa();
    setGalat(g);
    if (g.length) return;
    if (!adaKunci || !profil.model_utama) {
      setGalat(['Pasang kunci API dan pilih model utama di Pengaturan AI sebelum membuat soal.']);
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
      const param = keParameter(f, kur);
      const idPreset = simpanPreset ? await simpanSebagaiPreset(param) : presetId;
      if (!simpanPreset && presetId) await db.preset.update(presetId, { terakhir_dipakai: sekarang() });
      const id = await buatPaket(param, judul || param.tp[0].rumusan.replace(/^peserta didik (dapat|mampu)\s*/i, '').replace(/\.$/, '').slice(0, 80));
      if (simpanPreset && idPreset) {
        // Preset menyimpan id TP kustom yang baru tersimpan agar versi TP berikutnya bertaut.
        const paket = await db.paket_soal.get(id);
        if (paket) await db.preset.update(idPreset, { parameter_json: paket.parameter_json });
      }
      navigasi(`/soal/${id}`);
      void pengatur.mulai(id);
    } catch (e) {
      setGalat([(e as Error).message]);
    } finally {
      setMengirim(false);
    }
  }

  async function hanyaSimpanPreset() {
    const g = periksa().filter((x) => !x.startsWith('Beri nama'));
    if (!namaPreset.trim()) g.push('Beri nama preset.');
    setGalat(g);
    if (g.length) return;
    await simpanSebagaiPreset(keParameter(f, kur));
    pesan('Preset disimpan.');
  }

  function tambahTpResmi(daftar: TpTerpilih[], cp: string) {
    const ada = new Set(daftarTp);
    const baru = daftar.filter((t) => !ada.has(t.rumusan));
    ubah({
      tpTeks: [...daftarTp, ...baru.map((t) => t.rumusan)].join('\n'),
      tpResmi: [...f.tpResmi, ...baru],
      cp: f.cp.trim() ? f.cp : cp,
    });
    setPilihTp(false);
  }

  const notePreset = presetId ? 'Preset dimuat · ubah isian bila perlu, lalu Generate' : 'Formulir kosong · isi, lalu simpan sebagai preset';

  return (
    <div>
      <div className="mx-auto max-w-[1000px] px-4 pb-20 pt-10 sm:px-8 lg:px-16 lg:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <KepalaHalaman label="Soal baru" judul="Buat soal" ukuran="besar">
            Isi sekali, simpan sebagai preset. Lain kali cukup pilih preset lalu Generate.
          </KepalaHalaman>
          <button type="button" className="mono text-redup underline-offset-4 hover:text-tinta hover:underline" onClick={() => setBantuan(true)}>
            Tonton caranya
          </button>
        </div>

        <div className="mt-10">
          <Bagian nomor="00" judul="Preset">
            <div className="flex flex-wrap gap-3">
              <Chip aktif={!presetId} onClick={() => muatPreset(null)}>
                Kosong
              </Chip>
              {(preset ?? []).map((p) => (
                <Chip key={p.id} aktif={presetId === p.id} onClick={() => muatPreset(p)}>
                  {p.nama}
                </Chip>
              ))}
            </div>
            <p className="mono mt-4 text-redup">{notePreset}</p>
            {presetId ? (
              <button
                type="button"
                className="mono mt-3 text-redup hover:text-buruk"
                onClick={async () => {
                  if (!confirm('Hapus preset ini? Paket soal yang sudah dibuat tidak terpengaruh.')) return;
                  await db.preset.delete(presetId);
                  muatPreset(null);
                }}
              >
                Hapus preset ini
              </button>
            ) : null}
          </Bagian>

          <Bagian nomor="01" judul="Kelas dan mapel">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="kur">Kurikulum</Label>
                <select id="kur" className="bidang mt-2" value={f.kurikulumId} onChange={(e) => ubah({ kurikulumId: e.target.value, ...(e.target.value === KUSTOM ? { rumpun: f.rumpun } : {}) })}>
                  {kurResmi.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                  <option value={KUSTOM}>Kustom saya</option>
                </select>
              </div>
              <div>
                <Label htmlFor="kelas">Kelas · fase {fase}</Label>
                <select id="kelas" className="bidang mt-2" value={f.kelas} onChange={(e) => ubah({ kelas: Number(e.target.value) })}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="mapel">Mata pelajaran</Label>
                {kustom ? (
                  <input id="mapel" className="bidang mt-2" value={f.mapel} onChange={(e) => ubah({ mapel: e.target.value })} placeholder="mis. Matematika" />
                ) : (
                  <select id="mapel" className="bidang mt-2" value={f.mapel} onChange={(e) => ubah({ mapel: e.target.value })}>
                    {daftarMapel.map((m) => (
                      <option key={m.id} value={m.nama} disabled={!m.paket_aktif}>
                        {m.nama}
                        {m.paket_aktif ? '' : ' · belum dibuka'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {kustom ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="namaKur">Nama kurikulum kustom</Label>
                  <input id="namaKur" className="bidang mt-2" value={f.namaKustom} onChange={(e) => ubah({ namaKustom: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="rumpun">Rumpun mapel · menentukan pemeriksa</Label>
                  <select id="rumpun" className="bidang mt-2" value={f.rumpun ?? ''} onChange={(e) => ubah({ rumpun: (e.target.value || null) as Rumpun | null })}>
                    <option value="">Tidak dipilih (semua soal perlu telaah)</option>
                    {(Object.keys(RUMPUN_LABEL) as Rumpun[]).map((r) => (
                      <option key={r} value={r}>
                        {RUMPUN_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-redup">
                {kur ? `${kur.dasar_hukum} · versi ${kur.versi}. ` : galatIndeks ? 'Data kurikulum resmi tidak dapat dimuat. ' : ''}
                Mapel lain menunggu gerbang mutu; untuk sementara pakai <button type="button" className="underline" onClick={() => ubah({ kurikulumId: KUSTOM })}>Kustom saya</button>.
              </p>
            )}
            {f.rumpun && f.rumpun !== 'matematika' ? (
              <p className="mt-3 text-sm text-redup">Pemeriksa otomatis rumpun {RUMPUN_LABEL[f.rumpun]} menyusul pada V1; soal akan berstatus perlu telaah dan wajib Anda telaah sebelum ekspor.</p>
            ) : null}
          </Bagian>

          <Bagian nomor="02" judul="CP dan TP" keterangan="Tulis langsung, satu TP satu baris.">
            <Label htmlFor="cp">CP (opsional)</Label>
            <textarea id="cp" className="bidang mt-2" rows={2} value={f.cp} onChange={(e) => ubah({ cp: e.target.value })} />
            <Label htmlFor="tp" className="mt-5">
              TP
            </Label>
            <textarea
              id="tp"
              className="bidang mt-2"
              rows={Math.min(10, Math.max(4, daftarTp.length + 1))}
              value={f.tpTeks}
              onChange={(e) => ubah({ tpTeks: e.target.value })}
              placeholder="Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="mono flex items-center gap-2 text-redup">
                <Titik isi={daftarTp.length > 0 && jumlahLemah === 0} />
                {daftarTp.length} TP{daftarTp.length ? (jumlahLemah ? ` · ${jumlahLemah} perlu diperjelas` : jumlahBaik === daftarTp.length ? ' · rumusan jelas' : ' · ada saran') : ''}
              </span>
              <Tombol varian="hantu" onClick={() => setPilihTp(true)} disabled={kustom && !kurResmi.length}>
                Ambil dari kurikulum resmi
              </Tombol>
            </div>
            {penilaian.length ? (
              <ul className="mt-4 border-t border-garis">
                {penilaian.map(({ t, n }, i) => (
                  <li key={i} className="flex gap-3 border-b border-garis py-3 text-[14px] leading-normal">
                    <span className={`mono mt-0.5 shrink-0 ${n.nilai === 'lemah' ? 'text-awas' : 'text-redup'}`}>{n.nilai === 'baik' ? 'Siap dipakai' : n.nilai === 'cukup' ? 'Saran' : 'Lemah'}</span>
                    <span className="min-w-0">
                      <span className="text-isi">{t}</span>
                      {n.alasan.length ? <span className="mt-1 block text-redup">{n.alasan.join(' ')}</span> : null}
                      {n.level ? <span className="mono mt-1 block text-redup">Perkiraan level {n.level}{f.tpResmi.some((r) => r.rumusan === t) ? ' · data resmi' : ''}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Bagian>

          <Bagian nomor="03" judul="Komposisi">
            <div className="flex items-center justify-between gap-4 pb-5">
              <span className="mono text-redup">Jumlah soal</span>
              <span className="flex items-center gap-4">
                <Langkah label="Kurangi jumlah soal" onClick={() => ubah({ n: Math.max(5, f.n - 1) })} disabled={f.n <= 5} />
                <input
                  aria-label="Jumlah soal"
                  type="number"
                  min={5}
                  max={50}
                  value={f.n}
                  onChange={(e) => ubah({ n: Math.max(5, Math.min(50, Number(e.target.value) || 5)) })}
                  className="w-20 bg-transparent text-center text-[40px] font-extralight [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Langkah label="Tambah jumlah soal" onClick={() => ubah({ n: Math.min(50, f.n + 1) })} disabled={f.n >= 50} />
              </span>
            </div>
            <div className="flex h-3.5 overflow-hidden border border-tinta" aria-hidden="true">
              <div className="bg-garis" style={{ width: `${f.persen[0]}%` }} />
              <div className="bg-redup/60" style={{ width: `${f.persen[1]}%` }} />
              <div className="bg-tinta" style={{ width: `${f.persen[2]}%` }} />
            </div>
            <div className="mt-2 border-t border-garis">
              {(['Mudah', 'Sedang', 'Sulit'] as const).map((nama, i) => (
                <div key={nama} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-garis py-4 sm:gap-5">
                  <span className="text-lg font-light">
                    {nama} <span className="mono text-redup">{['C1–C2', 'C3–C4', 'C5–C6'][i]}</span>
                  </span>
                  <span className="flex items-center gap-2 sm:gap-3">
                    <Langkah label={`Kurangi persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] - 5) })} disabled={f.persen[i] <= 0} />
                    <span className="min-w-14 text-center text-[28px] font-extralight sm:min-w-[72px]" aria-live="polite">
                      {f.persen[i]}%
                    </span>
                    <Langkah label={`Tambah persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] + 5) })} disabled={f.persen[i] >= 100} />
                  </span>
                  <span className="min-w-14 text-right sm:min-w-[72px]">
                    <span className="text-[28px] font-extralight">{kuota[i]}</span> <span className="mono text-redup">soal</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-redup">Persentase saling terkunci pada 100%. Sisa soal dibagikan ke kategori dengan pecahan sisa terbesar.</p>
          </Bagian>

          <Bagian nomor="04" judul="Opsi">
            <Label>Bentuk soal</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {URUTAN_BENTUK.map((b) => (
                <Chip key={b} aktif={f.bentuk.includes(b)} onClick={() => ubah({ bentuk: f.bentuk.includes(b) ? f.bentuk.filter((x) => x !== b) : [...f.bentuk, b] })}>
                  {BENTUK_LABEL[b]}
                </Chip>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="bahasa">Bahasa soal</Label>
                <select id="bahasa" className="bidang mt-2" value={f.bahasa} onChange={(e) => ubah({ bahasa: e.target.value as BahasaSoal })}>
                  <option value="id">Indonesia</option>
                  <option value="en">Inggris</option>
                  <option value="dwibahasa">Dwibahasa</option>
                </select>
              </div>
              <div>
                <Label htmlFor="gaya">Gaya soal</Label>
                <select id="gaya" className="bidang mt-2" value={f.gaya} onChange={(e) => ubah({ gaya: e.target.value as GayaSoal })}>
                  <option value="biasa">Biasa</option>
                  <option value="numerasi">Numerasi</option>
                  <option value="literasi">Literasi</option>
                  <option value="hots">HOTS</option>
                </select>
              </div>
              <div>
                <Label htmlFor="gambar">Soal bergambar</Label>
                <select id="gambar" className="bidang mt-2" value={f.gambar} onChange={(e) => ubah({ gambar: e.target.value as ModeGambar })}>
                  <option value="terprogram">Hanya terprogram</option>
                  <option value="campuran">Campuran</option>
                  <option value="mati">Mati</option>
                </select>
              </div>
            </div>
            <Label htmlFor="materi" className="mt-6">
              Teks materi tempel (opsional · {kataMateri}/{MAKS_KATA_MATERI} kata)
            </Label>
            <textarea id="materi" className="bidang mt-2" rows={4} value={f.materi} onChange={(e) => ubah({ materi: e.target.value })} placeholder="Tempel bahan bacaan atau ringkasan materi bila soal harus berdasar teks tertentu." />
            <p className="mt-2 text-sm text-redup">Jangan menempel data siswa. Teks ini dikirim ke penyedia AI pilihan Anda.</p>
            <Label htmlFor="judul" className="mt-6">
              Judul paket (tidak ikut preset)
            </Label>
            <input id="judul" className="bidang mt-2" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Penilaian harian pecahan" />
          </Bagian>

          {galat.length ? (
            <Peringatan className="mt-2">
              <ul className="list-disc pl-5">
                {galat.map((g) => (
                  <li key={g}>
                    {g}
                    {g.includes('Pengaturan AI') ? (
                      <>
                        {' '}
                        <Link to="/pengaturan/ai" className="underline">
                          Buka Pengaturan AI
                        </Link>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Peringatan>
          ) : null}
        </div>
      </div>

      <div className="tanpa-cetak sticky bottom-0 z-10 border-t border-tinta bg-latar">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4 lg:px-16">
          <div className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="size-5" checked={simpanPreset} onChange={(e) => setSimpanPreset(e.target.checked)} />
              <span>Simpan sebagai preset</span>
            </label>
            {simpanPreset ? (
              <>
                <input className="bidang !min-h-11 !w-[220px]" aria-label="Nama preset" value={namaPreset} onChange={(e) => setNamaPreset(e.target.value)} placeholder={`${f.mapel || 'Mapel'} K${f.kelas}`} />
                <button type="button" className="mono text-redup hover:text-tinta" onClick={hanyaSimpanPreset}>
                  Simpan saja
                </button>
              </>
            ) : null}
          </div>
          <Tombol ukuran="besar" onClick={generate} disabled={mengirim} className="w-full sm:w-auto">
            {mengirim ? 'Menyiapkan…' : `Generate ${f.n} soal`} <Panah />
          </Tombol>
        </div>
      </div>

      <Dialog buka={pilihTp} tutup={() => setPilihTp(false)} judul="Ambil dari kurikulum resmi" lebar={860}>
        {indeks ? <PemilihTpResmi indeks={indeks} kelas={f.kelas} mapelKode={mapelResmi?.kode ?? 'matematika'} pilih={tambahTpResmi} /> : <p className="text-redup">Memuat data kurikulum…</p>}
      </Dialog>
      <Dialog buka={bantuan} tutup={() => setBantuan(false)} judul="Bantuan" lebar={560}>
        <PanelBantuan id={kustom ? 'kurikulum-sendiri' : 'soal-pertama'} />
      </Dialog>
    </div>
  );
}
