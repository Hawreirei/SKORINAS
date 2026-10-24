import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/skema';
import { bangunDokumen, penghalangEkspor, soalUntukEkspor, type OpsiEkspor } from '../ekspor/model';
import { ekspor, VERSI_APLIKASI, type FormatEkspor } from '../ekspor/peramban';
import { LembarCetak } from '../komponen/LembarCetak';
import { usePesan } from '../komponen/Pesan';
import { Peringatan } from '../komponen/Status';
import { kelasTombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';

const FORMAT: { id: FormatEkspor; nama: string; ket: string; ext: string }[] = [
  { id: 'docx', nama: 'Word (.docx)', ket: 'Dapat disunting di Word. Rumus pecahan bertumpuk asli (Office Math).', ext: '.docx' },
  { id: 'pdf', nama: 'PDF', ket: 'Siap cetak, rumus dan gambar vektor, font tertanam.', ext: '.pdf' },
  { id: 'tex', nama: 'LaTeX (.tex)', ket: 'Berkas sumber 14 pt, dua kolom, untuk dikompilasi sendiri di Overleaf atau TeX lokal.', ext: '.tex' },
];

export default function Ekspor() {
  const { id = '' } = useParams();
  const paket = useLiveQuery(() => db.paket_soal.get(id), [id]);
  const soal = useLiveQuery(() => db.soal.where('paket_id').equals(id).toArray(), [id]);
  const profil = useProfil();
  const pesan = usePesan();
  const [format, setFormat] = useState<FormatEkspor>('docx');
  const [opsi, setOpsi] = useState<OpsiEkspor>({ kop: true, kunci: true, kisi: true, pembahasan: false });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  useJudulHalaman(paket ? `Unduh · ${paket.judul}` : 'Unduh');

  const dok = useMemo(() => (paket && soal ? bangunDokumen(paket, soal, profil, opsi, VERSI_APLIKASI) : null), [paket, soal, profil, opsi]);
  if (paket === undefined || soal === undefined) return <div className="mono px-16 py-20 text-redup">Memuat…</div>;
  if (!paket || !dok) return <div className="px-4 py-20 sm:px-16">Paket tidak ditemukan.</div>;

  const aktif = soalUntukEkspor(soal);
  const penghalang = penghalangEkspor(paket, aktif);
  const halaman = 1 + (opsi.kunci ? 1 : 0) + (opsi.pembahasan ? 1 : 0) + (opsi.kisi ? 1 : 0) + Math.floor(aktif.length / 8);

  async function unduh() {
    setSibuk(true);
    setGalat(null);
    try {
      const h = await ekspor(format, paket!, soal!, profil, opsi);
      pesan(`${h.nama} terunduh (${Math.round(h.ukuran / 1024)} KB, ${(h.ms / 1000).toFixed(1).replace('.', ',')} detik).`);
    } catch (e) {
      setGalat(`${(e as Error).message} Anda dapat memakai tampilan cetak peramban sebagai cadangan.`);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1312px] flex-wrap px-4 sm:px-8 lg:px-16">
      <div className="min-w-0 flex-[1_1_520px] pb-20 pt-10 lg:pr-14 lg:pt-14">
        <div className="mono text-redup">
          <Link to={`/soal/${id}`} className="hover:text-tinta">
            {paket.judul}
          </Link>{' '}
          · {aktif.length} soal
        </div>
        <h1 className="judul-besar mt-3.5 text-[44px] sm:text-[64px]">Unduh</h1>
        <p className="mt-5 max-w-[520px] text-[17px] font-light leading-relaxed text-isi">Berkas dibuat langsung di perangkat ini. Tidak ada yang diunggah ke server.</p>

        {penghalang.length ? (
          <Peringatan className="mt-8">
            {penghalang.length} soal berstatus perlu telaah belum Anda tandai. <Link to={`/soal/${id}`} className="underline">Telaah dulu di Peninjauan</Link>.
          </Peringatan>
        ) : null}

        <div role="radiogroup" aria-label="Format berkas" className="mt-10 border-t border-tinta">
          {FORMAT.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              onClick={() => setFormat(f.id)}
              className={`grid w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-5 border-b border-garis px-2 py-6 text-left ${format === f.id ? 'bg-lembut' : 'bg-latar'}`}
            >
              <span className="inline-flex size-[18px] items-center justify-center rounded-full border-[1.5px] border-tinta">
                <span className={`size-2 rounded-full bg-tinta ${format === f.id ? 'opacity-100' : 'opacity-0'}`} />
              </span>
              <span>
                <span className="block text-[22px] font-light">{f.nama}</span>
                <span className="mt-1.5 block text-sm text-redup">{f.ket}</span>
              </span>
              <span className="mono text-redup">{f.ext}</span>
            </button>
          ))}
        </div>

        <div className="mt-10">
          <div className="mono text-redup">Isi dokumen</div>
          <ul className="mt-4 border-t border-garis">
            {(
              [
                ['kop', 'Kop sekolah dan identitas siswa'],
                ['kunci', 'Kunci jawaban di halaman terpisah'],
                ['kisi', 'Kisi-kisi'],
                ['pembahasan', 'Pembahasan'],
              ] as [keyof OpsiEkspor, string][]
            ).map(([k, l]) => (
              <li key={k} className="flex items-center justify-between border-b border-garis py-4">
                <label htmlFor={`o-${k}`} className="text-base">
                  {l}
                </label>
                <input id={`o-${k}`} type="checkbox" className="size-5" checked={opsi[k]} onChange={(e) => setOpsi((o) => ({ ...o, [k]: e.target.checked }))} />
              </li>
            ))}
          </ul>
          {opsi.kop && !profil.sekolah ? (
            <p className="mt-3 text-sm text-redup">
              Kop memakai "Nama sekolah". <Link to="/pengaturan" className="underline">Isi profil sekolah</Link>.
            </p>
          ) : null}
        </div>

        {galat ? <Peringatan className="mt-6">{galat}</Peringatan> : null}
        <button type="button" onClick={unduh} disabled={sibuk || penghalang.length > 0 || !aktif.length} className={`${kelasTombol('utama', 'besar')} mt-10 w-full`}>
          <svg aria-hidden="true" width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M7 1v10M3 7l4 4 4-4M1 15h12" />
          </svg>
          {sibuk ? 'Membuat berkas…' : `Unduh ${FORMAT.find((f) => f.id === format)!.nama.split(' ')[0]}`}
        </button>
        <Link to={`/soal/${id}/cetak?kop=${+opsi.kop}&kunci=${+opsi.kunci}&kisi=${+opsi.kisi}&pembahasan=${+opsi.pembahasan}`} className="mono mt-5 inline-block text-redup hover:text-tinta" target="_blank">
          Tampilan cetak peramban
        </Link>
      </div>

      <section aria-label="Pratinjau halaman" className="min-w-0 flex-[1_1_440px] border-garis pb-20 lg:border-l lg:pl-14 lg:pt-14">
        <div className="mono flex justify-between text-redup">
          <span>Pratinjau</span>
          <span>Halaman 1 dari ±{halaman}</span>
        </div>
        <div className="mt-5 flex justify-center bg-lembut p-4 sm:p-10">
          <div className="aspect-[210/297] w-full max-w-[420px] overflow-hidden border border-[#d9dde2] bg-white px-[7%] py-[7%] text-[9.5px] leading-normal sm:text-[11px]">
            <LembarCetak d={dok} hanyaHalamanPertama />
          </div>
        </div>
        <p className="mono mt-4 leading-[1.8] text-redup">Dokumen mencatat versi soal dan versi kurikulum</p>
      </section>
    </div>
  );
}
