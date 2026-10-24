import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/skema';
import { setujui } from '../generasi/operasi';
import { paketUntuk } from '../paket';
import { KepalaHalaman } from '../komponen/Kepala';
import { LencanaMutu } from '../komponen/Status';
import { TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';
import { useJudulHalaman } from './kait';

/** Telaah mandiri: semua soal perlu_telaah yang belum ditandai, lintas paket. */
export default function Telaah() {
  useJudulHalaman('Mohon cek dulu');
  const data = useLiveQuery(async () => {
    const soal = await db.soal.where('status_mutu').equals('perlu_telaah').filter((s) => s.dihapus_pada == null && s.status_telaah !== 'ditelaah_guru').toArray();
    const paket = await db.paket_soal.bulkGet([...new Set(soal.map((s) => s.paket_id))]);
    const peta = new Map(paket.filter(Boolean).map((p) => [p!.id, p!]));
    return soal.filter((s) => peta.get(s.paket_id)?.dihapus_pada == null).map((s) => ({ s, p: peta.get(s.paket_id)! }));
  }, []);
  return (
    <div className="mx-auto max-w-[960px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman label="Semua paket" judul="Mohon cek dulu">
        Kunci soal di bawah tidak dapat dicek otomatis. Baca soal beserta kunci dan pembahasannya, lalu tekan Setujui atau sunting di paketnya. Soal ini baru bisa diunduh setelah disetujui.
      </KepalaHalaman>
      <div className="mt-8 space-y-6">
        {data && !data.length ? <p className="rounded-xl border border-garis bg-kartu p-6 text-[17px] text-isi">Tidak ada soal yang menunggu dicek.</p> : null}
        {data?.map(({ s, p }) => {
          const risiko = paketUntuk(p.parameter_json.rumpun)?.risikoTinggi ?? false;
          return (
            <article key={s.id} className="rounded-xl border border-garis border-t-4 border-t-awas bg-kartu p-4 sm:p-6">
              <div className="flex flex-wrap justify-between gap-3">
                <Link to={`/soal/${p.id}#soal-${s.id}`} className="text-base font-bold text-redup hover:text-utama">
                  {p.judul} · soal {s.urutan}
                </Link>
                <LencanaMutu mutu={s.status_mutu} telaah={s.status_telaah} />
              </div>
              <TampilSoal isi={s.isi_json} besar={false} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Tombol
                  varian="garis"
                  onClick={() => {
                    if (risiko && !confirm('Anda sudah memeriksa kunci dan kutipan sumber?')) return;
                    void setujui(s.id, risiko);
                  }}
                >
                  Setujui
                </Tombol>
                <Link to={`/soal/${p.id}`} className="inline-flex min-h-11 items-center px-3 font-bold text-utama hover:underline">
                  Sunting di paket
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
