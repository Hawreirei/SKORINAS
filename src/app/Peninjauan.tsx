import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/skema';
import type { Soal } from '../db/tipe';
import { KESUKARAN_LABEL } from '../db/tipe';
import { penghalangEkspor } from '../ekspor/model';
import { pengatur } from '../generasi/pengatur';
import { paketUntuk } from '../paket';
import { Dialog } from '../komponen/Dialog';
import { usePesan } from '../komponen/Pesan';
import { Peringatan } from '../komponen/Status';
import { Chip, Panah, TautanTombol, Tombol } from '../komponen/Tombol';
import { GantiSoal } from './GantiSoal';
import { usePengatur, useJudulHalaman, useProfil } from './kait';
import { KartuSoal, type AksiKartu } from './KartuSoal';
import { formatBiaya, ringkasPaket } from './ringkas';
import { SuntingSoal } from './SuntingSoal';

function HitungMundur({ sampai, alasan }: { sampai: number; alasan: string }) {
  const [kini, setKini] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setKini(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const detik = Math.max(0, Math.ceil((sampai - kini) / 1000));
  return (
    <p className="mt-3 text-sm text-isi" role="status">
      {alasan} Melanjutkan otomatis dalam {detik} detik. Tidak perlu menekan apa pun.
    </p>
  );
}

type Saring = 'semua' | 'perlu_telaah' | 'belum_disetujui' | 'ditolak';

export default function Peninjauan() {
  const { id = '' } = useParams();
  const paket = useLiveQuery(() => db.paket_soal.get(id), [id]);
  const semua = useLiveQuery(() => db.soal.where('paket_id').equals(id).toArray(), [id]);
  const kerja = useLiveQuery(() => db.pekerjaan_generasi.where('paket_id').equals(id).first(), [id]);
  const pemakaian = useLiveQuery(() => db.pemakaian_ai.where('paket_id').equals(id).toArray(), [id]);
  const status = usePengatur();
  const profil = useProfil();
  const pesan = usePesan();
  const [saring, setSaring] = useState<Saring>('semua');
  const [dialog, setDialog] = useState<{ soal: Soal; aksi: AksiKartu } | null>(null);
  const [judulBaru, setJudulBaru] = useState<string | null>(null);
  useJudulHalaman(paket?.judul ?? 'Peninjauan');

  const aktif = useMemo(() => (semua ?? []).filter((s) => s.dihapus_pada == null && s.status_mutu !== 'ditolak').sort((a, b) => a.urutan - b.urutan), [semua]);
  const ditolak = useMemo(() => (semua ?? []).filter((s) => s.status_mutu === 'ditolak' && s.dihapus_pada == null), [semua]);
  if (paket === undefined || semua === undefined) return <div className="mono px-16 py-20 text-redup">Memuat…</div>;
  if (!paket) return <div className="px-4 py-20 sm:px-16">Paket tidak ditemukan. <Link to="/soal" className="underline">Kembali ke Soal saya</Link></div>;

  const p = paket.parameter_json;
  const r = ringkasPaket(paket, semua);
  const risiko = paketUntuk(p.rumpun)?.risikoTinggi ?? false;
  const penghalang = penghalangEkspor(paket, aktif);
  const sedangDibuat = status.berjalan && status.paketId === id;
  const slot = kerja?.slot ?? [];
  const selesaiSlot = slot.filter((s) => s.status === 'lolos' || s.status === 'gagal').length;
  const gagalSlot = slot.filter((s) => s.status === 'gagal');
  const komposisi = (['mudah', 'sedang', 'sulit'] as const).map((k) => `${KESUKARAN_LABEL[k]} ${aktif.filter((s) => s.kesukaran_rancangan === k).length}`).join(' · ');
  const totalBiaya = (pemakaian ?? []).reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
  const totalToken = (pemakaian ?? []).reduce((a, x) => a + x.token_masuk + x.token_keluar, 0);

  const ditampilkan = saring === 'ditolak' ? ditolak : aktif.filter((s) => (saring === 'perlu_telaah' ? s.status_mutu === 'perlu_telaah' && s.status_telaah !== 'ditelaah_guru' : saring === 'belum_disetujui' ? s.status_telaah !== 'ditelaah_guru' : true));

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
    <div className="mx-auto flex max-w-[1312px] flex-wrap px-4 sm:px-8 lg:px-16">
      <div className="min-w-0 flex-[999_1_640px] pb-20 pt-10 lg:pr-12 lg:pt-14">
        <div className="mono text-redup">
          Kelas {p.kelas} · {p.mapel} · Fase {p.fase}
        </div>
        {judulBaru === null ? (
          <h1 className="judul-besar mt-3.5 text-[34px] sm:text-[48px] lg:text-[56px]">
            {paket.judul}{' '}
            <button type="button" className="mono align-middle text-redup hover:text-tinta" onClick={() => setJudulBaru(paket.judul)}>
              Ubah
            </button>
          </h1>
        ) : (
          <form
            className="mt-3.5 flex flex-wrap gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (judulBaru.trim()) await db.paket_soal.update(id, { judul: judulBaru.trim() });
              setJudulBaru(null);
            }}
          >
            <input className="bidang max-w-xl" aria-label="Judul paket" value={judulBaru} onChange={(e) => setJudulBaru(e.target.value)} autoFocus />
            <Tombol type="submit">Simpan</Tombol>
          </form>
        )}
        <div className="mono mt-5 flex flex-wrap gap-x-7 gap-y-2 text-redup">
          <span>{aktif.length} soal</span>
          <span>{komposisi}</span>
          <span>Dibuat dengan bantuan AI</span>
          {paket.model ? <span>{paket.model}</span> : null}
        </div>

        {paket.status !== 'siap' || sedangDibuat ? (
          <div className="mt-8 border border-tinta p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-[17px] font-light">
                {sedangDibuat
                  ? status.menunggu
                    ? `Menunggu batas penyedia pulih · butir ${status.slotAktif ?? selesaiSlot + 1} dari ${slot.length}`
                    : `Membuat butir ${status.slotAktif ?? selesaiSlot + 1} dari ${slot.length}…`
                  : `Dijeda · ${selesaiSlot} dari ${slot.length} butir selesai`}
              </span>
              {sedangDibuat ? (
                <Tombol varian="hantu" onClick={() => pengatur.jeda()}>
                  Jeda
                </Tombol>
              ) : (
                <span className="flex flex-wrap gap-2">
                  <Tombol onClick={() => lanjutkan()} disabled={status.berjalan}>
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
            <div className="mt-4 h-1.5 bg-garis" aria-hidden="true">
              <div className="h-full bg-tinta transition-all" style={{ width: `${slot.length ? (selesaiSlot / slot.length) * 100 : 0}%` }} />
            </div>
            {sedangDibuat && status.menunggu ? <HitungMundur sampai={status.menunggu.sampai} alasan={status.menunggu.alasan} /> : null}
            {status.paketId === id && status.catatan ? <p className="mt-3 text-sm text-isi">{status.catatan}</p> : null}
            {!sedangDibuat && (kerja?.galat || status.pesan) ? (
              <div className="mt-3 text-sm text-awas">
                <p>
                  {status.paketId === id && status.pesan ? status.pesan : kerja?.galat}{' '}
                  {(status.paketId === id && (status.jenisGalat === 'kunci' || status.jenisGalat === 'batas' || status.jenisGalat === 'model')) || /kunci|model|kuota/i.test(kerja?.galat ?? '') ? (
                    <Link to="/pengaturan/ai" className="underline">
                      Buka Pengaturan AI
                    </Link>
                  ) : null}
                </p>
                {status.paketId === id && status.rinci ? (
                  <details className="mt-2 text-redup">
                    <summary className="mono cursor-pointer">Rincian dari penyedia</summary>
                    <p className="mt-1 break-words">{status.rinci}</p>
                  </details>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 text-sm text-redup">Setiap butir disimpan begitu lolos pemeriksaan. Bila tab tertutup, lanjutkan dari butir terakhir.</p>
          </div>
        ) : null}

        {gagalSlot.length && !sedangDibuat ? (
          <Peringatan className="mt-6">
            {gagalSlot.length} butir tidak berhasil dibuat setelah percobaan ulang dan pengganti.{' '}
            <button type="button" className="underline" onClick={ulangiGagal}>
              Coba buat lagi
            </button>
          </Peringatan>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-2">
          <Chip aktif={saring === 'semua'} onClick={() => setSaring('semua')}>
            Semua · {aktif.length}
          </Chip>
          <Chip aktif={saring === 'perlu_telaah'} onClick={() => setSaring('perlu_telaah')}>
            Perlu telaah · {r.belumDitelaah}
          </Chip>
          <Chip aktif={saring === 'belum_disetujui'} onClick={() => setSaring('belum_disetujui')}>
            Belum disetujui · {aktif.length - r.disetujui}
          </Chip>
          {ditolak.length ? (
            <Chip aktif={saring === 'ditolak'} onClick={() => setSaring('ditolak')}>
              Ditolak otomatis · {ditolak.length}
            </Chip>
          ) : null}
        </div>

        <div className="mt-6">
          {saring === 'ditolak' ? (
            <div className="border-t border-tinta">
              <p className="py-5 text-[15px] text-isi">Butir ini gagal pemeriksaan otomatis tiga kali dan tidak pernah dipakai. Ditampilkan hanya sebagai jejak.</p>
              {ditolak.map((s) => (
                <details key={s.id} className="border-b border-garis py-4">
                  <summary className="cursor-pointer text-[15px]">
                    Butir {s.urutan} · {s.catatan_mutu[s.catatan_mutu.length - 1] ?? 'ditolak'}
                  </summary>
                  <ul className="mt-2 list-disc pl-5 text-sm text-redup">
                    {s.catatan_mutu.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ) : ditampilkan.length === 0 ? (
            <p className="border-t border-tinta py-8 text-[17px] font-light text-isi">{sedangDibuat ? 'Butir pertama sedang dibuat dan diperiksa…' : 'Tidak ada soal pada saringan ini.'}</p>
          ) : (
            ditampilkan.map((s, i) => <KartuSoal key={s.id} soal={s} nomor={aktif.indexOf(s) + 1} risikoTinggi={risiko} pertama={i === 0} aksi={(a) => setDialog({ soal: s, aksi: a })} />)
          )}
        </div>
      </div>

      <aside aria-label="Status paket" className="w-full shrink-0 border-garis pb-14 lg:w-[320px] lg:border-l lg:pl-10 lg:pt-14">
        <div className="lg:sticky lg:top-6">
          <div className="mono text-redup">Status paket</div>
          <div className="mt-5 border-t border-tinta">
            {[
              ['Terverifikasi', r.terverifikasi],
              ['Perlu telaah', r.belumDitelaah],
              ['Sudah disetujui', r.disetujui],
              ['Ditolak otomatis', r.ditolak],
            ].map(([l, n]) => (
              <div key={l} className="flex justify-between border-b border-garis py-4">
                <span className="mono">{l}</span>
                <span className="text-xl font-light">{n}</span>
              </div>
            ))}
            <div className="flex justify-between border-b border-garis py-4">
              <span className="mono">Biaya AI</span>
              <span className="text-right text-[15px] font-light">
                {formatBiaya(totalBiaya)}
                <span className="mono block text-redup">{totalToken.toLocaleString('id-ID')} token</span>
              </span>
            </div>
          </div>
          <p className="mt-5 text-sm leading-normal text-isi">
            {penghalang.length ? `${penghalang.length} soal berstatus perlu telaah belum ditandai. Soal tersebut baru dapat diekspor setelah Anda menelaahnya.` : 'Soal berstatus perlu telaah baru dapat diekspor setelah Anda menandainya.'}
          </p>
          {penghalang.length ? (
            <Tombol varian="garis" className="mt-5 w-full" onClick={() => setSaring('perlu_telaah')}>
              Tampilkan yang perlu telaah
            </Tombol>
          ) : null}
          <TautanTombol to={`/soal/${id}/ekspor`} ukuran="besar" className={`mt-4 w-full ${penghalang.length || !aktif.length ? 'pointer-events-none opacity-40' : ''}`} aria-disabled={penghalang.length > 0 || !aktif.length}>
            Lanjut ke ekspor <Panah />
          </TautanTombol>
          <Link to={`/soal/baru?ulang=${id}`} className="mono mt-5 block text-redup hover:text-tinta">
            Buat paket serupa
          </Link>
        </div>
      </aside>

      <Dialog buka={!!dialog} tutup={() => setDialog(null)} judul={dialog?.aksi === 'sunting' ? 'Sunting soal' : dialog?.aksi === 'ganti' ? 'Ganti butir' : 'Buat ulang'} lebar={1100}>
        {dialog?.aksi === 'sunting' ? <SuntingSoal key={dialog.soal.id} soal={dialog.soal} selesai={() => setDialog(null)} /> : null}
        {dialog && dialog.aksi !== 'sunting' ? <GantiSoal key={dialog.soal.id + dialog.aksi} soal={dialog.soal} mode={dialog.aksi} selesai={() => setDialog(null)} /> : null}
      </Dialog>
    </div>
  );
}
