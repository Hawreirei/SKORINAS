import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';
import { Tombol } from './Tombol';

export interface OpsiKonfirmasi {
  /** Pertanyaan yang menyebut nama item, mis. 'Hapus paket "Penjumlahan pecahan"?'. */
  judul: string;
  /** Akibatnya dalam bahasa sehari-hari. */
  pesan: ReactNode;
  /** Label tombol aksi, mis. "Hapus paket". */
  aksi: string;
  /** Aksi menghapus atau mengganti data: tombol merah. */
  bahaya?: boolean;
  batal?: string;
}

type Tanya = (o: OpsiKonfirmasi) => Promise<boolean>;

const Konteks = createContext<Tanya>(async () => false);

/**
 * Dialog konfirmasi pengganti window.confirm (rancangan UI v0.5, UI-05). Fokus awal di tombol Batal;
 * Escape, Tutup, dan Batal menjawab tidak.
 */
export function PenyediaKonfirmasi({ children }: { children: ReactNode }) {
  const [aktif, setAktif] = useState<(OpsiKonfirmasi & { selesai: (ya: boolean) => void }) | null>(null);
  const tanya = useCallback<Tanya>((o) => new Promise<boolean>((selesai) => setAktif({ ...o, selesai })), []);
  const jawab = (ya: boolean) => {
    aktif?.selesai(ya);
    setAktif(null);
  };
  return (
    <Konteks.Provider value={tanya}>
      {children}
      <Dialog
        buka={!!aktif}
        tutup={() => jawab(false)}
        judul={aktif?.judul ?? ''}
        ukuran="sempit"
        kaki={
          aktif ? (
            <>
              <Tombol varian="garis" onClick={() => jawab(false)} data-fokus-awal>
                {aktif.batal ?? 'Batal'}
              </Tombol>
              <Tombol varian={aktif.bahaya ? 'bahaya' : 'utama'} onClick={() => jawab(true)}>
                {aktif.aksi}
              </Tombol>
            </>
          ) : null
        }
      >
        <div className="text-[17px] leading-relaxed text-isi">{aktif?.pesan}</div>
      </Dialog>
    </Konteks.Provider>
  );
}

/** `const konfirmasi = useKonfirmasi(); if (await konfirmasi({ judul, pesan, aksi, bahaya: true })) …` */
export function useKonfirmasi(): Tanya {
  return useContext(Konteks);
}
