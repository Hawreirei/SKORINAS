import type { Soal } from '../db/tipe';
import { BENTUK_LABEL, KESUKARAN_LABEL } from '../db/tipe';
import { aturKunci, batalSetujui, hapusSoal, setujui } from '../generasi/operasi';
import { LencanaMutu } from '../komponen/Status';
import { TampilSoal } from '../komponen/TampilSoal';
import { Tombol } from '../komponen/Tombol';
import { formatBiaya } from './ringkas';

export type AksiKartu = 'sunting' | 'ganti' | 'buat_ulang';

export function KartuSoal({ soal, nomor, risikoTinggi, aksi, pertama }: { soal: Soal; nomor: number; risikoTinggi: boolean; aksi: (a: AksiKartu) => void; pertama?: boolean }) {
  const perluTelaah = soal.status_mutu === 'perlu_telaah';
  const sudah = soal.status_telaah === 'ditelaah_guru';
  const terkunci = soal.terkunci;
  return (
    <article id={`soal-${soal.id}`} className={`border-b border-garis py-8 ${pertama ? 'border-t border-t-tinta' : ''}`} aria-labelledby={`nomor-${soal.id}`}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="mono flex flex-wrap gap-x-5 gap-y-1">
          <span id={`nomor-${soal.id}`} className="font-medium">
            {String(nomor).padStart(2, '0')}
          </span>
          <span className="text-redup">
            {soal.tp.kode ? `${soal.tp.kode} · ` : ''}
            {soal.level_kognitif} · {KESUKARAN_LABEL[soal.kesukaran_rancangan]} · {BENTUK_LABEL[soal.bentuk]}
          </span>
          {terkunci ? <span>Terkunci</span> : null}
        </div>
        <LencanaMutu mutu={soal.status_mutu} telaah={soal.status_telaah} />
      </div>
      <TampilSoal isi={soal.isi_json} />
      {perluTelaah && !sudah ? (
        <div className="mt-6 border border-garis-kuat bg-panel px-5 py-4 text-sm leading-normal text-isi">
          {soal.bentuk === 'uraian' ? 'Soal uraian tidak dapat dihitung ulang otomatis.' : 'Kunci soal ini tidak dapat dihitung ulang otomatis.'} Periksa kunci{soal.bentuk === 'uraian' ? ' dan rubrik' : ''} sebelum diekspor.
          {risikoTinggi ? ' Rumpun ini berisiko tinggi: periksa juga kutipan sumber di pembahasan.' : ''}
        </div>
      ) : null}
      {soal.catatan_mutu.length ? (
        <details className="mt-4">
          <summary className="mono cursor-pointer text-redup">Catatan pemeriksa</summary>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-redup">
            {soal.catatan_mutu.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Tombol varian="hantu" onClick={() => aksi('sunting')} disabled={terkunci}>
          Sunting
        </Tombol>
        <Tombol varian="hantu" onClick={() => aksi('ganti')} disabled={terkunci}>
          Ganti butir
        </Tombol>
        <Tombol varian="hantu" onClick={() => aksi('buat_ulang')} disabled={terkunci}>
          Buat ulang
        </Tombol>
        {sudah ? (
          <Tombol varian="hantu" onClick={() => batalSetujui(soal.id)}>
            Batalkan persetujuan
          </Tombol>
        ) : perluTelaah ? (
          <Tombol
            onClick={() => {
              if (risikoTinggi && !confirm('Rumpun berisiko tinggi. Anda sudah memeriksa kunci dan kutipan sumber di pembahasan?')) return;
              void setujui(soal.id, risikoTinggi);
            }}
          >
            Tandai sudah ditelaah
          </Tombol>
        ) : (
          <Tombol varian="hantu" onClick={() => setujui(soal.id)}>
            Setujui
          </Tombol>
        )}
        <Tombol varian="hantu" onClick={() => aturKunci(soal.id, !terkunci)} title="Soal terkunci tidak dapat disunting atau diganti">
          {terkunci ? 'Buka kunci' : 'Kunci'}
        </Tombol>
        <button
          type="button"
          className="mono ml-auto min-h-11 px-2 text-redup hover:text-buruk"
          onClick={() => {
            if (confirm('Pindahkan soal ini ke tong sampah? Dapat dipulihkan selama 30 hari.')) void hapusSoal(soal.id);
          }}
          disabled={terkunci}
        >
          Hapus
        </button>
      </div>
      <p className="mono mt-4 text-redup">
        v{soal.versi} · {soal.model ?? 'manual'} · {formatBiaya(soal.biaya_usd)}
      </p>
    </article>
  );
}
