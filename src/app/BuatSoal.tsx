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
import { KepalaHalaman, PenunjukLangkah } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Kartu, Label, NomorBagian, Peringatan } from '../komponen/Status';
import { Chip, Panah, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { batasEfektif, permintaanHariIni } from '../ai/laju';

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

function Bagian({ nomor, judul, keterangan, pita, children }: { nomor: string; judul: string; keterangan?: string; pita: 'utama' | 'kuning'; children: React.ReactNode }) {
  return (
    <Kartu pita={pita} className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <NomorBagian>{nomor}</NomorBagian>
        <h2 className="mt-2 text-[22px] font-extrabold text-judul">{judul}</h2>
        {keterangan ? <p className="mt-1 text-base leading-normal text-redup">{keterangan}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </Kartu>
  );
}

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
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string[]>([]);
  const ubah = (u: Partial<Isian>) => setF((x) => ({ ...x, ...u }));

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

  return (
    <div>
      <PenunjukLangkah langkah={1} />
      <div className="mx-auto max-w-[960px] px-4 pb-16 pt-8 sm:px-8 sm:pt-10">
        <KepalaHalaman label="Soal baru" judul="Buat soal">
          Cukup isi kelas, mapel, dan jumlah soal. Sisanya sudah terisi otomatis.
        </KepalaHalaman>

        <div className="mt-8 space-y-6">
          {preset && preset.length ? (
            <Bagian nomor="00" judul="Pengaturan tersimpan" pita="utama" keterangan="Pilih untuk mengisi semua isian sekaligus.">
              <div className="flex flex-wrap gap-3">
                <Chip aktif={!presetId} onClick={() => muatPreset(null)}>
                  Kosong
                </Chip>
                {preset.map((p) => (
                  <Chip key={p.id} aktif={presetId === p.id} onClick={() => muatPreset(p)}>
                    {p.nama}
                  </Chip>
                ))}
              </div>
              {presetId ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-base text-redup">Pengaturan dimuat. Ubah isian bila perlu, lalu tekan Buat soal.</p>
                  <Tombol
                    varian="bahaya"
                    ukuran="kecil"
                    onClick={async () => {
                      if (!confirm('Hapus pengaturan tersimpan ini? Paket soal yang sudah dibuat tidak terpengaruh.')) return;
                      await db.preset.delete(presetId);
                      muatPreset(null);
                    }}
                  >
                    Hapus
                  </Tombol>
                </div>
              ) : null}
            </Bagian>
          ) : null}

          <Bagian nomor="01" judul="Kelas dan mapel" pita="kuning">
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
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
            </div>
            {f.mapel.trim() ? (
              <p className="mt-3 text-base text-redup">
                {dicekOtomatis ? 'Kunci soal hitungan dicek otomatis.' : 'Kunci soal mapel ini belum dapat dicek otomatis. Setiap soal ditandai "Mohon cek dulu" dan perlu Anda setujui sebelum diunduh.'}
              </p>
            ) : null}
          </Bagian>

          <Bagian nomor="02" judul="CP dan TP" pita="utama" keterangan="Boleh dikosongkan. Satu TP satu baris; jumlah soal dibagi ke tiap TP.">
            <Label htmlFor="cp">Capaian pembelajaran (CP)</Label>
            <textarea id="cp" className="bidang mt-2" rows={2} value={f.cp} onChange={(e) => ubah({ cp: e.target.value })} />
            <Label htmlFor="tp" className="mt-5">
              Tujuan pembelajaran (TP)
            </Label>
            <textarea
              id="tp"
              className="bidang mt-2"
              rows={Math.min(10, Math.max(4, daftarTp.length + 1))}
              value={f.tpTeks}
              onChange={(e) => ubah({ tpTeks: e.target.value })}
              placeholder="Peserta didik dapat membandingkan dua pecahan berpenyebut berbeda dengan menyamakan penyebutnya."
            />
            <p className="mt-2 text-base font-semibold text-utama">
              {daftarTp.length ? `${daftarTp.length} TP · soal dibagi ke tiap TP` : f.cp.trim() ? 'Tanpa TP: soal dibuat dari CP' : 'Tanpa CP dan TP: soal dibuat dari topik atau mapel'}
            </p>
            {saranTp.length ? (
              <details className="mt-3 rounded-lg border border-garis bg-panel px-4 py-3">
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
          </Bagian>

          <Bagian nomor="03" judul="Jumlah soal" pita="kuning">
            <div className="flex items-center gap-4">
              <Langkah label="Kurangi jumlah soal" onClick={() => ubah({ n: Math.max(5, f.n - 1) })} disabled={f.n <= 5} />
              <input
                aria-label="Jumlah soal"
                type="number"
                min={5}
                max={50}
                value={f.n}
                onChange={(e) => ubah({ n: Math.max(5, Math.min(50, Number(e.target.value) || 5)) })}
                className="w-20 bg-transparent text-center text-[40px] font-extrabold text-judul [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Langkah label="Tambah jumlah soal" onClick={() => ubah({ n: Math.min(50, f.n + 1) })} disabled={f.n >= 50} />
              <span className="text-base text-redup">5 sampai 50 soal</span>
            </div>
            {batasModel && (batasModel.rpm || batasModel.rpd) ? (
              <div className={`mt-4 rounded-lg border px-4 py-3 text-base leading-relaxed ${sisaHarian !== null && sisaHarian < f.n ? 'border-awas/40 bg-awas-latar text-awas' : 'border-garis bg-panel text-isi'}`}>
                <div>
                  Perkiraan {f.n}–{perkiraanMaks} permintaan ke AI
                  {menitPerkiraan && f.n > (batasModel.rpm ?? 0) ? `, sekitar ${menitPerkiraan} menit karena batas ${batasModel.rpm} permintaan per menit` : ''}.
                </div>
                {sisaHarian !== null ? (
                  <div className="mt-1">
                    Sisa kuota hari ini: {sisaHarian} dari {batasModel.rpd} permintaan.
                    {sisaHarian < f.n
                      ? profil.model_cadangan
                        ? ' Sisanya dibuat dengan model cadangan.'
                        : ' Tidak cukup untuk satu paket; pembuatan akan dijeda di tengah. Kurangi jumlah soal atau pasang model cadangan di Pengaturan AI.'
                      : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Bagian>

          <Kartu pita="utama" className="!p-0">
            <button type="button" className="flex w-full items-center gap-4 p-4 text-left sm:p-6" aria-expanded={lanjutan} aria-controls="lanjutan" onClick={() => setLanjutan((b) => !b)}>
              <NomorBagian>04</NomorBagian>
              <span className="min-w-0 flex-1">
                <span className="block text-[22px] font-extrabold text-judul">Pengaturan lanjutan</span>
                <span className="block text-base text-redup">
                  {kuota[0]} mudah · {kuota[1]} sedang · {kuota[2]} sulit · {f.bentuk.map((b) => BENTUK_LABEL[b].toLowerCase()).join(', ') || 'belum ada bentuk soal'}
                </span>
              </span>
              <span className="rounded-md bg-kuning-lembut px-3 py-1 text-base font-bold text-kuning-tua">{lanjutan ? 'Tutup' : 'Buka'}</span>
            </button>
            {lanjutan ? (
              <div id="lanjutan" className="space-y-7 border-t border-garis p-4 sm:p-6">
                <div>
                  <div className="text-base font-bold">Komposisi mudah, sedang, sulit</div>
                  <div className="mt-2 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
                    <div className="bg-utama-lembut" style={{ width: `${f.persen[0]}%` }} />
                    <div className="bg-utama" style={{ width: `${f.persen[1]}%` }} />
                    <div className="bg-judul" style={{ width: `${f.persen[2]}%` }} />
                  </div>
                  <div className="mt-2">
                    {(['Mudah', 'Sedang', 'Sulit'] as const).map((nama, i) => (
                      <div key={nama} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-garis py-3 last:border-b-0 sm:gap-5">
                        <span className="text-[17px] font-bold">{nama}</span>
                        <span className="flex items-center gap-2 sm:gap-3">
                          <Langkah label={`Kurangi persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] - 5) })} disabled={f.persen[i] <= 0} />
                          <span className="min-w-14 text-center text-[22px] font-extrabold" aria-live="polite">
                            {f.persen[i]}%
                          </span>
                          <Langkah label={`Tambah persen ${nama.toLowerCase()}`} onClick={() => ubah({ persen: geserPersen(f.persen, i as 0 | 1 | 2, f.persen[i] + 5) })} disabled={f.persen[i] >= 100} />
                        </span>
                        <span className="min-w-16 text-right text-base text-redup">
                          <strong className="text-[20px] text-tinta">{kuota[i]}</strong> soal
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-base text-redup">Bawaan 30% mudah, 50% sedang, 20% sulit. Jumlah persen selalu 100%.</p>
                </div>

                <div>
                  <div className="text-base font-bold">Bentuk soal</div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {URUTAN_BENTUK.map((b) => (
                      <Chip key={b} aktif={f.bentuk.includes(b)} onClick={() => ubah({ bentuk: f.bentuk.includes(b) ? f.bentuk.filter((x) => x !== b) : [...f.bentuk, b] })}>
                        {BENTUK_LABEL[b]}
                      </Chip>
                    ))}
                  </div>
                  {f.bentuk.includes('benar_salah') ? (
                    <fieldset className="mt-4">
                      <legend className="text-base font-bold">Cara menjawab benar-salah</legend>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {(
                          [
                            ['centang', 'Centang kotak Benar / Salah'],
                            ['lingkari', 'Lingkari B / S'],
                          ] as [CaraBenarSalah, string][]
                        ).map(([v, l]) => (
                          <Chip key={v} aktif={f.cara_bs === v} onClick={() => ubah({ cara_bs: v })}>
                            {l}
                          </Chip>
                        ))}
                      </div>
                    </fieldset>
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
                  <textarea id="materi" className="bidang mt-2" rows={4} value={f.materi} onChange={(e) => ubah({ materi: e.target.value })} placeholder="Tempel bahan bacaan atau ringkasan materi bila soal harus berdasar teks tertentu." />
                  <p className="mt-1 text-base text-redup">Jangan menempel data siswa. Teks ini dikirim ke penyedia AI pilihan Anda.</p>
                </div>

                <div>
                  <Label htmlFor="judul">Judul paket (tidak ikut pengaturan tersimpan)</Label>
                  <input id="judul" className="bidang mt-2" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Penilaian harian pecahan" />
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

      <div className="tanpa-cetak sticky bottom-0 z-10 border-t-[3px] border-kuning bg-kartu shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-3 text-base">
            <label className="flex items-center gap-2.5 font-semibold">
              <input type="checkbox" className="size-5" checked={simpanPreset} onChange={(e) => setSimpanPreset(e.target.checked)} />
              <span>Simpan pengaturan ini</span>
            </label>
            {simpanPreset ? (
              <>
                <input className="bidang !min-h-11 !w-[220px]" aria-label="Nama pengaturan tersimpan" value={namaPreset} onChange={(e) => setNamaPreset(e.target.value)} placeholder={`${f.mapel || 'Mapel'} K${f.kelas || ''}`} />
                <Tombol varian="hantu" ukuran="kecil" onClick={hanyaSimpanPreset}>
                  Simpan saja
                </Tombol>
              </>
            ) : null}
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Tombol varian="bahaya" onClick={() => navigasi('/')} className="flex-1 sm:flex-none">
              Batal
            </Tombol>
            <Tombol ukuran="besar" onClick={buat} disabled={mengirim} className="flex-[2] sm:flex-none">
              {mengirim ? 'Menyiapkan…' : `Buat ${f.n} soal`} <Panah />
            </Tombol>
          </div>
        </div>
      </div>
    </div>
  );
}
