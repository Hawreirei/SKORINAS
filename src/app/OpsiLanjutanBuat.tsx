import { useState, type ReactNode } from 'react';
import type { BarisRincian, Bentuk, GayaSoal, JenisIsian, JenisUraian, Level, ModeGambar, BahasaSoal } from '../db/tipe';
import { BENTUK_LABEL, GAYA, GAYA_LABEL, LEVEL } from '../db/tipe';
import { bagiKomposisi } from '../generasi/komposisi';
import { URUTAN_BENTUK } from '../generasi/rencana';
import { IsianAngka, IsianPanjang, IsianTeks, KartuLipat, OpsiLanjutan, Pemberitahuan, Pilihan, PilihanBanyak, PilihanDaftar, Sakelar } from '../komponen/Formulir';
import { Tombol } from '../komponen/Tombol';
import type { FormatUjian } from '../ujian';
import { aturanDariTeks, barisTp, bentukIsian, rincianDariIsian, type galatKartu, type Isian } from './isian-buat';
import { bagiRata, levelDariPersen, MAKS_SOAL, MIN_SOAL, SKOR_BAWAAN } from './rencana-buat';

/**
 * Opsi lanjutan layar Buat (F-36): sembilan kartu lipat. Hampir setiap pilihan juga dapat diatur sendiri:
 * angka diketik, susunan soal per baris, rincian tiap bentuk, skor salah, waktu, campuran gaya, bahasa lain,
 * konteks, dan aturan tambahan untuk AI.
 */

const KOMPOSISI = [
  { nilai: 'bawaan', label: 'Bawaan', persen: [30, 50, 20], akibat: 'Seimbang untuk penilaian harian.' },
  { nilai: 'mudah', label: 'Lebih mudah', persen: [50, 40, 10], akibat: 'Cocok untuk latihan atau remedial.' },
  { nilai: 'sulit', label: 'Lebih sulit', persen: [20, 50, 30], akibat: 'Lebih banyak soal penalaran; pembuatan bisa lebih lama karena soal lebih sering dicek ulang.' },
] as const satisfies readonly { nilai: string; label: string; persen: readonly [number, number, number]; akibat: string }[];
type NilaiKomposisi = (typeof KOMPOSISI)[number]['nilai'] | 'sendiri';
const samaPersen = (a: readonly number[], b: readonly number[]) => a.every((x, i) => x === b[i]);

export const NAMA_LEVEL: Record<Level, string> = { C1: 'Mengingat', C2: 'Memahami', C3: 'Menerapkan', C4: 'Menganalisis', C5: 'Mengevaluasi', C6: 'Mencipta' };

const JENIS_ISIAN: { nilai: JenisIsian; label: string }[] = [
  { nilai: 'bebas', label: 'Bebas (bilangan, kata, atau tanda)' },
  { nilai: 'bilangan', label: 'Bilangan (boleh pecahan dan satuan)' },
  { nilai: 'bilangan_bulat', label: 'Bilangan bulat saja' },
  { nilai: 'kata', label: 'Kata atau istilah' },
];

const jumlah = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function TandaPerbaiki() {
  return <span className="inline-flex min-h-7 items-center rounded-full bg-buruk-latar px-2.5 text-base font-bold text-buruk">Perlu diperbaiki</span>;
}

function Langkah({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="size-11 shrink-0 rounded-lg border border-garis-kuat bg-kartu text-2xl font-bold text-utama hover:border-utama disabled:opacity-30">
      {label.startsWith('Kurangi') ? '−' : '+'}
    </button>
  );
}

/** Satu baris jumlah: nama di kiri, tombol kurang, angka yang dapat diketik, dan tombol tambah di kanan. */
export function BarisJumlah({ id, label, ket, nilai, ubah, maks = MAKS_SOAL, min = 0, akhiran }: { id: string; label: ReactNode; ket?: ReactNode; nilai: number; ubah: (n: number) => void; maks?: number; min?: number; akhiran?: string }) {
  const atur = (n: number) => ubah(Math.max(min, Math.min(maks, n)));
  const nama = typeof label === 'string' ? label : id;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-garis py-2 last:border-b-0">
      <label htmlFor={id} className="min-w-0 text-base">
        <span className="font-bold text-tinta">{label}</span>
        {ket ? <span className="block text-redup">{ket}</span> : null}
      </label>
      <span className="flex shrink-0 items-center gap-2">
        <Langkah label={`Kurangi ${nama}`} onClick={() => atur(nilai - 1)} disabled={nilai <= min} />
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className="bidang !min-h-11 w-16 text-center text-[18px] font-extrabold tabular-nums"
          value={nilai}
          onFocus={(e) => e.target.select()}
          onChange={(e) => atur(Number(e.target.value.replace(/\D/g, '').slice(0, 3)) || 0)}
        />
        <Langkah label={`Tambah ${nama}`} onClick={() => atur(nilai + 1)} disabled={nilai >= maks} />
        {akhiran ? <span className="w-5 text-base font-bold text-redup">{akhiran}</span> : null}
      </span>
    </div>
  );
}

