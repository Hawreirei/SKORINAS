import type { HurufOpsi } from '../db/tipe';
import { HURUF_KANAN } from '../db/tipe';
import { kolomOpsi, teksPenskoran, type BagianDok, type ButirDok, type DokumenSoal } from '../ekspor/model';
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

/** Menjodohkan: kolom kiri bernomor dan kolom kanan berhuruf dengan titik, ruang tengah untuk menarik garis. */
function KolomJodoh({ b }: { b: ButirDok }) {
  const p = b.soal.isi_json.pasangan;
  if (!p) return null;
  const titik = <span className="inline-block size-[0.4em] shrink-0 rounded-full bg-black" />;
  return (
    <div className="mt-[0.3em] grid grid-cols-[minmax(0,1fr)_5em_minmax(0,1fr)] gap-y-[0.5em]">
      {Array.from({ length: Math.max(p.kiri.length, p.kanan.length) }, (_, i) => (
        <div key={i} className="contents">
          <div className="flex items-center justify-between gap-[0.5em]">
            {p.kiri[i] !== undefined ? (
              <>
                <span>
                  {i + 1}. <TeksSoal teks={p.kiri[i]} />
                </span>
                {titik}
              </>
            ) : null}
          </div>
          <div />
          <div className="flex items-center gap-[0.5em]">
            {p.kanan[i] !== undefined ? (
              <>
                {titik}
                <span>
                  {HURUF_KANAN[i]}. <TeksSoal teks={p.kanan[i]} />
                </span>
              </>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
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
          <KolomJodoh b={b} />
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

/** Pedoman penskoran di berkas kunci jawaban: skor per bentuk soal, skor maksimal, dan rumus nilai. */
function TabelPenskoran({ d }: { d: DokumenSoal }) {
  const t = teksPenskoran(d.inggris);
  const sel = 'border border-black p-[0.3em]';
  return (
    <div className="mt-[1.2em] break-inside-avoid">
      <div className="font-bold">{t.judul}</div>
      <table className="mt-[0.3em] w-full border-collapse">
        <thead>
          <tr className="bg-[#f2f2f2]">
            {t.kepala.map((k, i) => (
              <th key={k} className={`${sel} ${i ? 'text-center' : 'text-left'} font-bold`}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.penskoran!.baris.map((b) => (
            <tr key={b.bentuk}>
              <td className={sel}>{b.bentuk}</td>
              <td className={`${sel} text-center`}>{b.jumlah}</td>
              <td className={`${sel} text-center`}>{b.skor}</td>
              <td className={`${sel} text-center`}>{b.maks}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={sel} colSpan={3}>
              {t.total}
            </td>
            <td className={`${sel} text-center`}>{d.penskoran!.total}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-[0.3em]">{t.rumus}</div>
    </div>
  );
}

function KepalaLampiran({ d, judul }: { d: DokumenSoal; judul: string }) {
  return (
    <div className="mb-[1em] text-center">
      <div className="font-bold">{judul}</div>
      {d.kop ? <div>{d.kop.sekolah.toUpperCase()}</div> : null}
      <div>
        {d.judul} · {d.mapel} · {d.inggris ? 'Grade' : 'Kelas'} {d.kelas}
      </div>
    </div>
  );
}

/** Kop sekolah dan baris identitas siswa di halaman pertama lembar soal; juga dipakai pratinjau di Profil dan kop. */
export function KopLembar({ kop, identitas, mapelKelas }: { kop: DokumenSoal['kop']; identitas: string[]; mapelKelas: string }) {
  return (
    <>
      {kop ? (
        <div className="flex items-end gap-[0.8em] border-b-[1.5px] border-black pb-[0.3em]">
          {kop.logo ? <img src={kop.logo} alt="" className="size-[3.2em] object-contain" /> : null}
          <div className="min-w-0 flex-1">
            <div className="font-bold">{kop.sekolah.toUpperCase()}</div>
            {kop.baris.map((b) => (
              <div key={b}>{b}</div>
            ))}
            {kop.alamat ? <div className="text-[0.85em] text-[#4b5563]">{kop.alamat}</div> : null}
          </div>
          <div className="shrink-0 font-bold">{mapelKelas}</div>
        </div>
      ) : null}
      {identitas.length ? (
        <div className="mt-[0.7em] flex gap-[1.2em]">
          {identitas.map((f, i) => (
            <span key={f} className="flex items-end gap-[0.3em]" style={{ flex: i === 0 ? 2 : 1 }}>
              {f} : <span className="mb-[0.25em] flex-1 border-b border-black" />
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Satu berkas (lembar soal, kunci jawaban, atau kisi-kisi) sebagai HTML: pratinjau di layar Unduh dan tampilan cetak peramban. Mengikuti pakem Word dan PDF (Times New Roman). */
export function LembarCetak({ d, hanyaHalamanPertama = false }: { d: DokumenSoal; hanyaHalamanPertama?: boolean }) {
  const L = (id: string, en: string) => (d.inggris ? en : id);
  const bagian = hanyaHalamanPertama ? d.bagian.slice(0, 2).map((b) => ({ ...b, butir: b.butir.slice(0, 4) })) : d.bagian;
  const mapelKelas = `${d.mapel} · ${L('Kelas', 'Grade')} ${d.kelas}`;
  return (
    <div className="lembar kertas">
      {d.berkas === 'soal' ? (
        <>
      <KopLembar kop={d.kop} identitas={d.identitas} mapelKelas={mapelKelas} />
      <div className="mt-[0.8em] text-center font-bold">{d.judul.toUpperCase()}</div>
      {!d.kop ? <div className="text-center">{mapelKelas}</div> : null}
      {bagian.map((bg) => (
        <section key={bg.judul} className="mt-[0.9em]">
          <div className="font-bold">{bg.judul}</div>
          <div className="italic">{bg.petunjuk}</div>
          {bg.bentuk === 'benar_salah' ? <TabelBenarSalah bg={bg} d={d} /> : bg.butir.map((b) => <Butir key={b.nomor} b={b} d={d} />)}
        </section>
      ))}
        </>
      ) : null}
      {!hanyaHalamanPertama ? (
        <>
          {d.berkas === 'kunci' ? (
            <section>
              <KepalaLampiran d={d} judul={L('KUNCI JAWABAN', 'ANSWER KEY')} />
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
              {d.penskoran ? <TabelPenskoran d={d} /> : null}
            </section>
          ) : null}
          {d.berkas === 'kunci' && d.opsi.pembahasan ? (
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
          {d.berkas === 'kisi' ? (
            <section>
              <KepalaLampiran d={d} judul={L('KISI-KISI', 'TEST BLUEPRINT')} />
              <div>
                {L('Fase', 'Phase')} {d.fase} · {d.kurikulumLabel}
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
