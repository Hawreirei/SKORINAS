import type { JenisUraian, Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL, jenisUraian, penandaSoal } from '../db/tipe';
import { aturJenisUraian, aturKunci, batalSetujui, hapusSoal, setujui } from '../generasi/operasi';
import { Kartu, LencanaPenanda } from '../komponen/Status';
import { TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';

export type AksiKartu = 'sunting' | 'ganti' | 'buat_ulang';

const PITA = { dicek: 'utama', cek_dulu: 'awas', disetujui: 'baik', ditolak: 'tanpa' } as const;

/** Satu soal di layar Periksa: satu penanda, satu tombol Setujui. */
export function KartuSoal({ soal, nomor, risikoTinggi, aksi }: { soal: Soal; nomor: number; risikoTinggi: boolean; aksi: (a: AksiKartu) => void }) {
  const penanda = penandaSoal(soal);
  const terkunci = soal.terkunci;
  const jenis = soal.bentuk === 'uraian' ? jenisUraian(soal.isi_json) : null;
  return (
    <Kartu as="article" pita={PITA[penanda]} id={`soal-${soal.id}`} aria-labelledby={`nomor-${soal.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span id={`nomor-${soal.id}`} className="text-[22px] font-extrabold text-judul">
            {nomor}.
          </span>
          <span className="text-base font-semibold text-redup">
            {BENTUK_LABEL[soal.bentuk]} · {KESUKARAN_LABEL[soal.kesukaran_rancangan]} · {soal.level_kognitif}
            {soal.tp.kode ? ` · ${soal.tp.kode}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LencanaPenanda penanda={penanda} />
          <Tombol
            varian="bahaya"
            ukuran="kecil"
            onClick={() => {
              if (confirm('Pindahkan soal ini ke tong sampah? Dapat dipulihkan selama 30 hari.')) void hapusSoal(soal.id);
            }}
            disabled={terkunci}
          >
            Hapus
          </Tombol>
        </div>
      </div>
      <TampilSoal isi={soal.isi_json} />
      {penanda === 'cek_dulu' ? (
        <div className="mt-5 rounded-lg border border-awas/30 bg-awas-latar px-4 py-3 text-base leading-normal text-awas">
          {soal.bentuk === 'uraian' ? 'Jawaban soal uraian tidak dapat dicek otomatis.' : 'Kunci soal ini tidak dapat dicek otomatis.'} Baca kunci{soal.bentuk === 'uraian' ? ' dan rubrik' : ''}, lalu tekan Setujui.
          {risikoTinggi ? ' Periksa juga kutipan sumber di pembahasan.' : ''}
        </div>
      ) : null}
      {jenis ? (
        <fieldset className="mt-5 flex flex-wrap items-center gap-3">
          <legend className="sr-only">Jenis jawaban uraian</legend>
          <span className="text-base font-bold">Tempat jawaban di berkas:</span>
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
        </fieldset>
      ) : null}
      {soal.catatan_mutu.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-base font-semibold text-redup">Catatan pemeriksaan</summary>
          <ul className="mt-2 list-disc pl-5 text-base leading-relaxed text-redup">
            {soal.catatan_mutu.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Tombol varian="hantu" onClick={() => aksi('sunting')} disabled={terkunci}>
          Sunting
        </Tombol>
        <Tombol varian="hantu" onClick={() => aksi('ganti')} disabled={terkunci}>
          Ganti soal
        </Tombol>
        <Tombol varian="hantu" onClick={() => aksi('buat_ulang')} disabled={terkunci}>
          Buat ulang
        </Tombol>
        {penanda === 'disetujui' ? (
          <Tombol varian="hantu" onClick={() => batalSetujui(soal.id)}>
            Batalkan persetujuan
          </Tombol>
        ) : (
          <Tombol
            varian="garis"
            onClick={() => {
              if (penanda === 'cek_dulu' && risikoTinggi && !confirm('Anda sudah memeriksa kunci dan kutipan sumber di pembahasan?')) return;
              void setujui(soal.id, risikoTinggi);
            }}
          >
            Setujui
          </Tombol>
        )}
        {terkunci ? (
          <Tombol varian="hantu" onClick={() => aturKunci(soal.id, false)}>
            Buka kunci
          </Tombol>
        ) : null}
      </div>
    </Kartu>
  );
}
