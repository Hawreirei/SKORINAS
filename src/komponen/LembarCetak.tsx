import type { HurufOpsi } from '../db/tipe';
import { kolomOpsi, type BagianDok, type ButirDok, type DokumenSoal } from '../ekspor/model';
import { GambarSvg, TeksSoal } from './TeksSoal';

function TempatJawab({ b, d }: { b: ButirDok; d: DokumenSoal }) {
  const t = b.tempat;
  const jawab = d.inggris ? 'Answer :' : 'Jawaban :';
  if (t.jenis === 'titik') return <div className="mt-[0.3em]">{jawab} {'.'.repeat(60)}</div>;
  if (t.jenis === 'kotak')
    return (
      <div className="mt-[0.4em] flex items-center gap-[0.5em]">
        <strong>{jawab}</strong>
        <span className="inline-block h-[1.7em] w-[11em] border border-black" />
      </div>
    );
  if (t.jenis === 'garis')
    return (
      <div className="mt-[0.2em]">
        {Array.from({ length: t.jumlah }, (_, i) => (
          <div key={i} className="h-[1.8em] border-b border-black" />
        ))}
      </div>
    );
  if (t.jenis === 'hitungan')
    return (
      <>
        <div className="mt-[0.4em] h-[8em] border border-black px-[0.4em] pt-[0.2em] text-[0.8em] text-[#4b5563]">{d.inggris ? 'Working :' : 'Cara pengerjaan :'}</div>
        <div className="mt-[0.5em] flex items-center gap-[0.5em]">
          <strong>{d.inggris ? 'Final answer :' : 'Jawaban akhir :'}</strong>
          <span className="inline-block h-[1.7em] w-[11em] border border-black" />
        </div>
      </>
    );
  return null;
}

function Butir({ b, d }: { b: ButirDok; d: DokumenSoal }) {
  const isi = b.soal.isi_json;
  const huruf = Object.keys(isi.opsi ?? {}).sort() as HurufOpsi[];
  return (
    <div className="break-inside-avoid py-[0.4em]">
      <div className="flex">
        <span className="w-[1.8em] shrink-0">{b.nomor}.</span>
        <div className="min-w-0 flex-1">
          <TeksSoal as="div" teks={isi.pokok} />
          {isi.terjemahan?.pokok ? <TeksSoal as="div" teks={isi.terjemahan.pokok} className="italic text-[#4b5563]" /> : null}
          {b.svg ? <GambarSvg svg={b.svg} className="my-[0.4em] !p-0" maks={b.gambar && b.gambar.lebar < 300 ? 180 : 360} /> : null}
          {huruf.length ? (
            <div className="mt-[0.2em] grid gap-x-[1em] gap-y-[0.1em]" style={{ gridTemplateColumns: `repeat(${kolomOpsi(b)}, minmax(0, 1fr))` }}>
              {huruf.map((h) => (
                <div key={h} className="flex gap-[0.5em]">
                  <span>{h}.</span>
                  <TeksSoal teks={isi.opsi![h] ?? ''} />
                </div>
              ))}
            </div>
          ) : null}
          <TempatJawab b={b} d={d} />
        </div>
      </div>
    </div>
  );
}

