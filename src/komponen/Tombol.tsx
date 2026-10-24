import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Varian = 'utama' | 'garis' | 'hantu' | 'bahaya';

const KELAS: Record<Varian, string> = {
  utama: 'bg-tinta text-di-tinta border border-tinta hover:opacity-90',
  garis: 'border border-tinta text-tinta bg-latar hover:bg-lembut',
  hantu: 'border border-garis-kuat text-tinta bg-latar hover:border-tinta',
  bahaya: 'border border-buruk text-buruk bg-latar hover:bg-lembut',
};

const UKURAN = { besar: 'min-h-14 px-8', sedang: 'min-h-11 px-5', kecil: 'min-h-9 px-3.5' };

export function kelasTombol(varian: Varian = 'utama', ukuran: keyof typeof UKURAN = 'sedang') {
  return `mono inline-flex items-center justify-center gap-3.5 rounded-[2px] ${UKURAN[ukuran]} ${KELAS[varian]} disabled:cursor-not-allowed disabled:opacity-40`;
}

export function Panah() {
  return (
    <svg aria-hidden="true" width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.3">
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
      className={`min-h-11 rounded-[2px] border px-[18px] text-[15px] transition-colors ${aktif ? 'border-tinta bg-tinta text-di-tinta' : 'border-garis-kuat bg-latar text-tinta hover:border-tinta'} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
