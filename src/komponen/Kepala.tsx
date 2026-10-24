import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { Titik } from './Status';
import { usePengatur } from '../app/kait';

const NAV = [
  { ke: '/', label: 'Beranda', akhir: true },
  { ke: '/soal/baru', label: 'Buat soal', akhir: true },
  { ke: '/soal', label: 'Soal saya', akhir: false },
  { ke: '/kurikulum', label: 'Kurikulum', akhir: true },
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
    <header className="tanpa-cetak relative z-20 border-b border-garis bg-latar/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-5 sm:px-8 lg:px-16 lg:py-7">
        <Link to="/" aria-label="GenSoal, beranda">
          <Logo />
        </Link>
        <nav aria-label="Utama" className="hidden flex-wrap gap-x-8 gap-y-2 xl:flex">
          {NAV.map((n) => (
            <NavLink key={n.ke} to={n.ke} className={`mono ${aktif(pathname, n.ke, n.akhir) ? 'text-tinta' : 'text-redup hover:text-tinta'}`} aria-current={aktif(pathname, n.ke, n.akhir) ? 'page' : undefined}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {pengatur.berjalan ? (
            <Link to={`/soal/${pengatur.paketId}`} className="mono hidden items-center gap-2.5 text-tinta sm:flex">
              <span className="inline-block size-[7px] animate-pulse rounded-full bg-tinta" />
              Membuat soal {pengatur.slotAktif ? `· butir ${pengatur.slotAktif}` : ''}
            </Link>
          ) : (
            <span className="mono hidden items-center gap-2.5 text-redup sm:flex">
              <Titik />
              Tersimpan di perangkat ini
            </span>
          )}
          <button type="button" className="inline-flex size-11 items-center justify-center xl:hidden" aria-label="Menu" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
            <svg aria-hidden="true" width="22" height="12" viewBox="0 0 22 12" stroke="currentColor" strokeWidth="1.4">
              {buka ? <path d="M3 0l16 12M3 12L19 0" /> : <path d="M0 1h22M0 11h22" />}
            </svg>
          </button>
        </div>
      </div>
      {buka ? (
        <nav aria-label="Menu" className="border-t border-garis px-4 pb-4 sm:px-8 xl:hidden">
          {NAV.map((n) => (
            <NavLink key={n.ke} to={n.ke} className={`mono flex min-h-12 items-center border-b border-garis ${aktif(pathname, n.ke, n.akhir) ? 'text-tinta' : 'text-redup'}`}>
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/pengaturan" className="mono flex min-h-12 items-center border-b border-garis text-redup">
            Profil dan kop
          </NavLink>
          <NavLink to="/bantuan" className="mono flex min-h-12 items-center text-redup">
            Bantuan
          </NavLink>
        </nav>
      ) : null}
    </header>
  );
}

export function Kaki() {
  return (
    <footer className="tanpa-cetak border-t border-garis">
      <div className="mono mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 text-redup sm:px-8 lg:px-16">
        <span className="flex items-center gap-2">
          <Titik />
          Data tinggal di peramban ini · tanpa akun
        </span>
        <span className="flex flex-wrap gap-6">
          <Link to="/pengaturan" className="hover:text-tinta">
            Profil dan kop
          </Link>
          <Link to="/telaah" className="hover:text-tinta">
            Telaah
          </Link>
          <Link to="/bantuan" className="hover:text-tinta">
            Bantuan
          </Link>
          <span>GenSoal {__VERSI_APLIKASI__}</span>
        </span>
      </div>
    </footer>
  );
}

export function KepalaHalaman({ label, judul, ukuran = 'sedang', children }: { label: string; judul: string; ukuran?: 'besar' | 'sedang' | 'kecil'; children?: React.ReactNode }) {
  const kelas = { besar: 'text-[44px] sm:text-[64px] lg:text-[72px]', sedang: 'text-[40px] sm:text-[56px] lg:text-[64px]', kecil: 'text-[34px] sm:text-[48px] lg:text-[56px]' }[ukuran];
  return (
    <div>
      <div className="mono text-redup">{label}</div>
      <h1 className={`judul-besar mt-3.5 ${kelas}`}>{judul}</h1>
      {children ? <div className="mt-5 max-w-[620px] text-[17px] font-light leading-relaxed text-isi">{children}</div> : null}
    </div>
  );
}
