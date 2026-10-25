import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/skema';
import { MASA_SAMPAH_MS } from '../db/sampah';
import { hapusPaket, pulihkanPaket, pulihkanSoal } from '../generasi/operasi';
import { Dialog } from '../komponen/Dialog';
import { IsianTeks, Pilihan } from '../komponen/Formulir';
import { KepalaHalaman } from '../komponen/Kepala';
import { useKonfirmasi } from '../komponen/Konfirmasi';
import { MenuLainnya } from '../komponen/MenuLainnya';
import { usePesan } from '../komponen/Pesan';
import { Kartu, LencanaStatus } from '../komponen/Status';
import { Panah, TautanTombol, Tombol } from '../komponen/Tombol';
import { teksPolos } from '../matematika/teks';
import { useJudulHalaman, usePengatur } from './kait';
import { daftarRingkasan, formatTanggal, statusRingkasan, teksJumlah, type RingkasanPaket } from './ringkas';

/** Saringan status Soal saya (rancangan UI v0.5, UI-09); tersimpan di URL sebagai ?status=. */
type Saring = 'semua' | 'belum' | 'siap';

export default function DaftarSoal() {
  useJudulHalaman('Soal saya');
  const [url, setUrl] = useSearchParams();
  const navigasi = useNavigate();
  const pesan = usePesan();
  const konfirmasi = useKonfirmasi();
  const pengatur = usePengatur();
  const sampah = url.get('tab') === 'sampah';
  const saring: Saring = url.get('status') === 'belum' || url.get('status') === 'siap' ? (url.get('status') as Saring) : 'semua';
  const [cari, setCari] = useState('');
  const [ubahJudul, setUbahJudul] = useState<{ id: string; judul: string } | null>(null);
  const paket = useLiveQuery(() => daftarRingkasan(), []);
  const paketSampah = useLiveQuery(() => daftarRingkasan(undefined, true), []);
  const soalSampah = useLiveQuery(() => db.soal.filter((s) => s.dihapus_pada != null).toArray(), []);
  const jumlahSampah = (paketSampah?.length ?? 0) + (soalSampah?.length ?? 0);
  const sisaHari = (t: number) => Math.max(0, Math.ceil((t + MASA_SAMPAH_MS - Date.now()) / 86400000));

  const siap = (r: RingkasanPaket) => statusRingkasan(r, pengatur) === 'siap';
  const hitung = { semua: paket?.length ?? 0, belum: (paket ?? []).filter((r) => !siap(r)).length, siap: (paket ?? []).filter(siap).length };
  const q = cari.trim().toLowerCase();
  const tersaring = (paket ?? [])
    .filter((r) => (saring === 'semua' ? true : saring === 'siap' ? siap(r) : !siap(r)))
    .filter((r) => !q || `${r.paket.judul} ${r.paket.parameter_json.mapel} kelas ${r.paket.parameter_json.kelas} ${r.paket.parameter_json.tp.map((t) => t.rumusan).join(' ')}`.toLowerCase().includes(q));

  const ubahUrl = (u: Record<string, string | null>) =>
    setUrl((lama) => {
      const baru = new URLSearchParams(lama);
      for (const [k, v] of Object.entries(u)) {
        if (v === null) baru.delete(k);
        else baru.set(k, v);
      }
      return baru;
    });

  async function hapus(r: RingkasanPaket) {
    const ya = await konfirmasi({ judul: `Hapus paket "${r.paket.judul}"?`, pesan: `${teksJumlah(r)} pindah ke tong sampah dan dapat dipulihkan selama 30 hari.`, aksi: 'Hapus paket', bahaya: true });
    if (ya) await hapusPaket(r.paket.id);
  }

  async function simpanJudul() {
    if (!ubahJudul) return;
    const judul = ubahJudul.judul.trim();
    if (judul) {
      await db.paket_soal.update(ubahJudul.id, { judul });
      pesan('Judul paket disimpan.');
    }
    setUbahJudul(null);
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman
        kembali={sampah ? { ke: '/soal', label: 'Kembali ke paket soal' } : undefined}
        judul={sampah ? 'Tong sampah' : 'Soal saya'}
        subjudul={sampah ? 'Paket dan soal yang dihapus. Isinya dikosongkan otomatis 30 hari setelah dihapus.' : 'Paket soal yang tersimpan di perangkat ini.'}
        aksi={
          sampah ? undefined : (
            <TautanTombol to="/soal/baru" ukuran="besar" className="w-full sm:w-auto">
              Buat soal <Panah />
            </TautanTombol>
          )
        }
      />

      {sampah ? (
        <Kartu as="div" className="mt-6 !py-1">
          {paketSampah?.map((r) => (
            <div key={r.paket.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-garis py-4 last:border-b-0">
              <span className="min-w-0">
                <span className="block text-[17px] font-bold text-tinta">Paket · {r.paket.judul}</span>
                <span className="block text-base text-redup tabular-nums">{sisaHari(r.paket.dihapus_pada!)} hari lagi dihapus permanen</span>
              </span>
              <Tombol varian="hantu" ukuran="kecil" onClick={() => pulihkanPaket(r.paket.id)}>
                Pulihkan
              </Tombol>
            </div>
          ))}
          {soalSampah?.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-garis py-4 last:border-b-0">
              <span className="min-w-0">
                <span className="block text-[17px] text-tinta">Soal · {teksPolos(s.isi_json.pokok).slice(0, 100)}</span>
                <span className="block text-base text-redup tabular-nums">{sisaHari(s.dihapus_pada!)} hari lagi dihapus permanen</span>
              </span>
              <Tombol varian="hantu" ukuran="kecil" onClick={() => pulihkanSoal(s.id)}>
                Pulihkan
              </Tombol>
            </div>
          ))}
          {paketSampah && soalSampah && !jumlahSampah ? <p className="py-8 text-[17px] text-isi">Tong sampah kosong.</p> : null}
        </Kartu>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-end gap-3">
            <Pilihan
              className="w-full sm:w-auto sm:min-w-[440px]"
              labelTersembunyi
              label="Saring paket menurut status"
              nilai={saring}
              ubah={(v) => ubahUrl({ status: v === 'semua' ? null : v })}
              opsi={[
                { nilai: 'semua', label: <span className="tabular-nums">Semua · {hitung.semua}</span> },
                { nilai: 'belum', label: <span className="tabular-nums">Belum selesai · {hitung.belum}</span> },
                { nilai: 'siap', label: <span className="tabular-nums">Siap diunduh · {hitung.siap}</span> },
              ]}
            />
            <input className="bidang !min-h-12 sm:ml-auto sm:!w-72" type="search" placeholder="Cari judul, mapel, TP" aria-label="Cari paket" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>

          <Kartu as="div" className="mt-4 !py-1">
            {paket && !tersaring.length ? (
              <div className="py-8 text-[17px] text-isi">
                {q ? (
                  <>
                    Tidak ada paket yang cocok dengan pencarian.{' '}
                    <button type="button" className="font-bold text-utama underline" onClick={() => setCari('')}>
                      Hapus pencarian
                    </button>
                  </>
                ) : paket.length ? (
                  saring === 'belum' ? 'Semua paket sudah siap diunduh.' : 'Belum ada paket yang siap diunduh.'
                ) : (
                  <>
                    Belum ada paket soal.{' '}
                    <Link to="/soal/baru" className="font-bold text-utama underline">
                      Buat paket pertama
                    </Link>
                    .
                  </>
                )}
              </div>
            ) : null}
            {tersaring.map((r) => (
              <div key={r.paket.id} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-garis py-4 last:border-b-0 hover:bg-lembut sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-2">
                <span className="min-w-0">
                  {/* Seluruh baris membuka paket; menu ⋯ berada di atas tautan ini. */}
                  <Link to={`/soal/${r.paket.id}`} className="block text-[18px] font-bold text-tinta after:absolute after:inset-0 hover:underline">
                    {r.paket.judul}
                  </Link>
                  <span className="mt-0.5 block text-base text-redup tabular-nums">
                    Kelas {r.paket.parameter_json.kelas} · {r.paket.parameter_json.mapel} · {formatTanggal(r.paket.dibuat_pada)} · {teksJumlah(r)}
                  </span>
                  <span className="mt-2 block sm:hidden">
                    <LencanaStatus status={statusRingkasan(r, pengatur)} />
                  </span>
                </span>
                <span className="hidden sm:block">
                  <LencanaStatus status={statusRingkasan(r, pengatur)} />
                </span>
                <MenuLainnya
                  ikon
                  arah="bawah"
                  className="relative z-10"
                  label={`Aksi paket ${r.paket.judul}`}
                  butir={[
                    { label: 'Buka', onClick: () => navigasi(`/soal/${r.paket.id}`) },
                    { label: 'Unduh', onClick: () => navigasi(`/soal/${r.paket.id}/ekspor`) },
                    { label: 'Buat paket serupa', onClick: () => navigasi(`/soal/baru?ulang=${r.paket.id}`) },
                    { label: 'Ubah judul…', onClick: () => setUbahJudul({ id: r.paket.id, judul: r.paket.judul }) },
                    { label: 'Hapus…', bahaya: true, onClick: () => void hapus(r) },
                  ]}
                />
              </div>
            ))}
          </Kartu>

          <p className="mt-6 text-base">
            <button type="button" className="font-bold text-utama hover:underline tabular-nums" onClick={() => ubahUrl({ tab: 'sampah', status: null })}>
              Tong sampah · {jumlahSampah}
            </button>
          </p>
        </>
      )}

      <Dialog
        buka={!!ubahJudul}
        tutup={() => setUbahJudul(null)}
        judul="Ubah judul paket"
        ukuran="sempit"
        kaki={
          <>
            <Tombol varian="garis" onClick={() => setUbahJudul(null)}>
              Batal
            </Tombol>
            <Tombol onClick={simpanJudul}>Simpan</Tombol>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void simpanJudul();
          }}
        >
          <IsianTeks id="judul-paket" label="Judul paket" value={ubahJudul?.judul ?? ''} onChange={(e) => setUbahJudul((u) => (u ? { ...u, judul: e.target.value } : u))} data-fokus-awal />
        </form>
      </Dialog>
    </div>
  );
}
