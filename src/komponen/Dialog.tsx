import { useEffect, useRef, type ReactNode } from 'react';

export function Dialog({ buka, tutup, judul, children, lebar = 720 }: { buka: boolean; tutup: () => void; judul: string; children: ReactNode; lebar?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);
  return (
    <dialog
      ref={ref}
      onClose={tutup}
      onCancel={tutup}
      aria-label={judul}
      className="m-auto max-h-[90vh] w-[calc(100%-32px)] overflow-auto border border-tinta bg-latar p-0 text-tinta backdrop:bg-black/40"
      style={{ maxWidth: lebar }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-garis bg-latar px-6 py-4">
        <h2 className="text-xl font-light">{judul}</h2>
        <button type="button" onClick={tutup} className="mono min-h-11 px-2 text-redup hover:text-tinta" aria-label="Tutup">
          Tutup
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
