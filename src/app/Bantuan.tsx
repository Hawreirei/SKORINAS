import { BANTUAN } from '../bantuan/daftar';
import { PanelBantuan } from '../komponen/Bantuan';
import { KepalaHalaman } from '../komponen/Kepala';
import { useJudulHalaman } from './kait';

export default function Bantuan() {
  useJudulHalaman('Bantuan');
  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman judul="Bantuan" subjudul="Satu tugas per video, dengan langkah teks di bawahnya." />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.keys(BANTUAN).map((id) => (
          <PanelBantuan key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
