import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/skema';
import { Orbit } from '../komponen/Logo';
import { Titik } from '../komponen/Status';
import { Panah, TautanTombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';
import { daftarRingkasan, formatTanggal, labelStatusPaket } from './ringkas';

const SEMINGGU = 7 * 24 * 60 * 60 * 1000;

export function Beranda() {
  useJudulHalaman('');
  const profil = useProfil();
  const terbaru = useLiveQuery(() => daftarRingkasan(5), []);
  const preset = useLiveQuery(() => db.preset.orderBy('terakhir_dipakai').reverse().limit(4).toArray(), []);
  const kunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const [persisten, setPersisten] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisten, () => setPersisten(null));
  }, []);
  const adaData = (terbaru?.length ?? 0) > 0;
  const perluCadangan = adaData && (!profil.cadangan_terakhir || Date.now() - profil.cadangan_terakhir > SEMINGGU);
  const kunciAktif = kunci?.filter((k) => k.kunci) ?? [];

  return (
    <div className="relative overflow-hidden">
      <Orbit className="-right-[420px] -top-[60px] hidden h-[900px] w-[900px] md:block lg:-right-[220px]" />
      <Orbit className="-right-[190px] -top-[40px] h-[500px] w-[500px] md:hidden" />
      <div className="relative mx-auto max-w-[1312px] px-4 pt-12 sm:px-8 lg:px-16 lg:pt-[72px]">
        <div className="mono text-redup">Kurikulum Merdeka · Kelas 1–12 · Tanpa akun</div>
        <h1 className="judul-besar mt-4 max-w-[820px] text-[46px] sm:text-[72px] lg:mt-7 lg:text-[96px]">
          Soal yang
          <br className="hidden sm:block" /> sudah terbukti
          <br className="hidden sm:block" /> benar.
        </h1>
        <p className="mt-6 max-w-[520px] text-base font-light leading-relaxed text-isi sm:mt-9 sm:text-[19px]">
          Pilih tujuan pembelajaran, atur komposisi mudah, sedang, dan sulit, lalu unduh lembar soal lengkap sebagai Word atau PDF. Kunci dihitung ulang oleh kode, bukan oleh model.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 sm:mt-11">
          <TautanTombol to="/soal/baru" ukuran="besar" className="w-full sm:w-auto">
            Buat soal baru <Panah />
          </TautanTombol>
          <TautanTombol to="/soal/baru?mulai=kustom" varian="garis" ukuran="besar" className="w-full sm:w-auto">
            Tulis kurikulum sendiri
          </TautanTombol>
        </div>

        {kunciAktif.length === 0 ? (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-tinta px-5 py-4">
            <span className="text-[15px]">Langkah pertama: pasang kunci API dari penyedia AI pilihan Anda. Beberapa penyedia gratis.</span>
            <TautanTombol to="/pengaturan/ai" ukuran="kecil">
              Pasang kunci
            </TautanTombol>
          </div>
        ) : null}

        <section aria-label="Ringkasan" className="mt-14 grid grid-cols-2 border-y border-garis lg:mt-24 lg:grid-cols-4">
          {[
            ['Cakupan', 'Kelas 1–12'],
            ['Komposisi', 'Mudah · Sedang · Sulit'],
            ['Verifikasi', 'Kunci dihitung ulang'],
            ['Unduhan', 'Word · PDF · TeX'],
          ].map(([l, n], i) => (
            <div key={l} className={`px-0 py-5 sm:py-7 ${i % 2 ? 'border-l border-garis pl-4 sm:pl-6' : 'pr-4'} ${i === 2 ? 'border-t border-garis lg:border-t-0 lg:border-l lg:pl-6' : ''} ${i === 3 ? 'border-t border-garis lg:border-t-0' : ''}`}>
              <div className="mono text-redup">{l}</div>
              <div className="mt-3 text-xl font-extralight uppercase tracking-[.02em] sm:text-[26px] xl:text-[32px]">{n}</div>
            </div>
          ))}
        </section>

        <section aria-label="Soal terbaru" className="mt-14 grid gap-12 pb-24 lg:mt-[72px] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="mono font-medium">Soal terbaru</h2>
              <Link className="mono text-redup hover:text-tinta" to="/soal">
                Lihat semua
              </Link>
            </div>
            <div className="border-t border-tinta">
              {terbaru === undefined ? null : terbaru.length === 0 ? (
                <p className="border-b border-garis py-6 text-[17px] font-light text-isi">Belum ada paket soal. Buat paket pertama Anda; semuanya tersimpan di perangkat ini.</p>
              ) : (
                terbaru.map((r) => {
                  const st = labelStatusPaket(r);
                  return (
                    <Link key={r.paket.id} to={`/soal/${r.paket.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-garis px-2 py-5 hover:bg-lembut sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:py-[22px]">
                      <span className="mono hidden text-redup sm:block">Kelas {r.paket.parameter_json.kelas}</span>
                      <span className="text-[17px] font-light sm:text-xl">
                        {r.paket.judul}
                        <span className="mono mt-1.5 block text-redup sm:hidden">
                          Kelas {r.paket.parameter_json.kelas} · {st.teks}
                        </span>
                      </span>
                      <span className="mono flex items-center gap-2">
                        <Titik isi={st.isi} />
                        <span className="hidden sm:inline">{st.teks}</span>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
            {preset && preset.length > 0 ? (
              <div className="mt-12">
                <h2 className="mono mb-4 font-medium">Preset</h2>
                <div className="flex flex-wrap gap-3">
                  {preset.map((p) => (
                    <Link key={p.id} to={`/soal/baru?preset=${p.id}`} className="inline-flex min-h-11 items-center rounded-[2px] border border-garis-kuat px-[18px] text-[15px] hover:border-tinta">
                      {p.nama}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <aside aria-label="Cadangan" className="self-start border border-garis bg-panel p-6 sm:p-8">
            <div className="mono text-redup">Cadangan</div>
            <p className="mt-4 text-[19px] font-light leading-snug sm:text-[22px]">
              {perluCadangan
                ? `Cadangan terakhir: ${formatTanggal(profil.cadangan_terakhir)}. Unduh cadangan sekarang agar soal aman bila data situs terhapus.`
                : 'Data hanya tinggal di peramban ini. Unduh cadangan agar soal aman bila data situs terhapus.'}
            </p>
            <TautanTombol to="/cadangan" varian={perluCadangan ? 'utama' : 'garis'} className="mt-7">
              Unduh berkas .gensoal
            </TautanTombol>
            <div className="mono mt-5 text-redup">Penyimpanan persisten: {persisten === null ? 'tidak didukung' : persisten ? 'aktif' : 'belum aktif'}</div>
          </aside>
        </section>
      </div>
    </div>
  );
}
