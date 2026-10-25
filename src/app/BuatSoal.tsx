import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Bentuk, BahasaSoal, CaraBenarSalah, GayaSoal, ModeGambar, ParameterPaket, Preset, TpDipakai } from '../db/tipe';
import { BENTUK_LABEL } from '../db/tipe';
import { sekarang, uuid } from '../db/util';
import { bagiKomposisi, geserPersen } from '../generasi/komposisi';
import { buatPaket, jumlahLolosHariIni, pengatur } from '../generasi/pengatur';
import { URUTAN_BENTUK } from '../generasi/rencana';
import { faseDariKelas } from '../kurikulum/fase';
import { nilaiTp } from '../kurikulum/pemeriksa-tp';
import { paketUntuk, rumpunDariMapel } from '../paket';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { usePesan } from '../komponen/Pesan';
import { Kartu, Label, Peringatan } from '../komponen/Status';
import { Chip, Panah, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { batasEfektif, permintaanHariIni } from '../ai/laju';

const MAKS_TP = 500;
const MIN_SOAL = 5;
const MAKS_SOAL = 50;
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

function keParameter(f: Isian): ParameterPaket {
  const tp: TpDipakai[] = tpUntuk(f).map((rumusan) => {
    const asal = f.tpAsal.find((t) => t.rumusan === rumusan);
    return { id: asal?.id ?? '', rumusan, sumber: 'guru', versi: 1 };
  });
  return {
    kelas: f.kelas,
    fase: faseDariKelas(f.kelas),
    mapel: f.mapel.trim(),
    rumpun: rumpunDariMapel(f.mapel),
    cp: f.cp.trim(),
    tp,
    n: f.n,
    persen: f.persen,
    bentuk: URUTAN_BENTUK.filter((b) => f.bentuk.includes(b)),
    bahasa: f.bahasa,
    gaya: f.gaya,
    gambar: f.gambar,
    materi: f.materi,
    cara_bs: f.cara_bs,
  };
}

const KOMPOSISI: { nama: string; persen: [number, number, number] }[] = [
  { nama: 'Bawaan', persen: [30, 50, 20] },
  { nama: 'Lebih mudah', persen: [50, 40, 10] },
  { nama: 'Lebih sulit', persen: [20, 50, 30] },
];

const samaPersen = (a: [number, number, number], b: [number, number, number]) => a.every((x, i) => x === b[i]);

function Langkah({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="size-11 shrink-0 rounded-lg border border-garis-kuat bg-kartu text-2xl font-bold text-utama hover:border-utama disabled:opacity-30">
      {label.startsWith('Kurangi') ? '−' : '+'}
    </button>
  );
}

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
  const [f, setF] = useState<Isian>(isianKosong);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [simpanPreset, setSimpanPreset] = useState(false);
  const [namaPreset, setNamaPreset] = useState('');
  const [judul, setJudul] = useState('');
  const [lanjutan, setLanjutan] = useState(false);
  const [aturSendiri, setAturSendiri] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string[]>([]);
  const ubah = (u: Partial<Isian>) => setF((x) => ({ ...x, ...u }));
  // Jumlah soal diketik bebas; angka baru dipakai bila sah, dan dirapikan saat kolom ditinggalkan.
  const [teksN, setTeksN] = useState(String(f.n));
  useEffect(() => setTeksN(String(f.n)), [f.n]);
  const nSah = /^\d+$/.test(teksN.trim()) && Number(teksN) >= MIN_SOAL && Number(teksN) <= MAKS_SOAL;

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

  const daftarTp = useMemo(() => barisTp(f.tpTeks), [f.tpTeks]);
  const saranTp = useMemo(() => daftarTp.map((t) => ({ t, n: nilaiTp(t) })).filter((x) => x.n.nilai !== 'baik'), [daftarTp]);
  const kuota = bagiKomposisi(f.n, f.persen);
  const kataMateri = f.materi.trim() ? f.materi.trim().split(/\s+/).length : 0;
  const adaKunci = (kunci ?? []).some((k) => k.kunci && k.penyedia === profil.penyedia_utama);
  const rumpun = rumpunDariMapel(f.mapel);
  const dicekOtomatis = !!paketUntuk(rumpun)?.pemeriksa;
  const batasModel = profil.penyedia_utama && profil.model_utama ? batasEfektif(profil, registri ?? null, profil.penyedia_utama, profil.model_utama) : null;
  // Setiap soal minimal satu permintaan; soal yang ditolak pemeriksa dibuat ulang, jadi sediakan sekitar 30% lebih.
  const perkiraanMaks = Math.ceil(f.n * 1.3);
  const sisaHarian = batasModel?.rpd ? Math.max(0, batasModel.rpd - (terpakai ?? 0)) : null;
  const menitPerkiraan = batasModel?.rpm ? Math.max(1, Math.ceil((f.n - batasModel.rpm) / batasModel.rpm)) : null;

  function periksa(): string[] {
    const g: string[] = [];
    if (!f.kelas) g.push('Pilih kelas.');
    if (!f.mapel.trim()) g.push('Isi topik atau mata pelajaran.');
    if (!nSah) g.push(`Jumlah soal ${MIN_SOAL} sampai ${MAKS_SOAL}.`);
    if (daftarTp.length > MAKS_TP) g.push(`Maksimal ${MAKS_TP} TP.`);
    if (!f.bentuk.length) g.push('Pilih minimal satu bentuk soal di Pengaturan lanjutan.');
    if (kataMateri > MAKS_KATA_MATERI) g.push(`Teks materi maksimal ${MAKS_KATA_MATERI} kata (sekarang ${kataMateri}).`);
    if (simpanPreset && !namaPreset.trim()) g.push('Beri nama pengaturan tersimpan.');
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

  async function buat() {
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
      const param = keParameter(f);
      const idPreset = simpanPreset ? await simpanSebagaiPreset(param) : presetId;
      if (!simpanPreset && presetId) await db.preset.update(presetId, { terakhir_dipakai: sekarang() });
      const id = await buatPaket(param, judul || `${param.mapel} kelas ${param.kelas}`.slice(0, 80));
      if (simpanPreset && idPreset) {
        // Pengaturan tersimpan memakai id TP yang baru diberikan agar paket berikutnya merujuk TP yang sama.
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
    if (!namaPreset.trim()) g.push('Beri nama pengaturan tersimpan.');
    setGalat(g);
    if (g.length) return;
    await simpanSebagaiPreset(keParameter(f));
    pesan('Pengaturan disimpan.');
  }

  const komposisiCepat = KOMPOSISI.find((k) => samaPersen(k.persen, f.persen));
  const nTampil = nSah ? Number(teksN) : f.n;
  const kuotaKurang = sisaHarian !== null && sisaHarian < f.n;

  return (
    <div>
      <div className="mx-auto max-w-[880px] px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
        <KepalaHalaman judul="Buat soal" subjudul="Cukup isi kelas, mapel, dan jumlah soal. Sisanya sudah terisi otomatis." />

        {preset && preset.length ? (
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <Label htmlFor="preset">Pakai pengaturan tersimpan</Label>
              <select
                id="preset"
                className="bidang mt-2"
                value={presetId ?? ''}
                onChange={(e) => muatPreset(preset.find((p) => p.id === e.target.value) ?? null)}
              >
                <option value="">Tidak (isian kosong)</option>
                {preset.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
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
        ) : null}

        <div className="mt-6 space-y-6">
          <Kartu aria-labelledby="judul-soal">
            <h2 id="judul-soal" className="text-[20px] font-extrabold text-judul">
              Soal yang dibuat
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)_128px]">
              <div>
                <Label htmlFor="kelas">Kelas</Label>
                <select id="kelas" className="bidang mt-2" value={f.kelas} onChange={(e) => ubah({ kelas: Number(e.target.value) })}>
                  <option value={0} disabled>
                    Pilih kelas
                  </option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="mapel">Topik atau mata pelajaran</Label>
                <input id="mapel" className="bidang mt-2" list="daftar-mapel" value={f.mapel} onChange={(e) => ubah({ mapel: e.target.value })} placeholder="mis. Matematika" autoComplete="off" />
                <datalist id="daftar-mapel">
                  {(mapelLama ?? []).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="jumlah">Jumlah soal</Label>
                <input
                  id="jumlah"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={teksN}
                  aria-invalid={!nSah}
                  aria-describedby="jumlah-ket"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const s = e.target.value.replace(/\D/g, '').slice(0, 3);
                    setTeksN(s);
                    const n = Number(s);
                    if (s && n >= MIN_SOAL && n <= MAKS_SOAL) ubah({ n });
                  }}
                  onBlur={() => {
                    const n = Math.max(MIN_SOAL, Math.min(MAKS_SOAL, Number(teksN) || f.n));
                    ubah({ n });
                    setTeksN(String(n));
                  }}
                  className={`bidang mt-2 text-center !text-[20px] font-extrabold text-judul ${nSah ? '' : '!border-buruk'}`}
                />
              </div>
            </div>
            <p id="jumlah-ket" className={`mt-3 text-base tabular-nums ${nSah ? 'text-redup' : 'font-bold text-buruk'}`}>
              {!nSah
                ? `Jumlah soal: ketik angka ${MIN_SOAL} sampai ${MAKS_SOAL}.`
                : [
                    f.mapel.trim() ? (dicekOtomatis ? 'Kunci soal hitungan dicek otomatis.' : 'Kunci soal mapel ini tidak dicek otomatis.') : `Jumlah ${MIN_SOAL} sampai ${MAKS_SOAL} soal.`,
                    menitPerkiraan && f.n > (batasModel?.rpm ?? 0) ? `Perkiraan selesai sekitar ${menitPerkiraan} menit karena batas ${batasModel?.rpm} permintaan per menit.` : '',
                    kuotaKurang && profil.model_cadangan ? `Sisa kuota hari ini ${sisaHarian} permintaan; sisanya dibuat dengan model cadangan.` : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
            </p>
            {kuotaKurang && !profil.model_cadangan ? (
              <Peringatan className="mt-3">
                Sisa kuota AI hari ini {sisaHarian} dari {batasModel?.rpd} permintaan, sedangkan {f.n} soal perlu {f.n}–{perkiraanMaks} permintaan. Pembuatan akan dijeda di tengah. Kurangi jumlah soal atau pasang model cadangan di{' '}
                <Link to="/pengaturan/ai" className="font-bold underline">
                  Pengaturan AI
                </Link>
                .
              </Peringatan>
            ) : null}
          </Kartu>

          <Kartu aria-labelledby="judul-cp">
            <h2 id="judul-cp" className="text-[20px] font-extrabold text-judul">
              CP dan TP <span className="text-base font-semibold text-redup">(boleh kosong)</span>
            </h2>
            <Label htmlFor="cp" className="mt-4">
              Capaian pembelajaran (CP)
            </Label>
            <textarea id="cp" className="bidang mt-2" rows={2} value={f.cp} onChange={(e) => ubah({ cp: e.target.value })} />
            <Label htmlFor="tp" className="mt-5">
              Tujuan pembelajaran (TP), satu TP satu baris
            </Label>
            <textarea
              id="tp"
              className="bidang mt-2"
              rows={Math.min(10, Math.max(3, daftarTp.length + 1))}
              value={f.tpTeks}
              onChange={(e) => ubah({ tpTeks: e.target.value })}
              placeholder="Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya."
            />
            <p className="mt-2 text-base text-redup">
              {daftarTp.length ? `${daftarTp.length} TP · jumlah soal dibagi ke tiap TP.` : f.cp.trim() ? 'Tanpa TP: soal dibuat dari CP.' : 'Tanpa CP dan TP: soal dibuat dari topik atau mapel.'}
            </p>
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

          <Kartu pita="tanpa" className="!p-0">
            <button type="button" className="flex w-full items-center gap-4 p-4 text-left sm:px-6" aria-expanded={lanjutan} aria-controls="lanjutan" onClick={() => setLanjutan((b) => !b)}>
              <span className="min-w-0 flex-1">
                <span className="block text-[20px] font-extrabold text-judul">Pengaturan lanjutan</span>
                <span className="block text-base text-redup">
                  {kuota[0]} mudah · {kuota[1]} sedang · {kuota[2]} sulit · {f.bentuk.map((b) => BENTUK_LABEL[b].toLowerCase()).join(', ') || 'belum ada bentuk soal'}
                </span>
              </span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-utama transition-transform ${lanjutan ? 'rotate-180' : ''}`}>
                <path d="M3 6.5l6 6 6-6" />
              </svg>
            </button>
            {lanjutan ? (
              <div id="lanjutan" className="space-y-7 border-t border-garis p-4 sm:p-6">
                <div>
                  <div className="text-base font-bold">Tingkat kesukaran</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {KOMPOSISI.map((k) => (
                      <Chip
                        key={k.nama}
                        aktif={!aturSendiri && komposisiCepat === k}
                        onClick={() => {
                          setAturSendiri(false);
                          ubah({ persen: k.persen });
                        }}
                      >
                        {k.nama}
                      </Chip>
                    ))}
                    <Chip aktif={aturSendiri || !komposisiCepat} onClick={() => setAturSendiri(true)}>
                      Atur sendiri
                    </Chip>
                  </div>
                  <p className="mt-2 text-base text-redup tabular-nums">
                    {kuota[0]} mudah ({f.persen[0]}%) · {kuota[1]} sedang ({f.persen[1]}%) · {kuota[2]} sulit ({f.persen[2]}%)
                  </p>
                  {aturSendiri || !komposisiCepat ? (
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
                </div>

                <div>
                  <div className="text-base font-bold">Bentuk soal</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {URUTAN_BENTUK.map((b) => (
                      <Chip key={b} aktif={f.bentuk.includes(b)} onClick={() => ubah({ bentuk: f.bentuk.includes(b) ? f.bentuk.filter((x) => x !== b) : [...f.bentuk, b] })}>
                        {BENTUK_LABEL[b]}
                      </Chip>
                    ))}
                  </div>
                  {f.bentuk.includes('benar_salah') ? (
                    <div className="mt-4">
                      <Label htmlFor="cara-bs">Cara menjawab benar-salah</Label>
                      <select id="cara-bs" className="bidang mt-2 sm:max-w-sm" value={f.cara_bs} onChange={(e) => ubah({ cara_bs: e.target.value as CaraBenarSalah })}>
                        <option value="centang">Centang kotak Benar / Salah</option>
                        <option value="lingkari">Lingkari B / S</option>
                      </select>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
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
                      <option value="terprogram">Pakai gambar bila membantu</option>
                      <option value="campuran">Sesekali saja</option>
                      <option value="mati">Tanpa gambar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="materi">
                    Teks materi (boleh kosong · {kataMateri}/{MAKS_KATA_MATERI} kata)
                  </Label>
                  <textarea id="materi" className="bidang mt-2" rows={3} value={f.materi} onChange={(e) => ubah({ materi: e.target.value })} placeholder="Tempel bahan bacaan bila soal harus berdasar teks tertentu. Jangan menempel data siswa." />
                </div>

                <div>
                  <Label htmlFor="judul">Judul paket</Label>
                  <input id="judul" className="bidang mt-2" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder={f.mapel ? `${f.mapel} kelas ${f.kelas || ''}`.trim() : 'mis. Penilaian harian pecahan'} />
                </div>

                <div className="border-t border-garis pt-5">
                  <label className="flex items-center gap-3 text-base font-bold">
                    <input type="checkbox" className="size-5" checked={simpanPreset} onChange={(e) => setSimpanPreset(e.target.checked)} />
                    Simpan pengaturan ini
                  </label>
                  <p className="mt-1 pl-8 text-base text-redup">Lain kali cukup pilih namanya di atas formulir.</p>
                  {simpanPreset ? (
                    <div className="mt-3 flex flex-wrap gap-3 pl-8">
                      <input className="bidang min-w-0 flex-1 sm:max-w-xs" aria-label="Nama pengaturan tersimpan" value={namaPreset} onChange={(e) => setNamaPreset(e.target.value)} placeholder={`${f.mapel || 'Mapel'} K${f.kelas || ''}`} />
                      <Tombol varian="hantu" onClick={hanyaSimpanPreset}>
                        Simpan tanpa membuat soal
                      </Tombol>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Kartu>

          {galat.length ? (
            <Peringatan>
              <ul className="list-disc pl-5">
                {galat.map((g) => (
                  <li key={g}>
                    {g}
                    {g.includes('Pengaturan AI') ? (
                      <>
                        {' '}
                        <Link to="/pengaturan/ai" className="font-bold underline">
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

      <div className="tanpa-cetak sticky bottom-0 z-10 border-t border-garis bg-kartu shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <span className="hidden min-w-0 truncate text-base text-redup sm:block">
            {[f.kelas ? `Kelas ${f.kelas}` : 'Kelas belum dipilih', f.mapel.trim() || 'mapel belum diisi'].join(' · ')}
          </span>
          <div className="flex w-full gap-3 sm:w-auto">
            <Tombol varian="bahaya" onClick={() => navigasi('/')} className="flex-1 sm:flex-none">
              Batal
            </Tombol>
            <Tombol ukuran="besar" onClick={buat} disabled={mengirim} className="flex-[2] sm:flex-none">
              {mengirim ? 'Menyiapkan…' : `Buat ${nTampil} soal`} <Panah />
            </Tombol>
          </div>
        </div>
      </div>
    </div>
  );
}
