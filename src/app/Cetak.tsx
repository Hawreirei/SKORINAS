import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import { bangunDokumen } from '../ekspor/model';
import { VERSI_APLIKASI } from '../ekspor/peramban';
import { LembarCetak } from '../komponen/LembarCetak';
import { kelasTombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';

/** Tampilan cetak peramban: cadangan bila PDF gagal; pratinjau sama dengan hasil cetak. */
export default function Cetak() {
  const { id = '' } = useParams();
  const [q] = useSearchParams();
  const paket = useLiveQuery(() => db.paket_soal.get(id), [id]);
  const soal = useLiveQuery(() => db.soal.where('paket_id').equals(id).toArray(), [id]);
  const profil = useProfil();
  const opsi = { kop: q.get('kop') !== '0', kunci: q.get('kunci') !== '0', kisi: q.get('kisi') !== '0', pembahasan: q.get('pembahasan') === '1' };
  const dok = useMemo(() => (paket && soal ? bangunDokumen(paket, soal, profil, opsi, VERSI_APLIKASI) : null), [paket, soal, profil, opsi.kop, opsi.kunci, opsi.kisi, opsi.pembahasan]);
  useJudulHalaman(paket?.judul ?? 'Cetak');
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
  if (!dok) return <div className="mono p-10 text-redup">Memuat…</div>;
  return (
    <div className="min-h-screen bg-[#f6f7f8] py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 16mm 18mm; } @media print { .halaman-baru { break-before: page; margin-top: 0 !important; } }`}</style>
      <div className="tanpa-cetak mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-4">
        <span className="mono text-[#5b616b]">Tampilan cetak · {dok.judul}</span>
        <button type="button" className={kelasTombol('utama')} onClick={() => window.print()}>
          Cetak atau simpan PDF
        </button>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-[16mm] text-[14pt] leading-[1.45] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <LembarCetak d={dok} />
      </div>
    </div>
  );
}
