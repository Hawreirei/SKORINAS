import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { adaptorUntuk } from '../ai';
import { batasEfektif, kunciModel, permintaanHariIni } from '../ai/laju';
import { GalatAi } from '../ai/galat';
import { gabungModel, penyediaDari, type BarisModel } from '../ai/registri';
import type { PenyediaRegistri, StatusModel } from '../ai/tipe';
import { db } from '../db/skema';
import { simpanProfil } from '../db/profil';
import type { KunciApi, PenyediaId } from '../db/tipe';
import { tanggalLokal } from '../db/util';
import { BANTUAN } from '../bantuan/daftar';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Label, Peringatan, Titik } from '../komponen/Status';
import { Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil, useRegistri } from './kait';
import { formatBiaya } from './ringkas';

const LABEL_STATUS: Record<StatusModel, string> = { direkomendasikan: 'direkomendasikan', stabil: 'stabil', pratinjau: 'pratinjau', usang: 'usang' };

function modelTersedia(p: PenyediaRegistri, k: KunciApi | undefined): BarisModel[] {
  if (k?.status !== 'berfungsi') return [];
  return gabungModel(p, k.model_tersedia.map((id) => ({ id, nama: id }))).filter((m) => m.tersedia);
}

function Langkah({ nomor, judul, children, redup = false }: { nomor: string; judul: string; children: React.ReactNode; redup?: boolean }) {
  return (
    <section className={`border-t border-garis py-8 ${redup ? 'opacity-50' : ''}`}>
      <div className="flex items-baseline gap-4">
        <span className="mono text-redup">{nomor}</span>
        <h2 className="text-xl font-normal">{judul}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function PengaturanAi() {
  useJudulHalaman('Pengaturan AI');
  const { data: reg, galat: galatReg } = useRegistri();
  const profil = useProfil();
  const pesan = usePesan();
  const daftarKunci = useLiveQuery(() => db.kunci_api.toArray(), []);
  const pemakaian = useLiveQuery(() => db.pemakaian_ai.where('tanggal').equals(tanggalLokal()).toArray(), []);
  const [pilih, setPilih] = useState<PenyediaId | null>(null);
  const [teksKunci, setTeksKunci] = useState('');
  const [lihat, setLihat] = useState(false);
  const [menguji, setMenguji] = useState(false);
  const aktif: PenyediaId = pilih ?? profil.penyedia_utama ?? 'gemini';
  const kunci = daftarKunci?.find((k) => k.penyedia === aktif);
  const modelDipilih = profil.penyedia_utama === aktif ? profil.model_utama ?? '' : '';
  const terpakaiHariIni = useLiveQuery(() => (modelDipilih ? permintaanHariIni(aktif, modelDipilih) : Promise.resolve(0)), [aktif, modelDipilih]);

  useEffect(() => {
    setTeksKunci(kunci?.kunci ?? '');
    setLihat(false);
  }, [aktif, kunci?.kunci]);

  if (galatReg) return <div className="px-4 py-20 sm:px-16">Registri model tidak dapat dimuat: {galatReg}</div>;
  if (!reg) return <div className="mono px-16 py-20 text-redup">Memuat…</div>;

  const p = penyediaDari(reg, aktif)!;
  const tersedia = modelTersedia(p, kunci);
  const siap = !!(profil.penyedia_utama && profil.model_utama && daftarKunci?.some((k) => k.penyedia === profil.penyedia_utama && k.status === 'berfungsi'));
  const namaUtama = profil.penyedia_utama ? penyediaDari(reg, profil.penyedia_utama) : undefined;
  const labelUtama = namaUtama?.model.find((m) => m.id === profil.model_utama)?.label ?? profil.model_utama;
  const batas = modelDipilih ? batasEfektif(profil, reg, aktif, modelDipilih) : null;
  const ubahBatas = (u: Partial<{ rpm: number | null; rpd: number | null }>) => {
    if (!modelDipilih || !batas) return;
    void simpanProfil({ batas_model: { ...profil.batas_model, [kunciModel(aktif, modelDipilih)]: { ...batas, ...u } } });
  };
  const angkaAtauKosong = (v: string) => (v.trim() === '' ? null : Math.max(1, Math.round(Number(v)) || 1));

  // Model cadangan boleh dari penyedia mana pun yang kuncinya berfungsi.
  const pilihanCadangan = reg.penyedia.flatMap((x) => modelTersedia(x, daftarKunci?.find((k) => k.penyedia === x.id)).map((m) => ({ penyedia: x, m })));

  async function simpanDanUji() {
    const k = teksKunci.trim();
    if (!k) return;
    setMenguji(true);
    await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: null, status: 'belum', pesan: '', model_tersedia: [] });
    try {
      const model = await adaptorUntuk(aktif).daftarModel(k);
      await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: Date.now(), status: 'berfungsi', pesan: `Kunci berfungsi · ${model.length} model tersedia`, model_tersedia: model.map((m) => m.id) });
      // Pilih model terbaik secara otomatis bila belum ada model utama di penyedia ini.
      if (profil.penyedia_utama !== aktif || !profil.model_utama) {
        const saran = gabungModel(p, model).find((m) => m.tersedia && m.registri);
        if (saran) await simpanProfil({ penyedia_utama: aktif, model_utama: saran.id });
      }
      pesan('Kunci berfungsi. GenSoal siap dipakai.');
    } catch (e) {
      const g = e instanceof GalatAi ? e : new GalatAi('lain', (e as Error).message);
      await db.kunci_api.put({ penyedia: aktif, kunci: k, diuji_pada: Date.now(), status: 'gagal', pesan: g.message, model_tersedia: [] });
    } finally {
      setMenguji(false);
    }
  }

  async function hapusKunci() {
    if (!confirm(`Hapus kunci ${p.nama} dari perangkat ini?`)) return;
    await db.kunci_api.delete(aktif);
    if (profil.penyedia_utama === aktif) await simpanProfil({ penyedia_utama: null, model_utama: null });
    if (profil.penyedia_cadangan === aktif) await simpanProfil({ penyedia_cadangan: null, model_cadangan: null });
  }

  const lolosHariIni = pemakaian?.filter((x) => x.lolos).length ?? 0;
  const biayaHariIni = (pemakaian ?? []).reduce<number | null>((a, x) => (a === null || x.perkiraan_biaya === null ? null : a + x.perkiraan_biaya), 0);
  const lewatBatasBiaya = biayaHariIni !== null && biayaHariIni > profil.batas_biaya_usd;

  return (
    <div className="mx-auto max-w-[880px] px-4 pb-24 pt-10 sm:px-8 lg:pt-14">
      <KepalaHalaman label="Pengaturan · AI" judul="Kunci AI">
        Tempel kunci API dari satu penyedia AI, lalu GenSoal siap membuat soal. Kunci hanya tersimpan di peramban ini dan tidak ikut berkas cadangan.
      </KepalaHalaman>

      <div className={`mt-8 flex items-start gap-3 border px-5 py-4 ${siap ? 'border-tinta' : 'border-garis-kuat bg-panel'}`} role="status">
        <Titik isi={siap} className="mt-2" />
        <span className="min-w-0 flex-1 text-[16px]">
          {siap ? (
            <>
              Siap dipakai · <strong className="font-medium">{namaUtama?.nama}</strong> · {labelUtama}
            </>
          ) : (
            'Belum siap. Ikuti tiga langkah di bawah.'
          )}
        </span>
      </div>

      <div className="mt-8">
        <Langkah nomor="01" judul="Pilih penyedia">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reg.penyedia.map((x) => {
              const k = daftarKunci?.find((y) => y.penyedia === x.id);
              const dipilih = aktif === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setPilih(x.id)}
                  aria-pressed={dipilih}
                  className={`flex min-h-[72px] flex-col items-start justify-center gap-1.5 rounded-[2px] border px-4 py-3 text-left transition-colors ${dipilih ? 'border-tinta bg-tinta text-di-tinta' : 'border-garis-kuat hover:border-tinta'}`}
                >
                  <span className="text-[16px]">{x.nama}</span>
                  <span className={`mono ${dipilih ? 'opacity-80' : 'text-redup'}`}>
                    {x.tingkat_gratis ? 'Gratis' : 'Berbayar'}
                    {k?.status === 'berfungsi' ? ' · kunci ✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-redup">Baru mulai? Google Gemini gratis tanpa kartu kredit.</p>
        </Langkah>

        <Langkah nomor="02" judul={`Tempel kunci ${p.nama}`}>
          <p className="text-[15px] text-isi">
            Belum punya kunci? Buat di{' '}
            <a href={p.situs_kunci} target="_blank" rel="noreferrer noopener" className="underline">
              {new URL(p.situs_kunci).host}
            </a>
            , salin, lalu tempel di sini.
          </p>
          <Label htmlFor="kunci" className="mt-5">
            Kunci API
          </Label>
          <div className="relative mt-2">
            <input
              id="kunci"
              type={lihat ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={teksKunci}
              onChange={(e) => setTeksKunci(e.target.value)}
              placeholder={p.awalan_kunci ? `${p.awalan_kunci}…` : 'Tempel kunci di sini'}
              className="min-h-[52px] w-full rounded-[2px] border border-tinta bg-latar py-0 pl-4 pr-24 font-mono text-sm text-tinta"
            />
            <button type="button" onClick={() => setLihat((l) => !l)} aria-pressed={lihat} className="mono absolute inset-y-0 right-0 px-4 text-redup hover:text-tinta">
              {lihat ? 'Sembunyi' : 'Lihat'}
            </button>
          </div>
          <Tombol onClick={simpanDanUji} disabled={menguji || !teksKunci.trim()} ukuran="besar" className="mt-4 w-full sm:w-auto">
            {menguji ? 'Menguji…' : 'Simpan dan uji'}
          </Tombol>
          {kunci && kunci.status !== 'belum' ? (
            <div className={`mt-4 flex items-start gap-2 text-[15px] ${kunci.status === 'gagal' ? 'text-buruk' : ''}`}>
              <Titik isi={kunci.status === 'berfungsi'} className="mt-2" />
              <span>{kunci.status === 'berfungsi' ? 'Kunci berfungsi.' : kunci.pesan}</span>
            </div>
          ) : null}
          <details className="mt-5 border border-garis px-5 py-4">
            <summary className="cursor-pointer text-[15px]">Cara mendapatkan kunci</summary>
            <ol className="mt-3 list-decimal pl-5 text-[15px] leading-[1.7] text-isi">
              {BANTUAN['kunci-api'].langkah.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ol>
          </details>
        </Langkah>

        <Langkah nomor="03" judul="Pilih model" redup={!tersedia.length}>
          {tersedia.length ? (
            <>
              <Label htmlFor="model-utama">Model yang dipakai</Label>
              <select id="model-utama" className="bidang mt-2" value={modelDipilih} onChange={(e) => simpanProfil({ penyedia_utama: aktif, model_utama: e.target.value })}>
                {!modelDipilih ? <option value="">Pilih model…</option> : null}
                {tersedia.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.status !== 'stabil' ? ` (${LABEL_STATUS[m.status]})` : ''}
                    {m.registri?.catatan ? ` · ${m.registri.catatan}` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-sm text-redup">Pilihan pertama biasanya sudah tepat. Setiap soal tetap dihitung ulang oleh GenSoal, model mana pun yang dipakai.</p>
              {batas ? (
                <div className="mt-6 border border-garis px-5 py-4">
                  <div className="text-[15px]">Batas pemakaian model ini</div>
                  <p className="mt-1 text-sm text-redup">
                    Samakan dengan angka di dasbor penyedia{aktif === 'gemini' ? ' (aistudio.google.com → Usage and billing)' : ''}. GenSoal memberi jeda antar permintaan agar tidak melewatinya. Kosongkan bila tidak dibatasi.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rpm">Per menit (RPM)</Label>
                      <input id="rpm" type="number" min={1} className="bidang mt-2" value={batas.rpm ?? ''} placeholder="tanpa batas" onChange={(e) => ubahBatas({ rpm: angkaAtauKosong(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="rpd">Per hari (RPD)</Label>
                      <input id="rpd" type="number" min={1} className="bidang mt-2" value={batas.rpd ?? ''} placeholder="tanpa batas" onChange={(e) => ubahBatas({ rpd: angkaAtauKosong(e.target.value) })} />
                    </div>
                  </div>
                  <p className="mono mt-3 text-redup">
                    Terpakai hari ini: {terpakaiHariIni ?? 0}
                    {batas.rpd ? ` dari ${batas.rpd} permintaan` : ' permintaan'}
                    {batas.rpm ? ` · paling banyak ${batas.rpm} permintaan tiap 60 detik` : ''}
                  </p>
                </div>
              ) : null}
              <div className="mt-6">
                <Label htmlFor="model-cadangan">Model cadangan (opsional)</Label>
                <select
                  id="model-cadangan"
                  className="bidang mt-2"
                  value={profil.penyedia_cadangan && profil.model_cadangan ? `${profil.penyedia_cadangan}|${profil.model_cadangan}` : ''}
                  onChange={(e) => {
                    const [penyedia, ...model] = e.target.value.split('|');
                    void simpanProfil(e.target.value ? { penyedia_cadangan: penyedia as PenyediaId, model_cadangan: model.join('|') } : { penyedia_cadangan: null, model_cadangan: null });
                  }}
                >
                  <option value="">Tidak ada</option>
                  {pilihanCadangan.map(({ penyedia, m }) => (
                    <option key={`${penyedia.id}|${m.id}`} value={`${penyedia.id}|${m.id}`}>
                      {penyedia.nama} · {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm text-redup">
                  Dipakai otomatis bila kuota harian model utama habis di tengah pembuatan. Paling aman memilih penyedia lain, mis. Groq atau OpenRouter yang juga gratis.
                </p>
              </div>
            </>
          ) : (
            <p className="text-[15px] text-isi">Model muncul setelah kunci berfungsi.</p>
          )}
          <div className="mt-6 border border-garis bg-panel px-5 py-4 text-sm leading-relaxed text-isi">
            <p>
              <span className="mono text-redup">Biaya · </span>
              {p.peringatan_biaya}
            </p>
            <p className="mt-2">
              <span className="mono text-redup">Privasi · </span>
              {p.peringatan_privasi}
            </p>
          </div>
        </Langkah>

        <details className="border-y border-garis py-5">
          <summary className="cursor-pointer text-[17px]">Pengaturan lanjutan</summary>
          <div className="mt-6 space-y-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="batas">Batas harian soal</Label>
                <input id="batas" type="number" min={1} max={5000} className="bidang mt-2" value={profil.batas_harian} onChange={(e) => simpanProfil({ batas_harian: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div>
                <Label htmlFor="biaya">Peringatan biaya harian (US$)</Label>
                <input id="biaya" type="number" min={0} step={0.1} className="bidang mt-2" value={profil.batas_biaya_usd} onChange={(e) => simpanProfil({ batas_biaya_usd: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
            </div>
            <div>
              <p className="mono text-redup">
                Hari ini: {lolosHariIni} soal lolos · {(pemakaian ?? []).length} permintaan · {formatBiaya(biayaHariIni)}
              </p>
              {lewatBatasBiaya ? <Peringatan className="mt-3">Perkiraan biaya hari ini melewati batas peringatan yang Anda atur.</Peringatan> : null}
              <p className="mt-2 text-sm text-redup">Hanya soal yang lolos verifikasi yang mengurangi batas harian.</p>
            </div>

            <div>
              <div className="mono text-redup">Semua model {p.nama}</div>
              <ul className="mt-3 border-t border-garis text-[15px]">
                {gabungModel(p, kunci?.status === 'berfungsi' ? kunci.model_tersedia.map((id) => ({ id, nama: id })) : null).map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-garis py-3">
                    <span className={m.tersedia === false ? 'text-redup' : ''}>{m.label}</span>
                    <span className="mono text-redup">
                      {LABEL_STATUS[m.status]} · golden set {m.registri?.golden.status ?? 'belum'}
                      {m.tersedia === false ? ' · tidak tersedia' : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-redup">Registri diperiksa {reg.diperiksa_pada}. Lencana "direkomendasikan" hanya diberikan setelah model lolos golden set.</p>
            </div>

            {kunci ? (
              <button type="button" className="mono text-redup hover:text-buruk" onClick={hapusKunci}>
                Hapus kunci {p.nama} dari perangkat ini
              </button>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}
