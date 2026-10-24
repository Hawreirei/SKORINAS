import { TautanTombol } from '../komponen/Tombol';
import { useJudulHalaman } from './kait';

export default function TidakDitemukan() {
  useJudulHalaman('Tidak ditemukan');
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-24 sm:px-16">
      <div className="text-base font-bold text-redup">404</div>
      <h1 className="judul-besar mt-4 text-[48px]">Halaman tidak ditemukan</h1>
      <TautanTombol to="/" className="mt-8">
        Ke beranda
      </TautanTombol>
    </div>
  );
}
