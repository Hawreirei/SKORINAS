import { useState, type ReactNode } from 'react';
import type { BahasaSoal, BarisRincian, Bentuk, GayaPembahasan, GayaSoal, JenisIsian, JenisUraian, Level, ModeGambar } from '../db/tipe';
import { BENTUK_LABEL, GAYA, GAYA_LABEL, LEVEL } from '../db/tipe';
import { bagiKomposisi } from '../generasi/komposisi';
import { URUTAN_BENTUK, urutanBentuk } from '../generasi/rencana';
import { IsianAngka, IsianPanjang, IsianTeks, KartuLipat, OpsiLanjutan, Pemberitahuan, Pilihan, PilihanBanyak, PilihanDaftar, Sakelar } from '../komponen/Formulir';
import { Tombol } from '../komponen/Tombol';
import type { FormatUjian } from '../ujian';
import { rumusanCakupan, type Cakupan } from '../ujian/cakupan';
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

/** Pasangan kategori siap pakai untuk PG kompleks kategori; guru juga dapat menulis sendiri. */
const LABEL_KATEGORI: [string, string][] = [
  ['Benar', 'Salah'],
  ['Sesuai', 'Tidak sesuai'],
  ['Fakta', 'Opini'],
  ['Ya', 'Tidak'],
  ['Setuju', 'Tidak setuju'],
  ['Mungkin', 'Tidak mungkin'],
];

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

/** Contoh kalimat petunjuk bagian (placeholder); kalimat bawaan sebenarnya disusun saat berkas dibuat. */
const PETUNJUK_CONTOH: Record<Bentuk, string> = {
  pilihan_ganda: 'Pilihlah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D.',
  pilihan_ganda_kompleks: 'Pilihlah semua jawaban yang benar (lebih dari satu) dengan memberi tanda silang (X).',
  pilihan_ganda_kategori: 'Tentukan Benar atau Salah untuk setiap pernyataan dengan memberi tanda centang (✓).',
  benar_salah: 'Berilah tanda centang (✓) pada kolom Benar atau Salah untuk setiap pernyataan.',
  menjodohkan: 'Pasangkan setiap butir di kolom kiri dengan jawaban yang tepat di kolom kanan dengan menarik garis.',
  isian_singkat: 'Tuliskan jawabanmu pada titik-titik yang tersedia.',
  uraian: 'Jawablah dengan jelas pada tempat yang tersedia.',
};

