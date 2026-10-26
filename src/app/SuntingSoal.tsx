import { useState } from 'react';
import type { HurufOpsi, IsiSoal, Soal, Verifikasi } from '../db/tipe';
import { HURUF_KANAN, hurufKunci, petaJodoh, teksJodoh } from '../db/tipe';
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
  const [kiri, setKiri] = useState((awal.pasangan?.kiri ?? []).join('\n'));
  const [kanan, setKanan] = useState((awal.pasangan?.kanan ?? []).join('\n'));
  // Verifikasi per_opsi dan pasangan disunting sebagai JSON.
  const [verifikasiJson, setVerifikasiJson] = useState(awal.verifikasi.tipe === 'per_opsi' || awal.verifikasi.tipe === 'pasangan' ? JSON.stringify(awal.verifikasi, null, 1) : '');
  const berOpsi = awal.bentuk === 'pilihan_ganda' || awal.bentuk === 'pilihan_ganda_kompleks';
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
    let v = verifikasi;
    if (verifikasi.tipe === 'per_opsi' || verifikasi.tipe === 'pasangan') {
      try {
        v = JSON.parse(verifikasiJson || '{}');
      } catch {
        setGalat('Verifikasi bukan JSON yang sah.');
        return null;
      }
    }
    setGalat(null);
    const huruf = HURUF.filter((h) => (opsi[h] ?? '').trim());
    return {
      ...awal,
      pokok: pokok.trim(),
      opsi: berOpsi ? Object.fromEntries(huruf.map((h) => [h, opsi[h]!.trim()])) : undefined,
      pasangan: awal.bentuk === 'menjodohkan' ? { kiri: baris(kiri), kanan: baris(kanan) } : undefined,
      kunci: awal.bentuk === 'menjodohkan' ? teksJodoh(petaJodoh(kunci, baris(kiri).length)) : awal.bentuk === 'pilihan_ganda_kompleks' ? hurufKunci(kunci).join(',') : kunci.trim(),
      rubrik: awal.bentuk === 'uraian' ? baris(rubrik) : undefined,
      pembahasan: baris(pembahasan),
      verifikasi: v,
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
        {awal.bentuk === 'menjodohkan' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-kiri">Kolom kiri · satu butir per baris (1, 2, …)</Label>
              <textarea id="s-kiri" className="bidang mt-2" rows={5} value={kiri} onChange={(e) => setKiri(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-kanan">Kolom kanan · satu butir per baris (A, B, …)</Label>
              <textarea id="s-kanan" className="bidang mt-2" rows={5} value={kanan} onChange={(e) => setKanan(e.target.value)} />
            </div>
          </div>
        ) : null}
        {berOpsi ? (
          <div className="space-y-2">
            <Label>Opsi</Label>
            {HURUF.slice(0, Math.max(4, Object.keys(opsi).length)).map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="font-semibold w-4">{h}</span>
                <input className="bidang !min-h-11" aria-label={`Opsi ${h}`} value={opsi[h] ?? ''} onChange={(e) => setOpsi((o) => ({ ...o, [h]: e.target.value }))} />
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <Label htmlFor="s-kunci">Kunci</Label>
          {awal.bentuk === 'pilihan_ganda_kompleks' ? (
            <div id="s-kunci" role="group" aria-label="Kunci" className="mt-2 flex flex-wrap gap-4">
              {HURUF.filter((h) => (opsi[h] ?? '').trim()).map((h) => {
                const dipilih = hurufKunci(kunci);
                return (
                  <label key={h} className="inline-flex min-h-11 items-center gap-2 text-base font-semibold">
                    <input type="checkbox" className="size-5 accent-[var(--gs-main-fill)]" checked={dipilih.includes(h)} onChange={(e) => setKunci((e.target.checked ? [...dipilih, h] : dipilih.filter((x) => x !== h)).sort().join(','))} />
                    {h}
                  </label>
                );
              })}
            </div>
          ) : awal.bentuk === 'menjodohkan' ? (
            <input id="s-kunci" className="bidang mt-2" value={kunci} onChange={(e) => setKunci(e.target.value)} placeholder={`1-${HURUF_KANAN[1]}, 2-${HURUF_KANAN[0]}, …`} />
          ) : awal.bentuk === 'pilihan_ganda' ? (
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
          <summary className="font-semibold cursor-pointer text-redup">Verifikasi hitung{awal.gambar ? ' dan parameter gambar' : ''}</summary>
          <div className="mt-4 space-y-3">
            <select
              className="bidang"
              aria-label="Tipe verifikasi"
              value={verifikasi.tipe}
              onChange={(e) => {
                const t = e.target.value;
                if (t === 'per_opsi' || t === 'pasangan') {
                  const v: Verifikasi = t === 'per_opsi' ? { tipe: 'per_opsi', opsi: Object.fromEntries(HURUF.filter((h) => (opsi[h] ?? '').trim()).map((h) => [h, { kiri: '', relasi: '=', kanan: '' }])) } : { tipe: 'pasangan', kiri: baris(kiri).map(() => ''), kanan: baris(kanan).map(() => '') };
                  setVerifikasi(v);
                  setVerifikasiJson(JSON.stringify(v, null, 1));
                } else setVerifikasi(t === 'ekspresi' ? { tipe: 'ekspresi', ekspresi: '', nilai: '' } : t === 'perbandingan' ? { tipe: 'perbandingan', kiri: '', relasi: '<', kanan: '' } : t === 'urutan' ? { tipe: 'urutan', nilai: [], arah: 'naik' } : { tipe: 'tidak_ada', alasan: 'Ditelaah guru.' });
              }}
            >
              {awal.bentuk === 'menjodohkan' ? null : <option value="ekspresi">Ekspresi = nilai</option>}
              {awal.bentuk === 'pilihan_ganda_kompleks' || awal.bentuk === 'menjodohkan' ? null : (
                <>
                  <option value="perbandingan">Perbandingan</option>
                  <option value="urutan">Urutan</option>
                </>
              )}
              {awal.bentuk === 'pilihan_ganda_kompleks' ? <option value="per_opsi">Pernyataan per opsi</option> : null}
              {awal.bentuk === 'menjodohkan' ? <option value="pasangan">Nilai tiap pasangan</option> : null}
              <option value="tidak_ada">Tidak dapat dihitung (kunci tidak dicek otomatis)</option>
            </select>
            {verifikasi.tipe === 'ekspresi' ? (
              <div className="grid grid-cols-2 gap-3">
                <input className="bidang font-font-semibold" aria-label="Ekspresi" value={verifikasi.ekspresi} onChange={(e) => ubahV({ ekspresi: e.target.value })} placeholder="3/4 + 1/8" />
                <input className="bidang font-font-semibold" aria-label="Nilai" value={verifikasi.nilai} onChange={(e) => ubahV({ nilai: e.target.value })} placeholder="7/8" />
              </div>
            ) : verifikasi.tipe === 'perbandingan' ? (
              <div className="grid grid-cols-3 gap-3">
                <input className="bidang font-font-semibold" aria-label="Kiri" value={verifikasi.kiri} onChange={(e) => ubahV({ kiri: e.target.value })} />
                <select className="bidang" aria-label="Relasi" value={verifikasi.relasi} onChange={(e) => ubahV({ relasi: e.target.value })}>
                  {['=', '<', '>', '<=', '>=', '!='].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input className="bidang font-font-semibold" aria-label="Kanan" value={verifikasi.kanan} onChange={(e) => ubahV({ kanan: e.target.value })} />
              </div>
            ) : verifikasi.tipe === 'urutan' ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input className="bidang font-font-semibold" aria-label="Nilai urutan" value={verifikasi.nilai.join('; ')} onChange={(e) => setVerifikasi({ ...verifikasi, nilai: e.target.value.split(';').map((x) => x.trim()).filter(Boolean) })} placeholder="2/3; 3/4; 5/6" />
                <select className="bidang" aria-label="Arah" value={verifikasi.arah} onChange={(e) => setVerifikasi({ ...verifikasi, arah: e.target.value as 'naik' | 'turun' })}>
                  <option value="naik">naik</option>
                  <option value="turun">turun</option>
                </select>
              </div>
            ) : verifikasi.tipe === 'per_opsi' || verifikasi.tipe === 'pasangan' ? (
              <textarea className="bidang font-semibold text-base" aria-label="Verifikasi (JSON)" rows={6} value={verifikasiJson} onChange={(e) => setVerifikasiJson(e.target.value)} />
            ) : null}
            <p className="text-base text-redup">Sintaks mathjs: titik desimal, pecahan a/b. Bila soal memakai gambar, ekspresi boleh memakai variabel gambar.</p>
            {awal.gambar ? (
              <>
                <Label htmlFor="s-gambar">Parameter gambar ({awal.gambar.templat})</Label>
                <textarea id="s-gambar" className="bidang font-font-semibold text-base" rows={5} value={gambar} onChange={(e) => setGambar(e.target.value)} />
              </>
            ) : null}
          </div>
        </details>
        {galat ? <Peringatan>{galat}</Peringatan> : null}
        {hasil ? (
          hasil.lolos ? (
            <div className="border border-utama px-5 py-4 text-base">
              Lolos pemeriksaan · {hasil.status_mutu === 'perlu_telaah' ? 'kunci tidak dicek otomatis' : 'kunci sudah dihitung ulang'}
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
              <span className="mt-2 block">Perbaiki kunci atau, bila soal memang tidak dapat dihitung, ubah verifikasi menjadi "tidak dapat dihitung" agar soal Anda cek sendiri.</span>
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
        <div className="text-base font-bold text-redup">Pratinjau</div>
        {pratinjau ? <TampilSoal isi={pratinjau} besar={false} /> : null}
      </div>
    </div>
  );
}
