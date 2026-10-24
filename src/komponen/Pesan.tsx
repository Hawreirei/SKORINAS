import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface Pesan {
  id: number;
  teks: string;
  jenis: 'info' | 'galat';
}

const Konteks = createContext<(teks: string, jenis?: Pesan['jenis']) => void>(() => {});

export function PenyediaPesan({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<Pesan[]>([]);
  const tampil = useCallback((teks: string, jenis: Pesan['jenis'] = 'info') => {
    const id = Date.now() + Math.random();
    setDaftar((d) => [...d, { id, teks, jenis }]);
    setTimeout(() => setDaftar((d) => d.filter((p) => p.id !== id)), jenis === 'galat' ? 8000 : 4000);
  }, []);
  return (
    <Konteks.Provider value={tampil}>
      {children}
      <div aria-live="polite" className="tanpa-cetak pointer-events-none fixed inset-x-4 top-20 z-50 sm:top-auto sm:bottom-4 flex flex-col items-center gap-2 sm:left-6 sm:right-auto sm:items-start">
        {daftar.map((p) => (
          <div key={p.id} className={`pointer-events-auto max-w-md border px-5 py-3 text-[15px] shadow-sm ${p.jenis === 'galat' ? 'border-buruk bg-latar text-buruk' : 'border-tinta bg-tinta text-di-tinta'}`}>
            {p.teks}
          </div>
        ))}
      </div>
    </Konteks.Provider>
  );
}

export function usePesan() {
  return useContext(Konteks);
}
