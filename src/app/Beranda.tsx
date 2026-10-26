import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db/skema';
import { IsianAngka, IsianTeks, PilihanDaftar } from '../komponen/Formulir';
import { Kartu, LencanaStatus } from '../komponen/Status';
import { Panah, TautanTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, usePengatur } from './kait';
import { bacaIsianCepat, MAKS_SOAL, MIN_SOAL, simpanIsianCepat } from './rencana-buat';
import { daftarRingkasan, formatTanggal, ringkasPaket, statusRingkasan, teksJumlah, type RingkasanPaket } from './ringkas';

function IkonBerkas({ ukuran = 18 }: { ukuran?: number }) {
  return (
    <svg aria-hidden="true" width={ukuran} height={ukuran} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5z" />
      <path d="M11.5 2.5v4h4M7.5 10.5h5M7.5 13.5h5" />
    </svg>
  );
}

function IkonUnduh() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M4.5 6.8 8 10.3l3.5-3.5M2.5 13.5h11" />
    </svg>
  );
}

function IkonKunci() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="13" r="3.5" />
      <path d="m9.5 10.5 7-7M14 6l2 2M12 8l1.5 1.5" />
    </svg>
  );
}

function Centang() {
  return (
    <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-kuning-lembut text-kuning-tua">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 8.5l3.5 3.5 7.5-8" />
      </svg>
    </span>
  );
}

/** Kartu biru Mulai cepat: tiga isian wajib layar Buat, ditimpakan ke drafnya lalu guru lanjut mengisi CP dan TP. */
function MulaiCepat() {
  const navigasi = useNavigate();
  const [awal] = useState(bacaIsianCepat);
  const [kelas, setKelas] = useState(awal.kelas ?? 0);
  const [mapel, setMapel] = useState(awal.mapel ?? '');
  const [teksN, setTeksN] = useState(String(awal.n ?? 20));
  const mapelLama = useLiveQuery(async () => [...new Set((await db.paket_soal.toArray()).map((p) => p.parameter_json.mapel).filter(Boolean))].slice(0, 30), []);

  function lanjut(e: FormEvent) {
    e.preventDefault();
    simpanIsianCepat({ kelas, mapel, n: Number(teksN) });
    navigasi('/soal/baru');
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-utama-isi p-4 sm:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.22)_1px,transparent_1px)] [background-size:16px_16px]" />
      <div aria-hidden="true" className="absolute -right-10 -top-10 size-28 rounded-full bg-kuning" />
      <div aria-hidden="true" className="absolute -bottom-12 -left-12 size-28 rounded-full border-[10px] border-kuning" />
      <form onSubmit={lanjut} aria-labelledby="judul-mulai-cepat" className="relative rounded-xl bg-kartu p-5 shadow-lg sm:p-6">
        <h2 id="judul-mulai-cepat" className="text-[22px] font-extrabold text-judul">
          Mulai cepat
        </h2>
        <p className="mt-0.5 text-base text-redup">Tiga isian ini cukup untuk membuat draf pertama.</p>
        <div className="mt-4 space-y-4">
          <PilihanDaftar id="cepat-kelas" label="Kelas" value={kelas} onChange={(e) => setKelas(Number(e.target.value))}>
            <option value={0} disabled>
              Pilih kelas
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </PilihanDaftar>
          <IsianTeks id="cepat-mapel" label="Mata pelajaran" list="cepat-daftar-mapel" value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Contoh: Matematika" autoComplete="off" />
          <datalist id="cepat-daftar-mapel">
            {(mapelLama ?? []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <IsianAngka id="cepat-jumlah" label="Jumlah soal" petunjuk={`${MIN_SOAL}–${MAKS_SOAL}`} value={teksN} onFocus={(e) => e.target.select()} onChange={(e) => setTeksN(e.target.value.replace(/\D/g, '').slice(0, 3))} />
        </div>
        <Tombol type="submit" ukuran="besar" className="mt-5 w-full">
          Lanjut isi CP dan TP <Panah />
        </Tombol>
      </form>
    </div>
  );
}

const TIGA_LANGKAH = [
  { judul: 'Buat', ket: 'Isi kelas, mapel, CP dan TP, lalu atur jumlah soal.', warna: 'bg-utama-isi text-di-tinta' },
  { judul: 'Periksa', ket: 'Baca soal dan kunci yang sudah dihitung ulang, ubah bila perlu.', warna: 'bg-kuning text-gray-900' },
  { judul: 'Unduh', ket: 'Simpan dengan format rapi, siap dicetak atau dibagikan.', warna: 'bg-judul text-kartu' },
];

