import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { Kaki, Kepala } from '../komponen/Kepala';
import { PenyediaPesan } from '../komponen/Pesan';
import { PembaruanAplikasi } from './PembaruanAplikasi';
import { Beranda } from './Beranda';

const BuatSoal = lazy(() => import('./BuatSoal'));
const DaftarSoal = lazy(() => import('./DaftarSoal'));
const Peninjauan = lazy(() => import('./Peninjauan'));
const Ekspor = lazy(() => import('./Ekspor'));
const Cetak = lazy(() => import('./Cetak'));
const Telaah = lazy(() => import('./Telaah'));
const Pengaturan = lazy(() => import('./Pengaturan'));
const PengaturanAi = lazy(() => import('./PengaturanAi'));
const Cadangan = lazy(() => import('./Cadangan'));
const Bantuan = lazy(() => import('./Bantuan'));
const TidakDitemukan = lazy(() => import('./TidakDitemukan'));

function Tata() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#isi" className="sr-only z-50 rounded-lg bg-utama px-4 py-3 font-bold text-di-tinta focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Lompat ke isi
      </a>
      <Kepala />
      <main id="isi" className="flex-1">
        <Suspense fallback={<div className="px-4 py-20 text-center text-redup sm:px-8">Memuat…</div>}>
          <Outlet />
        </Suspense>
      </main>
      <Kaki />
      <PembaruanAplikasi />
    </div>
  );
}

export function App() {
  return (
    <PenyediaPesan>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route path="/soal/:id/cetak" element={<Suspense fallback={null}><Cetak /></Suspense>} />
          <Route element={<Tata />}>
            <Route index element={<Beranda />} />
            <Route path="soal/baru" element={<BuatSoal />} />
            <Route path="soal" element={<DaftarSoal />} />
            <Route path="soal/:id" element={<Peninjauan />} />
            <Route path="soal/:id/ekspor" element={<Ekspor />} />
            <Route path="telaah" element={<Telaah />} />
            <Route path="pengaturan" element={<Pengaturan />} />
            <Route path="pengaturan/ai" element={<PengaturanAi />} />
            <Route path="cadangan" element={<Cadangan />} />
            <Route path="bantuan" element={<Bantuan />} />
            <Route path="*" element={<TidakDitemukan />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PenyediaPesan>
  );
}
