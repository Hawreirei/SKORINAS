import { BANTUAN } from '../bantuan/daftar';
import { PanelBantuan } from '../komponen/Bantuan';
import { KepalaHalaman } from '../komponen/Kepala';
import { useJudulHalaman } from './kait';

export default function Bantuan() {
  useJudulHalaman('Bantuan');
  return (
    <div className="mx-auto max-w-[1312px] px-4 pb-24 pt-10 sm:px-8 lg:px-16 lg:pt-14">
      <KepalaHalaman label="Bantuan" judul="Cara memakai">
        Satu tugas per video, dengan langkah teks di bawahnya. Bantuan yang sama juga tampil di layar terkait.
      </KepalaHalaman>
      <div className="mt-12 grid gap-12 border-t border-tinta pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {Object.keys(BANTUAN).map((id) => (
          <PanelBantuan key={id} id={id} />
        ))}
      </div>
    </div>
  );
}