function TigaLangkah() {
  return (
    <section aria-labelledby="judul-tiga-langkah" className="mt-12">
      <h2 id="judul-tiga-langkah" className="text-[22px] font-extrabold text-judul">
        Tiga langkah, soal siap dipakai
      </h2>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        {TIGA_LANGKAH.map((l, i) => (
          <li key={l.judul} className="flex items-start gap-3 rounded-xl border border-garis bg-kartu p-4 sm:p-5">
            <span aria-hidden="true" className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[17px] font-extrabold ${l.warna}`}>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-bold text-tinta">{l.judul}</span>
              <span className="mt-0.5 block text-base text-redup">{l.ket}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Satu paket di daftar Soal terakhir: judul ke halaman paket, lencana status, dan satu aksi (Unduh atau Lanjutkan). */
export function BarisPaket({ r }: { r: RingkasanPaket }) {
  const st = statusRingkasan(r, usePengatur());
  const siap = r.paket.status === 'siap';
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-garis py-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span aria-hidden="true" className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg ${siap ? 'bg-utama-lembut text-judul' : 'bg-kuning-lembut text-kuning-tua'}`}>
        <IkonBerkas />
      </span>
      <span className="min-w-0">
        <Link to={`/soal/${r.paket.id}`} className="block text-[17px] font-bold text-tinta hover:text-utama hover:underline">
          {r.paket.judul}
        </Link>
        <span className="mt-0.5 block text-base text-redup tabular-nums">
          Kelas {r.paket.parameter_json.kelas} · {r.paket.parameter_json.mapel} · {formatTanggal(r.paket.dibuat_pada)} · {teksJumlah(r)}
        </span>
      </span>
      <span className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:justify-end">
        <LencanaStatus status={st} />
        {siap ? (
          <TautanTombol to={`/soal/${r.paket.id}/ekspor`} varian="garis" ukuran="kecil" aria-label={`Unduh ${r.paket.judul}`}>
            <IkonUnduh /> Unduh
          </TautanTombol>
        ) : (
          <TautanTombol to={`/soal/${r.paket.id}`} ukuran="kecil" aria-label={`Lanjutkan ${r.paket.judul}`}>
            Lanjutkan
          </TautanTombol>
        )}
      </span>
    </li>
  );
}

/** Paket terbaru yang belum selesai; tampil di samping daftar agar guru dapat melanjutkannya. */
function BelumSelesai({ r }: { r: RingkasanPaket }) {
  const st = statusRingkasan(r, usePengatur());
  const total = r.paket.parameter_json.n;
  const teks = `${r.jumlah} dari ${total} soal sudah dibuat`;
  return (
    <section aria-labelledby="judul-belum-selesai" className="rounded-xl border border-kuning bg-kuning-lembut p-5">
      <span className="inline-flex min-h-7 items-center rounded-full bg-kuning px-3 text-base font-bold text-gray-900">Belum selesai</span>
      <h2 id="judul-belum-selesai" className="mt-3 text-[20px] font-extrabold text-judul">
        {r.paket.judul}
      </h2>
      <div role="progressbar" aria-label="Kemajuan pembuatan soal" aria-valuemin={0} aria-valuemax={total} aria-valuenow={r.jumlah} aria-valuetext={teks} className="mt-3 h-2 overflow-hidden rounded-full bg-kuning/50">
        <div className="h-full rounded-full bg-utama-isi" style={{ width: `${total ? Math.min(100, (r.jumlah / total) * 100) : 0}%` }} />
      </div>
      <p className="mt-2 text-base font-semibold text-kuning-tua tabular-nums">{teks}</p>
      <Link to={`/soal/${r.paket.id}`} className="tombol mt-4 min-h-12 border-judul bg-judul px-5 text-base text-kartu hover:opacity-90">
        {st === 'membuat' || st === 'menunggu' ? 'Lihat kemajuan' : 'Lanjutkan membuat'} <Panah />
      </Link>
    </section>
  );
}

function BarisPintasan({ ke, ikon, judul, ket }: { ke: string; ikon: ReactNode; judul: string; ket: string }) {
  return (
    <li className="border-b border-garis last:border-b-0">
      <Link to={ke} className="group flex items-center gap-3 py-3">
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-utama-lembut text-judul">
          {ikon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-tinta group-hover:text-utama group-hover:underline">{judul}</span>
          <span className="block text-base text-redup">{ket}</span>
        </span>
        <svg aria-hidden="true" width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-redup">
          <path d="m2 2 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function Pintasan() {
  return (
    <section aria-labelledby="judul-pintasan" className="rounded-xl border border-garis bg-kartu p-5">
      <h2 id="judul-pintasan" className="text-[20px] font-extrabold text-judul">
        Pintasan
      </h2>
      <ul className="mt-2">
        <BarisPintasan ke="/pengaturan/ai" ikon={<IkonKunci />} judul="Atur kunci API" ket="Pilih penyedia AI Anda" />
        <BarisPintasan ke="/cadangan" ikon={<IkonUnduh />} judul="Cadangkan data" ket="Simpan file .gensoal" />
        <BarisPintasan ke="/soal" ikon={<IkonBerkas />} judul="Semua soal saya" ket="Cari dan unduh ulang" />
      </ul>
    </section>
  );
}

/** Beranda: ajakan Buat soal dengan kartu Mulai cepat, tiga langkah, soal terakhir, paket yang belum selesai, dan pintasan. */
export function Beranda() {
  useJudulHalaman('');
  const terbaru = useLiveQuery(() => daftarRingkasan(5), []);
  const belum = useLiveQuery(async () => {
    const p = await db.paket_soal
      .orderBy('dibuat_pada')
      .reverse()
      .filter((x) => x.dihapus_pada == null && x.status !== 'siap')
      .first();
    if (!p) return null;
    return ringkasPaket(p, await db.soal.where('paket_id').equals(p.id).toArray(), await db.pekerjaan_generasi.where('paket_id').equals(p.id).first());
  }, []);

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-20 pt-10 sm:px-8 sm:pt-14">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:gap-14">
        <div className="min-w-0">
          <span className="inline-flex min-h-8 items-center rounded-full bg-utama-lembut px-3 text-base font-bold text-judul">Kelas 1–12 · tanpa akun</span>
          <h1 className="judul-besar mt-4 text-[38px] sm:text-[52px]">
            Buat soal yang kuncinya{' '}
            <span className="bg-[linear-gradient(transparent_68%,var(--gs-yellow)_68%)] [box-decoration-break:clone] dark:bg-[linear-gradient(transparent_80%,var(--gs-yellow)_80%)]">sudah dicek.</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-redup">Isi kelas, mapel, dan jumlah soal. GenSoal membuat soalnya, menghitung ulang kuncinya, lalu Anda unduh sebagai Word atau PDF.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <TautanTombol to="/soal/baru" ukuran="besar" className="w-full sm:w-auto">
              Buat soal <Panah />
            </TautanTombol>
            <TautanTombol to="/soal" varian="garis" ukuran="besar" className="w-full sm:w-auto">
              <IkonBerkas /> Buka soal saya
            </TautanTombol>
          </div>
          <ul className="mt-6 space-y-2.5 text-base text-isi">
            {['Kunci jawaban dihitung ulang sebelum diunduh', 'Tersimpan di browser Anda, tanpa akun', 'Unduh sebagai Word, PDF, atau LaTeX'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Centang />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <MulaiCepat />
      </div>

      <TigaLangkah />

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Kartu as="section" aria-labelledby="judul-soal-terakhir">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h2 id="judul-soal-terakhir" className="text-[22px] font-extrabold text-judul">
              Soal terakhir
            </h2>
            <Link className="text-base font-bold text-utama hover:underline" to="/soal">
              Lihat semua
            </Link>
          </div>
          {terbaru === undefined ? null : terbaru.length === 0 ? (
            <p className="py-4 text-base text-redup">
              Belum ada soal. Tekan{' '}
              <Link to="/soal/baru" className="font-bold text-utama underline">
                Buat soal
              </Link>{' '}
              untuk membuat paket pertama; semuanya tersimpan di perangkat ini.
            </p>
          ) : (
            <ul>
              {terbaru.map((r) => (
                <BarisPaket key={r.paket.id} r={r} />
              ))}
            </ul>
          )}
        </Kartu>
        <div className="space-y-6">
          {belum ? <BelumSelesai r={belum} /> : null}
          <Pintasan />
        </div>
      </div>
    </div>
  );
}
