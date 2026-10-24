import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

// Satu tombol utama berwarna pekat per layar; tombol lain berupa garis tepi. Merah hanya untuk hapus dan batal.
type Varian = 'utama' | 'garis' | 'hantu' | 'bahaya';

const KELAS: Record<Varian, string> = {
  utama: 'bg-utama text-di-tinta border border-utama hover:bg-utama-tua hover:border-utama-tua',
  garis: 'border border-utama text-utama bg-kartu hover:bg-utama-lembut',
  hantu: 'border border-garis-kuat text-tinta bg-kartu hover:border-utama hover:text-utama',
  bahaya: 'border border-buruk text-buruk bg-kartu hover:bg-buruk-latar',
};

const UKURAN = { besar: 'min-h-14 px-7 text-[17px]', sedang: 'min-h-12 px-5 text-base', kecil: 'min-h-10 px-3.5 text-base' };

export function kelasTombol(varian: Varian = 'utama', ukuran: keyof typeof UKURAN = 'sedang') {
  return `inline-flex items-center justify-center gap-3 rounded-lg font-bold ${UKURAN[ukuran]} ${KELAS[varian]} disabled:cursor-not-allowed disabled:opacity-40`;
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
