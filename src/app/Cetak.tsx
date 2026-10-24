import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import { bangunDokumen, type JenisBerkas } from '../ekspor/model';
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
  const berkas: JenisBerkas = q.get('berkas') === 'kunci' ? 'kunci' : q.get('berkas') === 'kisi' ? 'kisi' : 'soal';
  const dok = useMemo(() => (paket && soal ? bangunDokumen(paket, soal, profil, opsi, berkas) : null), [paket, soal, profil, opsi.kop, opsi.kunci, opsi.kisi, opsi.pembahasan, berkas]);
  useJudulHalaman(paket?.judul ?? 'Cetak');
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
  if (!dok) return <div className="p-10 text-redup">Memuat…</div>;
  return (
    <div className="min-h-screen bg-latar py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 20mm; } @media print { .halaman-baru { break-before: page; margin-top: 0 !important; } }`}</style>
      <div className="tanpa-cetak mx-auto mb-6 flex max-w-[210mm] items-center justify-between px-4">
        <span className="font-bold text-redup">Tampilan cetak · {dok.judul}</span>
        <button type="button" className={kelasTombol('utama')} onClick={() => window.print()}>
          Cetak atau simpan PDF
        </button>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white p-[20mm] text-[12pt] leading-[1.4] shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <LembarCetak d={dok} />
      </div>
    </div>
  );
}
