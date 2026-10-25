import type { ReactNode } from 'react';

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

export function Peringatan({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" className={`rounded-lg border border-awas/40 bg-awas-latar px-4 py-3 text-base leading-relaxed text-awas ${className}`}>
      {children}
    </div>
  );
}

/** Kartu putih dengan pita judul berwarna di atasnya (rancangan v0.4, aturan pengelompokan). */
export function Kartu({ children, pita = 'utama', className = '', as: Tag = 'section', ...props }: { children: ReactNode; pita?: 'utama' | 'kuning' | 'baik' | 'awas' | 'tanpa'; className?: string; as?: 'section' | 'article' | 'div' | 'aside' } & React.HTMLAttributes<HTMLElement>) {
  const warna = { utama: 'border-t-utama', kuning: 'border-t-kuning', baik: 'border-t-baik', awas: 'border-t-awas', tanpa: 'border-t-garis' }[pita];
  return (
    <Tag className={`rounded-xl border border-garis border-t-4 ${warna} bg-kartu p-4 sm:p-6 ${className}`} {...props}>
      {children}
    </Tag>
  );
}

