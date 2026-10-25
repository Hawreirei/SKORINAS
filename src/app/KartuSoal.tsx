import type { JenisUraian, Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL, jenisUraian, penandaSoal } from '../db/tipe';
import { aturJenisUraian, aturKunci, batalSetujui, hapusSoal, setujui } from '../generasi/operasi';
import { Kartu, LencanaPenanda } from '../komponen/Status';
import { MenuLainnya } from '../komponen/MenuLainnya';
import { PembahasanSoal, TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';

export type AksiKartu = 'sunting' | 'ganti' | 'buat_ulang';

const PITA = { dicek: 'utama', cek_dulu: 'awas', disetujui: 'baik', ditolak: 'tanpa' } as const;

/** Satu soal di layar Periksa: satu penanda, Setujui dan Sunting terlihat, aksi lain di menu Lainnya. */
export function KartuSoal({ soal, nomor, risikoTinggi, aksi }: { soal: Soal; nomor: number; risikoTinggi: boolean; aksi: (a: AksiKartu) => void }) {
  const penanda = penandaSoal(soal);
  const terkunci = soal.terkunci;
  const jenis = soal.bentuk === 'uraian' ? jenisUraian(soal.isi_json) : null;
  const perluDicek = penanda === 'cek_dulu';
  return (
    <Kartu as="article" pita={PITA[penanda]} id={`soal-${soal.id}`} aria-labelledby={`nomor-${soal.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <span id={`nomor-${soal.id}`} className="text-[22px] font-extrabold text-judul">
            {nomor}.
          </span>
          <span className="text-base font-semibold text-redup">
            {BENTUK_LABEL[soal.bentuk]} · {KESUKARAN_LABEL[soal.kesukaran_rancangan]}
          </span>
        </div>
        <LencanaPenanda penanda={penanda} />
      </div>
      <TampilSoal isi={soal.isi_json} tanpaPembahasan />
      {perluDicek ? (
        <div className="mt-5 rounded-lg border border-awas/30 bg-awas-latar px-4 py-3 text-base leading-normal text-awas">
          {soal.bentuk === 'uraian' ? 'Jawaban soal uraian tidak dapat dicek otomatis.' : 'Kunci soal ini tidak dapat dicek otomatis.'} Baca kunci{soal.bentuk === 'uraian' ? ' dan rubrik' : ''}, lalu tekan Setujui.
          {risikoTinggi ? ' Periksa juga kutipan sumber di pembahasan.' : ''}
        </div>
      ) : null}
      <details className="group mt-4" open={perluDicek}>
        <summary className="cursor-pointer text-base font-bold text-utama">
          {soal.isi_json.rubrik?.length ? 'Rubrik dan pembahasan' : 'Pembahasan'}
          {soal.catatan_mutu.length ? ' · catatan pemeriksaan' : ''}
        </summary>
        <PembahasanSoal isi={soal.isi_json} />
        {soal.catatan_mutu.length ? (
          <div className="mt-4">
            <div className="text-base font-bold text-redup">Catatan pemeriksaan</div>
            <ul className="mt-2 list-disc pl-5 text-base leading-relaxed text-redup">
              {soal.catatan_mutu.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </details>
      {jenis ? (
        <fieldset className="mt-4">
          <legend className="text-base font-bold">Tempat jawaban di berkas</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['penjelasan', 'Penjelasan (garis tulis)'],
                ['hitungan', 'Hitungan (kotak cara dan jawaban akhir)'],
              ] as [JenisUraian, string][]
            ).map(([v, l]) => (
              <label key={v} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-base font-semibold ${jenis === v ? 'border-utama bg-utama-lembut text-utama-tua dark:text-di-tinta' : 'border-garis-kuat'}`}>
                <input type="radio" name={`jenis-${soal.id}`} className="size-4" checked={jenis === v} onChange={() => aturJenisUraian(soal.id, v)} disabled={terkunci} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-garis pt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {penanda === 'disetujui' ? (
          <Tombol varian="hantu" className="!px-3 sm:!px-5" onClick={() => batalSetujui(soal.id)} aria-label="Batalkan persetujuan">
            <span className="sm:hidden">Batalkan</span>
            <span className="hidden sm:inline">Batalkan persetujuan</span>
          </Tombol>
        ) : (
          <Tombol
            varian="garis"
            className="!px-3 sm:!px-5"
            onClick={() => {
              if (perluDicek && risikoTinggi && !confirm('Anda sudah memeriksa kunci dan kutipan sumber di pembahasan?')) return;
              void setujui(soal.id, risikoTinggi);
            }}
          >
            Setujui
          </Tombol>
        )}
        <Tombol varian="hantu" className="!px-3 sm:!px-5" onClick={() => aksi('sunting')} disabled={terkunci}>
          Sunting
        </Tombol>
        {terkunci ? (
          <Tombol varian="hantu" className="!px-3 sm:!px-5" onClick={() => aturKunci(soal.id, false)}>
            Buka kunci
          </Tombol>
        ) : (
          <MenuLainnya
            butir={[
              { label: 'Ganti soal', onClick: () => aksi('ganti') },
              { label: 'Buat ulang dengan catatan', onClick: () => aksi('buat_ulang') },
              {
                label: 'Hapus soal',
                bahaya: true,
                onClick: () => {
                  if (confirm('Pindahkan soal ini ke tong sampah? Dapat dipulihkan selama 30 hari.')) void hapusSoal(soal.id);
                },
              },
            ]}
          />
        )}
      </div>
    </Kartu>
  );
}
