import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tombol } from '../komponen/Tombol';

/**
 * Pemberitahuan PWA. Versi baru dipasang otomatis saat aplikasi dibuka (registerType 'autoUpdate' di
 * vite.config.ts), jadi yang tersisa hanya kabar bahwa aplikasi siap dipakai tanpa internet.
 */
export function PembaruanAplikasi() {
  const {
    offlineReady: [siapLuring, setSiapLuring],
  } = useRegisterSW();
  if (!siapLuring) return null;
  return (
    <div role="status" className="tanpa-cetak fixed bottom-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-4 border border-utama bg-latar px-5 py-4 sm:left-auto sm:right-6 sm:max-w-md">
      <span className="text-base">GenSoal siap dipakai tanpa internet.</span>
      <Tombol ukuran="kecil" varian="hantu" onClick={() => setSiapLuring(false)}>
        Tutup
      </Tombol>
    </div>
  );
}
