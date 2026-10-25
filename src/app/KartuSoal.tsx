import type { JenisUraian, Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL, jenisUraian } from '../db/tipe';
import { aturJenisUraian, aturKunci, hapusSoal } from '../generasi/operasi';
import { Kartu } from '../komponen/Status';
import { MenuLainnya } from '../komponen/MenuLainnya';
import { PembahasanSoal, TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';

export type AksiKartu = 'sunting' | 'ganti' | 'buat_ulang';

/**
 * Satu soal di halaman paket. Tanpa penanda status dan tanpa langkah persetujuan (rancangan v0.5);
 * soal yang kuncinya tidak dapat dicek otomatis hanya diberi satu kalimat keterangan.
 */
export function KartuSoal({ soal, nomor, risikoTinggi, aksi }: { soal: Soal; nomor: number; risikoTinggi: boolean; aksi: (a: AksiKartu) => void }) {
  const terkunci = soal.terkunci;
  const jenis = soal.bentuk === 'uraian' ? jenisUraian(soal.isi_json) : null;
  const tanpaCek = soal.status_mutu === 'perlu_telaah';
  return (
    <Kartu as="article" pita={tanpaCek ? 'awas' : 'utama'} id={`soal-${soal.id}`} aria-labelledby={`nomor-${soal.id}`}>
      <div className="flex min-w-0 items-baseline gap-3">
        <span id={`nomor-${soal.id}`} className="text-[22px] font-extrabold text-judul">
          {nomor}.
        </span>
        <span className="text-base font-semibold text-redup">
          {BENTUK_LABEL[soal.bentuk]} · {KESUKARAN_LABEL[soal.kesukaran_rancangan]}
        </span>
      </div>
      <TampilSoal isi={soal.isi_json} tanpaPembahasan />
      {tanpaCek ? (
        <p className="mt-4 flex items-start gap-2 text-base leading-normal text-awas">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0">
            <path d="M8 1.5l6.5 12h-13z" />
            <path d="M8 6.5v3M8 11.6v.2" />
          </svg>
          <span>
            Kunci tidak dicek otomatis. Baca sekali sebelum dipakai.
            {risikoTinggi ? ' Periksa juga kutipan sumber di pembahasan.' : ''}
          </span>
        </p>
      ) : null}
      <details className="group mt-4" open={tanpaCek}>
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
      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-garis pt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
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
