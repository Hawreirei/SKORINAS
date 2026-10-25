import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { LencanaStatus, Titik } from './Status';
import { menungguPenyedia } from '../app/status';
import { usePengatur } from '../app/kait';

const NAV = [
  { ke: '/', label: 'Beranda', akhir: true },
  { ke: '/soal/baru', label: 'Buat soal', akhir: true },
  { ke: '/soal', label: 'Soal saya', akhir: false },
  { ke: '/pengaturan/ai', label: 'Pengaturan AI', akhir: false },
  { ke: '/cadangan', label: 'Cadangan', akhir: true },
];

function aktif(path: string, ke: string, akhir: boolean) {
  if (ke === '/soal') return path === '/soal' || (path.startsWith('/soal/') && !path.startsWith('/soal/baru'));
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
            <Link to={`/soal/${pengatur.paketId}`} className="hidden rounded-full hover:underline sm:block" aria-label={`Buka paket yang ${menungguPenyedia(pengatur.menunggu) ? 'menunggu batas penyedia' : 'sedang dibuat'}${pengatur.slotAktif ? `, soal ${pengatur.slotAktif}` : ''}`}>
              <LencanaStatus status={menungguPenyedia(pengatur.menunggu) ? 'menunggu' : 'membuat'}>{pengatur.slotAktif ? ` · soal ${pengatur.slotAktif}` : ''}</LencanaStatus>
            </Link>
          ) : null}
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
