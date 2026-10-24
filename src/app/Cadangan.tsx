import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { bacaCadangan, buatCadangan, hapusSemuaData, pulihkanCadangan, ringkasCadangan, type BerkasCadangan } from '../db/cadangan';
import { db } from '../db/skema';
import { simpanProfil } from '../db/profil';
import { unduhBlob, VERSI_APLIKASI } from '../ekspor/peramban';
import { PanelBantuan } from '../komponen/Bantuan';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Label, Peringatan } from '../komponen/Status';
import { Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';
import { mintaPenyimpananPersisten } from './mulai';
import { formatTanggal } from './ringkas';

const LABEL_TOKO: Record<string, string> = {
  profil: 'Profil',
  preset: 'Preset',
  paket_soal: 'Paket soal',
  soal: 'Soal',
  soal_gambar: 'Gambar soal',
  pekerjaan_generasi: 'Pekerjaan generasi',
  pemakaian_ai: 'Catatan pemakaian AI',
  log_soal: 'Jejak suntingan',
  tp_kustom: 'TP kustom',
};

export default function Cadangan() {
  useJudulHalaman('Cadangan');
  const profil = useProfil();
  const pesan = usePesan();
  const [ukuran, setUkuran] = useState<{ pakai: number; kuota: number } | null>(null);
  const [persisten, setPersisten] = useState<boolean | null>(null);
  const [impor, setImpor] = useState<BerkasCadangan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState('');
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
    if (mode === 'ganti' && !confirm('Semua soal, preset, dan profil di perangkat ini akan diganti isi cadangan. Lanjutkan?')) return;
    await pulihkanCadangan(db, impor, mode);
    setImpor(null);
    pesan('Data dipulihkan dari cadangan.');
  }

  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

  return (
    <div className="mx-auto flex max-w-[1312px] flex-wrap px-4 pb-24 sm:px-8 lg:px-16">
      <div className="min-w-0 flex-[999_1_560px] pt-10 lg:pr-12 lg:pt-14">
        <KepalaHalaman label="Data di perangkat ini" judul="Cadangan">
          Tanpa akun, cadangan adalah satu-satunya jalan memindah soal ke perangkat lain dan memulihkannya bila data situs terhapus. Kunci API tidak pernah ikut berkas cadangan.
        </KepalaHalaman>

        <div className="mt-10 grid border-y border-garis sm:grid-cols-3">
          <div className="py-6 pr-4">
            <div className="mono text-redup">Ukuran data</div>
            <div className="mt-3 text-2xl font-extralight">{ukuran ? mb(ukuran.pakai) : '—'}</div>
            <div className="mono mt-1 text-redup">
              {jumlah?.paket ?? 0} paket · {jumlah?.soal ?? 0} soal
            </div>
          </div>
          <div className="border-garis py-6 sm:border-l sm:pl-6">
            <div className="mono text-redup">Cadangan terakhir</div>
            <div className="mt-3 text-2xl font-extralight">{formatTanggal(profil.cadangan_terakhir)}</div>
          </div>
          <div className="border-garis py-6 sm:border-l sm:pl-6">
            <div className="mono text-redup">Penyimpanan persisten</div>
            <div className="mt-3 text-2xl font-extralight">{persisten === null ? 'Tidak didukung' : persisten ? 'Aktif' : 'Belum aktif'}</div>
            {persisten === false ? (
              <button type="button" className="mono mt-1 underline" onClick={async () => setPersisten(await mintaPenyimpananPersisten())}>
                Minta sekarang
              </button>
            ) : null}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-light">Ekspor</h2>
          <p className="mt-2 text-[15px] text-isi">Unduh semua data guru sebagai satu berkas .gensoal (JSON). Disarankan setiap minggu.</p>
          <Tombol ukuran="besar" className="mt-5" onClick={unduh}>
            Unduh berkas .gensoal
          </Tombol>
        </section>

        <section className="mt-12 border-t border-garis pt-9">
          <h2 className="text-xl font-light">Impor</h2>
          <p className="mt-2 text-[15px] text-isi">Pulihkan data atau pindahkan dari perangkat lain.</p>
          <label className="mono mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-[2px] border border-garis-kuat px-5 hover:border-tinta">
            Pilih berkas .gensoal
            <input type="file" accept=".gensoal,application/json" className="sr-only" onChange={(e) => pilihBerkas(e.target.files?.[0])} />
          </label>
          {galat ? <Peringatan className="mt-4">{galat}</Peringatan> : null}
          {impor ? (
            <div className="mt-5 border border-tinta p-5">
              <div className="mono text-redup">
                Cadangan {new Date(impor.dibuat_pada).toLocaleString('id-ID')} · GenSoal {impor.versi_aplikasi}
              </div>
              <ul className="mt-3 grid gap-1 text-[15px] sm:grid-cols-2">
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
                  Ganti semua data
                </Tombol>
                <Tombol varian="hantu" onClick={() => setImpor(null)}>
                  Batal
                </Tombol>
              </div>
              <p className="mt-3 text-sm text-redup">Gabungkan: rekaman dengan id sama ditimpa, sisanya dipertahankan.</p>
            </div>
          ) : null}
        </section>

        <section className="mt-12 border-t border-garis pt-9">
          <h2 className="text-xl font-light">Preset</h2>
          <ul className="mt-4 border-t border-garis">
            {preset?.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-garis py-3">
                <span>{p.nama}</span>
                <span className="mono text-redup">dipakai {formatTanggal(p.terakhir_dipakai)}</span>
              </li>
            ))}
            {!preset?.length ? <li className="py-3 text-redup">Belum ada preset.</li> : null}
          </ul>
        </section>

        <section className="mt-12 border-t border-buruk/40 pt-9">
          <h2 className="text-xl font-light text-buruk">Hapus semua data</h2>
          <p className="mt-2 text-[15px] text-isi">Menghapus semua soal, preset, profil, dan kunci API di peramban ini. Tidak dapat dibatalkan. Unduh cadangan lebih dulu.</p>
          <Label htmlFor="konfirmasi" className="mt-5">
            Ketik HAPUS untuk mengonfirmasi
          </Label>
          <div className="mt-2 flex flex-wrap gap-3">
            <input id="konfirmasi" className="bidang max-w-[200px]" value={konfirmasi} onChange={(e) => setKonfirmasi(e.target.value)} />
            <Tombol
              varian="bahaya"
              disabled={konfirmasi !== 'HAPUS'}
              onClick={async () => {
                await hapusSemuaData(db);
                setKonfirmasi('');
                pesan('Semua data di perangkat ini dihapus.');
                void segarkan();
              }}
            >
              Hapus semua
            </Tombol>
          </div>
        </section>
      </div>
      <aside aria-label="Bantuan" className="w-full border-garis pt-12 lg:w-[320px] lg:border-l lg:pl-10 lg:pt-14">
        <PanelBantuan id="cadangan" />
      </aside>
    </div>
  );
}
