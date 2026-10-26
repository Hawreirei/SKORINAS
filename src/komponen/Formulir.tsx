/**
 * Komponen formulir bersama (rancangan UI v0.5, UI-02). Teks minimal 16 px; setiap isian berlabel.
 *
 * - `Bidang`: label, isian, petunjuk. Bila ada `galat`, petunjuk diganti teks merah dan isian diberi
 *   `aria-invalid` serta `aria-describedby`. Turunannya: `IsianTeks`, `IsianPanjang`, `IsianAngka`, `PilihanDaftar`.
 * - `Pilihan`: satu dari 2–4 opsi (segmented), `role="radiogroup"`, panah kiri/kanan/atas/bawah, Home, End.
 * - `PilihanBanyak`: deret chip untuk memilih beberapa opsi (`aria-pressed`).
 * - `Sakelar`: kotak centang besar dengan label tebal dan petunjuk.
 * - `BagianLipat`: judul dan ringkasan sebagai tombol lipat; `ingat` menyimpan status buka per perangkat.
 * - `Pemberitahuan`: pesan dengan nada info, awas, galat, berhasil. Warna dari token; nada galat memakai `role="alert"`.
 */
import { useEffect, useId, useRef, useState, type Dispatch, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes, type SetStateAction, type TextareaHTMLAttributes } from 'react';
import { Chip } from './Tombol';

/** Atribut yang menghubungkan isian dengan label, petunjuk, dan galatnya. */
export interface PropsIsian {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface DasarBidang {
  label: ReactNode;
  petunjuk?: ReactNode;
  /** Pesan galat; menggantikan petunjuk dan menandai isian tidak sah. */
  galat?: ReactNode;
  /** Kelas pembungkus (label, isian, dan petunjuk). */
  className?: string;
}

export function Bidang({ label, petunjuk, galat, className = '', id, children }: DasarBidang & { id?: string; children: (p: PropsIsian) => ReactNode }) {
  const otomatis = useId();
  const idIsian = id ?? otomatis;
  const idKet = `${idIsian}-ket`;
  const ket = galat ?? petunjuk;
  return (
    <div className={className}>
      <label htmlFor={idIsian} className="block text-base font-bold text-tinta">
        {label}
      </label>
      {children({ id: idIsian, ...(galat ? { 'aria-invalid': true } : {}), ...(ket ? { 'aria-describedby': idKet } : {}) })}
      {ket ? (
        <p id={idKet} className={`mt-1.5 text-base ${galat ? 'font-bold text-buruk' : 'text-redup'}`}>
          {ket}
        </p>
      ) : null}
    </div>
  );
}

type TanpaMilikBidang<T> = Omit<T, 'className' | 'id' | 'children'> & DasarBidang & { id?: string; kelasIsian?: string };

export function IsianTeks({ label, petunjuk, galat, className, id, kelasIsian = '', ...isian }: TanpaMilikBidang<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <Bidang label={label} petunjuk={petunjuk} galat={galat} className={className} id={id}>
      {(p) => <input type="text" {...isian} {...p} className={`bidang mt-2 ${galat ? '!border-buruk' : ''} ${kelasIsian}`} />}
    </Bidang>
  );
}

/** Angka yang diketik bebas (keyboard angka di ponsel); nilai tetap teks agar guru dapat menghapus lalu mengetik ulang. */
export function IsianAngka(props: TanpaMilikBidang<InputHTMLAttributes<HTMLInputElement>>) {
  return <IsianTeks inputMode="numeric" autoComplete="off" {...props} />;
}

export function IsianPanjang({ label, petunjuk, galat, className, id, kelasIsian = '', ...isian }: TanpaMilikBidang<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <Bidang label={label} petunjuk={petunjuk} galat={galat} className={className} id={id}>
      {(p) => <textarea {...isian} {...p} className={`bidang mt-2 ${galat ? '!border-buruk' : ''} ${kelasIsian}`} />}
    </Bidang>
  );
}

export function PilihanDaftar({ label, petunjuk, galat, className, id, kelasIsian = '', children, ...isian }: TanpaMilikBidang<SelectHTMLAttributes<HTMLSelectElement>> & { children: ReactNode }) {
  return (
    <Bidang label={label} petunjuk={petunjuk} galat={galat} className={className} id={id}>
      {(p) => (
        <select {...isian} {...p} className={`bidang mt-2 ${galat ? '!border-buruk' : ''} ${kelasIsian}`}>
          {children}
        </select>
      )}
    </Bidang>
  );
}

export interface OpsiPilihan<T extends string> {
  nilai: T;
  label: ReactNode;
  /** Keterangan satu baris di bawah label (mis. "Bisa disunting"). */
  keterangan?: ReactNode;
}

