import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/skema';
import { Kartu, Titik } from '../komponen/Status';
import { Panah, TautanTombol } from '../komponen/Tombol';
import { useJudulHalaman } from './kait';
import { daftarRingkasan, formatTanggal, labelStatusPaket, type RingkasanPaket } from './ringkas';

const NADA = { proses: 'text-utama', awas: 'text-awas', baik: 'text-baik' } as const;

export function BarisPaket({ r }: { r: RingkasanPaket }) {
  const st = labelStatusPaket(r);
  return (
    <Link to={`/soal/${r.paket.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-garis px-1 py-4 last:border-b-0 hover:bg-lembut sm:px-3">
      <span className="min-w-0">
        <span className="block text-[17px] font-bold text-tinta">{r.paket.judul}</span>
        <span className="mt-0.5 block text-base text-redup">
          Kelas {r.paket.parameter_json.kelas} · {r.paket.parameter_json.mapel} · {formatTanggal(r.paket.dibuat_pada)}
        </span>
        <span className={`mt-1 flex items-center gap-2 text-base font-bold sm:hidden ${NADA[st.nada]}`}>
          <Titik isi={st.isi} />
          {st.teks}
        </span>
      </span>
      <span className={`hidden items-center gap-2 text-base font-bold sm:flex ${NADA[st.nada]}`}>
        <Titik isi={st.isi} />
        {st.teks}
      </span>
    </Link>
  );
}

/** Beranda sederhana: satu tombol besar "Buat soal" dan daftar soal terakhir. */
export function Beranda() {
  useJudulHalaman('');
  const terbaru = useLiveQuery(() => daftarRingkasan(5), []);
  const kunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const tanpaKunci = kunci !== undefined && !kunci.some((k) => k.kunci);

  return (
    <div className="mx-auto max-w-[960px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="text-base font-bold text-utama">Kelas 1–12 · tanpa akun</div>
      <h1 className="judul-besar mt-2 text-[34px] sm:text-[44px]">Buat soal yang kuncinya sudah dicek.</h1>
      <p className="mt-3 max-w-[620px] text-[17px] leading-relaxed text-redup">Isi kelas, mapel, dan jumlah soal. GenSoal membuat soalnya, menghitung ulang kuncinya, lalu Anda unduh sebagai Word atau PDF.</p>
      <TautanTombol to="/soal/baru" ukuran="besar" className="mt-7 w-full !min-h-16 !text-[19px] sm:w-auto sm:!px-10">
        Buat soal <Panah />
      </TautanTombol>

      {tanpaKunci ? (
        <Kartu pita="kuning" className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <span className="text-base">
            <strong>Sebelum mulai:</strong> pasang kunci API dari penyedia AI pilihan Anda. Beberapa penyedia gratis.
          </span>
          <TautanTombol to="/pengaturan/ai" varian="garis">
            Pasang kunci
          </TautanTombol>
        </Kartu>
      ) : null}

      <Kartu as="section" aria-label="Soal terakhir" className="mt-10">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-[22px] font-extrabold text-judul">Soal terakhir</h2>
          <Link className="text-base font-bold text-utama hover:underline" to="/soal">
            Lihat semua
          </Link>
        </div>
        {terbaru === undefined ? null : terbaru.length === 0 ? (
          <p className="py-4 text-base text-redup">Belum ada soal. Tekan "Buat soal" untuk membuat paket pertama; semuanya tersimpan di perangkat ini.</p>
        ) : (
          terbaru.map((r) => <BarisPaket key={r.paket.id} r={r} />)
        )}
      </Kartu>
    </div>
  );
}