function TabelBenarSalah({ bg, d }: { bg: BagianDok; d: DokumenSoal }) {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const lingkari = d.cara_bs === 'lingkari';
  const sel = 'border border-black px-[0.4em] py-[0.25em]';
  return (
    <table className="mt-[0.3em] w-full border-collapse">
      <thead>
        <tr className="bg-[#f2f2f2]">
          <th className={`${sel} w-[2.5em]`}>No</th>
          <th className={sel}>{L('Pernyataan', 'Statement')}</th>
          {lingkari ? (
            <th className={`${sel} w-[6em]`}>{L('Jawaban', 'Answer')}</th>
          ) : (
            <>
              <th className={`${sel} w-[4.5em]`}>{L('Benar', 'True')}</th>
              <th className={`${sel} w-[4.5em]`}>{L('Salah', 'False')}</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {bg.butir.map((b) => (
          <tr key={b.nomor} className="break-inside-avoid">
            <td className={`${sel} text-center`}>{b.nomor}</td>
            <td className={sel}>
              <TeksSoal teks={b.soal.isi_json.pokok} />
            </td>
            {lingkari ? (
              <td className={`${sel} text-center`}>{d.inggris ? 'T   F' : 'B   S'}</td>
            ) : (
              <>
                <td className={`${sel} text-center`}>
                  <span className="inline-block size-[0.8em] border border-black" />
                </td>
                <td className={`${sel} text-center`}>
                  <span className="inline-block size-[0.8em] border border-black" />
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Lembar soal sebagai HTML: pratinjau di layar Unduh dan tampilan cetak peramban. Mengikuti pakem Word dan PDF (Times New Roman). */
export function LembarCetak({ d, hanyaHalamanPertama = false }: { d: DokumenSoal; hanyaHalamanPertama?: boolean }) {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const bagian = hanyaHalamanPertama ? d.bagian.slice(0, 2).map((b) => ({ ...b, butir: b.butir.slice(0, 4) })) : d.bagian;
  const mapelKelas = `${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`;
  return (
    <div className="lembar bg-white text-black" style={{ fontFamily: "'Times New Roman', 'Liberation Serif', Tinos, serif" }}>
      {d.kop ? (
        <div className="flex items-end gap-[0.8em] border-b-[1.5px] border-black pb-[0.3em]">
          {d.kop.logo ? <img src={d.kop.logo} alt="" className="size-[3.2em] object-contain" /> : null}
          <div className="min-w-0 flex-1">
            <div className="font-bold">{d.kop.sekolah.toUpperCase()}</div>
            {d.kop.baris.map((b) => (
              <div key={b}>{b}</div>
            ))}
            {d.kop.alamat ? <div className="text-[0.85em] text-[#4b5563]">{d.kop.alamat}</div> : null}
          </div>
          <div className="shrink-0 font-bold">{mapelKelas}</div>
        </div>
      ) : null}
      {d.identitas.length ? (
        <div className="mt-[0.7em] flex gap-[1.2em]">
          {d.identitas.map((f, i) => (
            <span key={f} className="flex items-end gap-[0.3em]" style={{ flex: i === 0 ? 2 : 1 }}>
              {f} : <span className="mb-[0.25em] flex-1 border-b border-black" />
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-[0.8em] text-center font-bold">{d.judul.toUpperCase()}</div>
      {!d.kop ? <div className="text-center">{mapelKelas}</div> : null}
      {bagian.map((bg) => (
        <section key={bg.judul} className="mt-[0.9em]">
          <div className="font-bold">{bg.judul}</div>
          <div className="italic">{bg.petunjuk}</div>
          {bg.bentuk === 'benar_salah' ? <TabelBenarSalah bg={bg} d={d} /> : bg.butir.map((b) => <Butir key={b.nomor} b={b} d={d} />)}
        </section>
      ))}
      {!hanyaHalamanPertama ? (
        <>
          <p className="mt-[1.5em] text-[0.75em] text-[#4b5563]">{d.jejak}</p>
          {d.opsi.kunci ? (
            <section className="halaman-baru mt-[2em]">
              <div className="text-center font-bold">{L('KUNCI JAWABAN', 'ANSWER KEY')}</div>
              <div className="mt-[0.5em] columns-2 gap-[1.5em]">
                {d.kunci.map((k) => (
                  <div key={k.nomor} className="break-inside-avoid py-[0.15em]">
                    {k.nomor}. <TeksSoal teks={k.teks} />
                    {k.rubrik?.length ? (
                      <ul className="list-disc pl-[1.2em]">
                        {k.rubrik.map((r, i) => (
                          <li key={i}>
                            <TeksSoal teks={r} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {d.opsi.pembahasan ? (
            <section className="halaman-baru mt-[2em]">
              <div className="text-center font-bold">{L('PEMBAHASAN', 'WORKED SOLUTIONS')}</div>
              {d.pembahasan.map((p) => (
                <div key={p.nomor} className="mt-[0.5em] break-inside-avoid">
                  <span className="font-bold">{p.nomor}.</span>
                  <ul className="list-disc pl-[1.2em]">
                    {p.langkah.map((l, i) => (
                      <li key={i}>
                        <TeksSoal teks={l} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
          {d.opsi.kisi ? (
            <section className="halaman-baru mt-[2em]">
              <div className="text-center font-bold">{L('KISI-KISI', 'TEST BLUEPRINT')}</div>
              <div>
                {d.mapel} · {L('Kelas', 'Grade')} {d.kelas} · {L('Fase', 'Phase')} {d.fase} · {d.kurikulumLabel}
              </div>
              {d.cp ? (
                <div>
                  CP: <TeksSoal teks={d.cp} />
                </div>
              ) : null}
              <table className="mt-[0.5em] w-full border-collapse">
                <thead>
                  <tr>
                    {['No', 'TP', L('Indikator', 'Indicator'), 'Level', L('Kesukaran', 'Difficulty'), L('Bentuk', 'Type')].map((k) => (
                      <th key={k} className="border border-black bg-[#f2f2f2] p-[0.3em] text-left font-bold">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.kisi.map((k) => (
                    <tr key={k.nomor} className="break-inside-avoid">
                      <td className="border border-black p-[0.3em] align-top">{k.nomor}</td>
                      <td className="border border-black p-[0.3em] align-top">
                        <TeksSoal teks={k.tp} />
                        {k.tp_kode ? <span> ({k.tp_kode})</span> : null}
                      </td>
                      <td className="border border-black p-[0.3em] align-top">
                        <TeksSoal teks={k.indikator} />
                      </td>
                      <td className="border border-black p-[0.3em] align-top">{k.level}</td>
                      <td className="border border-black p-[0.3em] align-top">{k.kesukaran}</td>
                      <td className="border border-black p-[0.3em] align-top">{k.bentuk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
