import type { ReactNode } from 'react';
import { Pemberitahuan } from './Formulir';

export function Titik({ isi = true, className = '' }: { isi?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full border border-current ${isi ? 'bg-current' : 'bg-transparent'} ${className}`} />;
}

export function Label({ children, htmlFor, className = '' }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block text-base font-bold text-tinta ${className}`}>
      {children}
    </label>
  );
}

export function Kotak({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-garis bg-panel p-4 text-base leading-relaxed text-isi ${className}`}>{children}</div>;
}

/** Pemberitahuan bernada awas; dipertahankan agar layar lama tetap jalan (UI-02). */
export function Peringatan({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Pemberitahuan nada="awas" className={className}>
      {children}
    </Pemberitahuan>
  );
}

/** Kartu putih dengan pita judul berwarna di atasnya (rancangan v0.4, aturan pengelompokan). */
export function Kartu({ children, pita = 'utama', className = '', as: Tag = 'section', ...props }: { children: ReactNode; pita?: 'utama' | 'kuning' | 'baik' | 'awas' | 'tanpa'; className?: string; as?: 'section' | 'article' | 'div' | 'aside' } & React.HTMLAttributes<HTMLElement>) {
  const warna = { utama: 'pita-utama', kuning: 'pita-kuning', baik: 'pita-baik', awas: 'pita-awas', tanpa: 'pita-garis' }[pita];
  return (
    <Tag className={`kartu ${warna} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

