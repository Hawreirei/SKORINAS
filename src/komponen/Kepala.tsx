import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Titik } from './Status';
import { usePengatur } from '../app/kait';

const NAV = [
  { ke: '/', label: 'Beranda', akhir: true },
  { ke: '/soal/baru', label: 'Buat soal', akhir: true },
  { ke: '/soal', label: 'Soal saya', akhir: false },
  { ke: '/pengaturan/ai', label: 'Pengaturan AI', akhir: false },
  { ke: '/cadangan', label: 'Cadangan', akhir: true },
];

function aktif(path: string, ke: string, akhir: boolean) {
  if (ke === '/soal') return path === '/soal' || (path.startsWith('/soal/') && !path.startsWith('/soal/baru')) || path === '/telaah';
  return akhir ? path === ke : path.startsWith(ke);
}

export function Kepala() {
  const { pathname } = useLocation();
  const [buka, setBuka] = useState(false);
  const pengatur = usePengatur();
  useEffect(() => setBuka(false), [pathname]);
  return (
    <header className="tanpa-cetak relative z-20 border-b-[3px] border-kuning bg-kartu">
      <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:py-4">
        <Link to="/" aria-label="GenSoal, beranda">
          <Logo />
        </Link>
        <nav aria-label="Utama" className="hidden gap-1 lg:flex">
          {NAV.map((n) => {
            const a = aktif(pathname, n.ke, n.akhir);
            return (
              <NavLink
                key={n.ke}
                to={n.ke}
                className={`relative rounded-lg px-3.5 py-2 text-base font-bold ${a ? 'text-utama after:absolute after:inset-x-3.5 after:-bottom-[9px] after:h-[3px] after:rounded-full after:bg-utama' : 'text-redup hover:bg-lembut hover:text-utama'}`}
                aria-current={a ? 'page' : undefined}
              >
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {pengatur.berjalan ? (
            <Link to={`/soal/${pengatur.paketId}`} className="hidden items-center gap-2 rounded-full bg-utama-lembut px-3 py-1.5 text-base font-bold text-utama-tua sm:flex dark:text-di-tinta">
              <span className="inline-block size-2 animate-pulse rounded-full bg-utama" />
              {pengatur.menunggu ? 'Menunggu batas penyedia' : 'Membuat soal'} {pengatur.slotAktif ? `· soal ${pengatur.slotAktif}` : ''}
            </Link>
          ) : (
            <span className="hidden items-center gap-2 text-base font-semibold text-redup xl:flex">
              <Titik className="text-utama" />
              Tersimpan di perangkat ini
            </span>
          )}
          <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg text-judul hover:bg-lembut lg:hidden" aria-label="Menu" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
            <svg aria-hidden="true" width="22" height="16" viewBox="0 0 22 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {buka ? <path d="M4 1l14 14M4 15L18 1" /> : <path d="M1 2h20M1 8h20M1 14h20" />}
            </svg>
          </button>
        </div>
      </div>
      {buka ? (
        <nav aria-label="Menu" className="border-t border-garis px-4 pb-3 sm:px-8 lg:hidden">
          {[...NAV, { ke: '/pengaturan', label: 'Profil dan kop', akhir: true }, { ke: '/bantuan', label: 'Bantuan', akhir: true }].map((n) => (
            <NavLink key={n.ke} to={n.ke} className={`flex min-h-12 items-center border-b border-garis text-base font-bold last:border-b-0 ${aktif(pathname, n.ke, n.akhir) ? 'text-utama' : 'text-tinta'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function Kaki() {
  return (
    <footer className="tanpa-cetak border-t border-garis bg-kartu">
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center justify-between gap-4 px-4 py-5 text-base text-redup sm:px-8">
        <span className="flex items-center gap-2">
          <Titik className="text-utama" />
          Data tinggal di peramban ini · tanpa akun
        </span>
        <span className="flex flex-wrap gap-5">
          <Link to="/pengaturan" className="font-semibold hover:text-utama">
            Profil dan kop
          </Link>
          <Link to="/bantuan" className="font-semibold hover:text-utama">
            Bantuan
          </Link>
          <span>GenSoal {__VERSI_APLIKASI__}</span>
        </span>
      </div>
    </footer>
  );
}

export function KepalaHalaman({ label, judul, children }: { label?: string; judul: string; ukuran?: 'besar' | 'sedang' | 'kecil'; children?: React.ReactNode }) {
  return (
    <div>
      {label ? <div className="text-base font-bold text-utama">{label}</div> : null}
      <h1 className="judul-besar mt-1 text-[30px] sm:text-[36px]">{judul}</h1>
      {children ? <div className="mt-2 max-w-[640px] text-[17px] leading-relaxed text-redup">{children}</div> : null}
    </div>
  );
}

const LANGKAH = [
  { nama: 'Buat', warna: 'bg-utama text-di-tinta', lembut: 'bg-utama-lembut text-utama-tua dark:text-di-tinta' },
  { nama: 'Periksa', warna: 'bg-awas text-di-tinta', lembut: 'bg-awas-latar text-awas' },
  { nama: 'Unduh', warna: 'bg-baik text-di-tinta', lembut: 'bg-baik-latar text-baik' },
] as const;

/** Penunjuk "Langkah n dari 3" yang selalu terlihat di layar Buat, Periksa, dan Unduh. */
export function PenunjukLangkah({ langkah, paketId }: { langkah: 1 | 2 | 3; paketId?: string }) {
  const tujuan = [null, paketId ? `/soal/${paketId}` : null, paketId ? `/soal/${paketId}/ekspor` : null];
  return (
    <nav aria-label="Langkah" className="tanpa-cetak border-b border-garis bg-kartu">
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-8">
        <span className="text-base font-extrabold text-judul">
          Langkah {langkah} dari 3
        </span>
        <ol className="flex items-center gap-1.5 sm:gap-2">
          {LANGKAH.map((l, i) => {
            const nomor = i + 1;
            const kini = nomor === langkah;
            const isi = (
              <>
                <span className={`inline-flex size-6 items-center justify-center rounded-full text-[14px] font-extrabold ${kini ? 'bg-kartu text-tinta' : l.warna}`}>{nomor}</span>
                {l.nama}
              </>
            );
            const kelas = `inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-base font-bold sm:gap-2 sm:px-3 ${kini ? l.warna : nomor < langkah ? l.lembut : 'bg-panel text-redup'}`;
            const ke = tujuan[i];
            return (
              <li key={l.nama} className="flex items-center gap-1.5 sm:gap-2" aria-current={kini ? 'step' : undefined}>
                {i ? <span aria-hidden="true" className="hidden h-px w-4 bg-garis-kuat sm:block" /> : null}
                {ke && !kini ? (
                  <Link to={ke} className={`${kelas} hover:underline`}>
                    {isi}
                  </Link>
                ) : (
                  <span className={kelas}>{isi}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
