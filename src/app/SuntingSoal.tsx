import { useState } from 'react';
import type { HurufOpsi, IsiSoal, Soal, Verifikasi } from '../db/tipe';
import { periksaSuntingan, simpanSuntingan } from '../generasi/operasi';
import { Label, Peringatan } from '../komponen/Status';
import { TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';
import type { HasilPeriksa } from '../verifikasi';

const HURUF: HurufOpsi[] = ['A', 'B', 'C', 'D', 'E'];

function baris(t: string): string[] {
  return t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Penyunting satu soal. Hasil suntingan diperiksa ulang dengan pemeriksa yang sama sebelum disimpan. */
export function SuntingSoal({ soal, selesai }: { soal: Soal; selesai: () => void }) {
  const awal = soal.isi_json;
  const [pokok, setPokok] = useState(awal.pokok);
  const [opsi, setOpsi] = useState<Partial<Record<HurufOpsi, string>>>(awal.opsi ?? {});
  const [kunci, setKunci] = useState(awal.kunci);
  const [rubrik, setRubrik] = useState((awal.rubrik ?? []).join('\n'));
  const [pembahasan, setPembahasan] = useState(awal.pembahasan.join('\n'));
  const [verifikasi, setVerifikasi] = useState<Verifikasi>(awal.verifikasi);
  const [gambar, setGambar] = useState(awal.gambar ? JSON.stringify(awal.gambar.parameter, null, 1) : '');
  const [hasil, setHasil] = useState<HasilPeriksa | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  function susun(): IsiSoal | null {
    let parameter: Record<string, unknown> | null = null;
    if (awal.gambar) {
      try {
        parameter = JSON.parse(gambar || '{}');
      } catch {
        setGalat('Parameter gambar bukan JSON yang sah.');
        return null;
      }
    }
    setGalat(null);
    const huruf = HURUF.filter((h) => (opsi[h] ?? '').trim());
    return {
      ...awal,
      pokok: pokok.trim(),
      opsi: awal.bentuk === 'pilihan_ganda' ? Object.fromEntries(huruf.map((h) => [h, opsi[h]!.trim()])) : undefined,
      kunci: kunci.trim(),
      rubrik: awal.bentuk === 'uraian' ? baris(rubrik) : undefined,
      pembahasan: baris(pembahasan),
      verifikasi,
      gambar: awal.gambar && parameter ? { ...awal.gambar, parameter } : null,
    };
  }

  const pratinjau = (() => {
    try {
      return susun();
    } catch {
      return null;
    }
  })();

  async function periksa() {
    const isi = susun();
    if (!isi) return;
    setHasil(await periksaSuntingan(soal.id, isi));
  }

  async function simpan() {
    const isi = susun();
    if (!isi) return;
    setSibuk(true);
    try {
      const h = await simpanSuntingan(soal.id, isi);
      setHasil(h);
      if (h.lolos) selesai();
    } catch (e) {
      setGalat((e as Error).message);
    } finally {
      setSibuk(false);
    }
  }

  const ubahV = (u: Partial<Record<string, string>>) => setVerifikasi((v) => ({ ...v, ...u }) as Verifikasi);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <Label htmlFor="s-pokok">Pokok soal · rumus di antara $…$</Label>
          <textarea id="s-pokok" className="bidang mt-2" rows={4} value={pokok} onChange={(e) => setPokok(e.target.value)} />
        </div>
        {awal.bentuk === 'pilihan_ganda' ? (
          <div className="space-y-2">
            <Label>Opsi</Label>
            {HURUF.slice(0, Math.max(4, Object.keys(opsi).length)).map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="mono w-4">{h}</span>
                <input className="bidang !min-h-11" aria-label={`Opsi ${h}`} value={opsi[h] ?? ''} onChange={(e) => setOpsi((o) => ({ ...o, [h]: e.target.value }))} />
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <Label htmlFor="s-kunci">Kunci</Label>
          {awal.bentuk === 'pilihan_ganda' ? (
            <select id="s-kunci" className="bidang mt-2" value={kunci} onChange={(e) => setKunci(e.target.value)}>
              {HURUF.filter((h) => (opsi[h] ?? '').trim()).map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          ) : awal.bentuk === 'benar_salah' ? (
            <select id="s-kunci" className="bidang mt-2" value={kunci} onChange={(e) => setKunci(e.target.value)}>
              <option value="B">Benar</option>
              <option value="S">Salah</option>
            </select>
          ) : (
            <textarea id="s-kunci" className="bidang mt-2" rows={awal.bentuk === 'uraian' ? 3 : 1} value={kunci} onChange={(e) => setKunci(e.target.value)} />
          )}
        </div>
        {awal.bentuk === 'uraian' ? (
          <div>
            <Label htmlFor="s-rubrik">Rubrik · satu kriteria per baris</Label>
            <textarea id="s-rubrik" className="bidang mt-2" rows={3} value={rubrik} onChange={(e) => setRubrik(e.target.value)} />
          </div>
        ) : null}
        <div>
          <Label htmlFor="s-bahas">Pembahasan · satu langkah per baris</Label>
          <textarea id="s-bahas" className="bidang mt-2" rows={3} value={pembahasan} onChange={(e) => setPembahasan(e.target.value)} />
        </div>
        <details className="border border-garis p-4">
          <summary className="mono cursor-pointer text-redup">Verifikasi hitung{awal.gambar ? ' dan parameter gambar' : ''}</summary>
          <div className="mt-4 space-y-3">
            <select className="bidang" aria-label="Tipe verifikasi" value={verifikasi.tipe} onChange={(e) => setVerifikasi(e.target.value === 'ekspresi' ? { tipe: 'ekspresi', ekspresi: '', nilai: '' } : e.target.value === 'perbandingan' ? { tipe: 'perbandingan', kiri: '', relasi: '<', kanan: '' } : e.target.value === 'urutan' ? { tipe: 'urutan', nilai: [], arah: 'naik' } : { tipe: 'tidak_ada', alasan: 'Ditelaah guru.' })}>
              <option value="ekspresi">Ekspresi = nilai</option>
              <option value="perbandingan">Perbandingan</option>
              <option value="urutan">Urutan</option>
              <option value="tidak_ada">Tidak dapat dihitung (perlu telaah)</option>
            </select>
            {verifikasi.tipe === 'ekspresi' ? (
              <div className="grid grid-cols-2 gap-3">
                <input className="bidang font-mono" aria-label="Ekspresi" value={verifikasi.ekspresi} onChange={(e) => ubahV({ ekspresi: e.target.value })} placeholder="3/4 + 1/8" />
                <input className="bidang font-mono" aria-label="Nilai" value={verifikasi.nilai} onChange={(e) => ubahV({ nilai: e.target.value })} placeholder="7/8" />
              </div>
            ) : verifikasi.tipe === 'perbandingan' ? (
              <div className="grid grid-cols-3 gap-3">
                <input className="bidang font-mono" aria-label="Kiri" value={verifikasi.kiri} onChange={(e) => ubahV({ kiri: e.target.value })} />
                <select className="bidang" aria-label="Relasi" value={verifikasi.relasi} onChange={(e) => ubahV({ relasi: e.target.value })}>
                  {['=', '<', '>', '<=', '>=', '!='].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input className="bidang font-mono" aria-label="Kanan" value={verifikasi.kanan} onChange={(e) => ubahV({ kanan: e.target.value })} />
              </div>
            ) : verifikasi.tipe === 'urutan' ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input className="bidang font-mono" aria-label="Nilai urutan" value={verifikasi.nilai.join('; ')} onChange={(e) => setVerifikasi({ ...verifikasi, nilai: e.target.value.split(';').map((x) => x.trim()).filter(Boolean) })} placeholder="2/3; 3/4; 5/6" />
                <select className="bidang" aria-label="Arah" value={verifikasi.arah} onChange={(e) => setVerifikasi({ ...verifikasi, arah: e.target.value as 'naik' | 'turun' })}>
                  <option value="naik">naik</option>
                  <option value="turun">turun</option>
                </select>
              </div>
            ) : null}
            <p className="text-sm text-redup">Sintaks mathjs: titik desimal, pecahan a/b. Bila soal memakai gambar, ekspresi boleh memakai variabel gambar.</p>
            {awal.gambar ? (
              <>
                <Label htmlFor="s-gambar">Parameter gambar ({awal.gambar.templat})</Label>
                <textarea id="s-gambar" className="bidang font-mono text-sm" rows={5} value={gambar} onChange={(e) => setGambar(e.target.value)} />
              </>
            ) : null}
          </div>
        </details>
        {galat ? <Peringatan>{galat}</Peringatan> : null}
        {hasil ? (
          hasil.lolos ? (
            <div className="border border-tinta px-5 py-4 text-[15px]">
              Lolos pemeriksaan · {hasil.status_mutu === 'perlu_telaah' ? 'perlu telaah' : 'terverifikasi'}
              {hasil.catatan.length ? <span className="mt-1 block text-redup">{hasil.catatan.join(' ')}</span> : null}
            </div>
          ) : (
            <Peringatan>
              Belum dapat disimpan:
              <ul className="mt-1 list-disc pl-5">
                {hasil.alasan.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <span className="mt-2 block">Perbaiki kunci atau, bila soal memang tidak dapat dihitung, ubah verifikasi menjadi "tidak dapat dihitung" agar soal ditelaah manual.</span>
            </Peringatan>
          )
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Tombol onClick={simpan} disabled={sibuk}>
            Simpan
          </Tombol>
          <Tombol varian="hantu" onClick={periksa}>
            Periksa
          </Tombol>
          <Tombol varian="hantu" onClick={selesai}>
            Batal
          </Tombol>
        </div>
      </div>
      <div className="min-w-0 border-t border-garis pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <div className="mono text-redup">Pratinjau</div>
        {pratinjau ? <TampilSoal isi={pratinjau} besar={false} /> : null}
      </div>
    </div>
  );
}
