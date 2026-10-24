import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/skema';
import { bangunDokumen, berkasDipilih, JENIS_BERKAS_LABEL, penghalangEkspor, soalUntukEkspor, type JenisBerkas, type OpsiEkspor } from '../ekspor/model';
import { ekspor, type FormatEkspor } from '../ekspor/peramban';
import { PenunjukLangkah } from '../komponen/Kepala';
import { LembarCetak } from '../komponen/LembarCetak';
import { usePesan } from '../komponen/Pesan';
import { Kartu, Peringatan } from '../komponen/Status';
import { Chip, kelasTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';

const FORMAT: { id: FormatEkspor; nama: string; tombol: string; ket: string; ext: string }[] = [
  { id: 'docx', nama: 'Word (.docx)', tombol: 'Word', ket: 'Dapat disunting di Word. Times New Roman 12, pecahan bertumpuk.', ext: '.docx' },
  { id: 'pdf', nama: 'PDF', tombol: 'PDF', ket: 'Siap cetak. Times New Roman 12, rumus dan gambar tajam.', ext: '.pdf' },
  { id: 'tex', nama: 'LaTeX (.tex)', tombol: 'LaTeX', ket: 'Berkas sumber untuk dikompilasi sendiri di Overleaf atau TeX lokal.', ext: '.tex' },
];

function PilihFormat({ f, dipilih, pilih }: { f: (typeof FORMAT)[number]; dipilih: boolean; pilih: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={dipilih}
      onClick={pilih}
      className={`grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border px-4 py-4 text-left ${dipilih ? 'border-utama bg-utama-lembut/60' : 'border-garis bg-kartu hover:border-utama'}`}
    >
      <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-utama">
        <span className={`size-2.5 rounded-full bg-utama ${dipilih ? 'opacity-100' : 'opacity-0'}`} />
      </span>
      <span>
        <span className="block text-[20px] font-extrabold text-judul">{f.nama}</span>
        <span className="mt-0.5 block text-base text-redup">{f.ket}</span>
      </span>
      <span className="text-base font-bold text-redup">{f.ext}</span>
    </button>
  );
}

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
  const [lihat, setLihat] = useState<JenisBerkas>('soal');
  useJudulHalaman(paket ? `Unduh · ${paket.judul}` : 'Unduh');

  const pratinjau: JenisBerkas = berkasDipilih(opsi).includes(lihat) ? lihat : 'soal';
  const dok = useMemo(() => (paket && soal ? bangunDokumen(paket, soal, profil, opsi, pratinjau) : null), [paket, soal, profil, opsi, pratinjau]);
  if (paket === undefined || soal === undefined) return <div className="px-4 py-20 text-center text-redup">Memuat…</div>;
  if (!paket || !dok) return <div className="px-4 py-20 sm:px-8">Paket tidak ditemukan.</div>;

  const aktif = soalUntukEkspor(soal);
  const penghalang = penghalangEkspor(paket, aktif);
  const halaman = { soal: 1 + Math.floor(aktif.length / 6), kunci: 1 + (opsi.pembahasan ? 1 + Math.floor(aktif.length / 10) : 0), kisi: 1 + Math.floor(aktif.length / 8) }[pratinjau];
  const pilihan = FORMAT.find((f) => f.id === format)!;
  const daftar = berkasDipilih(opsi);
  const terhalang = sibuk || penghalang.length > 0 || !aktif.length;

  /** Lembar soal, kunci jawaban, dan kisi-kisi diunduh sebagai berkas terpisah, berurutan. */
  async function unduh(berkas: JenisBerkas[]) {
    setSibuk(true);
    setGalat(null);
    try {
      const nama: string[] = [];
      for (const [i, b] of berkas.entries()) {
        // Jeda singkat agar peramban menerima beberapa unduhan berturut-turut.
        if (i) await new Promise((s) => setTimeout(s, 400));
        nama.push((await ekspor(format, paket!, soal!, profil, opsi, b)).nama);
      }
      pesan(nama.length > 1 ? `${nama.length} berkas terunduh: ${nama.join(', ')}.` : `${nama[0]} terunduh.`);
    } catch (e) {
      setGalat(`${(e as Error).message} Anda dapat memakai tampilan cetak peramban sebagai cadangan.`);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      <PenunjukLangkah langkah={3} paketId={id} />
      <div className="mx-auto flex max-w-[1312px] flex-wrap gap-x-10 px-4 sm:px-8">
        <div className="min-w-0 flex-[1_1_480px] pb-16 pt-8 sm:pt-10">
          <div className="text-base font-bold text-utama">
            <Link to={`/soal/${id}`} className="hover:underline">
              {paket.judul}
            </Link>{' '}
            · {aktif.length} soal
          </div>
          <h1 className="judul-besar mt-1 text-[30px] sm:text-[36px]">Unduh</h1>
          <p className="mt-2 max-w-[520px] text-[17px] leading-relaxed text-redup">Berkas dibuat langsung di perangkat ini. Tidak ada yang diunggah ke server.</p>

          {penghalang.length ? (
            <Peringatan className="mt-6">
              {penghalang.length} soal masih "Mohon cek dulu". <Link to={`/soal/${id}`} className="font-bold underline">Setujui dulu di layar Periksa</Link>.
            </Peringatan>
          ) : null}

          <Kartu pita="utama" className="mt-6">
            <h2 className="text-[20px] font-extrabold text-judul">Pilih format</h2>
            <div role="radiogroup" aria-label="Format berkas" className="mt-3 space-y-3">
              {FORMAT.filter((f) => f.id !== 'tex' || format === 'tex').map((f) => (
                <PilihFormat key={f.id} f={f} dipilih={format === f.id} pilih={() => setFormat(f.id)} />
              ))}
            </div>
          </Kartu>

          <Kartu pita="kuning" className="mt-6">
            <h2 className="text-[20px] font-extrabold text-judul">Berkas yang diunduh</h2>
            <p className="mt-1 text-base text-redup">Kunci jawaban dan kisi-kisi dibuat sebagai berkas tersendiri, terpisah dari lembar soal.</p>
            <ul className="mt-2">
              {(
                [
                  ['soal', null, 'kop', 'Kop sekolah dan identitas siswa'],
                  ['kunci', 'kunci', 'pembahasan', 'Sertakan pembahasan'],
                  ['kisi', 'kisi', null, null],
                ] as [JenisBerkas, keyof OpsiEkspor | null, keyof OpsiEkspor | null, string | null][]
              ).map(([b, pilih, tambahan, labelTambahan]) => {
                const dipakai = !pilih || opsi[pilih];
                return (
                  <li key={b} className="border-b border-garis py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 text-[17px] font-bold">
                        <input
                          type="checkbox"
                          className="size-5"
                          checked={dipakai}
                          disabled={!pilih}
                          aria-label={JENIS_BERKAS_LABEL[b]}
                          onChange={(e) => pilih && setOpsi((o) => ({ ...o, [pilih]: e.target.checked }))}
                        />
                        {JENIS_BERKAS_LABEL[b]}
                      </label>
                      <Tombol varian="hantu" ukuran="kecil" disabled={terhalang || !dipakai} onClick={() => unduh([b])} aria-label={`Unduh ${JENIS_BERKAS_LABEL[b].toLowerCase()} saja`}>
                        Unduh ini saja
                      </Tombol>
                    </div>
                    {tambahan && labelTambahan ? (
                      <label className={`mt-2 ml-8 flex items-center gap-3 text-base ${dipakai ? '' : 'opacity-50'}`}>
                        <input type="checkbox" className="size-5" disabled={!dipakai} checked={opsi[tambahan]} onChange={(e) => setOpsi((o) => ({ ...o, [tambahan]: e.target.checked }))} />
                        {labelTambahan}
                      </label>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {opsi.kop && !profil.sekolah ? (
              <p className="mt-2 text-base text-redup">
                Kop memakai "Nama sekolah". <Link to="/pengaturan" className="font-bold text-utama underline">Isi profil sekolah</Link>.
              </p>
            ) : null}
          </Kartu>

          {galat ? <Peringatan className="mt-6">{galat}</Peringatan> : null}
          <button type="button" onClick={() => unduh(daftar)} disabled={terhalang} className={`${kelasTombol('utama', 'besar')} mt-6 w-full`}>
            <svg aria-hidden="true" width="16" height="18" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 1v10M3 7l4 4 4-4M1 15h12" />
            </svg>
            {sibuk ? 'Membuat berkas…' : daftar.length > 1 ? `Unduh ${daftar.length} berkas ${pilihan.tombol}` : `Unduh ${pilihan.tombol}`}
          </button>
          {daftar.length > 1 ? <p className="mt-2 text-base text-redup">Bila peramban bertanya, izinkan mengunduh beberapa berkas.</p> : null}

          <details className="mt-6 rounded-lg border border-garis bg-kartu px-4 py-3">
            <summary className="cursor-pointer text-base font-bold text-redup">Menu lanjutan</summary>
            <div className="mt-3 space-y-3">
              <PilihFormat f={FORMAT[2]} dipilih={format === 'tex'} pilih={() => setFormat('tex')} />
              <p className="text-base text-redup">Berkas .tex memakai templatnya sendiri dan tidak mengubah font Word atau PDF.</p>
              <p className="text-base">
                Tampilan cetak peramban:{' '}
                {daftar.map((b, i) => (
                  <span key={b}>
                    {i ? ' · ' : ''}
                    <Link to={`/soal/${id}/cetak?berkas=${b}&kop=${+opsi.kop}&pembahasan=${+opsi.pembahasan}`} className="font-bold text-utama hover:underline" target="_blank">
                      {JENIS_BERKAS_LABEL[b].toLowerCase()}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          </details>
        </div>

        <section aria-label="Pratinjau halaman" className="min-w-0 flex-[1_1_440px] pb-16 lg:pt-10">
          <Kartu pita="tanpa">
            <div className="flex justify-between text-base font-bold text-redup">
              <span>Pratinjau · {JENIS_BERKAS_LABEL[pratinjau].toLowerCase()}</span>
              <span>Halaman 1 dari ±{halaman}</span>
            </div>
            {daftar.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {daftar.map((b) => (
                  <Chip key={b} aktif={pratinjau === b} onClick={() => setLihat(b)} className="!min-h-10 !px-3">
                    {JENIS_BERKAS_LABEL[b]}
                  </Chip>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex justify-center rounded-lg bg-lembut p-3 sm:p-8">
              <div className="aspect-[210/297] w-full max-w-[440px] overflow-hidden border border-garis bg-white px-[8%] py-[8%] text-[8.5px] leading-[1.4] shadow-sm sm:text-[10px]">
                <LembarCetak d={dok} hanyaHalamanPertama={pratinjau === 'soal'} />
              </div>
            </div>
            <p className="mt-3 text-base text-redup">Setiap berkas diunduh terpisah. Kisi-kisi mencatat kelas, mapel, CP, dan TP yang dipakai.</p>
          </Kartu>
        </section>
      </div>
    </div>
  );
}
