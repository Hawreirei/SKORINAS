import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { adaptorUntuk } from '../ai';
import { GalatAi } from '../ai/galat';
import { gabungModel, penyediaDari } from '../ai/registri';
import type { StatusModel } from '../ai/tipe';
import { db } from '../db/skema';
import { simpanProfil } from '../db/profil';
import type { PenyediaId } from '../db/tipe';
import { tanggalLokal } from '../db/util';
import { PanelBantuan } from '../komponen/Bantuan';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Kotak, Label, Peringatan, Titik } from '../komponen/Status';
import { Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { formatBiaya } from './ringkas';

const LABEL_STATUS: Record<StatusModel, string> = { direkomendasikan: 'Direkomendasikan', stabil: 'Stabil', pratinjau: 'Pratinjau', usang: 'Usang' };

export default function PengaturanAi() {
  useJudulHalaman('Pengaturan AI');
  const { data: reg, galat: galatReg } = useRegistri();
  const profil = useProfil();
  const pesan = usePesan();
  const daftarKunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const pemakaian = useLiveQuery(() => db.pemakaian_ai.where('tanggal').equals(tanggalLokal()).toArray(), []);
  const [pilih, setPilih] = useState<PenyediaId>('gemini');
  const [teksKunci, setTeksKunci] = useState('');
  const [lihat, setLihat] = useState(false);
  const [menguji, setMenguji] = useState(false);
  const kunci = daftarKunci?.find((k) => k.penyedia === pilih);

  useEffect(() => {
    if (profil.penyedia_utama) setPilih(profil.penyedia_utama);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil.penyedia_utama === null]);
  useEffect(() => {
    setTeksKunci(kunci?.kunci ?? '');
    setLihat(false);
  }, [pilih, kunci?.kunci]);

  if (galatReg) return <div className="px-4 py-20 sm:px-16">Registri model tidak dapat dimuat: {galatReg}</div>;
  if (!reg) return <div className="mono px-16 py-20 text-redup">Memuat…</div>;
  const p = penyediaDari(reg, pilih)!;
  const baris = gabungModel(p, kunci?.status === 'berfungsi' ? kunci.model_tersedia.map((id) => ({ id, nama: id })) : null);

  async function simpanDanUji() {
    const k = teksKunci.trim();
    if (!k) return;
    setMenguji(true);
    await db.kunci_api.put({ penyedia: pilih, kunci: k, diuji_pada: null, status: 'belum', pesan: '', model_tersedia: [] });
    try {
      const model = await adaptorUntuk(pilih).daftarModel(k);
      await db.kunci_api.put({ penyedia: pilih, kunci: k, diuji_pada: Date.now(), status: 'berfungsi', pesan: `Kunci berfungsi · ${model.length} model tersedia`, model_tersedia: model.map((m) => m.id) });
      if (!profil.penyedia_utama || !profil.model_utama) {
        const saran = gabungModel(p, model).find((m) => m.tersedia && m.registri);
        if (saran) await simpanProfil({ penyedia_utama: pilih, model_utama: saran.id });
      }
      pesan('Kunci berfungsi.');
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      await db.kunci_api.put({ penyedia: pilih, kunci: k, diuji_pada: Date.now(), status: 'gagal', pesan: g.message, model_tersedia: [] });
    } finally {
      setMenguji(false);
    }
  }

  async function hapusKunci() {
    if (!confirm(`Hapus kunci ${p.nama} dari perangkat ini?`)) return;
    await db.kunci_api.delete(pilih);
    if (profil.penyedia_utama === pilih) await simpanProfil({ penyedia_utama: null, model_utama: null });
    if (profil.penyedia_cadangan === pilih) await simpanProfil({ penyedia_cadangan: null, model_cadangan: null });
  }

  const lolosHariIni = pemakaian?.filter((x) => x.lolos).length ?? 0;
  const biayaHariIni = (pemakaian ?? []).reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
  const lewatBatasBiaya = biayaHariIni !== null && biayaHariIni > profil.batas_biaya_usd;

  return (
    <div className="mx-auto max-w-[1312px] px-4 pb-20 pt-10 sm:px-8 lg:px-16 lg:pt-14">
      <KepalaHalaman label="Pengaturan · AI" judul="Kunci dan model">
        GenSoal memakai kunci API milik Anda. Kunci hanya disimpan di peramban ini dan tidak ikut berkas cadangan. Beberapa penyedia menyediakan tingkat gratis.
      </KepalaHalaman>

      <div className="mt-12 flex flex-wrap border-t border-tinta">
        <nav aria-label="Penyedia" className="w-full border-garis lg:w-[280px] lg:border-r">
          <div className="mono border-b border-garis p-4 text-redup">Penyedia</div>
          {reg.penyedia.map((x) => {
            const k = daftarKunci?.find((y) => y.penyedia === x.id);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setPilih(x.id)}
                aria-current={pilih === x.id}
                className={`flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-garis px-4 text-left text-base hover:bg-lembut ${pilih === x.id ? 'bg-lembut' : ''}`}
              >
                <span className="flex items-center gap-2.5">
                  {x.nama}
                  {k?.status === 'berfungsi' ? <span className="mono text-redup">· kunci</span> : null}
                </span>
                <span className={`mono inline-flex items-center gap-2 ${x.tingkat_gratis ? '' : 'text-redup'}`}>
                  <Titik isi={x.tingkat_gratis} />
                  {x.tingkat_gratis ? 'Gratis' : 'Berbayar'}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-[999_1_560px] pt-8 lg:pl-12">
          <h2 className="text-[28px] font-light">{p.nama}</h2>
          <div className="mt-7">
            <Label htmlFor="kunci">Kunci API</Label>
            <div className="mt-2.5 flex flex-wrap gap-3">
              <input
                id="kunci"
                type={lihat ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                value={teksKunci}
                onChange={(e) => setTeksKunci(e.target.value)}
                placeholder={p.awalan_kunci ? `${p.awalan_kunci}…` : 'Tempel kunci di sini'}
                className="min-h-[52px] flex-[1_1_320px] rounded-[2px] border border-tinta bg-latar px-4 font-mono text-sm text-tinta"
              />
              <Tombol varian="hantu" onClick={() => setLihat((l) => !l)} aria-pressed={lihat}>
                {lihat ? 'Sembunyikan' : 'Lihat'}
              </Tombol>
              <Tombol onClick={simpanDanUji} disabled={menguji || !teksKunci.trim()} className="min-h-[52px] px-7">
                {menguji ? 'Menguji…' : 'Uji kunci'}
              </Tombol>
            </div>
            {kunci ? (
              <div className={`mono mt-3 flex flex-wrap items-center gap-2 ${kunci.status === 'gagal' ? 'text-buruk' : ''}`}>
                <Titik isi={kunci.status === 'berfungsi'} />
                <span className="normal-case tracking-normal">{kunci.status === 'belum' ? 'Belum diuji' : kunci.pesan}</span>
                <button type="button" className="ml-auto text-redup hover:text-buruk" onClick={hapusKunci}>
                  Hapus kunci
                </button>
              </div>
            ) : null}
            <p className="mt-3 text-sm text-redup">
              Buat kunci di{' '}
              <a href={p.situs_kunci} target="_blank" rel="noreferrer noopener" className="underline">
                {new URL(p.situs_kunci).host}
              </a>
              . Sebaiknya buat kunci khusus GenSoal dengan batas pengeluaran.
            </p>
          </div>

          <div className="mt-10">
            <div className="mono pb-3 text-redup">Model</div>
            <div className="border-t border-tinta">
              {baris.length === 0 ? <p className="py-5 text-isi">Tidak ada model.</p> : null}
              {baris.map((m) => {
                const utama = profil.penyedia_utama === pilih && profil.model_utama === m.id;
                const cadangan = profil.penyedia_cadangan === pilih && profil.model_cadangan === m.id;
                const bisa = kunci?.status === 'berfungsi' && m.tersedia !== false;
                return (
                  <div key={m.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 border-b border-garis px-2 py-4 sm:grid-cols-[minmax(0,1.4fr)_auto_auto] ${utama ? 'bg-lembut' : ''}`}>
                    <div className="min-w-0">
                      <div className={`text-lg ${utama ? 'font-normal' : 'font-light'}`}>{m.label}</div>
                      <div className="mono mt-1.5 break-all text-redup">
                        {utama ? 'Model utama · ' : cadangan ? 'Model cadangan · ' : ''}
                        {m.registri?.catatan ? `${m.registri.catatan} · ` : ''}
                        {m.id}
                        {m.tersedia === false ? ' · tidak tersedia untuk kunci ini' : ''}
                      </div>
                    </div>
                    <span className={`mono inline-flex items-center gap-2 ${m.status === 'pratinjau' ? 'text-redup' : ''}`}>
                      <Titik isi={m.status === 'direkomendasikan' || m.status === 'stabil'} />
                      {LABEL_STATUS[m.status]}
                    </span>
                    <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:justify-end">
                      <span className="mono text-redup">Golden set: {m.registri?.golden.status === 'lolos' ? 'lolos' : m.registri?.golden.status === 'gagal' ? 'gagal' : 'belum'}</span>
                      <Tombol ukuran="kecil" varian={utama ? 'utama' : 'hantu'} disabled={!bisa} onClick={() => simpanProfil({ penyedia_utama: pilih, model_utama: m.id })}>
                        Utama
                      </Tombol>
                      <Tombol ukuran="kecil" varian={cadangan ? 'utama' : 'hantu'} disabled={!bisa} onClick={() => simpanProfil({ penyedia_cadangan: pilih, model_cadangan: m.id })}>
                        Cadangan
                      </Tombol>
                    </div>
                  </div>
                );
              })}
            </div>
            {baris.some((m) => m.status === 'pratinjau') ? <p className="mt-3 text-sm text-redup">Model pratinjau belum diuji dengan golden set; mutu soal dapat lebih rendah. Semua soal tetap melewati verifikasi.</p> : null}
            <p className="mt-3 text-sm text-redup">Registri diperiksa {reg.diperiksa_pada}. {reg.catatan}</p>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            <Kotak>
              <div className="mono text-redup">Biaya</div>
              <p className="mt-2.5">{p.peringatan_biaya}</p>
            </Kotak>
            <Kotak>
              <div className="mono text-redup">Privasi</div>
              <p className="mt-2.5">{p.peringatan_privasi}</p>
            </Kotak>
          </div>

          <div className="mt-12 border-t border-garis pt-8">
            <h2 className="text-xl font-light">Batas dan pemakaian</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="batas">Batas harian soal lolos</Label>
                <input id="batas" type="number" min={1} max={5000} className="bidang mt-2" value={profil.batas_harian} onChange={(e) => simpanProfil({ batas_harian: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div>
                <Label htmlFor="biaya">Peringatan biaya harian (US$)</Label>
                <input id="biaya" type="number" min={0} step={0.1} className="bidang mt-2" value={profil.batas_biaya_usd} onChange={(e) => simpanProfil({ batas_biaya_usd: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </div>
            <p className="mono mt-4 text-redup">
              Hari ini: {lolosHariIni} soal lolos · {(pemakaian ?? []).length} permintaan · {formatBiaya(biayaHariIni)}
            </p>
            {lewatBatasBiaya ? <Peringatan className="mt-3">Perkiraan biaya hari ini melewati batas peringatan yang Anda atur.</Peringatan> : null}
            <p className="mt-3 text-sm text-redup">Hanya soal yang lolos verifikasi yang mengurangi batas harian. Biaya dihitung dari token dan harga registri; harga yang belum diverifikasi ditampilkan sebagai "belum diketahui".</p>
          </div>
        </div>

        <aside aria-label="Bantuan" className="w-full border-garis pt-10 lg:w-[320px] lg:border-l lg:pl-10 lg:pt-8">
          <PanelBantuan id="kunci-api" />
        </aside>
      </div>
    </div>
  );
}
