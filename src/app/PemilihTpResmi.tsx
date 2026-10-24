import { useEffect, useMemo, useState } from 'react';
import { muatBerkasMapel } from '../kurikulum/muat';
import type { BerkasMapel, IndeksKurikulum } from '../kurikulum/tipe';
import { Chip, Tombol } from '../komponen/Tombol';

export interface TpTerpilih {
  id: string;
  kode: string;
  rumusan: string;
}

export function PemilihTpResmi({ indeks, kelas, mapelKode, pilih }: { indeks: IndeksKurikulum; kelas: number; mapelKode: string; pilih: (tp: TpTerpilih[], cp: string) => void }) {
  const kur = indeks.kurikulum.find((k) => k.aktif)!;
  const mapel = kur.mapel.find((m) => m.kode === mapelKode) ?? kur.mapel.find((m) => m.berkas);
  const faseKelas = kur.fase.find((f) => kelas >= f.kelas_dari && kelas <= f.kelas_sampai)?.kode ?? 'A';
  const [berkas, setBerkas] = useState<BerkasMapel | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [fase, setFase] = useState(faseKelas);
  const [hanyaKelas, setHanyaKelas] = useState(true);
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mapel) return;
    const p = muatBerkasMapel(mapel);
    if (!p) {
      setGalat(`Belum ada data CP dan TP resmi untuk ${mapel.nama}.`);
      return;
    }
    p.then(setBerkas, (e: Error) => setGalat(e.message));
  }, [mapel]);

  const elemen = useMemo(() => berkas?.fase[fase] ?? [], [berkas, fase]);
  const faseTersedia = berkas ? Object.keys(berkas.fase) : [];

  if (galat) return <p className="text-isi">{galat}</p>;
  if (!berkas) return <p className="text-redup">Memuat…</p>;

  const semuaTp = elemen.flatMap((e) => e.tp.filter((t) => !hanyaKelas || t.kelas === kelas).map((t) => ({ t, e })));
  const ubah = (id: string) =>
    setTerpilih((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <p className="text-[15px] text-isi">
        {kur.nama} · {kur.dasar_hukum} · {berkas.mapel.nama}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {faseTersedia.map((f) => (
          <Chip key={f} aktif={fase === f} onClick={() => setFase(f)}>
            Fase {f}
          </Chip>
        ))}
        {!faseTersedia.includes(faseKelas) ? <span className="text-sm text-redup">Data fase {faseKelas} belum tersedia; tulis TP sendiri atau ambil dari fase lain.</span> : null}
        <label className="ml-auto flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-5" checked={hanyaKelas} onChange={(e) => setHanyaKelas(e.target.checked)} />
          Hanya kelas {kelas}
        </label>
      </div>
      <div className="mt-5 border-t border-tinta">
        {elemen.map((e) => {
          const tp = e.tp.filter((t) => !hanyaKelas || t.kelas === kelas);
          return (
            <details key={e.id} className="border-b border-garis py-4" open={tp.length > 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-lg font-light">{e.nama}</span>
                <span className="mono text-redup">{tp.length} TP</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-redup">
                <span className="mono">CP · </span>
                {e.cp.teks}
              </p>
              <ul className="mt-3">
                {tp.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer gap-3 py-2 text-[15px] leading-normal">
                      <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={terpilih.has(t.id)} onChange={() => ubah(t.id)} />
                      <span>
                        {t.rumusan}
                        <span className="mono mt-1 block text-redup">
                          {t.kode} · kelas {t.kelas} · {t.status_validasi === 'tervalidasi' ? 'tervalidasi' : 'draf kurator'}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
                {!tp.length ? <li className="py-2 text-sm text-redup">Tidak ada TP untuk kelas ini pada elemen ini.</li> : null}
              </ul>
            </details>
          );
        })}
      </div>
      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-garis bg-latar pt-4">
        <span className="mono text-redup">{terpilih.size} TP dipilih</span>
        <Tombol
          disabled={!terpilih.size}
          onClick={() => {
            const dipilih = semuaTp.filter(({ t }) => terpilih.has(t.id));
            const cp = [...new Set(dipilih.map(({ e }) => e.cp.teks))].join('\n');
            pilih(
              dipilih.map(({ t }) => ({ id: t.id, kode: t.kode, rumusan: t.rumusan })),
              cp,
            );
            setTerpilih(new Set());
          }}
        >
          Masukkan ke formulir
        </Tombol>
      </div>
    </div>
  );
}
