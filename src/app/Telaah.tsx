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
  useJudulHalaman('Telaah');
  const data = useLiveQuery(async () => {
    const soal = await db.soal.where('status_mutu').equals('perlu_telaah').filter((s) => s.dihapus_pada == null && s.status_telaah !== 'ditelaah_guru').toArray();
    const paket = await db.paket_soal.bulkGet([...new Set(soal.map((s) => s.paket_id))]);
    const peta = new Map(paket.filter(Boolean).map((p) => [p!.id, p!]));
    return soal.filter((s) => peta.get(s.paket_id)?.dihapus_pada == null).map((s) => ({ s, p: peta.get(s.paket_id)! }));
  }, []);
  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-10 sm:px-8 lg:px-16 lg:pt-14">
      <KepalaHalaman label="Telaah mandiri" judul="Perlu telaah">
        Soal di bawah tidak dapat dihitung ulang otomatis. Baca soal beserta kunci dan pembahasannya, lalu tandai sudah ditelaah atau sunting di paketnya. Soal ini baru dapat diekspor setelah ditandai.
      </KepalaHalaman>
      <div className="mt-10 border-t border-tinta">
        {data && !data.length ? <p className="py-8 text-[17px] font-light text-isi">Tidak ada soal yang menunggu telaah.</p> : null}
        {data?.map(({ s, p }) => {
          const risiko = paketUntuk(p.parameter_json.rumpun)?.risikoTinggi ?? false;
          return (
            <article key={s.id} className="border-b border-garis py-8">
              <div className="flex flex-wrap justify-between gap-3">
                <Link to={`/soal/${p.id}#soal-${s.id}`} className="mono text-redup hover:text-tinta">
                  {p.judul} · butir {s.urutan}
                </Link>
                <LencanaMutu mutu={s.status_mutu} telaah={s.status_telaah} />
              </div>
              <TampilSoal isi={s.isi_json} besar={false} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Tombol
                  onClick={() => {
                    if (risiko && !confirm('Rumpun berisiko tinggi. Anda sudah memeriksa kunci dan kutipan sumber?')) return;
                    void setujui(s.id, risiko);
                  }}
                >
                  Tandai sudah ditelaah
                </Tombol>
                <Link to={`/soal/${p.id}`} className="mono inline-flex min-h-11 items-center px-3 text-redup hover:text-tinta">
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
