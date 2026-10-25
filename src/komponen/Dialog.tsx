import { useEffect, useId, useRef, type ReactNode } from 'react';

const LEBAR = { sempit: 480, sedang: 720, lebar: 1100 } as const;

/**
 * Dialog modal (rancangan UI v0.5, UI-05). Memakai <dialog> bawaan: Escape menutup dan fokus terkurung di dalamnya.
 * Judul terhubung lewat aria-labelledby; saat ditutup, fokus kembali ke elemen yang membukanya.
 * `kaki` berisi tombol rata kanan di bawah isi.
 */
export function Dialog({ buka, tutup, judul, children, kaki, ukuran = 'sedang' }: { buka: boolean; tutup: () => void; judul: ReactNode; children: ReactNode; kaki?: ReactNode; ukuran?: keyof typeof LEBAR }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pemicu = useRef<HTMLElement | null>(null);
  const idJudul = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const terbuka = d.hasAttribute('open');
    if (buka && !terbuka) {
      pemicu.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      // Elemen bertanda data-fokus-awal (mis. tombol Batal di konfirmasi) mendapat fokus pertama.
      d.querySelector<HTMLElement>('[data-fokus-awal]')?.focus();
    }
    if (!buka && terbuka) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
    if (!buka && pemicu.current) {
      // Kembalikan fokus ke pemicu bila masih ada di halaman (mis. tombol Hapus di baris yang sudah terhapus tidak).
      if (pemicu.current.isConnected) pemicu.current.focus();
      pemicu.current = null;
    }
  }, [buka]);
  return (
    <dialog
      ref={ref}
      onClose={tutup}
      onCancel={(e) => {
        e.preventDefault();
        tutup();
      }}
      aria-labelledby={idJudul}
      aria-modal="true"
      className="m-auto max-h-[90vh] w-[calc(100%-32px)] overflow-auto rounded-xl border border-garis bg-kartu p-0 text-tinta backdrop:bg-[#0f172a]/50"
      style={{ maxWidth: LEBAR[ukuran] }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b-[3px] border-kuning bg-kartu px-4 py-3 sm:px-6 sm:py-4">
        <h2 id={idJudul} className="text-[22px] font-extrabold text-judul">
          {judul}
        </h2>
        <button type="button" onClick={tutup} className="tombol tombol-hantu min-h-11 px-4">
          Tutup
        </button>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
      {kaki ? <div className="flex flex-wrap justify-end gap-3 border-t border-garis px-4 py-3 sm:px-6 sm:py-4">{kaki}</div> : null}
    </dialog>
  );
}
