import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/skema';
import { MASA_SAMPAH_MS } from '../db/sampah';
import { hapusPaket, pulihkanPaket, pulihkanSoal } from '../generasi/operasi';
import { KepalaHalaman } from '../komponen/Kepala';
import { Kartu, Titik } from '../komponen/Status';
import { Chip, Panah, TautanTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman } from './kait';
import { daftarRingkasan, formatTanggal, labelStatusPaket } from './ringkas';
import { teksPolos } from '../matematika/teks';

export default function DaftarSoal() {
  useJudulHalaman('Soal saya');
  const [tab, setTab] = useState<'paket' | 'sampah'>('paket');
  const [cari, setCari] = useState('');
  const paket = useLiveQuery(() => daftarRingkasan(), []);
  const paketSampah = useLiveQuery(() => daftarRingkasan(undefined, true), []);
  const soalSampah = useLiveQuery(() => db.soal.filter((s) => s.dihapus_pada != null).toArray(), []);
  const q = cari.trim().toLowerCase();
  const tersaring = (paket ?? []).filter((r) => !q || `${r.paket.judul} ${r.paket.parameter_json.mapel} kelas ${r.paket.parameter_json.kelas} ${r.paket.parameter_json.tp.map((t) => t.rumusan).join(' ')}`.toLowerCase().includes(q));
  const sisaHari = (t: number) => Math.max(0, Math.ceil((t + MASA_SAMPAH_MS - Date.now()) / 86400000));

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <KepalaHalaman judul="Soal saya" />
        <TautanTombol to="/soal/baru" ukuran="besar">
          Buat soal <Panah />
        </TautanTombol>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Chip aktif={tab === 'paket'} onClick={() => setTab('paket')} className="tabular-nums">
          Paket · {paket?.length ?? 0}
        </Chip>
        <Chip aktif={tab === 'sampah'} onClick={() => setTab('sampah')} className="tabular-nums">
          Tong sampah · {(paketSampah?.length ?? 0) + (soalSampah?.length ?? 0)}
        </Chip>
        {tab === 'paket' ? <input className="bidang ml-auto !min-h-11 sm:!w-72" placeholder="Cari judul, mapel, TP" aria-label="Cari paket" value={cari} onChange={(e) => setCari(e.target.value)} /> : null}
      </div>

      {tab === 'paket' ? (
        <Kartu as="div" className="mt-6 !py-1">
          {paket && !tersaring.length ? <p className="py-8 text-[17px] text-isi">{q ? 'Tidak ada paket yang cocok.' : 'Belum ada paket soal.'}</p> : null}
          {tersaring.map((r) => {
            const st = labelStatusPaket(r);
            return (
              <div key={r.paket.id} className="grid items-center gap-x-6 gap-y-2 border-b border-garis px-1 py-4 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)_auto_auto]">
                <span className="text-base font-bold text-redup">Kelas {r.paket.parameter_json.kelas}</span>
                <Link to={`/soal/${r.paket.id}`} className="min-w-0 hover:underline">
                  <span className="text-[18px] font-bold">{r.paket.judul}</span>
                  <span className="mt-0.5 block text-base text-redup">
                    {r.paket.parameter_json.mapel} · {formatTanggal(r.paket.dibuat_pada)}
                  </span>
                </Link>
                <span className={`flex items-center gap-2 text-base font-bold ${st.nada === 'baik' ? 'text-baik' : st.nada === 'awas' ? 'text-awas' : 'text-utama'}`}>
                  <Titik isi={st.isi} />
                  {st.teks}
                </span>
                <span className="flex gap-4 text-base font-bold">
                  <Link to={`/soal/${r.paket.id}/ekspor`} className="inline-flex min-h-10 items-center text-utama hover:underline">
                    Unduh
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center text-redup hover:text-buruk hover:underline"
                    aria-label={`Hapus paket ${r.paket.judul}`}
                    onClick={() => {
                      if (confirm('Pindahkan paket ini ke tong sampah? Dapat dipulihkan selama 30 hari.')) void hapusPaket(r.paket.id);
                    }}
                  >
                    Hapus
                  </button>
                </span>
              </div>
            );
          })}
        </Kartu>
      ) : (
        <div className="mt-8">
          <p className="text-base text-isi">Isi tong sampah dikosongkan otomatis 30 hari setelah dihapus.</p>
          <Kartu as="div" className="mt-5 !py-1">
            {paketSampah?.map((r) => (
              <div key={r.paket.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-garis px-2 py-4">
                <span>
                  <span className="text-lg">Paket · {r.paket.judul}</span>
                  <span className="font-semibold block text-redup">{sisaHari(r.paket.dihapus_pada!)} hari lagi dihapus permanen</span>
                </span>
                <Tombol varian="hantu" ukuran="kecil" onClick={() => pulihkanPaket(r.paket.id)}>
                  Pulihkan
                </Tombol>
              </div>
            ))}
            {soalSampah?.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-garis px-2 py-4">
                <span className="min-w-0">
                  <span className="text-[17px]">Soal · {teksPolos(s.isi_json.pokok).slice(0, 100)}</span>
                  <span className="font-semibold block text-redup">{sisaHari(s.dihapus_pada!)} hari lagi dihapus permanen</span>
                </span>
                <Tombol varian="hantu" ukuran="kecil" onClick={() => pulihkanSoal(s.id)}>
                  Pulihkan
                </Tombol>
              </div>
            ))}
            {!paketSampah?.length && !soalSampah?.length ? <p className="py-8 text-isi">Tong sampah kosong.</p> : null}
          </Kartu>
        </div>
      )}
    </div>
  );
}
