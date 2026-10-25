import { useId, type ReactNode } from 'react';
import { Pemberitahuan, WARNA_NADA } from './Formulir';
import { STATUS_PAKET, type StatusPaket } from '../app/status';

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
export function Kartu({ children, pita = 'utama', className = '', as: Tag = 'section', ...props }: { children: ReactNode; pita?: 'utama' | 'kuning' | 'baik' | 'awas' | 'buruk' | 'tanpa'; className?: string; as?: 'section' | 'article' | 'div' | 'aside' } & React.HTMLAttributes<HTMLElement>) {
  const warna = { utama: 'pita-utama', kuning: 'pita-kuning', baik: 'pita-baik', awas: 'pita-awas', buruk: 'pita-buruk', tanpa: 'pita-garis' }[pita];
  return (
    <Tag className={`kartu ${warna} ${className}`} {...props}>
      {children}
    </Tag>
  );
}

/** Kartu bagian dengan judul h2; dipakai layar pengaturan (rancangan UI v0.5, UI-11). */
export function KartuBagian({ judul, ket, pita, children, className = '' }: { judul: ReactNode; ket?: ReactNode; pita?: 'utama' | 'kuning' | 'baik' | 'awas' | 'buruk' | 'tanpa'; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <Kartu pita={pita} aria-labelledby={id} className={className}>
      <h2 id={id} className={`text-[20px] font-extrabold ${pita === 'buruk' ? 'text-buruk' : 'text-judul'}`}>
        {judul}
      </h2>
      {ket ? <p className="mt-1 text-base text-redup">{ket}</p> : null}
      <div className="mt-5">{children}</div>
    </Kartu>
  );
}

/** Aksi yang menghapus data selalu di kartu terakhir berjudul merah (UI-11). Isi: satu atau lebih `BarisBahaya`. */
export function ZonaBerbahaya({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <KartuBagian judul="Zona berbahaya" pita="buruk" className={className}>
      <div className="divide-y divide-garis">{children}</div>
    </KartuBagian>
  );
}

export function BarisBahaya({ judul, ket, aksi }: { judul: ReactNode; ket: ReactNode; aksi: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-72">
        <div className="text-[17px] font-bold text-tinta">{judul}</div>
        <p className="mt-0.5 text-base text-redup">{ket}</p>
      </div>
      <div className="w-full sm:w-auto">{aksi}</div>
    </div>
  );
}


function IkonStatus({ status }: { status: StatusPaket }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {status === 'membuat' ? (
        <path d="M14 8a6 6 0 1 1-2.2-4.6M14 2.5v3.2h-3.2" />
      ) : status === 'menunggu' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5V8l2.5 1.5" />
        </>
      ) : status === 'dijeda' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M6.5 5.5v5M9.5 5.5v5" />
        </>
      ) : status === 'perhatian' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.8v3.8M8 11.2v.2" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5 8.2l2 2 4-4.4" />
        </>
      )}
    </svg>
  );
}

/** Warna pita kartu untuk status paket, mengikuti nadanya di peta pusat. */
export function pitaStatus(status: StatusPaket): 'utama' | 'awas' | 'buruk' | 'baik' {
  return ({ info: 'utama', awas: 'awas', galat: 'buruk', berhasil: 'baik' } as const)[STATUS_PAKET[status].nada];
}

/** Lencana status paket dari peta pusat (src/app/status.ts): ikon dan kata, tidak hanya warna. */
export function LencanaStatus({ status, children, className = '' }: { status: StatusPaket; children?: ReactNode; className?: string }) {
  const w = WARNA_NADA[STATUS_PAKET[status].nada];
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-base font-bold tabular-nums ${className}`} style={{ color: `var(${w.teks})`, backgroundColor: `var(${w.latar})` }}>
      <IkonStatus status={status} />
      {STATUS_PAKET[status].label}
      {children}
    </span>
  );
}

/** Kemajuan pembuatan soal; berwarna kuning-oranye saat menunggu batas penyedia. */
export function BilahKemajuan({ selesai, total, menunggu = false, className = '' }: { selesai: number; total: number; menunggu?: boolean; className?: string }) {
  const w = WARNA_NADA[menunggu ? 'awas' : 'info'];
  const teks = `${selesai} dari ${total} soal selesai`;
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label="Kemajuan pembuatan soal"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={selesai}
        aria-valuetext={teks}
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: `var(${w.latar})` }}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${total ? (selesai / total) * 100 : 0}%`, backgroundColor: menunggu ? 'var(--gs-warn)' : 'var(--gs-main)' }} />
      </div>
      <p className="mt-2 text-base text-redup tabular-nums">{teks}</p>
    </div>
  );
}
