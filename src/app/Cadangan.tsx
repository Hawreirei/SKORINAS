import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { bacaCadangan, buatCadangan, hapusSemuaData, pulihkanCadangan, ringkasCadangan, type BerkasCadangan } from '../db/cadangan';
import { db } from '../db/skema';
import type { Preset } from '../db/tipe';
import { ambilProfil, simpanProfil } from '../db/profil';
import { unduhBlob, VERSI_APLIKASI } from '../ekspor/peramban';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { usePesan } from '../komponen/Pesan';
import { Pemberitahuan } from '../komponen/Formulir';
import { BarisBahaya, KartuBagian, ZonaBerbahaya } from '../komponen/Status';
import { kelasTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';
import { hapusSimpananPerangkat, mintaPenyimpananPersisten, terapkanTema } from './mulai';
import { formatTanggal } from './ringkas';

const LABEL_TOKO: Record<string, string> = {
  profil: 'Profil',
  preset: 'Pengaturan tersimpan',
  paket_soal: 'Paket soal',
  soal: 'Soal',
  soal_gambar: 'Gambar soal',
  pekerjaan_generasi: 'Pekerjaan generasi',
  pemakaian_ai: 'Catatan pemakaian AI',
  log_soal: 'Jejak suntingan',
};

export default function Cadangan() {
  useJudulHalaman('Cadangan');
  const profil = useProfil();
  const pesan = usePesan();
  const tanya = useKonfirmasi();
  const [ukuran, setUkuran] = useState<{ pakai: number; kuota: number } | null>(null);
  const [persisten, setPersisten] = useState<boolean | null>(null);
  const [impor, setImpor] = useState<BerkasCadangan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const preset = useLiveQuery(() => db.preset.toArray(), []);
  const jumlah = useLiveQuery(async () => ({ paket: await db.paket_soal.count(), soal: await db.soal.count() }), []);

  async function segarkan() {
    const e = await navigator.storage?.estimate?.();
    if (e) setUkuran({ pakai: e.usage ?? 0, kuota: e.quota ?? 0 });
    setPersisten((await navigator.storage?.persisted?.()) ?? null);
  }
  useEffect(() => {
    void segarkan();
  }, []);

  async function unduh() {
    const b = await buatCadangan(db, VERSI_APLIKASI);
    const teks = JSON.stringify(b);
    const tgl = new Date().toISOString().slice(0, 10);
    unduhBlob(new Blob([teks], { type: 'application/json' }), `gensoal-cadangan-${tgl}.gensoal`);
    await simpanProfil({ cadangan_terakhir: Date.now() });
    pesan('Cadangan diunduh. Simpan berkas di tempat aman.');
  }

  async function pilihBerkas(f: File | undefined) {
    setGalat(null);
    setImpor(null);
    if (!f) return;
    try {
      setImpor(bacaCadangan(await f.text()));
    } catch (e) {
      setGalat((e as Error).message);
    }
  }

  async function pulihkan(mode: 'gabung' | 'ganti') {
    if (!impor) return;
    if (
      mode === 'ganti' &&
      !(await tanya({ judul: 'Ganti semua data dengan isi cadangan?', pesan: 'Semua soal, pengaturan tersimpan, dan profil di perangkat ini diganti isi berkas cadangan. Tidak dapat dibatalkan; unduh cadangan data sekarang lebih dulu bila perlu.', aksi: 'Ganti semua data', bahaya: true }))
    )
      return;
    await pulihkanCadangan(db, impor, mode);
    terapkanTema((await ambilProfil()).tema);
    setImpor(null);
    pesan('Data dipulihkan dari cadangan.');
  }

  async function hapusPreset(p: Preset) {
    if (!(await tanya({ judul: `Hapus pengaturan tersimpan "${p.nama}"?`, pesan: 'Isian ini tidak lagi dapat dipilih di layar Buat soal. Paket soal yang sudah dibuat tidak terpengaruh.', aksi: 'Hapus pengaturan', bahaya: true }))) return;
    await db.preset.delete(p.id);
    pesan('Pengaturan tersimpan dihapus.');
  }

  async function hapusSemua() {
    const isi = `${jumlah?.paket ?? 0} paket, ${jumlah?.soal ?? 0} soal`;
    if (!(await tanya({ judul: 'Hapus semua data di perangkat ini?', pesan: `${isi}, pengaturan tersimpan, profil, dan kunci API dihapus dari peramban ini. Tidak dapat dibatalkan; unduh cadangan lebih dulu bila perlu.`, aksi: 'Hapus semua data', bahaya: true }))) return;
    await hapusSemuaData(db);
    hapusSimpananPerangkat();
    terapkanTema('sistem');
    pesan('Semua data di perangkat ini dihapus.');
    void segarkan();
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

  return (
    <div className="mx-auto max-w-[800px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman judul="Cadangan" subjudul="Tanpa akun, berkas cadangan adalah satu-satunya cara memindah soal ke perangkat lain atau memulihkannya. Kunci API tidak ikut berkas cadangan." />

      <div className="mt-6 space-y-6">
        <KartuBagian judul="Data di perangkat ini" ket="Disarankan mengunduh cadangan setiap minggu.">
          <dl className="grid gap-4 tabular-nums sm:grid-cols-3">
            <div>
              <dt className="text-base text-redup">Tersimpan</dt>
              <dd className="mt-1 text-[18px] font-bold">
                {jumlah?.paket ?? 0} paket · {jumlah?.soal ?? 0} soal
              </dd>
              {ukuran ? <dd className="text-base text-redup">{mb(ukuran.pakai)}</dd> : null}
            </div>
            <div>
              <dt className="text-base text-redup">Cadangan terakhir</dt>
              <dd className="mt-1 text-[18px] font-bold">{formatTanggal(profil.cadangan_terakhir)}</dd>
            </div>
            <div>
              <dt className="text-base text-redup">Penyimpanan persisten</dt>
              <dd className="mt-1 text-[18px] font-bold">{persisten === null ? 'Tidak didukung' : persisten ? 'Aktif' : 'Belum aktif'}</dd>
              {persisten === false ? (
                <dd>
                  <button type="button" className="min-h-10 text-base font-bold text-utama underline" onClick={async () => setPersisten(await mintaPenyimpananPersisten())}>
                    Minta sekarang
                  </button>
                </dd>
              ) : null}
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-garis pt-5">
            <Tombol ukuran="besar" onClick={unduh} className="w-full sm:w-auto">
              Unduh berkas .gensoal
            </Tombol>
            <label className={`${kelasTombol('garis', 'besar')} w-full cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-utama sm:w-auto`}>
              Pulihkan dari berkas
              <input type="file" accept=".gensoal,application/json" className="sr-only" onChange={(e) => pilihBerkas(e.target.files?.[0])} />
            </label>
          </div>
          {galat ? (
            <Pemberitahuan nada="galat" className="mt-4">
              {galat}
            </Pemberitahuan>
          ) : null}
          {impor ? (
            <div className="mt-5 rounded-lg border border-utama p-4 sm:p-5">
              <div className="text-base font-bold text-redup">
                Cadangan {new Date(impor.dibuat_pada).toLocaleString('id-ID')} · GenSoal {impor.versi_aplikasi}
              </div>
              <ul className="mt-3 grid gap-1 text-base sm:grid-cols-2">
                {Object.entries(ringkasCadangan(impor))
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <li key={k}>
                      {LABEL_TOKO[k] ?? k}: {n}
                    </li>
                  ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Tombol onClick={() => pulihkan('gabung')}>Gabungkan</Tombol>
                <Tombol varian="garis" onClick={() => pulihkan('ganti')}>
                  Ganti semua data…
                </Tombol>
                <Tombol varian="hantu" onClick={() => setImpor(null)}>
                  Batal
                </Tombol>
              </div>
              <p className="mt-3 text-base text-redup">Gabungkan: data dengan id sama ditimpa, sisanya dipertahankan.</p>
            </div>
          ) : null}
        </KartuBagian>

        <KartuBagian judul={<span className="tabular-nums">Pengaturan tersimpan · {preset?.length ?? 0}</span>} pita="tanpa" ket="Isian layar Buat soal yang disimpan untuk dipakai lagi. Ikut berkas cadangan.">
          <ul className="border-t border-garis">
            {preset?.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-garis py-2">
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold text-tinta">{p.nama}</span>
                  <span className="block text-base text-redup">dipakai {formatTanggal(p.terakhir_dipakai)}</span>
                </span>
                <Tombol varian="hantu" ukuran="kecil" className="!text-buruk" aria-label={`Hapus pengaturan ${p.nama}`} onClick={() => hapusPreset(p)}>
                  Hapus…
                </Tombol>
              </li>
            ))}
            {preset && !preset.length ? <li className="py-3 text-base text-redup">Belum ada. Simpan isian di layar Buat soal, Pengaturan lanjutan.</li> : null}
          </ul>
        </KartuBagian>

        <ZonaBerbahaya>
          <BarisBahaya
            judul="Hapus semua data"
            ket="Semua soal, pengaturan tersimpan, profil, dan kunci API di peramban ini. Tidak dapat dibatalkan."
            aksi={
              <Tombol varian="bahaya" onClick={hapusSemua} className="w-full sm:w-auto">
                Hapus semua data…
              </Tombol>
            }
          />
        </ZonaBerbahaya>
      </div>
    </div>
  );
}