/** Cakupan materi format ujian (F-40): centang butir yang dipakai dan atur porsi tiap elemen. */
function KartuCakupan({ cakupan, f, ubah }: { cakupan: Cakupan; f: Isian; ubah: (u: Partial<Isian>) => void }) {
  const pilih = f.cakupanPilih;
  const semua = cakupan.butir.map(rumusanCakupan);
  const dipilih = pilih?.butir ?? semua;
  const porsi = { ...cakupan.porsi, ...pilih?.porsi };
  const elemen = Object.keys(cakupan.porsi);
  const atur = (u: Partial<NonNullable<Isian['cakupanPilih']>>) => ubah({ cakupanPilih: { butir: pilih?.butir ?? null, porsi: pilih?.porsi ?? null, ...u } });
  const total = elemen.reduce((a, e) => a + (dipilih.some((r) => r.startsWith(`${e} ›`)) ? porsi[e] : 0), 0);
  return (
    <KartuLipat judul="Cakupan materi" ket={`${dipilih.length} dari ${semua.length} butir cakupan · dipakai karena CP dan TP kosong`} ingat="buat-kartu-cakupan" tanda={!dipilih.length ? <TandaPerbaiki /> : null}>
      <p className="text-base text-redup">Soal disebar ke butir yang dicentang. Porsi menentukan perbandingan banyak soal antarelemen; butir di tiap elemen dipakai bergiliran dari titik acak.</p>
      {elemen.map((e) => {
        const butir = cakupan.butir.filter((b) => b.elemen === e);
        const aktif = butir.filter((b) => dipilih.includes(rumusanCakupan(b))).length;
        return (
          <div key={e} className="rounded-lg border border-garis p-3">
            <BarisJumlah id={`porsi-${e}`} label={e} ket={aktif ? `porsi ${total ? Math.round(((porsi[e] ?? 0) / total) * 100) : 0}% · ${aktif} butir` : 'tidak ada butir dicentang'} nilai={porsi[e] ?? 0} min={0} maks={50} ubah={(n) => atur({ porsi: { ...pilih?.porsi, [e]: n } })} />
            <ul className="mt-2 space-y-1">
              {butir.map((b) => {
                const r = rumusanCakupan(b);
                return (
                  <li key={r}>
                    <label className="flex min-h-11 items-start gap-3 text-base">
                      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[var(--gs-main-fill)]" checked={dipilih.includes(r)} onChange={(ev) => atur({ butir: ev.target.checked ? semua.filter((x) => x === r || dipilih.includes(x)) : dipilih.filter((x) => x !== r) })} />
                      <span>
                        <span className="text-redup">{b.sub}:</span> {b.butir}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {pilih ? (
        <button type="button" className="min-h-10 text-base font-bold text-utama hover:underline" onClick={() => ubah({ cakupanPilih: null })}>
          Pakai semua butir dan porsi bawaan
        </button>
      ) : null}
      {!dipilih.length ? <p className="text-base font-bold text-buruk">Centang sedikitnya satu butir cakupan.</p> : null}
    </KartuLipat>
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
  /** Cakupan materi format ujian yang berlaku (CP dan TP kosong); null bila tidak ada. */
  cakupan: Cakupan | null;
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
  const labelKategori: [string, string] = ab.kategori?.label ?? ['Benar', 'Salah'];
  const banyakPernyataan = ab.kategori?.pernyataan ?? 4;
  const ubahAb = (u: Partial<Isian['aturBentuk']>) => ubah({ aturBentuk: { ...ab, ...u } });
  const totalGaya = f.jumlahGaya ? jumlah(GAYA.map((g) => f.jumlahGaya![g] ?? 0)) : 0;
  const urutanTampil = urutanBentuk({ urutan_bentuk: f.urutanBentuk }).filter((b) => dipakai.includes(b));
  const geserBentuk = (i: number, arah: -1 | 1) => {
    const u = [...urutanTampil];
    [u[i], u[i + arah]] = [u[i + arah], u[i]];
    ubah({ urutanBentuk: [...u, ...urutanBentuk({ urutan_bentuk: f.urutanBentuk }).filter((b) => !u.includes(b))] });
  };

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
        {dipakai.includes('pilihan_ganda_kategori') ? (
          <div>
            <SubJudul>PG kompleks kategori</SubJudul>
            <p className="mt-1 text-base text-redup">Satu cerita atau bacaan, lalu beberapa pernyataan yang masing-masing digolongkan ke salah satu dari dua kategori.</p>
            <PilihanDaftar
              id="kategori-label"
              className="mt-3 sm:max-w-sm"
              label="Pasangan kategori"
              value={LABEL_KATEGORI.find((l) => l.join('|') === labelKategori.join('|'))?.join('|') ?? 'sendiri'}
              onChange={(e) => ubahAb({ kategori: { label: e.target.value === 'sendiri' ? ['', ''] : (e.target.value.split('|') as [string, string]), pernyataan: banyakPernyataan } })}
            >
              {LABEL_KATEGORI.map((l) => (
                <option key={l.join('|')} value={l.join('|')}>
                  {l[0]} / {l[1]}
                </option>
              ))}
              <option value="sendiri">Tulis sendiri…</option>
            </PilihanDaftar>
            {!LABEL_KATEGORI.some((l) => l.join('|') === labelKategori.join('|')) ? (
              <div className="mt-3 grid gap-3 sm:max-w-md sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <IsianTeks
                    key={i}
                    id={`kategori-${i}`}
                    label={i === 0 ? 'Kategori pertama' : 'Kategori kedua'}
                    value={labelKategori[i]}
                    galat={dicoba && !labelKategori[i].trim() ? 'Isi nama kategori.' : undefined}
                    onChange={(e) => ubahAb({ kategori: { label: (i === 0 ? [e.target.value, labelKategori[1]] : [labelKategori[0], e.target.value]) as [string, string], pernyataan: banyakPernyataan } })}
                  />
                ))}
              </div>
            ) : null}
            <div className="mt-2 sm:max-w-md">
              <BarisJumlah id="kategori-pernyataan" label="Pernyataan per soal" nilai={banyakPernyataan} min={3} maks={6} ubah={(n) => ubahAb({ kategori: { label: labelKategori, pernyataan: n } })} />
            </div>
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
            petunjuk={f.skorBentuk || f.skorKesukaran ? 'Skor tercetak di lembar soal, dan pedoman penskoran ikut berkas kunci jawaban.' : 'Skor tercetak di lembar soal dan pedoman penskoran di kunci jawaban.'}
            checked={!!(f.skorBentuk || f.skorKesukaran)}
            ubah={(nyala) => ubah({ skorBentuk: nyala ? Object.fromEntries(URUTAN_BENTUK.map((b) => [b, SKOR_BAWAAN[b]])) : null, skorKesukaran: null, skorSalah: null })}
          />
          {f.skorBentuk || f.skorKesukaran ? (
            <Pilihan
              className="mt-3 sm:max-w-xl sm:pl-8"
              label="Skor ditentukan per"
              nilai={f.skorKesukaran ? 'kesukaran' : 'bentuk'}
              ubah={(v) =>
                ubah(
                  v === 'kesukaran'
                    ? { skorKesukaran: { mudah: { benar: 1, salah: 0 }, sedang: { benar: 2, salah: 0 }, sulit: { benar: 3, salah: 0 } }, skorBentuk: null, skorSalah: null }
                    : { skorBentuk: Object.fromEntries(URUTAN_BENTUK.map((b) => [b, SKOR_BAWAAN[b]])), skorKesukaran: null },
                )
              }
              opsi={[
                { nilai: 'bentuk', label: 'Bentuk soal', keterangan: 'Sama dalam satu bagian' },
                { nilai: 'kesukaran', label: 'Tingkat kesukaran', keterangan: 'Mis. OSN: dasar 2, lanjut 4' },
              ]}
            />
          ) : null}
          {f.skorKesukaran ? (
            <div className="mt-2 pl-8">
              {(['mudah', 'sedang', 'sulit'] as const).map((k) => (
                <div key={k} className="border-b border-garis py-1 last:border-b-0">
                  <BarisJumlah id={`skor-${k}`} label={`Soal ${k}`} ket="skor bila benar" nilai={f.skorKesukaran![k].benar} min={0} maks={100} ubah={(n) => ubah({ skorKesukaran: { ...f.skorKesukaran!, [k]: { ...f.skorKesukaran![k], benar: n } } })} />
                  <BarisJumlah id={`salah-${k}`} label={`Soal ${k}`} ket="dikurangi bila salah (kosong tetap 0)" nilai={f.skorKesukaran![k].salah} min={0} maks={100} ubah={(n) => ubah({ skorKesukaran: { ...f.skorKesukaran!, [k]: { ...f.skorKesukaran![k], salah: n } } })} />
                </div>
              ))}
              {p.skorMaks !== null ? <p className="mt-2 text-base font-bold text-tinta tabular-nums">Skor maksimal {p.skorMaks}. Skor tiap soal tercetak di akhir soal.</p> : null}
            </div>
          ) : null}
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

      <KartuLipat judul="Gaya, bahasa, dan konteks" ket="Gaya soal (boleh campuran), bahasa (boleh bahasa lain), dan tema soal" ingat="buat-kartu-gaya" paksaBuka={dicoba && galat.gaya.length > 0} tanda={galat.gaya.length ? <TandaPerbaiki /> : null}>
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
        <IsianTeks id="konteks" label="Konteks atau tema soal (boleh kosong)" value={f.konteks} onChange={(e) => ubah({ konteks: e.target.value })} placeholder="mis. pertanian, pasar tradisional, budaya Bugis" petunjuk="AI memakai konteks ini untuk cerita, nama, dan situasi dalam soal." />
        {galat.gaya
          .filter((g) => !g.startsWith('Tulis nama bahasa'))
          .map((g) => (
            <p key={g} className="text-base font-bold text-buruk">
              {g}
            </p>
          ))}
      </KartuLipat>

      <KartuLipat judul="Stimulus, bacaan, dan variasi" ket="Cerita di setiap soal, satu bacaan untuk beberapa soal, panjang stimulus, tema, tokoh, dan bentuk stimulus" ingat="buat-kartu-stimulus">
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
        <div>
          <Sakelar
            label="Satu bacaan untuk beberapa soal"
            petunjuk={f.soalPerBacaan ? 'Bacaan dibuat sekali lalu dipakai beberapa soal berurutan dalam satu bentuk; dicetak sekali dengan keterangan nomor soal. Benar-salah dan menjodohkan tidak dikelompokkan.' : 'Seperti TKA: satu teks atau cerita untuk dua sampai lima soal.'}
            checked={!!f.soalPerBacaan}
            ubah={(nyala) => ubah({ soalPerBacaan: nyala ? 3 : null })}
          />
          {f.soalPerBacaan ? (
            <div className="mt-2 pl-8 sm:max-w-md">
              <BarisJumlah id="soal-per-bacaan" label="Soal per bacaan" nilai={f.soalPerBacaan} min={2} maks={5} ubah={(n) => ubah({ soalPerBacaan: n })} />
            </div>
          ) : null}
        </div>
        <div>
          <Sakelar
            label="Atur panjang stimulus sendiri"
            petunjuk={f.panjangStimulus ? 'Soal yang stimulusnya kurang dari 70% panjang minimal dibuat ulang.' : 'Bila mati, panjang mengikuti jenjang (mis. bacaan SMP 180–250 kata, cerita hitungan SD 35–80 kata).'}
            checked={!!f.panjangStimulus}
            ubah={(nyala) => ubah({ panjangStimulus: nyala ? { min: 50, maks: 120 } : null })}
          />
          {f.panjangStimulus ? (
            <div className="mt-2 pl-8 sm:max-w-md">
              <BarisJumlah id="stimulus-min" label="Paling sedikit (kata)" nilai={f.panjangStimulus.min} min={10} maks={500} ubah={(n) => ubah({ panjangStimulus: { ...f.panjangStimulus!, min: n, maks: Math.max(n, f.panjangStimulus!.maks) } })} />
              <BarisJumlah id="stimulus-maks" label="Paling banyak (kata)" nilai={f.panjangStimulus.maks} min={10} maks={600} ubah={(n) => ubah({ panjangStimulus: { ...f.panjangStimulus!, maks: Math.max(n, f.panjangStimulus!.min) } })} />
            </div>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <IsianPanjang id="variasi-tema" label="Tema sendiri (boleh kosong)" rows={4} value={f.temaTeks} onChange={(e) => ubah({ temaTeks: e.target.value })} placeholder={'Satu tema per baris, mis.\npanen kopi\nlomba perahu naga\npameran sains'} petunjuk="Kosong: 34 tema bawaan." />
          <IsianPanjang id="variasi-tokoh" label="Nama tokoh sendiri (boleh kosong)" rows={4} value={f.tokohTeks} onChange={(e) => ubah({ tokohTeks: e.target.value })} placeholder={'Satu nama per baris, mis.\nLa Ode\nNi Luh\nUmbu'} petunjuk="Kosong: 48 nama dari berbagai daerah." />
          <IsianPanjang id="variasi-stimulus" label="Bentuk stimulus sendiri (boleh kosong)" rows={4} value={f.stimulusTeks} onChange={(e) => ubah({ stimulusTeks: e.target.value })} placeholder={'Satu bentuk per baris, mis.\nberita koran sekolah\nresep masakan\njadwal kereta'} petunjuk="Kosong: cerita, daftar data, percakapan, dan lainnya." />
        </div>
        {!f.wajibStimulus && (f.temaTeks.trim() || f.tokohTeks.trim() || f.stimulusTeks.trim()) ? <p className="text-base text-redup">Tema, tokoh, dan bentuk stimulus dipakai bila stimulus di setiap soal dinyalakan.</p> : null}
      </KartuLipat>

      {p.cakupan ? <KartuCakupan cakupan={p.cakupan} f={f} ubah={ubah} /> : null}

      <KartuLipat judul="Lembar soal dan pembahasan" ket="Urutan bagian, kalimat petunjuk tiap bagian, dan gaya pembahasan" ingat="buat-kartu-lembar">
        <div>
          <SubJudul>Urutan bagian di lembar soal</SubJudul>
          <ol className="mt-2 space-y-2">
            {urutanTampil.map((b, i) => (
              <li key={b} className="flex items-center justify-between gap-3 rounded-lg border border-garis px-3 py-2">
                <span className="text-base font-bold text-tinta">
                  {i + 1}. {BENTUK_LABEL[b]}
                </span>
                <span className="flex gap-2">
                  <Tombol varian="garis" ukuran="kecil" aria-label={`Naikkan ${BENTUK_LABEL[b]}`} disabled={i === 0} onClick={() => geserBentuk(i, -1)}>
                    ↑
                  </Tombol>
                  <Tombol varian="garis" ukuran="kecil" aria-label={`Turunkan ${BENTUK_LABEL[b]}`} disabled={i === urutanTampil.length - 1} onClick={() => geserBentuk(i, 1)}>
                    ↓
                  </Tombol>
                </span>
              </li>
            ))}
          </ol>
          {f.urutanBentuk ? (
            <button type="button" className="mt-2 min-h-10 text-base font-bold text-utama hover:underline" onClick={() => ubah({ urutanBentuk: null })}>
              Kembalikan urutan bawaan
            </button>
          ) : null}
        </div>
        <div className="space-y-4">
          <SubJudul>Petunjuk tiap bagian (boleh kosong)</SubJudul>
          {dipakai.map((b) => (
            <IsianPanjang
              key={b}
              id={`petunjuk-${b}`}
              label={BENTUK_LABEL[b]}
              rows={2}
              value={f.petunjukBagian?.[b] ?? ''}
              onChange={(e) => ubah({ petunjukBagian: { ...f.petunjukBagian, [b]: e.target.value } })}
              placeholder={PETUNJUK_CONTOH[b]}
            />
          ))}
          <p className="text-base text-redup">Kosong: kalimat petunjuk bawaan sesuai bentuk soal.</p>
        </div>
        <Pilihan
          className="sm:max-w-2xl"
          label="Gaya pembahasan"
          nilai={f.gayaPembahasan ?? 'bawaan'}
          ubah={(v) => ubah({ gayaPembahasan: v === 'bawaan' ? null : (v as GayaPembahasan) })}
          opsi={[
            { nilai: 'bawaan', label: 'Bawaan' },
            { nilai: 'singkat', label: 'Singkat', keterangan: '1–3 langkah' },
            { nilai: 'langkah', label: 'Langkah demi langkah' },
            { nilai: 'dddj', label: 'Diketahui–Ditanya–Dijawab' },
          ]}
        />
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
