import type { HurufOpsi } from '../db/tipe';
import { opsiPerBaris, type ButirDok, type DokumenSoal } from '../ekspor/model';
import { GambarSvg, TeksSoal } from './TeksSoal';

function Butir({ b, d }: { b: ButirDok; d: DokumenSoal }) {
  const isi = b.soal.isi_json;
  const huruf = Object.keys(isi.opsi ?? {}).sort() as HurufOpsi[];
  const perBaris = opsiPerBaris(b, huruf.length);
  return (
    <div className="break-inside-avoid py-[0.45em]">
      <div className="flex gap-[0.6em]">
        <span className="w-[1.6em] shrink-0">{b.nomor}.</span>
        <div className="min-w-0 flex-1">
          <div className="flex gap-4">
            <TeksSoal teks={isi.pokok} className="flex-1" />
            {isi.bentuk === 'benar_salah' ? <span className="shrink-0">{d.inggris ? 'T / F' : 'B / S'}</span> : null}
          </div>
          {isi.terjemahan?.pokok ? <TeksSoal as="div" teks={isi.terjemahan.pokok} className="italic text-[#5b616b]" /> : null}
          {b.svg ? <GambarSvg svg={b.svg} className="mx-auto my-[0.5em] !p-0" maks={b.gambar && b.gambar.lebar < 300 ? 180 : 360} /> : null}
          {huruf.length ? (
            <div className="mt-[0.3em] grid gap-x-[1em] gap-y-[0.2em]" style={{ gridTemplateColumns: `repeat(${perBaris}, minmax(0, 1fr))` }}>
              {huruf.map((h) => (
                <div key={h} className="flex gap-[0.4em]">
                  <span>{h}.</span>
                  <TeksSoal teks={isi.opsi![h] ?? ''} />
                </div>
              ))}
            </div>
          ) : null}
          {b.kotakJawaban ? (
            <div className="mt-[0.4em] border border-black px-[0.4em] pt-[0.2em] text-[0.65em] text-[#5b616b]" style={{ height: isi.bentuk === 'uraian' ? '9em' : '4.5em' }}>
              {d.inggris ? 'Answer:' : 'Jawaban:'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DaftarButir({ butir, d }: { butir: ButirDok[]; d: DokumenSoal }) {
  const blok: ButirDok[][] = [];
  for (const b of butir) {
    const akhir = blok[blok.length - 1];
    if (akhir && akhir[0].sederhana === b.sederhana) akhir.push(b);
    else blok.push([b]);
  }
  return (
    <>
      {blok.map((k, i) =>
        k[0].sederhana && k.length > 1 ? (
          <div key={i} className="columns-2 gap-[1.5em]">
            {k.map((b) => (
              <Butir key={b.nomor} b={b} d={d} />
            ))}
          </div>
        ) : (
          k.map((b) => <Butir key={b.nomor} b={b} d={d} />)
        ),
      )}
    </>
  );
}

/** Lembar soal sebagai HTML: pratinjau di layar Ekspor dan tampilan cetak peramban (cadangan bila PDF gagal). */
export function LembarCetak({ d, hanyaHalamanPertama = false }: { d: DokumenSoal; hanyaHalamanPertama?: boolean }) {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const bagian = hanyaHalamanPertama ? d.bagian.slice(0, 1).map((b) => ({ ...b, butir: b.butir.slice(0, 6) })) : d.bagian;
  return (
    <div className="lembar bg-white text-[#0b0c0e]" style={{ fontFamily: "'Inter Tight', sans-serif" }}>
      {d.kop ? (
        <div className="flex items-center gap-4 border-b-[3px] border-double border-black pb-[0.5em]">
          {d.kop.logo ? <img src={d.kop.logo} alt="" className="size-[3.6em] object-contain" /> : null}
          <div className="flex-1 text-center">
            <div className="text-[1.15em] font-semibold tracking-[.08em]">{d.kop.sekolah.toUpperCase()}</div>
            {d.kop.baris.map((b) => (
              <div key={b} className="text-[0.85em]">
                {b}
              </div>
            ))}
            {d.kop.alamat ? <div className="text-[0.7em] text-[#5b616b]">{d.kop.alamat}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="mt-[0.8em] text-center">
        <div className="font-semibold">{d.judul}</div>
        <div className="text-[0.8em]">
          {d.mapel} · {L('Kelas', 'Grade')} {d.kelas}
        </div>
      </div>
      {d.identitas.length ? (
        <div className="mt-[0.8em] flex gap-[1.5em] text-[0.8em]">
          {d.identitas.map((f, i) => (
            <span key={f} className="flex flex-1 items-end gap-1" style={{ flexGrow: i === 0 ? 2 : 1 }}>
              {f}: <span className="mb-[0.25em] flex-1 border-b border-black" />
            </span>
          ))}
        </div>
      ) : null}
      {bagian.map((bg) => (
        <section key={bg.judul} className="mt-[1em]">
          <div className="font-semibold">{bg.judul}</div>
          <div className="text-[0.75em] italic text-[#5b616b]">{bg.petunjuk}</div>
          <DaftarButir butir={bg.butir} d={d} />
        </section>
      ))}
      {!hanyaHalamanPertama ? (
        <>
          <p className="mt-[1.5em] text-[0.55em] text-[#5b616b]">{d.jejak}</p>
          {d.opsi.kunci ? (
            <section className="halaman-baru mt-[2em]">
              <div className="text-[1.15em] font-semibold">{L('Kunci Jawaban', 'Answer Key')}</div>
              <div className="mt-[0.5em] columns-2 gap-[1.5em] text-[0.85em]">
                {d.kunci.map((k) => (
                  <div key={k.nomor} className="break-inside-avoid py-[0.15em]">
                    {k.nomor}. <TeksSoal teks={k.teks} />
                    {k.rubrik?.length ? (
                      <ul className="list-disc pl-[1.2em] text-[0.85em]">
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
              <div className="text-[1.15em] font-semibold">{L('Pembahasan', 'Worked Solutions')}</div>
              {d.pembahasan.map((p) => (
                <div key={p.nomor} className="mt-[0.5em] break-inside-avoid text-[0.85em]">
                  <span className="font-semibold">{p.nomor}.</span>
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
              <div className="text-[1.15em] font-semibold">{L('Kisi-kisi', 'Test Blueprint')}</div>
              <div className="text-[0.65em] text-[#5b616b]">
                {d.kurikulumLabel} · {d.mapel} · {L('Kelas', 'Grade')} {d.kelas} · {L('Fase', 'Phase')} {d.fase}
              </div>
              <table className="mt-[0.5em] w-full border-collapse text-[0.6em]">
                <thead>
                  <tr>
                    {['No', 'TP', L('Indikator', 'Indicator'), 'Level', L('Kesukaran', 'Difficulty'), L('Bentuk', 'Type')].map((k) => (
                      <th key={k} className="border border-black bg-[#f6f7f8] p-[0.4em] text-left font-semibold">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.kisi.map((k) => (
                    <tr key={k.nomor} className="break-inside-avoid">
                      <td className="border border-black p-[0.4em] align-top">{k.nomor}</td>
                      <td className="border border-black p-[0.4em] align-top">
                        <TeksSoal teks={k.tp} />
                        {k.tp_kode ? <span className="text-[#5b616b]"> ({k.tp_kode})</span> : null}
                      </td>
                      <td className="border border-black p-[0.4em] align-top">
                        <TeksSoal teks={k.indikator} />
                      </td>
                      <td className="border border-black p-[0.4em] align-top">{k.level}</td>
                      <td className="border border-black p-[0.4em] align-top">{k.kesukaran}</td>
                      <td className="border border-black p-[0.4em] align-top">{k.bentuk}</td>
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
