import { useState } from 'react';
import { BANTUAN } from '../bantuan/daftar';

export function PanelBantuan({ id, ringkas = false }: { id: keyof typeof BANTUAN | string; ringkas?: boolean }) {
  const v = BANTUAN[id];
  const [putar, setPutar] = useState(false);
  if (!v) return null;
  return (
    <div>
      <div className="mono text-redup">Tonton caranya</div>
      <div className="mt-4 flex aspect-video items-center justify-center border border-tinta bg-lembut">
        {v.youtube_id && putar ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1&cc_load_policy=1&hl=id`}
            title={v.judul}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : v.youtube_id ? (
          <button type="button" onClick={() => setPutar(true)} aria-label={`Putar video: ${v.judul}`} className="inline-flex size-14 items-center justify-center rounded-full border border-tinta">
            <svg aria-hidden="true" width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
              <path d="M2 1l13 8-13 8z" />
            </svg>
          </button>
        ) : (
          <span className="mono px-4 text-center text-redup">Video segera hadir · ikuti langkah di bawah</span>
        )}
      </div>
      <div className="mt-3.5 text-lg font-light">{v.judul}</div>
      <div className="mono mt-1.5 text-redup">{v.durasi}</div>
      {!ringkas || !v.youtube_id ? (
        <ol className="mt-5 list-decimal pl-5 text-[15px] leading-[1.7] text-isi">
          {v.langkah.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
