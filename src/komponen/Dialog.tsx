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
      className="m-auto max-h-[90vh] w-[calc(100%-32px)] overflow-auto rounded-xl border border-garis bg-kartu p-0 text-tinta backdrop:bg-[#0f172a]/50"
      style={{ maxWidth: lebar }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b-[3px] border-kuning bg-kartu px-6 py-4">
        <h2 className="text-[22px] font-extrabold text-judul">{judul}</h2>
        <button type="button" onClick={tutup} className="min-h-11 rounded-lg border border-garis-kuat px-4 font-bold text-tinta hover:border-utama hover:text-utama" aria-label="Tutup">
          Tutup
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
