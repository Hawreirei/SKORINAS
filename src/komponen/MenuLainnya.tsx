import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { kelasTombol } from './Tombol';

export interface ButirMenu {
  label: string;
  onClick: () => void;
  bahaya?: boolean;
  disabled?: boolean;
}

/**
 * Tombol "Lainnya" yang membuka daftar aksi jarang dipakai (rancangan UI v0.5, UI-05).
 * Butir `false` atau `null` dilewati, sehingga butir bersyarat dapat ditulis langsung di daftar.
 * Saat dibuka, fokus pindah ke butir pertama; panah atas/bawah, Home, dan End berpindah butir;
 * Escape menutup dan mengembalikan fokus ke tombol; klik di luar atau Tab menutup.
 * `ikon` menampilkan tombol "⋯" (untuk baris daftar); `label` tetap menjadi namanya bagi pembaca layar.
 * `arah="bawah"` membuka daftar ke bawah, rata kanan (untuk menu di kepala halaman).
 */
export function MenuLainnya({ butir, label = 'Lainnya', ikon = false, arah = 'atas', className = '' }: { butir: (ButirMenu | false | null | undefined)[]; label?: string; ikon?: boolean; arah?: 'atas' | 'bawah'; className?: string }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pemicu = useRef<HTMLButtonElement>(null);
  const idTombol = useId();
  const daftar = butir.filter((b): b is ButirMenu => !!b);

  const tombolButir = () => [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
  const tutup = (kembalikanFokus: boolean) => {
    setBuka(false);
    if (kembalikanFokus) pemicu.current?.focus();
  };

  useEffect(() => {
    if (!buka) return;
    tombolButir()[0]?.focus();
    const luar = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setBuka(false);
    document.addEventListener('mousedown', luar);
    return () => document.removeEventListener('mousedown', luar);
  }, [buka]);

  function tekan(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      tutup(true);
      return;
    }
    if (e.key === 'Tab') {
      tutup(false);
      return;
    }
    const semua = tombolButir();
    if (!semua.length) return;
    const kini = semua.indexOf(document.activeElement as HTMLButtonElement);
    const n = semua.length;
    const tujuan = { ArrowDown: (kini + 1) % n, ArrowUp: (kini - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (tujuan === undefined) return;
    e.preventDefault();
    semua[tujuan].focus();
  }

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={buka ? tekan : undefined}>
      <button
        ref={pemicu}
        id={idTombol}
        type="button"
        className={ikon ? `${kelasTombol('hantu')} !min-h-11 !min-w-11 !px-2 text-[20px] leading-none` : `${kelasTombol('hantu')} w-full !gap-2 !px-3 sm:!px-5`}
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-label={ikon ? label : undefined}
        onClick={() => setBuka((b) => !b)}
        onKeyDown={(e) => {
          if (!buka && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setBuka(true);
          }
        }}
      >
        {ikon ? (
          <span aria-hidden="true">⋯</span>
        ) : (
          <>
            {label}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4.5l4 4 4-4" />
            </svg>
          </>
        )}
      </button>
      {buka ? (
        <div role="menu" aria-labelledby={idTombol} className={`absolute right-0 z-20 min-w-52 overflow-hidden rounded-lg border border-garis bg-kartu py-1 shadow-lg ${arah === 'bawah' ? 'top-full mt-2' : 'bottom-full mb-2 sm:right-auto sm:left-0'}`}>
          {daftar.map((b) => (
            <button
              key={b.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={b.disabled}
              onClick={() => {
                tutup(true);
                b.onClick();
              }}
              className={`block min-h-11 w-full px-4 text-left text-base font-semibold hover:bg-lembut focus:bg-lembut focus-visible:-outline-offset-3 disabled:opacity-40 ${b.bahaya ? 'text-buruk' : 'text-tinta'}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
