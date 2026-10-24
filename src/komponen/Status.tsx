import type { ReactNode } from 'react';
import type { PenandaSoal, StatusMutu, StatusTelaah } from '../db/tipe';
import { PENANDA_LABEL, penandaSoal } from '../db/tipe';

export function Titik({ isi = true, className = '' }: { isi?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full border border-current ${isi ? 'bg-current' : 'bg-transparent'} ${className}`} />;
}

const WARNA_PENANDA: Record<PenandaSoal, string> = {
  dicek: 'bg-baik-latar text-baik',
  cek_dulu: 'bg-awas-latar text-awas',
  disetujui: 'bg-utama-lembut text-utama-tua dark:text-di-tinta',
  ditolak: 'bg-buruk-latar text-buruk',
};

/** Ikon status: warna tidak berdiri sendiri, setiap penanda juga memakai kata dan bentuk. */
function IkonPenanda({ p }: { p: PenandaSoal }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {p === 'cek_dulu' ? (
        <>
          <path d="M8 1.5l6.5 12h-13z" />
          <path d="M8 6.5v3M8 11.6v.2" />
        </>
      ) : p === 'ditolak' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
        </>
      ) : p === 'disetujui' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5 8.2l2 2 4-4.4" />
        </>
      ) : (
        <path d="M2.5 8.5l3.5 3.5 7.5-8" />
      )}
    </svg>
  );
}

export function LencanaPenanda({ penanda, className = '' }: { penanda: PenandaSoal; className?: string }) {
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-base font-bold ${WARNA_PENANDA[penanda]} ${className}`}>
      <IkonPenanda p={penanda} />
      {PENANDA_LABEL[penanda]}
    </span>
  );
}

/** Satu penanda per soal dari status mutu (sistem) dan status telaah (guru). */
export function LencanaMutu({ mutu, telaah }: { mutu: StatusMutu; telaah?: StatusTelaah }) {
  return <LencanaPenanda penanda={penandaSoal({ status_mutu: mutu, status_telaah: telaah ?? 'draf' })} />;
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

/** Nomor kelompok isian (00, 01, …) berlatar kuning. */
export function NomorBagian({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-w-9 items-center justify-center rounded-md bg-kuning px-2 py-0.5 text-base font-extrabold text-[#422006]">{children}</span>;
}
