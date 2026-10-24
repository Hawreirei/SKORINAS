export function Logo({ kecil = false }: { kecil?: boolean }) {
  const u = kecil ? 22 : 26;
  return (
    <span className="flex items-center gap-3.5">
      <svg aria-hidden="true" width={u} height={u} viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="13" cy="13" r="11" />
        <ellipse cx="13" cy="13" rx="11" ry="4.5" transform="rotate(-30 13 13)" />
        <circle cx="13" cy="13" r="1.6" fill="currentColor" />
      </svg>
      <span className={`${kecil ? 'text-[15px]' : 'text-[17px]'} font-medium tracking-[.32em]`}>GENSOAL</span>
    </span>
  );
}

/** Lingkaran orbit dekoratif dari papan desain. */
export function Orbit({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 900 900" className={`pointer-events-none absolute text-orbit ${className}`}>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="450" cy="450" r="140" />
        <circle cx="450" cy="450" r="230" />
        <circle cx="450" cy="450" r="330" />
        <circle cx="450" cy="450" r="430" strokeDasharray="2 7" />
        <ellipse cx="450" cy="450" rx="430" ry="150" transform="rotate(-24 450 450)" />
        <ellipse cx="450" cy="450" rx="330" ry="90" transform="rotate(38 450 450)" />
        <line x1="20" y1="450" x2="880" y2="450" strokeDasharray="1 5" />
        <line x1="450" y1="20" x2="450" y2="880" strokeDasharray="1 5" />
      </g>
      <g className="text-tinta" fill="currentColor">
        <circle cx="140" cy="318" r="4" />
        <circle cx="742" cy="540" r="3" />
        <circle cx="450" cy="120" r="3" />
        <circle cx="598" cy="236" r="2.5" />
      </g>
      <circle cx="598" cy="236" r="9" fill="none" stroke="currentColor" className="text-tinta" />
    </svg>
  );
}
