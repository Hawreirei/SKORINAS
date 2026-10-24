export function Logo({ kecil = false }: { kecil?: boolean }) {
  const u = kecil ? 24 : 28;
  return (
    <span className="flex items-center gap-2.5">
      <svg aria-hidden="true" width={u} height={u} viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-utama">
        <circle cx="13" cy="13" r="11" />
        <ellipse cx="13" cy="13" rx="11" ry="4.5" transform="rotate(-30 13 13)" />
        <circle cx="13" cy="13" r="1.8" fill="currentColor" />
      </svg>
      <span className={`${kecil ? 'text-[18px]' : 'text-[20px]'} font-extrabold text-judul`}>GenSoal</span>
    </span>
  );
}
