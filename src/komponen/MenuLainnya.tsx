import { useEffect, useRef, useState } from 'react';
import { kelasTombol } from './Tombol';

export interface ButirMenu {
  label: string;
  onClick: () => void;
  bahaya?: boolean;
  disabled?: boolean;
}

/** Tombol "Lainnya" yang membuka daftar aksi jarang dipakai; menutup saat klik di luar atau Escape. */
export function MenuLainnya({ butir, label = 'Lainnya', className = '' }: { butir: ButirMenu[]; label?: string; className?: string }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setBuka(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setBuka(false);
    document.addEventListener('mousedown', luar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', luar);
      document.removeEventListener('keydown', esc);
    };
  }, [buka]);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" className={`${kelasTombol('hantu')} w-full !gap-2 !px-3 sm:!px-5`} aria-haspopup="menu" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
        {label}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 4.5l4 4 4-4" />
        </svg>
      </button>
      {buka ? (
        <div role="menu" className="absolute right-0 bottom-full z-20 mb-2 min-w-48 overflow-hidden rounded-lg border border-garis bg-kartu py-1 shadow-lg sm:right-auto sm:left-0">
          {butir.map((b) => (
            <button
              key={b.label}
              type="button"
              role="menuitem"
              disabled={b.disabled}
              onClick={() => {
                setBuka(false);
                b.onClick();
              }}
              className={`block min-h-11 w-full px-4 text-left text-base font-semibold hover:bg-lembut disabled:opacity-40 ${b.bahaya ? 'text-buruk' : 'text-tinta'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
