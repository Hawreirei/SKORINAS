import { useEffect, useRef, useState } from 'react';
import type { Soal } from '../db/tipe';
import { buatKandidat, terimaKandidat, type Kandidat } from '../generasi/operasi';
import { Label, Peringatan } from '../komponen/Status';
import { TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';
import { formatBiaya } from './ringkas';

/** Ganti butir atau buat ulang: buat kandidat dengan kategori yang sama, bandingkan, lalu terima atau kembalikan. */
export function GantiSoal({ soal, mode, selesai }: { soal: Soal; mode: 'ganti' | 'buat_ulang'; selesai: () => void }) {
  const [catatan, setCatatan] = useState('');
  const [kandidat, setKandidat] = useState<Kandidat | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [tunggu, setTunggu] = useState<string | null>(null);
  const kendali = useRef<AbortController | null>(null);
  useEffect(() => () => kendali.current?.abort(), []);

  async function buat() {
    setSibuk(true);
    setGalat(null);
    setKandidat(null);
    kendali.current = new AbortController();
    try {
      const k = await buatKandidat(soal.id, mode === 'buat_ulang' ? catatan : null, kendali.current.signal, (ms, alasan) => setTunggu(ms > 0 ? `${alasan} Menunggu ${Math.ceil(ms / 1000)} detik…` : null));
      if (!k.hasil.ok) setGalat(`Tiga percobaan tidak lolos pemeriksaan: ${k.hasil.percobaan.at(-1)?.alasan.join(' ') ?? ''}`);
      setKandidat(k);
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }

  useEffect(() => {
    if (mode === 'ganti') void buat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {mode === 'buat_ulang' && !kandidat ? (
        <div className="mb-6">
          <Label htmlFor="catatan">Apa yang perlu diubah?</Label>
          <textarea id="catatan" className="bidang mt-2" rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. pakai angka lebih kecil; konteks pasar; pengecoh lebih masuk akal" />
          <Tombol className="mt-3" onClick={buat} disabled={sibuk}>
            {sibuk ? 'Membuat…' : 'Buat ulang'}
          </Tombol>
        </div>
      ) : null}
      {sibuk ? <p className="text-base font-bold text-redup">{tunggu ?? 'Membuat dan memeriksa soal baru…'}</p> : null}
      {galat ? <Peringatan className="mb-4">{galat}</Peringatan> : null}
      {kandidat?.hasil.ok && kandidat.hasil.isi ? (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="text-base font-bold text-redup">Versi lama · v{soal.versi}</div>
              <TampilSoal isi={soal.isi_json} besar={false} />
            </div>
            <div className="border-t border-garis pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="font-semibold">Versi baru · {kandidat.hasil.periksa?.status_mutu === 'perlu_telaah' ? 'kunci tidak dicek otomatis' : 'kunci sudah dihitung ulang'}</div>
              <TampilSoal isi={kandidat.hasil.isi} besar={false} />
              <p className="font-semibold mt-4 text-redup">
                {kandidat.model.model} · {formatBiaya(kandidat.biaya)}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-garis pt-5">
            <Tombol
              onClick={async () => {
                await terimaKandidat(soal.id, kandidat, mode);
                selesai();
              }}
            >
              Terima versi baru
            </Tombol>
            <Tombol varian="hantu" onClick={selesai}>
              Kembalikan versi lama
            </Tombol>
            <Tombol varian="hantu" onClick={buat} disabled={sibuk}>
              Coba lagi
            </Tombol>
          </div>
        </>
      ) : !sibuk && kandidat ? (
        <Tombol varian="hantu" onClick={buat}>
          Coba lagi
        </Tombol>
      ) : null}
    </div>
  );
}
