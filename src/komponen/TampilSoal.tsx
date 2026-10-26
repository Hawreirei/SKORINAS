import { useMemo } from 'react';
import type { HurufOpsi, IsiSoal } from '../db/tipe';
import { HURUF_KANAN, hurufKunci } from '../db/tipe';
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
  if (isi.bentuk === 'pilihan_ganda_kompleks') return `Kunci: ${hurufKunci(isi.kunci).join(', ')}`;
  if (isi.bentuk === 'benar_salah') return `Kunci: ${isi.kunci === 'B' ? 'Benar' : 'Salah'}`;
  if (isi.bentuk === 'menjodohkan') return `Kunci: ${isi.kunci.replace(/-/g, '–')}`;
  return 'Kunci';
}

/** Rubrik dan pembahasan satu soal. */
export function PembahasanSoal({ isi }: { isi: IsiSoal }) {
  return (
    <>
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
  );
}

/** Dua kolom menjodohkan: kiri bernomor, kanan berhuruf, dengan titik tempat menarik garis. */
function KolomJodoh({ isi }: { isi: IsiSoal }) {
  const p = isi.pasangan;
  if (!p) return null;
  const titik = <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-tinta" />;
  return (
    <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(1.5rem,4rem)_minmax(0,1fr)] gap-y-2">
      <div className="contents">
        {Array.from({ length: Math.max(p.kiri.length, p.kanan.length) }, (_, i) => (
          <div key={i} className="contents">
            <span className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${p.kiri[i] !== undefined ? 'border border-garis-kuat' : ''}`}>
              {p.kiri[i] !== undefined ? (
                <>
                  <span>
                    <span className="font-extrabold text-judul">{i + 1}.</span> <TeksSoal teks={p.kiri[i]} />
                  </span>
                  {titik}
                </>
              ) : null}
            </span>
            <span />
            <span className={`flex items-center gap-2 rounded-lg px-3 py-2 ${p.kanan[i] !== undefined ? 'border border-garis-kuat' : ''}`}>
              {p.kanan[i] !== undefined ? (
                <>
                  {titik}
                  <span>
                    <span className="font-extrabold text-judul">{HURUF_KANAN[i]}.</span> <TeksSoal teks={p.kanan[i]} />
                  </span>
                </>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tampilan satu soal: pokok, gambar, opsi, kunci, dan (kecuali `tanpaPembahasan`) rubrik serta pembahasan. */
export function TampilSoal({ isi, ringkas = false, besar = true, tanpaPembahasan = false }: { isi: IsiSoal; ringkas?: boolean; besar?: boolean; tanpaPembahasan?: boolean }) {
  const { svg, galat } = useSvgSoal(isi);
  const opsi = (Object.keys(isi.opsi ?? {}).sort() as HurufOpsi[]).map((h) => [h, isi.opsi![h]!] as const);
  const kunci = new Set<string>(isi.bentuk === 'pilihan_ganda_kompleks' ? hurufKunci(isi.kunci) : [isi.kunci]);
  // Opsi pendek tetap dua kolom di ponsel agar kartu soal tidak memanjang.
  const opsiPendek = !isi.terjemahan?.opsi && opsi.every(([, t]) => t.replace(/\\[a-z]+|[{}$]/g, '').length <= 24);
  return (
    <div>
      <TeksSoal as="p" teks={isi.pokok} className={`mt-4 leading-normal ${besar ? 'text-[18px] sm:text-[20px]' : 'text-[17px]'}`} />
      {isi.terjemahan?.pokok ? <TeksSoal as="p" teks={isi.terjemahan.pokok} className="mt-2 text-[16px] italic text-redup" /> : null}
      {svg ? <GambarSvg svg={svg} className="mt-5" /> : null}
      {galat ? <p className="mt-4 text-base text-buruk">Gambar tidak dapat dibuat: {galat}</p> : null}
      {opsi.length ? (
        <ol className={`mt-5 grid list-none gap-2 p-0 sm:grid-cols-2 sm:gap-3 ${opsiPendek ? 'grid-cols-2' : ''}`}>
          {opsi.map(([h, t]) => (
            <li key={h} className={`flex items-center gap-3 rounded-lg border px-3 py-2 sm:px-4 sm:py-3 ${!ringkas && kunci.has(h) ? 'border-baik bg-baik-latar/60' : 'border-garis-kuat'}`}>
              <span className="font-extrabold text-judul">{h}</span>
              <TeksSoal teks={t} />
              {isi.terjemahan?.opsi?.[h] ? <TeksSoal teks={isi.terjemahan.opsi[h]!} className="text-base italic text-redup" /> : null}
              {!ringkas && kunci.has(h) ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-base font-bold text-baik">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 8.5l3.5 3.5 7.5-8" />
                  </svg>
                  Kunci
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      <KolomJodoh isi={isi} />
      {!ringkas ? (
        <>
          {(isi.bentuk === 'pilihan_ganda' || isi.bentuk === 'pilihan_ganda_kompleks') && opsi.length ? null : (
            <div className="mt-5 flex flex-wrap items-start gap-3">
              <span className="shrink-0 rounded-md bg-utama-isi px-3 py-1.5 text-base font-bold text-di-tinta">{teksKunciLayar(isi)}</span>
              {isi.bentuk === 'isian_singkat' || isi.bentuk === 'uraian' ? <TeksSoal as="span" teks={isi.kunci} className="pt-1 text-base text-isi" /> : null}
            </div>
          )}
          {tanpaPembahasan ? null : <PembahasanSoal isi={isi} />}
        </>
      ) : null}
    </div>
  );
}
