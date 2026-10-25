import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db/skema';
import { KepalaHalaman } from '../komponen/Kepala';
import { Kartu, LencanaStatus } from '../komponen/Status';
import { Panah, TautanTombol } from '../komponen/Tombol';
import { useJudulHalaman, usePengatur } from './kait';
import { langkahAwalTersembunyi, sembunyikanLangkahAwal, sudahUnduh } from './langkah-awal';
import { daftarRingkasan, formatTanggal, statusRingkasan, teksJumlah, type RingkasanPaket } from './ringkas';

export function BarisPaket({ r }: { r: RingkasanPaket }) {
  const st = statusRingkasan(r, usePengatur());
  return (
    <Link to={`/soal/${r.paket.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-garis px-1 py-4 last:border-b-0 hover:bg-lembut sm:px-3">
      <span className="min-w-0">
        <span className="block text-[17px] font-bold text-tinta">{r.paket.judul}</span>
        <span className="mt-0.5 block text-base text-redup tabular-nums">
          Kelas {r.paket.parameter_json.kelas} · {r.paket.parameter_json.mapel} · {formatTanggal(r.paket.dibuat_pada)} · {teksJumlah(r)}
        </span>
        <span className="mt-2 block sm:hidden">
          <LencanaStatus status={st} />
        </span>
      </span>
      <span className="hidden sm:block">
        <LencanaStatus status={st} />
      </span>
    </Link>
  );
}

interface Langkah {
  judul: string;
  ket: string;
  ke: string;
  aksi: string;
  selesai: boolean;
}

/** Tiga langkah untuk guru baru; kartu hilang setelah semuanya selesai atau disembunyikan. */
function LangkahAwal({ langkah, sembunyikan }: { langkah: Langkah[]; sembunyikan: () => void }) {
  const berikut = langkah.findIndex((l) => !l.selesai);
  return (
    <Kartu pita="kuning" aria-labelledby="judul-langkah-awal" className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="judul-langkah-awal" className="text-[22px] font-extrabold text-judul">
          Langkah awal
        </h2>
        <button type="button" className="min-h-10 text-base font-bold text-redup hover:text-utama hover:underline" onClick={sembunyikan}>
          Sembunyikan
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {langkah.map((l, i) => {
          const kini = i === berikut;
          return (
            <li key={l.judul} aria-current={kini ? 'step' : undefined} className={`flex items-start gap-3 rounded-lg border px-3 py-3 sm:px-4 ${kini ? 'border-utama bg-utama-lembut/40' : 'border-garis'}`}>
              {l.selesai ? (
                <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-baik-latar text-baik">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" />
                  </svg>
                </span>
              ) : (
                <span aria-hidden="true" className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${kini ? 'bg-utama text-di-tinta' : 'bg-lembut text-redup'}`}>
                  {i + 1}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block text-[17px] font-bold ${l.selesai ? 'text-redup' : 'text-tinta'}`}>
                  {i + 1}. {l.judul}
                  {l.selesai ? <span className="ml-2 text-base font-bold text-baik">Selesai</span> : null}
                </span>
                {!l.selesai ? <span className="block text-base text-redup">{l.ket}</span> : null}
              </span>
              {kini ? (
                <Link to={l.ke} className="inline-flex min-h-10 shrink-0 items-center text-base font-bold text-utama hover:underline">
                  {l.aksi}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Kartu>
  );
}

/** Beranda sederhana: satu tombol besar "Buat soal", kartu Langkah awal untuk guru baru, dan daftar soal terakhir. */
export function Beranda() {
  useJudulHalaman('');
  const terbaru = useLiveQuery(() => daftarRingkasan(5), []);
  const kunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const adaPaket = useLiveQuery(async () => (await db.paket_soal.count()) > 0, []);
  const [tersembunyi, setTersembunyi] = useState(langkahAwalTersembunyi);
  const paketTerakhir = terbaru?.[0]?.paket.id;
  const langkah: Langkah[] = [
    { judul: 'Pasang kunci AI', ket: 'Tempel kunci dari penyedia AI pilihan Anda; beberapa penyedia gratis.', ke: '/pengaturan/ai', aksi: 'Pasang kunci', selesai: !!kunci?.some((k) => k.kunci && k.status === 'berfungsi') },
    { judul: 'Buat soal pertama', ket: 'Isi kelas, mapel, dan jumlah soal.', ke: '/soal/baru', aksi: 'Buat soal', selesai: !!adaPaket },
    { judul: 'Unduh soal', ket: 'Unduh sebagai Word atau PDF, lengkap dengan kunci dan kisi-kisi.', ke: paketTerakhir ? `/soal/${paketTerakhir}/ekspor` : '/soal', aksi: 'Unduh', selesai: sudahUnduh() },
  ];
  const tampilLangkah = kunci !== undefined && adaPaket !== undefined && !tersembunyi && langkah.some((l) => !l.selesai);

  return (
    <div className="mx-auto max-w-[960px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14">
      <KepalaHalaman
        besar
        label="Kelas 1–12 · tanpa akun"
        judul="Buat soal yang kuncinya sudah dicek."
        subjudul="Isi kelas, mapel, dan jumlah soal. GenSoal membuat soalnya, menghitung ulang kuncinya, lalu Anda unduh sebagai Word atau PDF."
      >
        <TautanTombol to="/soal/baru" ukuran="besar" className="mt-7 w-full !min-h-16 !text-[19px] sm:w-auto sm:!px-10">
          Buat soal <Panah />
        </TautanTombol>
      </KepalaHalaman>

      {tampilLangkah ? (
        <LangkahAwal
          langkah={langkah}
          sembunyikan={() => {
            sembunyikanLangkahAwal();
            setTersembunyi(true);
          }}
        />
      ) : null}

      <Kartu as="section" aria-label="Soal terakhir" className="mt-10">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <h2 className="text-[22px] font-extrabold text-judul">Soal terakhir</h2>
          <Link className="text-base font-bold text-utama hover:underline" to="/soal">
            Lihat semua
          </Link>
        </div>
        {terbaru === undefined ? null : terbaru.length === 0 ? (
          <p className="py-4 text-base text-redup">
            Belum ada soal. Tekan{' '}
            <Link to="/soal/baru" className="font-bold text-utama underline">
              Buat soal
            </Link>{' '}
            untuk membuat paket pertama; semuanya tersimpan di perangkat ini.
          </p>
        ) : (
          terbaru.map((r) => <BarisPaket key={r.paket.id} r={r} />)
        )}
      </Kartu>
    </div>
  );
}
