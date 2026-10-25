import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

// Satu tombol utama berwarna pekat per layar; tombol lain berupa garis tepi. Merah hanya untuk hapus dan batal.
type Varian = 'utama' | 'garis' | 'hantu' | 'bahaya';

// Nama kelas ditulis utuh agar Tailwind membuatnya (utilitas di src/index.css).
const KELAS: Record<Varian, string> = { utama: 'tombol-utama', garis: 'tombol-garis', hantu: 'tombol-hantu', bahaya: 'tombol-bahaya' };

const UKURAN = { besar: 'min-h-14 px-7 text-[17px]', sedang: 'min-h-12 px-5 text-base', kecil: 'min-h-10 px-3.5 text-base' };

export function kelasTombol(varian: Varian = 'utama', ukuran: keyof typeof UKURAN = 'sedang') {
  return `tombol ${KELAS[varian]} ${UKURAN[ukuran]}`;
}

export function Panah() {
  return (
    <svg aria-hidden="true" width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M0 5h16M12 1l4 4-4 4" />
    </svg>
  );
}

export function Tombol({ varian = 'utama', ukuran = 'sedang', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian; ukuran?: keyof typeof UKURAN; children: ReactNode }) {
  return (
    <button type="button" className={`${kelasTombol(varian, ukuran)} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function TautanTombol({ varian = 'utama', ukuran = 'sedang', className = '', children, ...props }: LinkProps & { varian?: Varian; ukuran?: keyof typeof UKURAN }) {
  return (
    <Link className={`${kelasTombol(varian, ukuran)} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function Chip({ aktif, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { aktif?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      className={`min-h-11 rounded-lg border px-4 text-base font-semibold transition-colors ${aktif ? 'border-utama bg-utama text-di-tinta' : 'border-garis-kuat bg-kartu text-tinta hover:border-utama hover:text-utama'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
