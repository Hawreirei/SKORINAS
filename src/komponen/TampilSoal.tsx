import { useMemo } from 'react';
import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { bangkitkanGambar } from '../gambar';
import { GambarSvg, TeksSoal } from './TeksSoal';

export function useSvgSoal(isi: IsiSoal): { svg: string | null; galat: string | null } {
  return useMemo(() => {
    if (!isi.gambar) return { svg: null, galat: null };
    try {
      return { svg: bangkitkanGambar(isi.gambar).svg, galat: null };
    } catch (e) {
      return { svg: null, galat: (e as Error).message };
    }
  }, [isi.gambar]);
}

export function teksKunciLayar(isi: IsiSoal): string {
  if (isi.bentuk === 'pilihan_ganda') return `Kunci: ${isi.kunci}`;
  if (isi.bentuk === 'benar_salah') return `Kunci: ${isi.kunci === 'B' ? 'Benar' : 'Salah'}`;
  return 'Kunci';
}

/** Tampilan satu soal: pokok, gambar, opsi, kunci, pembahasan, rubrik. */
export function TampilSoal({ isi, ringkas = false, besar = true }: { isi: IsiSoal; ringkas?: boolean; besar?: boolean }) {
  const { svg, galat } = useSvgSoal(isi);
  const opsi = (Object.keys(isi.opsi ?? {}).sort() as HurufOpsi[]).map((h) => [h, isi.opsi![h]!] as const);
  return (
    <div>
      <TeksSoal as="p" teks={isi.pokok} className={`mt-4 leading-normal ${besar ? 'text-[18px] sm:text-[20px]' : 'text-[17px]'}`} />
      {isi.terjemahan?.pokok ? <TeksSoal as="p" teks={isi.terjemahan.pokok} className="mt-2 text-[16px] italic text-redup" /> : null}
      {svg ? <GambarSvg svg={svg} className="mt-5" /> : null}
      {galat ? <p className="mt-4 text-base text-buruk">Gambar tidak dapat dibuat: {galat}</p> : null}
      {opsi.length ? (
        <ol className="mt-5 grid list-none gap-3 p-0 sm:grid-cols-2">
          {opsi.map(([h, t]) => (
            <li key={h} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${!ringkas && h === isi.kunci ? 'border-baik bg-baik-latar/60' : 'border-garis-kuat'}`}>
              <span className="font-extrabold text-judul">{h}</span>
              <TeksSoal teks={t} />
              {isi.terjemahan?.opsi?.[h] ? <TeksSoal teks={isi.terjemahan.opsi[h]!} className="text-base italic text-redup" /> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {!ringkas ? (
        <>
          <div className="mt-5 flex flex-wrap items-start gap-3">
            <span className="shrink-0 rounded-md bg-utama px-3 py-1.5 text-base font-bold text-di-tinta">{teksKunciLayar(isi)}</span>
            {isi.bentuk === 'isian_singkat' || isi.bentuk === 'uraian' ? <TeksSoal as="span" teks={isi.kunci} className="pt-1 text-base text-isi" /> : null}
          </div>
          {isi.rubrik?.length ? (
            <div className="mt-4">
              <div className="text-base font-bold text-redup">Rubrik</div>
              <ul className="mt-2 list-disc pl-5 text-base leading-relaxed text-isi">
                {isi.rubrik.map((r, i) => (
                  <li key={i}>
                    <TeksSoal teks={r} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-4">
            <div className="text-base font-bold text-redup">Pembahasan</div>
            <ol className="mt-2 list-decimal pl-5 text-base leading-relaxed text-isi">
              {isi.pembahasan.map((p, i) => (
                <li key={i}>
                  <TeksSoal teks={p} />
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </div>
  );
}
