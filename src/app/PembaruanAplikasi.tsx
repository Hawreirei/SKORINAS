import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { pengatur } from '../generasi/pengatur';
import { Tombol } from '../komponen/Tombol';
import { usePengatur } from './kait';
import { JEDA_PERIKSA_MS, saatnyaPasang } from './pembaruan';

/**
 * Versi baru GenSoal (PWA) dipasang otomatis pada saat yang aman (src/app/pembaruan.ts); pemberitahuan tetap tampil
 * dengan tombol Muat ulang bagi guru yang ingin memasangnya sekarang. Aplikasi tetap berjalan tanpa internet.
 */
export function PembaruanAplikasi() {
  const { pathname } = useLocation();
  const { berjalan } = usePengatur();
  const muatPada = useRef(Date.now());
  // Versi baru sudah mengendalikan halaman, tetapi muat ulang ditunda karena soal sedang dibuat di tab ini.
  const [muatUlangTertunda, setMuatUlangTertunda] = useState(false);
  const [tersembunyi, setTersembunyi] = useState(() => document.visibilityState === 'hidden');
  // Menutup pemberitahuan hanya menyembunyikannya; versi baru tetap dipasang otomatis nanti.
  const [ditutup, setDitutup] = useState(false);
  const {
    needRefresh: [perluMuatUlang],
    offlineReady: [siapLuring, setSiapLuring],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      if (!r) return;
      const periksa = () => void r.update().catch(() => {});
      setInterval(periksa, JEDA_PERIKSA_MS);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && periksa());
    },
    // Dipanggil saat versi baru mulai mengendalikan halaman, juga bila dipasang dari tab lain.
    onNeedReload() {
      if (pengatur.ambil().berjalan) setMuatUlangTertunda(true);
      else window.location.reload();
    },
  });

  useEffect(() => {
    const ubah = () => setTersembunyi(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', ubah);
    return () => document.removeEventListener('visibilitychange', ubah);
  }, []);

  // Layar saat versi baru ditemukan; pindah layar berarti saat yang aman untuk memasangnya.
  const layarSaatDitemukan = useRef<string | null>(null);
  const adaVersiBaru = perluMuatUlang || muatUlangTertunda;
  if (!adaVersiBaru) layarSaatDitemukan.current = null;
  else if (layarSaatDitemukan.current === null) layarSaatDitemukan.current = pathname;

  useEffect(() => {
    if (!adaVersiBaru) return;
    if (!saatnyaPasang({ berjalan, tersembunyi, pindahLayar: layarSaatDitemukan.current !== pathname, msSejakMuat: Date.now() - muatPada.current })) return;
    if (muatUlangTertunda) window.location.reload();
    else void updateServiceWorker(true);
  }, [adaVersiBaru, muatUlangTertunda, berjalan, tersembunyi, pathname, updateServiceWorker]);

  if ((!adaVersiBaru || ditutup) && !siapLuring) return null;
  return (
    <div role="status" className="tanpa-cetak fixed bottom-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-4 border border-utama bg-latar px-5 py-4 sm:left-auto sm:right-6 sm:max-w-md">
      <span className="text-base">
        {!adaVersiBaru || ditutup ? 'GenSoal siap dipakai tanpa internet.' : berjalan ? 'Versi baru GenSoal dipasang setelah pembuatan soal selesai.' : 'Versi baru GenSoal dipasang otomatis saat Anda pindah layar.'}
      </span>
      <span className="flex gap-2">
        {adaVersiBaru && !ditutup && !berjalan ? (
          <Tombol ukuran="kecil" onClick={() => (muatUlangTertunda ? window.location.reload() : void updateServiceWorker(true))}>
            Muat ulang
          </Tombol>
        ) : null}
        <Tombol
          ukuran="kecil"
          varian="hantu"
          onClick={() => {
            setSiapLuring(false);
            if (adaVersiBaru) setDitutup(true);
          }}
        >
          Tutup
        </Tombol>
      </span>
    </div>
  );
}
