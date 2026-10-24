import { useRegisterSW } from 'virtual:pwa-register/react';
import { Tombol } from '../komponen/Tombol';

/** Pemberitahuan versi baru (PWA). Aplikasi tetap berjalan tanpa internet setelah dimuat sekali. */
export function PembaruanAplikasi() {
  const {
    needRefresh: [perluMuatUlang, setPerluMuatUlang],
    offlineReady: [siapLuring, setSiapLuring],
    updateServiceWorker,
  } = useRegisterSW();
  if (!perluMuatUlang && !siapLuring) return null;
  return (
    <div role="status" className="tanpa-cetak fixed bottom-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-4 border border-tinta bg-latar px-5 py-4 sm:left-auto sm:right-6 sm:max-w-md">
      <span className="text-[15px]">{perluMuatUlang ? 'Versi baru GenSoal tersedia.' : 'GenSoal siap dipakai tanpa internet.'}</span>
      <span className="flex gap-2">
        {perluMuatUlang ? (
          <Tombol ukuran="kecil" onClick={() => updateServiceWorker(true)}>
            Muat ulang
          </Tombol>
        ) : null}
        <Tombol
          ukuran="kecil"
          varian="hantu"
          onClick={() => {
            setPerluMuatUlang(false);
            setSiapLuring(false);
          }}
        >
          Tutup
        </Tombol>
      </span>
    </div>
  );
}
