import { KepalaHalaman } from '../komponen/Kepala';
import { TautanTombol } from '../komponen/Tombol';
import { useJudulHalaman } from './kait';

export default function TidakDitemukan() {
  useJudulHalaman('Tidak ditemukan');
  return (
    <div className="mx-auto max-w-[1000px] px-4 py-24 sm:px-16">
      <KepalaHalaman label="404" judul="Halaman tidak ditemukan" subjudul="Alamat ini tidak ada di GenSoal. Mungkin tautannya sudah lama.">
        <TautanTombol to="/" className="mt-8">
          Ke beranda
        </TautanTombol>
      </KepalaHalaman>
    </div>
  );
}
