import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/skema';
import { bangunDokumen, berkasDipilih, JENIS_BERKAS_LABEL, soalUntukEkspor, type JenisBerkas, type OpsiEkspor } from '../ekspor/model';
import { ekspor, type FormatEkspor } from '../ekspor/peramban';
import { KepalaHalaman } from '../komponen/Kepala';
import { LembarCetak } from '../komponen/LembarCetak';
import { usePesan } from '../komponen/Pesan';
import { BagianLipat, Pemberitahuan, Pilihan, Sakelar } from '../komponen/Formulir';
import { Kartu } from '../komponen/Status';
import { kelasTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';

const FORMAT: { id: FormatEkspor; nama: string; tombol: string; ket: string }[] = [
  { id: 'docx', nama: 'Word', tombol: 'Word', ket: 'Bisa disunting' },
  { id: 'pdf', nama: 'PDF', tombol: 'PDF', ket: 'Siap cetak' },
  { id: 'tex', nama: 'LaTeX', tombol: 'LaTeX', ket: 'Berkas .tex' },
];

/** Format dan berkas terakhir diingat per perangkat agar unduhan berikutnya cukup satu ketukan. */
const KUNCI_PILIHAN = 'gensoal:pilihan-unduh';
const OPSI_BAWAAN: OpsiEkspor = { kop: true, kunci: true, kisi: true, pembahasan: false };

function bacaPilihan(): { format: FormatEkspor; opsi: OpsiEkspor } {
  try {
    const p = JSON.parse(localStorage.getItem(KUNCI_PILIHAN) ?? 'null') as { format?: FormatEkspor; opsi?: Partial<OpsiEkspor> } | null;
    const format = p?.format && FORMAT.some((f) => f.id === p.format) ? p.format : 'docx';
    return { format, opsi: { ...OPSI_BAWAAN, ...(p?.opsi ?? {}) } };
  } catch {
    return { format: 'docx', opsi: OPSI_BAWAAN };
  }
}

export default function Ekspor() {
  const { id = '' } = useParams();
  const paket = useLiveQuery(() => db.paket_soal.get(id), [id]);
  const soal = useLiveQuery(() => db.soal.where('paket_id').equals(id).toArray(), [id]);
  const profil = useProfil();
  const pesan = usePesan();
  const [awal] = useState(bacaPilihan);
  const [format, setFormat] = useState<FormatEkspor>(awal.format);
  const [opsi, setOpsi] = useState<OpsiEkspor>(awal.opsi);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [terunduh, setTerunduh] = useState<string[] | null>(null);
  const [lihat, setLihat] = useState<JenisBerkas>('soal');
  useJudulHalaman(paket ? `Unduh · ${paket.judul}` : 'Unduh');
  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_PILIHAN, JSON.stringify({ format, opsi }));
    } catch {
      // localStorage dapat ditolak (mode privat); pilihan kembali ke bawaan lain kali.
    }
  }, [format, opsi]);

  const pratinjau: JenisBerkas = berkasDipilih(opsi).includes(lihat) ? lihat : 'soal';
  const dok = useMemo(() => (paket && soal ? bangunDokumen(paket, soal, profil, opsi, pratinjau) : null), [paket, soal, profil, opsi, pratinjau]);
  if (paket === undefined || soal === undefined) return <div className="px-4 py-20 text-center text-redup">Memuat…</div>;
  if (!paket || !dok) return <div className="px-4 py-20 sm:px-8">Paket tidak ditemukan.</div>;

  const aktif = soalUntukEkspor(soal);
  const halamanPembahasan = 1 + Math.floor(aktif.length / 10);
  const halaman = { soal: 1 + Math.floor(aktif.length / 6), kunci: 1 + (opsi.pembahasan ? halamanPembahasan : 0), kisi: 1 + Math.floor(aktif.length / 8) }[pratinjau];
  const pilihan = FORMAT.find((f) => f.id === format)!;
  const daftar = berkasDipilih(opsi);
  const terhalang = sibuk || !aktif.length;
  const ubahOpsi = (u: Partial<OpsiEkspor>) => setOpsi((o) => ({ ...o, ...u }));

  /** Lembar soal, kunci jawaban, dan kisi-kisi diunduh sebagai berkas terpisah, berurutan. */
  async function unduh(berkas: JenisBerkas[]) {
    setSibuk(true);
    setGalat(null);
    setTerunduh(null);
    try {
      const nama: string[] = [];
      for (const [i, b] of berkas.entries()) {
        // Jeda singkat agar peramban menerima beberapa unduhan berturut-turut.
        if (i) await new Promise((s) => setTimeout(s, 400));
        nama.push((await ekspor(format, paket!, soal!, profil, opsi, b)).nama);
      }
      setTerunduh(nama);
      pesan(nama.length > 1 ? `${nama.length} berkas terunduh.` : `${nama[0]} terunduh.`);
    } catch (e) {
      setGalat(`${(e as Error).message} Anda dapat memakai tampilan cetak peramban sebagai cadangan.`);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div>
      <div className="mx-auto flex max-w-[1240px] flex-wrap gap-x-10 px-4 sm:px-8">
        <div className="min-w-0 flex-[1_1_440px] pb-10 pt-8 sm:pt-10 lg:pb-16">
          <KepalaHalaman kembali={{ ke: `/soal/${id}`, label: 'Kembali ke soal' }} judul="Unduh" subjudul={`${paket.judul} · ${aktif.length} soal. Berkas dibuat di perangkat ini.`} />

          <Kartu className="mt-6">
            <Pilihan
              label={<span className="text-[20px] font-extrabold text-judul">Format</span>}
              nilai={format}
              ubah={setFormat}
              opsi={FORMAT.filter((f) => f.id !== 'tex' || format === 'tex').map((f) => ({ nilai: f.id, label: f.nama, keterangan: f.ket }))}
            />

            <h2 className="mt-7 text-[20px] font-extrabold text-judul">Berkas</h2>
            <p className="mt-1 text-base text-redup">Setiap berkas diunduh terpisah.</p>
            <div className="mt-2 divide-y divide-garis">
              <div className="grid gap-x-6 py-2 sm:grid-cols-[200px_minmax(0,1fr)]">
                <p className="flex min-h-10 items-center gap-3 text-base font-bold text-tinta">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-utama">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" />
                  </svg>
                  <span>
                    Lembar soal <span className="font-normal text-redup">(selalu)</span>
                  </span>
                </p>
                <Sakelar className="pl-8 sm:pl-0" label="dengan kop sekolah" checked={opsi.kop} ubah={(kop) => ubahOpsi({ kop })} />
              </div>
              <div className="grid gap-x-6 py-2 sm:grid-cols-[200px_minmax(0,1fr)]">
                <Sakelar label="Kunci jawaban" checked={opsi.kunci} ubah={(kunci) => ubahOpsi({ kunci })} />
                <Sakelar
                  className="pl-8 sm:pl-0"
                  label="dengan pembahasan"
                  petunjuk={`Menambah sekitar ${halamanPembahasan} halaman.`}
                  checked={opsi.pembahasan}
                  disabled={!opsi.kunci}
                  ubah={(pembahasan) => ubahOpsi({ pembahasan })}
                />
              </div>
              <div className="py-2">
                <Sakelar label="Kisi-kisi" checked={opsi.kisi} ubah={(kisi) => ubahOpsi({ kisi })} />
              </div>
            </div>
            {opsi.kop && !profil.sekolah ? (
              <Pemberitahuan nada="info" className="mt-3">
                Nama sekolah di kop belum diisi.{' '}
                <Link to="/pengaturan" className="font-bold underline">
                  Isi profil sekolah
                </Link>
              </Pemberitahuan>
            ) : null}

            {galat ? (
              <Pemberitahuan nada="galat" className="mt-5">
                {galat}
              </Pemberitahuan>
            ) : null}
            <button type="button" onClick={() => unduh(daftar)} disabled={terhalang} className={`${kelasTombol('utama', 'besar')} mt-5 w-full`}>
              <svg aria-hidden="true" width="16" height="18" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 1v10M3 7l4 4 4-4M1 15h12" />
              </svg>
              {sibuk ? 'Membuat berkas…' : daftar.length > 1 ? `Unduh ${daftar.length} berkas ${pilihan.tombol}` : `Unduh ${pilihan.tombol}`}
            </button>
            {terunduh ? (
              <Pemberitahuan nada="berhasil" className="mt-3">
                {terunduh.length > 1 ? `${terunduh.length} berkas terunduh: ` : 'Terunduh: '}
                {terunduh.join(', ')}.
              </Pemberitahuan>
            ) : daftar.length > 1 ? (
              <p className="mt-2 text-base text-redup">Bila peramban bertanya, izinkan mengunduh beberapa berkas.</p>
            ) : null}
          </Kartu>

          <BagianLipat judul="Menu lanjutan" ringkasan="LaTeX dan tampilan cetak peramban" ingat="unduh-lanjutan" className="mt-6">
            <div className="space-y-4">
              <div>
                <Tombol varian="garis" onClick={() => setFormat('tex')} disabled={format === 'tex'}>
                  {format === 'tex' ? 'LaTeX (.tex) terpilih' : 'Pilih format LaTeX (.tex)'}
                </Tombol>
                <p className="mt-2 text-base text-redup">Berkas sumber untuk dikompilasi sendiri di Overleaf atau TeX lokal; memakai templatnya sendiri.</p>
              </div>
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
          </BagianLipat>
        </div>

        <section aria-label="Pratinjau halaman" className="min-w-0 flex-[1_1_400px] pb-16 lg:pt-10">
          <Kartu pita="tanpa">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {daftar.length > 1 ? (
                <Pilihan className="min-w-0 flex-1" labelTersembunyi label="Berkas yang dipratinjau" nilai={pratinjau} ubah={setLihat} opsi={daftar.map((b) => ({ nilai: b, label: JENIS_BERKAS_LABEL[b] }))} />
              ) : (
                <span className="text-base font-bold text-redup">Pratinjau · {JENIS_BERKAS_LABEL[pratinjau].toLowerCase()}</span>
              )}
              <span className="text-base text-redup tabular-nums">±{halaman} halaman</span>
            </div>
            <div className="mt-4 flex justify-center rounded-lg bg-lembut p-3 sm:p-6">
              <div className="aspect-[210/297] w-full max-w-[440px] overflow-hidden border border-garis kertas px-[8%] py-[8%] text-[8.5px] leading-[1.4] shadow-sm sm:text-[10px]">
                <LembarCetak d={dok} hanyaHalamanPertama={pratinjau === 'soal'} />
              </div>
            </div>
            <Tombol varian="hantu" className="mt-4 w-full" disabled={terhalang} onClick={() => unduh([pratinjau])}>
              Unduh {JENIS_BERKAS_LABEL[pratinjau].toLowerCase()} saja ({pilihan.tombol})
            </Tombol>
          </Kartu>
        </section>
      </div>
    </div>
  );
}