/** Total jumlah yang diatur terhadap jumlah soal, dengan tombol untuk membagi ulang. */
function TotalJumlah({ total, n, bagi, labelBagi, samakan }: { total: number; n: number; bagi: () => void; labelBagi: string; samakan: (n: number) => void }) {
  const pas = total === n;
  const bisaDisamakan = !pas && total >= MIN_SOAL && total <= MAKS_SOAL;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <p className={`text-base font-bold tabular-nums ${pas ? 'text-baik' : 'text-buruk'}`} aria-live="polite">
        {pas ? `Total ${total} soal, sudah pas.` : `Total ${total} dari ${n} soal${total < n ? `, kurang ${n - total}` : `, lebih ${total - n}`}.`}
      </p>
      <span className="flex flex-wrap gap-x-5">
        {bisaDisamakan ? (
          <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={() => samakan(total)}>
            Jadikan jumlah soal {total}
          </button>
        ) : null}
        <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={bagi}>
          {labelBagi}
        </button>
      </span>
    </div>
  );
}

function SubJudul({ children }: { children: ReactNode }) {
  return <h4 className="text-base font-extrabold text-judul">{children}</h4>;
}

/** Susunan rinci: satu baris = sekian soal berbentuk ini, berlevel ini, untuk TP ini. */
function TabelRincian({ f, ubah, daftarTp, samakan }: { f: Isian; ubah: (u: Partial<Isian>) => void; daftarTp: string[]; samakan: (n: number) => void }) {
  const baris = f.rincian ?? [];
  const ganti = (i: number, u: Partial<BarisRincian>) => ubah({ rincian: baris.map((r, j) => (j === i ? { ...r, ...u } : r)) });
  return (
    <div className="mt-3 pl-0 sm:pl-8">
      <ul className="space-y-3" aria-label="Susunan per baris">
        {baris.map((r, i) => (
          <li key={i} className="rounded-lg border border-garis p-3">
            <p className="text-base font-bold text-tinta">Baris {i + 1}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:items-end">
              <PilihanDaftar id={`rincian-${i}-bentuk`} label="Bentuk" value={r.bentuk} onChange={(e) => ganti(i, { bentuk: e.target.value as Bentuk })}>
                {URUTAN_BENTUK.map((b) => (
                  <option key={b} value={b}>
                    {BENTUK_LABEL[b]}
                  </option>
                ))}
              </PilihanDaftar>
              <PilihanDaftar id={`rincian-${i}-level`} label="Level" value={r.level} onChange={(e) => ganti(i, { level: e.target.value as Level })}>
                {LEVEL.map((l) => (
                  <option key={l} value={l}>
                    {l} · {NAMA_LEVEL[l]}
                  </option>
                ))}
              </PilihanDaftar>
              <PilihanDaftar id={`rincian-${i}-tp`} label="TP" value={r.tp === null ? '' : String(r.tp)} onChange={(e) => ganti(i, { tp: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">Bergiliran</option>
                {daftarTp.map((t, j) => (
                  <option key={j} value={j}>
                    TP {j + 1}: {t.slice(0, 50)}
                    {t.length > 50 ? '…' : ''}
                  </option>
                ))}
                {r.tp !== null && r.tp >= daftarTp.length ? <option value={r.tp}>TP {r.tp + 1} (sudah dihapus)</option> : null}
              </PilihanDaftar>
              <div className="flex items-end gap-3">
                <IsianAngka
                  id={`rincian-${i}-jumlah`}
                  label="Jumlah"
                  className="w-24"
                  kelasIsian="text-center font-extrabold"
                  value={r.jumlah}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => ganti(i, { jumlah: Math.min(MAKS_SOAL, Number(e.target.value.replace(/\D/g, '').slice(0, 2)) || 0) })}
                />
                <button type="button" className="min-h-12 px-1 text-base font-bold text-buruk hover:underline" onClick={() => ubah({ rincian: baris.filter((_, j) => j !== i) })} aria-label={`Hapus baris ${i + 1}`}>
                  Hapus
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3">
        <Tombol varian="garis" onClick={() => ubah({ rincian: [...baris, { bentuk: baris.at(-1)?.bentuk ?? 'pilihan_ganda', level: baris.at(-1)?.level ?? 'C3', tp: null, jumlah: Math.max(1, f.n - jumlah(baris.map((r) => r.jumlah))) }] })}>
          Tambah baris
        </Tombol>
      </div>
      <TotalJumlah total={jumlah(baris.map((r) => r.jumlah))} n={f.n} samakan={samakan} labelBagi="Isi ulang dari pengaturan bentuk dan level" bagi={() => ubah({ rincian: rincianDariIsian({ ...f, rincian: null }) })} />
    </div>
  );
}

export interface PropsOpsiLanjutan {
  f: Isian;
  ubah: (u: Partial<Isian>) => void;
  /** Jumlah soal diubah dari dalam opsi lanjutan (tombol "Jadikan jumlah soal …"). */
  ubahN: (n: number) => void;
  galat: ReturnType<typeof galatKartu>;
  dicoba: boolean;
  paksaBuka: boolean;
  perBentuk: Partial<Record<Bentuk, number>> | null;
  skorMaks: number | null;
  ujianKini: FormatUjian | null;
  kataMateri: number;
  maksKataMateri: number;
  judul: string;
  setJudul: (s: string) => void;
  judulBawaan: string;
  simpanPreset: boolean;
  setSimpanPreset: (b: boolean) => void;
  namaPreset: string;
  setNamaPreset: (s: string) => void;
  galatNamaPreset?: string;
  sentuhNamaPreset: () => void;
  hanyaSimpanPreset: () => void;
}

export default function OpsiLanjutanBuat(p: PropsOpsiLanjutan) {
  const { f, ubah, ubahN, galat, dicoba } = p;
  const [aturSendiri, setAturSendiri] = useState(false);
  const daftarTp = barisTp(f.tpTeks);
  const aturTp = daftarTp.length > 1;
  const bentukTerpilih = URUTAN_BENTUK.filter((b) => f.bentuk.includes(b));
  const dipakai = bentukIsian(f);
  const kuota = bagiKomposisi(f.n, f.persen);
  const komposisiCepat = KOMPOSISI.find((k) => samaPersen(k.persen, f.persen));
  const nilaiKomposisi: NilaiKomposisi = aturSendiri || !komposisiCepat ? 'sendiri' : komposisiCepat.nilai;
  const opsiOtomatis = f.kelas ? (f.kelas >= 10 ? 5 : 4) : null;
  const opsiPg = f.opsiPg ?? opsiOtomatis ?? 4;
  const adaPg = dipakai.includes('pilihan_ganda') || dipakai.includes('pilihan_ganda_kompleks');
  const aturanFormat = p.ujianKini ? p.ujianKini.aturan.join('\n') : null;
  const kataMateriLebih = p.kataMateri > p.maksKataMateri;
  const ab = f.aturBentuk;
  const ubahAb = (u: Partial<Isian['aturBentuk']>) => ubah({ aturBentuk: { ...ab, ...u } });
  const totalGaya = f.jumlahGaya ? jumlah(GAYA.map((g) => f.jumlahGaya![g] ?? 0)) : 0;

  return (
    <OpsiLanjutan ingat="buat-lanjutan" paksaBuka={p.paksaBuka} ringkasan="susunan, kesukaran, rincian bentuk, skor dan waktu, gaya dan bahasa, aturan AI, gambar, materi, simpan">
      <KartuLipat judul="Susunan soal" ket="Bentuk soal, jumlah per bentuk, atau susunan rinci per baris" ingat="buat-kartu-bentuk" paksaBuka={dicoba && galat.susunan.length > 0} tanda={galat.susunan.length ? <TandaPerbaiki /> : null}>
        {f.rincian ? (
          <Pemberitahuan nada="info">Bentuk, level, dan TP diatur di susunan per baris di bawah.</Pemberitahuan>
        ) : (
          <div>
            <PilihanBanyak label="Bentuk soal" nilai={f.bentuk} ubah={(bentuk) => ubah({ bentuk })} opsi={URUTAN_BENTUK.map((b) => ({ nilai: b, label: BENTUK_LABEL[b] }))} />
            {!f.bentuk.length ? <p className="mt-2 text-base font-bold text-buruk">Pilih minimal satu bentuk soal.</p> : null}
            {f.bentuk.includes('pilihan_ganda_kompleks') || f.bentuk.includes('menjodohkan') ? (
              <p className="mt-2 text-base text-redup">
                {[f.bentuk.includes('pilihan_ganda_kompleks') ? 'Pilihan ganda kompleks: jawaban benar lebih dari satu.' : null, f.bentuk.includes('menjodohkan') ? 'Menjodohkan: siswa menarik garis dari kolom kiri ke kolom kanan.' : null].filter(Boolean).join(' ')}
              </p>
            ) : null}
            {f.bentuk.length ? (
              <Sakelar
                className="mt-3"
                label="Atur jumlah per bentuk soal"
                petunjuk={f.jumlahBentuk ? undefined : 'Bila mati, soal dibagi rata ke bentuk yang dipilih.'}
                checked={!!f.jumlahBentuk}
                ubah={(nyala) => ubah({ jumlahBentuk: nyala ? Object.fromEntries(bentukTerpilih.map((b, i) => [b, bagiRata(f.n, bentukTerpilih.length)[i]])) : null })}
              />
            ) : null}
            {f.jumlahBentuk && f.bentuk.length ? (
              <div className="mt-2 pl-8">
                {bentukTerpilih.map((b) => (
                  <BarisJumlah key={b} id={`jumlah-${b}`} label={BENTUK_LABEL[b]} nilai={f.jumlahBentuk![b] ?? 0} ubah={(n) => ubah({ jumlahBentuk: { ...f.jumlahBentuk, [b]: n } })} />
                ))}
                <TotalJumlah
                  total={bentukTerpilih.reduce((a, b) => a + (f.jumlahBentuk![b] ?? 0), 0)}
                  n={f.n}
                  samakan={ubahN}
                  labelBagi="Bagi rata"
                  bagi={() => ubah({ jumlahBentuk: Object.fromEntries(bentukTerpilih.map((b, i) => [b, bagiRata(f.n, bentukTerpilih.length)[i]])) })}
                />
              </div>
            ) : null}
          </div>
        )}
        <div>
          <Sakelar
            label="Susun rinci per baris"
            petunjuk={f.rincian ? 'Setiap baris: bentuk, level, TP, dan jumlah soal. Menggantikan jumlah per bentuk, per level, dan per TP.' : 'Paling rinci: tentukan sendiri berapa soal untuk setiap pasangan bentuk, level, dan TP.'}
            checked={!!f.rincian}
            ubah={(nyala) => ubah({ rincian: nyala ? rincianDariIsian(f) : null })}
          />
          {f.rincian ? <TabelRincian f={f} ubah={ubah} daftarTp={daftarTp} samakan={ubahN} /> : null}
        </div>
      </KartuLipat>

      <KartuLipat judul="Kesukaran, level, dan TP" ket="Persen mudah-sedang-sulit, jumlah per level C1–C6, dan jumlah per TP" ingat="buat-kartu-kesukaran" paksaBuka={dicoba && galat.kesukaran.length > 0} tanda={galat.kesukaran.length ? <TandaPerbaiki /> : null}>
        {f.rincian ? (
          <Pemberitahuan nada="info">Level dan TP mengikuti susunan per baris di kartu Susunan soal.</Pemberitahuan>
        ) : (
          <>
            <div>
              {f.sebaranLevel ? null : (
                <>
                  <Pilihan
                    label="Tingkat kesukaran"
                    nilai={nilaiKomposisi}
                    ubah={(v) => {
                      if (v === 'sendiri') return setAturSendiri(true);
                      setAturSendiri(false);
                      ubah({ persen: [...KOMPOSISI.find((k) => k.nilai === v)!.persen] });
                    }}
                    opsi={[...KOMPOSISI.map((k) => ({ nilai: k.nilai, label: k.label })), { nilai: 'sendiri' as const, label: 'Atur sendiri' }]}
                  />
                  <p className="mt-2 text-base text-redup tabular-nums">
                    {kuota[0]} mudah ({f.persen[0]}%) · {kuota[1]} sedang ({f.persen[1]}%) · {kuota[2]} sulit ({f.persen[2]}%).{' '}
                    {nilaiKomposisi === 'sendiri' ? 'Ketik persen tiap tingkat; jumlahnya harus 100%.' : KOMPOSISI.find((k) => k.nilai === nilaiKomposisi)?.akibat}
                  </p>
                  {nilaiKomposisi === 'sendiri' ? (
                    <div className="mt-2 pl-0 sm:pl-8">
                      {(['Mudah', 'Sedang', 'Sulit'] as const).map((nama, i) => (
                        <BarisJumlah
                          key={nama}
                          id={`persen-${nama.toLowerCase()}`}
                          label={`${nama} (persen)`}
                          nilai={f.persen[i]}
                          maks={100}
                          akhiran="%"
                          ubah={(v) => ubah({ persen: f.persen.map((x, j) => (j === i ? v : x)) as [number, number, number] })}
                        />
                      ))}
                      <p className={`mt-2 text-base font-bold tabular-nums ${jumlah(f.persen) === 100 ? 'text-baik' : 'text-buruk'}`} aria-live="polite">
                        Jumlah {jumlah(f.persen)}%{jumlah(f.persen) === 100 ? ', sudah pas.' : ', harus 100%.'}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
              <Sakelar
                className={f.sebaranLevel ? '' : 'mt-3'}
                label="Atur per level kognitif (C1–C6)"
                petunjuk={f.sebaranLevel ? 'C1–C2 dihitung mudah, C3–C4 sedang, C5–C6 sulit.' : 'Tentukan sendiri jumlah soal tiap level, menggantikan tingkat kesukaran di atas.'}
                checked={!!f.sebaranLevel}
                ubah={(nyala) => ubah({ sebaranLevel: nyala ? levelDariPersen(f.n, jumlah(f.persen) === 100 ? f.persen : [30, 50, 20]) : null })}
              />
              {f.sebaranLevel ? (
                <div className="mt-2 pl-8">
                  {LEVEL.map((l) => (
                    <BarisJumlah key={l} id={`level-${l}`} label={l} ket={NAMA_LEVEL[l]} nilai={f.sebaranLevel![l] ?? 0} ubah={(n) => ubah({ sebaranLevel: { ...f.sebaranLevel, [l]: n } })} />
                  ))}
                  <TotalJumlah
                    total={LEVEL.reduce((a, l) => a + (f.sebaranLevel![l] ?? 0), 0)}
                    n={f.n}
                    samakan={ubahN}
                    labelBagi="Ambil dari tingkat kesukaran"
                    bagi={() => ubah({ sebaranLevel: levelDariPersen(f.n, jumlah(f.persen) === 100 ? f.persen : [30, 50, 20]) })}
                  />
                </div>
              ) : null}
            </div>
            {aturTp ? (
              <div>
                <Sakelar
                  label="Atur jumlah soal per TP"
                  petunjuk={f.jumlahTp ? undefined : `Bila mati, ${f.n} soal dibagi rata ke ${daftarTp.length} TP.`}
                  checked={!!f.jumlahTp}
                  ubah={(nyala) => ubah({ jumlahTp: nyala ? bagiRata(f.n, daftarTp.length) : null })}
                />
                {f.jumlahTp && f.jumlahTp.length === daftarTp.length ? (
                  <div className="mt-2 pl-8">
                    {daftarTp.map((t, i) => (
                      <BarisJumlah key={i} id={`jumlah-tp-${i}`} label={`TP ${i + 1}`} ket={<span className="line-clamp-2">{t}</span>} nilai={f.jumlahTp![i] ?? 0} ubah={(n) => ubah({ jumlahTp: f.jumlahTp!.map((x, j) => (j === i ? n : x)) })} />
                    ))}
                    <TotalJumlah total={f.jumlahTp.reduce((a, b) => a + b, 0)} n={f.n} samakan={ubahN} labelBagi="Bagi rata" bagi={() => ubah({ jumlahTp: bagiRata(f.n, daftarTp.length) })} />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-base text-redup">Jumlah per TP dapat diatur bila TP lebih dari satu baris.</p>
            )}
          </>
        )}
      </KartuLipat>

      <KartuLipat judul="Rincian tiap bentuk" ket="Banyak opsi, jawaban benar, pasangan, jenis jawaban isian dan uraian" ingat="buat-kartu-rincian" paksaBuka={dicoba && galat.rincianBentuk.length > 0} tanda={galat.rincianBentuk.length ? <TandaPerbaiki /> : null}>
        {adaPg ? (
          <div>
            <SubJudul>Pilihan ganda</SubJudul>
            <Pilihan
              className="mt-2 sm:max-w-xl"
              label="Banyak opsi pilihan ganda"
              nilai={f.opsiPg ? String(f.opsiPg) : 'otomatis'}
              ubah={(v) => ubah({ opsiPg: v === 'otomatis' ? null : (Number(v) as 3 | 4 | 5) })}
              opsi={[
                { nilai: 'otomatis', label: 'Otomatis', keterangan: opsiOtomatis ? `${opsiOtomatis} opsi` : 'Sesuai kelas' },
                { nilai: '3', label: '3 opsi', keterangan: 'A–C' },
                { nilai: '4', label: '4 opsi', keterangan: 'A–D' },
                { nilai: '5', label: '5 opsi', keterangan: 'A–E' },
              ]}
            />
          </div>
        ) : null}
        {dipakai.includes('pilihan_ganda_kompleks') ? (
          <div>
            <SubJudul>Pilihan ganda kompleks</SubJudul>
            <Sakelar
              className="mt-2"
              label="Atur banyak jawaban benar"
              petunjuk={ab.pgk_benar ? undefined : 'Bila mati, AI memilih 2 atau lebih jawaban benar dengan sedikitnya satu opsi salah.'}
              checked={!!ab.pgk_benar}
              ubah={(nyala) => ubahAb({ pgk_benar: nyala ? { min: 2, maks: Math.max(2, Math.min(3, opsiPg - 1)) } : null })}
            />
            {ab.pgk_benar ? (
              <div className="mt-2 pl-8">
                <BarisJumlah id="pgk-min" label="Paling sedikit" nilai={ab.pgk_benar.min} min={2} maks={4} ubah={(n) => ubahAb({ pgk_benar: { ...ab.pgk_benar!, min: n } })} />
                <BarisJumlah id="pgk-maks" label="Paling banyak" nilai={ab.pgk_benar.maks} min={2} maks={4} ubah={(n) => ubahAb({ pgk_benar: { ...ab.pgk_benar!, maks: n } })} />
              </div>
            ) : null}
          </div>
        ) : null}
        {dipakai.includes('benar_salah') ? (
          <div>
            <SubJudul>Benar-salah</SubJudul>
            <Pilihan
              className="mt-2 sm:max-w-lg"
              label="Cara menjawab benar-salah"
              nilai={f.cara_bs}
              ubah={(cara_bs) => ubah({ cara_bs })}
              opsi={[
                { nilai: 'centang', label: 'Centang kotak', keterangan: 'Benar / Salah' },
                { nilai: 'lingkari', label: 'Lingkari', keterangan: 'B / S' },
              ]}
            />
          </div>
        ) : null}
        {dipakai.includes('menjodohkan') ? (
          <div>
            <SubJudul>Menjodohkan</SubJudul>
            <Sakelar
              className="mt-2"
              label="Atur banyak pasangan"
              petunjuk={ab.jodoh ? undefined : 'Bila mati, 3–5 pasangan dengan satu pengecoh.'}
              checked={!!ab.jodoh}
              ubah={(nyala) => ubahAb({ jodoh: nyala ? { kiri: 4, pengecoh: 1 } : null })}
            />
            {ab.jodoh ? (
              <div className="mt-2 pl-8">
                <BarisJumlah id="jodoh-kiri" label="Butir kolom kiri" nilai={ab.jodoh.kiri} min={3} maks={6} ubah={(n) => ubahAb({ jodoh: { ...ab.jodoh!, kiri: n } })} />
                <BarisJumlah id="jodoh-pengecoh" label="Pengecoh di kolom kanan" nilai={ab.jodoh.pengecoh} min={0} maks={2} ubah={(n) => ubahAb({ jodoh: { ...ab.jodoh!, pengecoh: n } })} />
              </div>
            ) : null}
          </div>
        ) : null}
        {dipakai.includes('isian_singkat') ? (
          <div className="sm:max-w-md">
            <SubJudul>Isian singkat</SubJudul>
            <PilihanDaftar id="jenis-isian" className="mt-2" label="Jenis jawaban" value={ab.isian ?? 'bebas'} onChange={(e) => ubahAb({ isian: e.target.value === 'bebas' ? null : (e.target.value as JenisIsian) })} petunjuk="Soal yang jawabannya tidak sesuai dibuat ulang otomatis.">
              {JENIS_ISIAN.map((j) => (
                <option key={j.nilai} value={j.nilai}>
                  {j.label}
                </option>
              ))}
            </PilihanDaftar>
          </div>
        ) : null}
        {dipakai.includes('uraian') ? (
          <div>
            <SubJudul>Uraian</SubJudul>
            <Pilihan
              className="mt-2 sm:max-w-xl"
              label="Jenis jawaban uraian"
              nilai={ab.uraian ?? 'campur'}
              ubah={(v) => ubahAb({ uraian: v === 'campur' ? null : (v as JenisUraian) })}
              opsi={[
                { nilai: 'campur', label: 'Campur', keterangan: 'Dipilih AI' },
                { nilai: 'penjelasan', label: 'Penjelasan', keterangan: 'Garis tulis' },
                { nilai: 'hitungan', label: 'Hitungan', keterangan: 'Kotak cara' },
              ]}
            />
          </div>
        ) : null}
        {galat.rincianBentuk.map((g) => (
          <p key={g} className="text-base font-bold text-buruk">
            {g}
          </p>
        ))}
      </KartuLipat>

      <KartuLipat judul="Skor dan waktu" ket="Skor per soal, pengurangan untuk jawaban salah, dan waktu mengerjakan" ingat="buat-kartu-skor">
        <div>
          <Sakelar
            label="Cantumkan skor per soal"
            petunjuk={f.skorBentuk ? 'Skor tercetak di petunjuk tiap bagian, dan pedoman penskoran ikut berkas kunci jawaban.' : 'Skor tercetak di lembar soal dan pedoman penskoran di kunci jawaban.'}
            checked={!!f.skorBentuk}
            ubah={(nyala) => ubah({ skorBentuk: nyala ? Object.fromEntries(URUTAN_BENTUK.map((b) => [b, SKOR_BAWAAN[b]])) : null })}
          />
          {f.skorBentuk && dipakai.length ? (
            <div className="mt-2 pl-8">
              {dipakai.map((b) => (
                <BarisJumlah
                  key={b}
                  id={`skor-${b}`}
                  label={BENTUK_LABEL[b]}
                  ket={p.perBentuk?.[b] ? `${p.perBentuk[b]} soal × ${f.skorBentuk![b] ?? SKOR_BAWAAN[b]} = ${(p.perBentuk[b] ?? 0) * (f.skorBentuk![b] ?? SKOR_BAWAAN[b])}` : undefined}
                  nilai={f.skorBentuk![b] ?? SKOR_BAWAAN[b]}
                  min={1}
                  maks={100}
                  ubah={(n) => ubah({ skorBentuk: { ...f.skorBentuk, [b]: n } })}
                />
              ))}
              {p.skorMaks !== null ? (
                <p className="mt-2 text-base font-bold text-tinta tabular-nums">
                  Skor maksimal {p.skorMaks}
                  {dipakai.includes('uraian') ? '. Rubrik uraian disusun sesuai skornya.' : '.'}
                </p>
              ) : null}
              <Sakelar
                className="mt-4"
                label="Kurangi skor untuk jawaban salah"
                petunjuk={f.skorSalah ? 'Jawaban kosong tetap 0. Aturannya tercetak di petunjuk bagian dan pedoman penskoran.' : 'Seperti olimpiade: jawaban salah mengurangi skor, jawaban kosong 0.'}
                checked={!!f.skorSalah}
                ubah={(nyala) => ubah({ skorSalah: nyala ? Object.fromEntries(dipakai.map((b) => [b, 1])) : null })}
              />
              {f.skorSalah ? (
                <div className="mt-2 pl-8">
                  {dipakai.map((b) => (
                    <BarisJumlah key={b} id={`salah-${b}`} label={BENTUK_LABEL[b]} ket="dikurangi bila salah" nilai={f.skorSalah![b] ?? 0} min={0} maks={100} ubah={(n) => ubah({ skorSalah: { ...f.skorSalah, [b]: n } })} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <IsianAngka
          id="durasi"
          className="sm:max-w-xs"
          label="Waktu mengerjakan (menit)"
          petunjuk={f.durasi ? `Tercetak di lembar soal: "Waktu: ${f.durasi} menit".` : 'Boleh kosong. Bila diisi, tercetak di bawah judul lembar soal.'}
          value={f.durasi ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, '').slice(0, 3));
            ubah({ durasi: n > 0 ? n : null });
          }}
        />
      </KartuLipat>

      <KartuLipat judul="Gaya, bahasa, dan konteks" ket="Stimulus cerita, gaya soal (boleh campuran), bahasa (boleh bahasa lain), dan tema soal" ingat="buat-kartu-gaya" paksaBuka={dicoba && galat.gaya.length > 0} tanda={galat.gaya.length ? <TandaPerbaiki /> : null}>
        <div>
          {f.jumlahGaya ? null : (
            <PilihanDaftar id="gaya" className="sm:max-w-sm" label="Gaya soal" value={f.gaya} onChange={(e) => ubah({ gaya: e.target.value as GayaSoal })}>
              {GAYA.map((g) => (
                <option key={g} value={g}>
                  {GAYA_LABEL[g]}
                </option>
              ))}
            </PilihanDaftar>
          )}
          <Sakelar
            className={f.jumlahGaya ? '' : 'mt-3'}
            label="Campur beberapa gaya"
            petunjuk={f.jumlahGaya ? 'Tentukan berapa soal untuk tiap gaya.' : 'Mis. 15 soal literasi dan 15 numerasi dalam satu paket.'}
            checked={!!f.jumlahGaya}
            ubah={(nyala) => ubah({ jumlahGaya: nyala ? { [f.gaya]: f.n } : null })}
          />
          {f.jumlahGaya ? (
            <div className="mt-2 pl-8">
              {GAYA.map((g) => (
                <BarisJumlah key={g} id={`gaya-${g}`} label={GAYA_LABEL[g]} nilai={f.jumlahGaya![g] ?? 0} ubah={(n) => ubah({ jumlahGaya: { ...f.jumlahGaya, [g]: n } })} />
              ))}
              <TotalJumlah total={totalGaya} n={f.n} samakan={ubahN} labelBagi="Bagi rata" bagi={() => ubah({ jumlahGaya: Object.fromEntries(GAYA.map((g, i) => [g, bagiRata(f.n, GAYA.length)[i]])) })} />
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PilihanDaftar id="bahasa" label="Bahasa soal" value={f.bahasa} onChange={(e) => ubah({ bahasa: e.target.value as BahasaSoal })} petunjuk={f.bahasa === 'dwibahasa' ? 'Setiap soal ditulis dalam bahasa Indonesia dan Inggris.' : f.bahasa === 'lain' ? 'Judul bagian dan petunjuk di berkas tetap berbahasa Indonesia.' : undefined}>
            <option value="id">Indonesia</option>
            <option value="en">Inggris</option>
            <option value="dwibahasa">Dwibahasa (Indonesia dan Inggris)</option>
            <option value="lain">Bahasa lain…</option>
          </PilihanDaftar>
          {f.bahasa === 'lain' ? <IsianTeks id="bahasa-lain" label="Nama bahasa" value={f.bahasaLain} onChange={(e) => ubah({ bahasaLain: e.target.value })} placeholder="mis. Arab, Jawa, Jepang" galat={dicoba && !f.bahasaLain.trim() ? 'Tulis nama bahasa soal.' : undefined} /> : null}
        </div>
        <Sakelar
          label="Setiap soal diawali cerita atau bacaan (stimulus)"
          petunjuk={
            f.wajibStimulus
              ? 'Soal tanpa stimulus yang cukup panjang dibuat ulang otomatis. Tema, bentuk stimulus, dan nama tokoh dibuat berbeda di tiap soal.'
              : 'Nyalakan agar setiap soal berbasis cerita, teks, atau situasi nyata seperti soal TKA.'
          }
          checked={f.wajibStimulus}
          ubah={(wajibStimulus) => ubah({ wajibStimulus })}
        />
        <IsianTeks id="konteks" label="Konteks atau tema soal (boleh kosong)" value={f.konteks} onChange={(e) => ubah({ konteks: e.target.value })} placeholder="mis. pertanian, pasar tradisional, budaya Bugis" petunjuk="AI memakai konteks ini untuk cerita, nama, dan situasi dalam soal." />
        {galat.gaya
          .filter((g) => !g.startsWith('Tulis nama bahasa'))
          .map((g) => (
            <p key={g} className="text-base font-bold text-buruk">
              {g}
            </p>
          ))}
      </KartuLipat>

      <KartuLipat judul="Aturan tambahan untuk AI" ket={p.ujianKini ? `Diisi dari format ${p.ujianKini.nama}; boleh diubah` : 'Permintaan khusus, satu aturan per baris'} ingat="buat-kartu-aturan">
        <IsianPanjang
          id="aturan"
          label={`Aturan tambahan (${aturanDariTeks(f.aturanTeks).length} aturan)`}
          rows={Math.min(12, Math.max(3, aturanDariTeks(f.aturanTeks).length + 1))}
          value={f.aturanTeks}
          onChange={(e) => ubah({ aturanTeks: e.target.value })}
          placeholder={'Gunakan nama tokoh dari Sulawesi Selatan.\nSetiap soal cerita memakai satuan rupiah.\nHindari soal tentang uang jajan.'}
          petunjuk="Satu aturan satu baris. Dikirim ke AI bersama setiap soal; pemeriksa kunci tetap berjalan seperti biasa."
        />
        {aturanFormat !== null && f.aturanTeks !== aturanFormat ? (
          <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={() => ubah({ aturanTeks: aturanFormat })}>
            Kembalikan aturan format {p.ujianKini!.nama}
          </button>
        ) : null}
      </KartuLipat>

      <KartuLipat judul="Gambar" ket="Digambar aplikasi dari isi soal, bukan ditebak AI" ingat="buat-kartu-gambar">
        <div className="sm:max-w-sm">
          <PilihanDaftar id="gambar" label="Soal bergambar" value={f.gambar} onChange={(e) => ubah({ gambar: e.target.value as ModeGambar })} petunjuk={f.gambar === 'mati' ? undefined : 'Gambar dihitung dari isi soal, bukan ditebak AI.'}>
            <option value="terprogram">Pakai gambar bila membantu</option>
            <option value="campuran">Sesekali saja</option>
            <option value="mati">Tanpa gambar</option>
          </PilihanDaftar>
        </div>
      </KartuLipat>

      <KartuLipat judul="Teks materi" ket="Bahan bacaan sebagai dasar soal, boleh kosong" ingat="buat-kartu-materi" paksaBuka={dicoba && kataMateriLebih} tanda={kataMateriLebih ? <TandaPerbaiki /> : null}>
        <IsianPanjang
          id="materi"
          label={`Teks materi (boleh kosong · ${p.kataMateri}/${p.maksKataMateri} kata)`}
          rows={3}
          value={f.materi}
          onChange={(e) => ubah({ materi: e.target.value })}
          placeholder="Tempel bahan bacaan bila soal harus berdasar teks tertentu."
          petunjuk="Teks ini dikirim ke penyedia AI pilihan Anda. Jangan menempel data siswa."
          galat={kataMateriLebih ? `Teks materi maksimal ${p.maksKataMateri} kata.` : undefined}
        />
      </KartuLipat>

      <KartuLipat judul="Judul dan simpan" ket="Judul paket dan pengaturan tersimpan untuk dipakai lagi" ingat="buat-kartu-simpan" paksaBuka={!!p.galatNamaPreset}>
        <IsianTeks id="judul" label="Judul paket" value={p.judul} onChange={(e) => p.setJudul(e.target.value)} placeholder="mis. Penilaian harian pecahan" petunjuk={`Bila kosong: ${p.judulBawaan}.`} />
        <div>
          <Sakelar label="Simpan pengaturan ini" petunjuk="Semua isian, termasuk opsi lanjutan, disimpan. Lain kali cukup pilih namanya di atas formulir." checked={p.simpanPreset} ubah={p.setSimpanPreset} />
          {p.simpanPreset ? (
            <div className="mt-3 flex flex-wrap items-start gap-3 pl-8">
              <IsianTeks
                id="nama-preset"
                label="Nama pengaturan tersimpan"
                className="min-w-0 flex-1 sm:max-w-xs"
                value={p.namaPreset}
                galat={p.galatNamaPreset}
                onBlur={p.sentuhNamaPreset}
                onChange={(e) => p.setNamaPreset(e.target.value)}
                placeholder={`${f.mapel || 'Mapel'} K${f.kelas || ''}`}
              />
              <Tombol varian="hantu" className="sm:mt-9" onClick={p.hanyaSimpanPreset}>
                Simpan tanpa membuat soal
              </Tombol>
            </div>
          ) : null}
        </div>
      </KartuLipat>
    </OpsiLanjutan>
  );
}