/** Satu dari 2–4 opsi. Hanya opsi terpilih yang dapat difokus dengan Tab; panah memindah pilihan. */
export function Pilihan<T extends string>({ label, opsi, nilai, ubah, labelTersembunyi = false, className = '' }: { label: ReactNode; opsi: OpsiPilihan<T>[]; nilai: T; ubah: (v: T) => void; labelTersembunyi?: boolean; className?: string }) {
  const idLabel = useId();
  const tombol = useRef<(HTMLButtonElement | null)[]>([]);
  const kini = Math.max(0, opsi.findIndex((o) => o.nilai === nilai));

  function tekan(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = opsi.length;
    const tujuan = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (tujuan === undefined) return;
    e.preventDefault();
    ubah(opsi[tujuan].nilai);
    tombol.current[tujuan]?.focus();
  }

  return (
    <div className={className}>
      <div id={idLabel} className={labelTersembunyi ? 'sr-only' : 'text-base font-bold text-tinta'}>
        {label}
      </div>
      <div role="radiogroup" aria-labelledby={idLabel} className={`grid gap-1 rounded-lg border border-garis-kuat bg-kartu p-1 ${labelTersembunyi ? '' : 'mt-2'}`} style={{ gridTemplateColumns: `repeat(${opsi.length}, minmax(0, 1fr))` }}>
        {opsi.map((o, i) => {
          const dipilih = i === kini;
          return (
            <button
              key={o.nilai}
              ref={(el) => {
                tombol.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={dipilih}
              tabIndex={dipilih ? 0 : -1}
              onClick={() => ubah(o.nilai)}
              onKeyDown={(e) => tekan(e, i)}
              className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-md px-3 py-1.5 text-center text-base font-bold ${dipilih ? 'bg-utama-isi text-di-tinta' : 'text-tinta hover:bg-lembut'}`}
            >
              <span>{o.label}</span>
              {o.keterangan ? <span className={`text-base font-semibold ${dipilih ? '' : 'text-redup'}`}>{o.keterangan}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Beberapa opsi sekaligus, berupa chip dengan `aria-pressed`. */
export function PilihanBanyak<T extends string>({ label, opsi, nilai, ubah, className = '' }: { label: ReactNode; opsi: OpsiPilihan<T>[]; nilai: T[]; ubah: (v: T[]) => void; className?: string }) {
  const idLabel = useId();
  return (
    <div className={className}>
      <div id={idLabel} className="text-base font-bold text-tinta">
        {label}
      </div>
      <div role="group" aria-labelledby={idLabel} className="mt-2 flex flex-wrap gap-2">
        {opsi.map((o) => {
          const aktif = nilai.includes(o.nilai);
          return (
            <Chip key={o.nilai} aktif={aktif} onClick={() => ubah(aktif ? nilai.filter((x) => x !== o.nilai) : [...nilai, o.nilai])}>
              {o.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

export function Sakelar({ label, petunjuk, checked, ubah, disabled, className = '' }: { label: ReactNode; petunjuk?: ReactNode; checked: boolean; ubah: (v: boolean) => void; disabled?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={`${disabled ? 'opacity-50' : ''} ${className}`}>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-base font-bold text-tinta">
        <input type="checkbox" className="size-5 shrink-0" checked={checked} disabled={disabled} onChange={(e) => ubah(e.target.checked)} aria-describedby={petunjuk ? `${id}-ket` : undefined} />
        <span>{label}</span>
      </label>
      {petunjuk ? (
        <p id={`${id}-ket`} className="pl-8 text-base text-redup">
          {petunjuk}
        </p>
      ) : null}
    </div>
  );
}

const AWALAN_INGAT = 'gensoal:lipat:';

function bacaIngat(kunci: string | undefined, bawaan: boolean): boolean {
  if (!kunci) return bawaan;
  try {
    const v = localStorage.getItem(AWALAN_INGAT + kunci);
    return v === null ? bawaan : v === '1';
  } catch {
    return bawaan;
  }
}

/** Status buka/tutup; bila `ingat` diisi, disimpan per perangkat. */
export function useIngatBuka(ingat: string | undefined, bawaan = false): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [buka, setBuka] = useState(() => bacaIngat(ingat, bawaan));
  useEffect(() => {
    if (!ingat) return;
    try {
      localStorage.setItem(AWALAN_INGAT + ingat, buka ? '1' : '0');
    } catch {
      // localStorage dapat ditolak (mode privat); bagian tetap dapat dibuka, hanya tidak diingat.
    }
  }, [ingat, buka]);
  return [buka, setBuka];
}

/** Bagian yang dapat dilipat. Bila `ingat` diisi, status buka/tutup disimpan per perangkat. */
export function BagianLipat({ judul, ringkasan, ingat, bawaanTerbuka = false, className = '', children }: { judul: ReactNode; ringkasan?: ReactNode; ingat?: string; bawaanTerbuka?: boolean; className?: string; children: ReactNode }) {
  const [buka, setBuka] = useIngatBuka(ingat, bawaanTerbuka);
  const idIsi = useId();
  return (
    <section className={`kartu pita-garis !p-0 ${className}`}>
      <button type="button" className="flex w-full items-center gap-4 p-4 text-left sm:px-6" aria-expanded={buka} aria-controls={idIsi} onClick={() => setBuka((b) => !b)}>
        <span className="min-w-0 flex-1">
          <span className="block text-[20px] font-extrabold text-judul">{judul}</span>
          {ringkasan ? <span className="block text-base text-redup">{ringkasan}</span> : null}
        </span>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-utama transition-transform ${buka ? 'rotate-180' : ''}`}>
          <path d="M3 6.5l6 6 6-6" />
        </svg>
      </button>
      {buka ? (
        <div id={idIsi} className="border-t border-garis p-4 sm:p-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Opsi lanjutan: satu tombol lebar "Tampilkan/Sembunyikan opsi lanjutan" dengan daftar isinya di kanan,
 * lalu kartu-kartu `KartuLipat` di bawahnya.
 */
export function OpsiLanjutan({ ringkasan, ingat, paksaBuka = false, className = '', children }: { ringkasan?: ReactNode; ingat?: string; paksaBuka?: boolean; className?: string; children: ReactNode }) {
  const [buka, setBuka] = useIngatBuka(ingat);
  const idIsi = useId();
  useEffect(() => {
    if (paksaBuka) setBuka(true);
  }, [paksaBuka, setBuka]);
  return (
    <section aria-label="Opsi lanjutan" className={className}>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-4 rounded-xl border border-garis-kuat bg-kartu px-4 py-3 text-left hover:border-utama sm:px-5"
        aria-expanded={buka}
        aria-controls={idIsi}
        onClick={() => setBuka((b) => !b)}
      >
        <span className="shrink-0 text-base font-bold text-tinta">{buka ? 'Sembunyikan opsi lanjutan' : 'Tampilkan opsi lanjutan'}</span>
        {ringkasan ? <span className="hidden min-w-0 truncate text-base text-redup sm:block">{ringkasan}</span> : null}
      </button>
      {buka ? (
        <div id={idIsi} className="mt-4 space-y-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Kartu lipat di dalam opsi lanjutan: judul, satu baris keterangan, dan tanda + / −. `paksaBuka` membukanya (mis. ada isian salah). */
export function KartuLipat({ judul, ket, ingat, paksaBuka = false, tanda, children }: { judul: string; ket?: ReactNode; ingat?: string; paksaBuka?: boolean; tanda?: ReactNode; children: ReactNode }) {
  const [buka, setBuka] = useIngatBuka(ingat);
  const idIsi = useId();
  useEffect(() => {
    if (paksaBuka) setBuka(true);
  }, [paksaBuka, setBuka]);
  return (
    <section className="rounded-xl border border-garis bg-kartu shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <h3>
        <button type="button" className="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left sm:px-6 sm:py-5" aria-expanded={buka} aria-controls={idIsi} onClick={() => setBuka((b) => !b)}>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[18px] font-extrabold text-judul">{judul}</span>
              {tanda}
            </span>
            {ket ? <span className="mt-0.5 block text-base font-normal text-redup">{ket}</span> : null}
          </span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-redup">
            {buka ? <path d="M2.5 8h11" /> : <path d="M2.5 8h11M8 2.5v11" />}
          </svg>
        </button>
      </h3>
      {buka ? (
        <div id={idIsi} className="space-y-6 border-t border-garis px-4 py-5 sm:px-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export type NadaPemberitahuan = 'info' | 'awas' | 'galat' | 'berhasil';

/**
 * Token warna teks dan latar per nada. Satu pasangan dipakai di mode terang dan gelap;
 * kontrasnya diuji minimal 4,5 : 1 di keduanya (tests/formulir.test.tsx).
 */
export const WARNA_NADA: Record<NadaPemberitahuan, { teks: string; latar: string }> = {
  info: { teks: '--gs-head', latar: '--gs-main-soft' },
  awas: { teks: '--gs-warn', latar: '--gs-warn-bg' },
  galat: { teks: '--gs-bad', latar: '--gs-bad-bg' },
  berhasil: { teks: '--gs-good', latar: '--gs-good-bg' },
};

function IkonNada({ nada }: { nada: NadaPemberitahuan }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0">
      {nada === 'awas' ? (
        <>
          <path d="M8 1.5l6.5 12h-13z" />
          <path d="M8 6.5v3M8 11.6v.2" />
        </>
      ) : nada === 'galat' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
        </>
      ) : nada === 'berhasil' ? (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M5 8.2l2 2 4-4.4" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7.2v4M8 4.6v.2" />
        </>
      )}
    </svg>
  );
}

export function Pemberitahuan({ nada = 'info', children, className = '' }: { nada?: NadaPemberitahuan; children: ReactNode; className?: string }) {
  const w = WARNA_NADA[nada];
  return (
    <div
      role={nada === 'galat' ? 'alert' : 'status'}
      data-nada={nada}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-base leading-relaxed ${className}`}
      style={{ color: `var(${w.teks})`, backgroundColor: `var(${w.latar})`, borderColor: `color-mix(in srgb, var(${w.teks}) 40%, transparent)` }}
    >
      <IkonNada nada={nada} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
