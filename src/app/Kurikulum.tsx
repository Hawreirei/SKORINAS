import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/skema';
import { RUMPUN_LABEL } from '../db/tipe';
import { muatBerkasMapel } from '../kurikulum/muat';
import { nilaiTp } from '../kurikulum/pemeriksa-tp';
import type { BerkasMapel } from '../kurikulum/tipe';
import { KepalaHalaman } from '../komponen/Kepala';
import { Chip, TautanTombol } from '../komponen/Tombol';
import { Titik } from '../komponen/Status';
import { useIndeksKurikulum, useJudulHalaman } from './kait';

/** Katalog kurikulum resmi (baca saja) dan TP kustom yang pernah ditulis guru. */
export default function Kurikulum() {
  useJudulHalaman('Kurikulum');
  const { data: indeks, galat } = useIndeksKurikulum();
  const [tab, setTab] = useState<'resmi' | 'kustom'>('resmi');
  const [mapel, setMapel] = useState('matematika');
  const [fase, setFase] = useState('A');
  const [berkas, setBerkas] = useState<BerkasMapel | null>(null);
  const tpKustom = useLiveQuery(() => db.tp_kustom.toArray(), []);
  const kur = indeks?.kurikulum.find((k) => k.aktif);
  const m = kur?.mapel.find((x) => x.kode === mapel);

  useEffect(() => {
    setBerkas(null);
    if (m) muatBerkasMapel(m)?.then(setBerkas);
  }, [m]);

  const garis = new Map<string, NonNullable<typeof tpKustom>>();
  for (const t of tpKustom ?? []) garis.set(t.garis_id, [...(garis.get(t.garis_id) ?? []), t].sort((a, b) => b.versi - a.versi));

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-10 sm:px-8 lg:px-16 lg:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <KepalaHalaman label="Data kurikulum" judul="Kurikulum">
          Data resmi dibaca dari berkas berversi di aplikasi dan tidak dapat diubah. TP yang Anda tulis sendiri tersimpan di perangkat ini, berversi, dan ikut berkas cadangan.
        </KepalaHalaman>
        <TautanTombol to="/soal/baru?mulai=kustom" varian="garis">
          Tulis kurikulum sendiri
        </TautanTombol>
      </div>
      <div className="mt-10 flex gap-3">
        <Chip aktif={tab === 'resmi'} onClick={() => setTab('resmi')}>
          Resmi
        </Chip>
        <Chip aktif={tab === 'kustom'} onClick={() => setTab('kustom')}>
          Kustom saya · {garis.size}
        </Chip>
      </div>

      {tab === 'resmi' ? (
        galat ? (
          <p className="mt-8 text-isi">Data kurikulum tidak dapat dimuat: {galat}</p>
        ) : !kur ? (
          <p className="mono mt-8 text-redup">Memuat…</p>
        ) : (
          <div className="mt-8">
            <p className="text-[15px] text-isi">
              {kur.nama} · {kur.dasar_hukum} · versi {kur.versi} · berlaku {kur.berlaku_dari}
            </p>
            <div className="mt-6 border-t border-tinta">
              {kur.mapel.map((x) => (
                <button key={x.id} type="button" onClick={() => setMapel(x.kode)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-garis px-2 py-3.5 text-left hover:bg-lembut sm:grid-cols-[minmax(0,1fr)_160px_160px] ${mapel === x.kode ? 'bg-lembut' : ''}`}>
                  <span className="text-[17px] font-light">{x.nama}</span>
                  <span className="mono hidden text-redup sm:block">{RUMPUN_LABEL[x.rumpun]}</span>
                  <span className="mono flex items-center gap-2">
                    <Titik isi={x.paket_aktif} />
                    {x.paket_aktif ? 'Dibuka' : 'Menunggu gerbang mutu'}
                  </span>
                </button>
              ))}
            </div>
            {m ? (
              <div className="mt-10">
                <h2 className="text-2xl font-light">{m.nama}</h2>
                {!m.berkas ? (
                  <p className="mt-3 text-isi">CP dan TP resmi untuk mapel ini belum dikurasi. Guru tetap dapat menulis CP dan TP sendiri.</p>
                ) : !berkas ? (
                  <p className="mono mt-3 text-redup">Memuat…</p>
                ) : (
                  <>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {Object.keys(berkas.fase).map((f) => (
                        <Chip key={f} aktif={fase === f} onClick={() => setFase(f)}>
                          Fase {f}
                        </Chip>
                      ))}
                    </div>
                    <div className="mt-6 border-t border-tinta">
                      {(berkas.fase[fase] ?? []).map((e) => (
                        <section key={e.id} className="border-b border-garis py-6">
                          <h3 className="text-xl font-light">{e.nama}</h3>
                          <p className="mt-3 text-[15px] leading-relaxed text-isi">{e.cp.teks}</p>
                          <p className="mono mt-2 text-redup">{e.cp.sumber_dokumen}</p>
                          <ul className="mt-4">
                            {e.tp.map((t) => {
                              const n = nilaiTp(t.rumusan);
                              return (
                                <li key={t.id} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-garis py-3 text-[15px]">
                                  <span className="mono w-36 shrink-0 text-redup">{t.kode}</span>
                                  <span className="min-w-0 flex-1">{t.rumusan}</span>
                                  <span className="mono text-redup">
                                    Kelas {t.kelas} · {t.status_validasi === 'tervalidasi' ? 'Tervalidasi' : 'Draf kurator'}
                                    {n.nilai === 'baik' ? ' · siap dipakai' : ''}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )
      ) : (
        <div className="mt-8 border-t border-tinta">
          {!garis.size ? <p className="py-8 text-isi">Belum ada TP kustom. TP yang Anda ketik di formulir Buat soal tersimpan di sini saat paket dibuat.</p> : null}
          {[...garis.values()].map((versi) => {
            const t = versi[0];
            return (
              <div key={t.garis_id} className="border-b border-garis py-5">
                <div className="mono text-redup">
                  {t.kurikulum_nama} · {t.mapel} · Kelas {t.kelas} · versi {t.versi}
                  {t.induk_id ? ' · disalin dari data resmi' : ''}
                </div>
                <p className="mt-2 text-[17px] font-light">{t.rumusan}</p>
                {versi.length > 1 ? (
                  <details className="mt-2">
                    <summary className="mono cursor-pointer text-redup">Versi sebelumnya</summary>
                    <ul className="mt-2 text-sm text-redup">
                      {versi.slice(1).map((v) => (
                        <li key={v.id}>
                          v{v.versi}: {v.rumusan}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
