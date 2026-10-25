import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Soal } from '../db/tipe';
import { KESUKARAN_LABEL } from '../db/tipe';
import { pengatur } from '../generasi/pengatur';
import { paketUntuk } from '../paket';
import { Dialog } from '../komponen/Dialog';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { BilahKemajuan, Kartu, LencanaStatus, Peringatan, pitaStatus } from '../komponen/Status';
import { menungguPenyedia, statusPaket } from './status';
import { Panah, TautanTombol, Tombol } from '../komponen/Tombol';
import { GantiSoal } from './GantiSoal';
import { usePengatur, useJudulHalaman, useProfil } from './kait';
import { KartuSoal, type AksiKartu } from './KartuSoal';
import { formatBiaya } from './ringkas';
import { SuntingSoal } from './SuntingSoal';

function HitungMundur({ sampai, alasan }: { sampai: number; alasan: string }) {
  const [kini, setKini] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const detik = Math.max(0, Math.ceil((sampai - kini) / 1000));
  return (
    <p className="mt-3 text-base text-isi tabular-nums">
      {alasan} Melanjutkan otomatis dalam {detik} detik. Tidak perlu menekan apa pun.
    </p>
  );
}

export default function Peninjauan() {
  const { id = '' } = useParams();
  const paket = useLiveQuery(() => db.paket_soal.get(id), [id]);
  const semua = useLiveQuery(() => db.soal.where('paket_id').equals(id).toArray(), [id]);
  const kerja = useLiveQuery(() => db.pekerjaan_generasi.where('paket_id').equals(id).first(), [id]);
  const pemakaian = useLiveQuery(() => db.pemakaian_ai.where('paket_id').equals(id).toArray(), [id]);
  const status = usePengatur();
  const profil = useProfil();
  const pesan = usePesan();
  const [dialog, setDialog] = useState<{ soal: Soal; aksi: AksiKartu } | null>(null);
  const [judulBaru, setJudulBaru] = useState<string | null>(null);
  useJudulHalaman(paket ? paket.judul : 'Paket soal');

  const aktif = useMemo(() => (semua ?? []).filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak').sort((a, b) => a.urutan - b.urutan), [semua]);
  if (paket === undefined || semua === undefined) return <div className="px-4 py-20 text-center text-redup">Memuat…</div>;
  if (!paket) return <div className="px-4 py-20 sm:px-8">Paket tidak ditemukan. <Link to="/soal" className="font-bold text-utama underline">Kembali ke Soal saya</Link></div>;

  const p = paket.parameter_json;
  const risiko = paketUntuk(p.rumpun)?.risikoTinggi ?? false;
  const sedangDibuat = status.berjalan && status.paketId === id;
  // Pengatur sudah berhenti tetapi status paket di IndexedDB belum terbaca ulang: jangan sempat menampilkan "Dijeda".
  const menyelesaikan = !sedangDibuat && paket.status === 'membuat';
  const slot = kerja?.slot ?? [];
  const selesaiSlot = slot.filter((s) => s.status === 'lolos' || s.status === 'gagal').length;
  const gagalSlot = slot.filter((s) => s.status === 'gagal');
  const st = statusPaket({ paketId: id, status: paket.status, gagal: gagalSlot.length, galat: kerja?.galat ?? null, pengatur: status });
  const nomorAktif = status.slotAktif ?? selesaiSlot + 1;
  const rinciKemajuan = sedangDibuat
    ? status.menunggu
      ? // Lencana sudah berbunyi "Menunggu batas penyedia"; jeda yang diatur GenSoal sendiri disebut terpisah.
        `${menungguPenyedia(status.menunggu) ? '' : 'Menjaga batas per menit · '}soal ${nomorAktif} dari ${slot.length}`
      : `Membuat soal ${nomorAktif} dari ${slot.length}…`
    : menyelesaikan
      ? 'Menyimpan soal terakhir…'
      : null;
  const komposisi = (['mudah', 'sedang', 'sulit'] as const).map((k) => `${KESUKARAN_LABEL[k]} ${aktif.filter((s) => s.kesukaran_rancangan === k).length}`).join(' · ');
  const totalBiaya = (pemakaian ?? []).reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
  const totalToken = (pemakaian ?? []).reduce((a, x) => a + x.token_masuk + x.token_keluar, 0);

  // Tidak ada gerbang persetujuan (rancangan v0.5): paket dapat diunduh begitu punya soal.
  const bisaUnduh = aktif.length > 0;

  async function lanjutkan(pakaiCadangan = false) {
    try {
      await pengatur.mulai(id, { pakaiCadangan });
      const s = pengatur.ambil();
      if (s.pesan) pesan(s.pesan, 'galat');
    } catch (e) {
      pesan((e as Error).message, 'galat');
    }
  }

  async function ulangiGagal() {
    if (!kerja) return;
    const baru = kerja.slot.map((s) => (s.status === 'gagal' ? { ...s, status: 'menunggu' as const, pengganti: false, galat: null } : s));
    await db.pekerjaan_generasi.update(kerja.id, { slot: baru, status: 'dijeda' });
    await lanjutkan();
  }

  return (
    <div>
      <div className="mx-auto flex max-w-[1240px] gap-x-10 px-4 sm:px-8">
        <div className="min-w-0 flex-1 pb-10 pt-8 sm:pt-10 lg:pb-16">
          <KepalaHalaman
            label={`Kelas ${p.kelas} · ${p.mapel}`}
            judul={
              judulBaru === null ? (
                <>
                  {paket.judul}{' '}
                  <button type="button" className="align-middle text-base font-bold text-utama hover:underline" onClick={() => setJudulBaru(paket.judul)}>
                    Ubah judul
                  </button>
                </>
              ) : (
                paket.judul
              )
            }
            subjudul={<span className="tabular-nums">{`${aktif.length} soal · ${komposisi} · Dibuat dengan bantuan AI`}</span>}
          >
            {judulBaru !== null ? (
              <form
                className="mt-3 flex flex-wrap gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (judulBaru.trim()) await db.paket_soal.update(id, { judul: judulBaru.trim() });
                  setJudulBaru(null);
                }}
              >
                <input className="bidang max-w-xl" aria-label="Judul paket" value={judulBaru} onChange={(e) => setJudulBaru(e.target.value)} autoFocus />
                <Tombol type="submit" varian="garis">
                  Simpan
                </Tombol>
              </form>
            ) : null}
          </KepalaHalaman>

          {paket.status !== 'siap' || sedangDibuat ? (
            <Kartu pita={pitaStatus(st)} className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
                  <LencanaStatus status={st} />
                  {rinciKemajuan ? <span className="text-base font-semibold text-isi tabular-nums">{rinciKemajuan}</span> : null}
                </div>
                {menyelesaikan ? null : sedangDibuat ? (
                  <Tombol varian="hantu" onClick={() => pengatur.jeda()}>
                    Jeda
                  </Tombol>
                ) : (
                  <span className="flex flex-wrap gap-2">
                    <Tombol varian="garis" onClick={() => lanjutkan()} disabled={status.berjalan}>
                      Lanjutkan
                    </Tombol>
                    {(status.paketId === id && status.jenisGalat === 'batas') || /kuota|batas pemakaian/i.test(kerja?.galat ?? '') ? (
                      <Tombol varian="hantu" onClick={() => lanjutkan(true)} disabled={status.berjalan || !profil.model_cadangan}>
                        Pakai model cadangan
                      </Tombol>
                    ) : null}
                  </span>
                )}
              </div>
              <BilahKemajuan selesai={selesaiSlot} total={slot.length} menunggu={st === 'menunggu'} className="mt-4" />
              {sedangDibuat && status.menunggu ? <HitungMundur sampai={status.menunggu.sampai} alasan={status.menunggu.alasan} /> : null}
              {status.paketId === id && status.catatan ? <p className="mt-3 text-base text-isi">{status.catatan}</p> : null}
              {!sedangDibuat && (kerja?.galat || status.pesan) ? (
                <div className="mt-3 text-base text-isi">
                  <p>
                    {status.paketId === id && status.pesan ? status.pesan : kerja?.galat}{' '}
                    {(status.paketId === id && (status.jenisGalat === 'kunci' || status.jenisGalat === 'batas' || status.jenisGalat === 'model')) || /kunci|model|kuota/i.test(kerja?.galat ?? '') ? (
                      <Link to="/pengaturan/ai" className="font-bold underline">
                        Buka Pengaturan AI
                      </Link>
                    ) : null}
                  </p>
                  {status.paketId === id && status.rinci ? (
                    <details className="mt-2 text-redup">
                      <summary className="cursor-pointer font-semibold">Rincian dari penyedia</summary>
                      <p className="mt-1 break-words">{status.rinci}</p>
                    </details>
                  ) : null}
                </div>
              ) : null}
              {!sedangDibuat && !menyelesaikan ? <p className="mt-3 text-base text-redup">Soal yang sudah jadi tetap tersimpan. Tekan Lanjutkan untuk membuat sisanya.</p> : null}
            </Kartu>
          ) : null}

          {gagalSlot.length && !sedangDibuat ? (
            <Peringatan className="mt-6">
              {gagalSlot.length} soal tidak berhasil dibuat setelah dicoba ulang.{' '}
              <button type="button" className="font-bold underline" onClick={ulangiGagal}>
                Coba buat lagi
              </button>
            </Peringatan>
          ) : null}

          <div className="mt-6 space-y-4 sm:space-y-6">
            {aktif.length === 0 ? (
              <Kartu pita="tanpa">
                <p className="text-[17px] text-isi">{sedangDibuat ? 'Soal pertama sedang dibuat dan diperiksa…' : 'Belum ada soal di paket ini.'}</p>
              </Kartu>
            ) : (
              aktif.map((s, i) => <KartuSoal key={s.id} soal={s} nomor={i + 1} risikoTinggi={risiko} aksi={(a) => setDialog({ soal: s, aksi: a })} />)
            )}
          </div>
        </div>

        <aside aria-label="Paket ini" className="hidden w-[300px] shrink-0 pb-14 pt-10 lg:block">
          <Kartu className="sticky top-[calc(var(--tinggi-kepala,76px)+1.5rem)]">
            <h2 className="text-[20px] font-extrabold text-judul">Paket ini</h2>
            <p className="mt-2 text-base text-isi">{aktif.length ? `${aktif.length} soal siap diunduh.` : 'Belum ada soal.'}</p>
            <TautanTombol to={`/soal/${id}/ekspor`} ukuran="besar" className={`mt-4 w-full ${bisaUnduh ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!bisaUnduh}>
              Unduh <Panah />
            </TautanTombol>
            <Link to={`/soal/baru?ulang=${id}`} className="mt-4 block text-base font-bold text-utama hover:underline">
              Buat paket serupa
            </Link>
            <p className="mt-4 border-t border-garis pt-3 text-base text-redup tabular-nums">
              Biaya AI: {formatBiaya(totalBiaya)} · {totalToken.toLocaleString('id-ID')} token
            </p>
          </Kartu>
        </aside>
      </div>

      {/* Ponsel dan tablet: ringkasan dan langkah berikutnya selalu terlihat di bawah. */}
      <div className="tanpa-cetak sticky bottom-0 z-10 border-t border-garis bg-kartu shadow-[0_-4px_16px_rgba(15,23,42,0.08)] lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <span className="min-w-0 text-base font-bold text-isi tabular-nums">{aktif.length ? `${aktif.length} soal` : 'Belum ada soal'}</span>
          <TautanTombol to={`/soal/${id}/ekspor`} className={`shrink-0 ${bisaUnduh ? '' : 'pointer-events-none opacity-40'}`} aria-disabled={!bisaUnduh}>
            Unduh <Panah />
          </TautanTombol>
        </div>
      </div>

      <Dialog buka={!!dialog} tutup={() => setDialog(null)} judul={dialog?.aksi === 'sunting' ? 'Sunting soal' : dialog?.aksi === 'ganti' ? 'Ganti soal' : 'Buat ulang'} ukuran="lebar">
        {dialog?.aksi === 'sunting' ? <SuntingSoal key={dialog.soal.id} soal={dialog.soal} selesai={() => setDialog(null)} /> : null}
        {dialog && dialog.aksi !== 'sunting' ? <GantiSoal key={dialog.soal.id + dialog.aksi} soal={dialog.soal} mode={dialog.aksi} selesai={() => setDialog(null)} /> : null}
      </Dialog>
    </div>
  );
}
