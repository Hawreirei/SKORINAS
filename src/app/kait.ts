import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { db } from '../db/skema';
import { ID_PROFIL, profilBawaan } from '../db/profil';
import type { Profil } from '../db/tipe';
import { pengatur } from '../generasi/pengatur';
import { muatRegistri } from '../ai/registri';
import type { Registri } from '../ai/tipe';

export function useProfil(): Profil {
  const p = useLiveQuery(() => db.profil.get(ID_PROFIL), []);
  return p ? { ...profilBawaan(), ...p } : profilBawaan();
}

export function usePengatur() {
  return useSyncExternalStore(
    (f) => pengatur.dengar(f),
    () => pengatur.ambil(),
  );
}

function useMuat<T>(muat: () => Promise<T>): { data: T | null; galat: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  useEffect(() => {
    let hidup = true;
    muat()
      .then((d) => hidup && setData(d))
      .catch((e: Error) => hidup && setGalat(e.message));
    return () => {
      hidup = false;
    };
  }, [muat]);
  return { data, galat };
}

export function useRegistri() {
  return useMuat<Registri>(muatRegistri);
}

export function useJudulHalaman(judul: string) {
  useEffect(() => {
    document.title = judul ? `${judul} · GenSoal` : 'GenSoal';
  }, [judul]);
}
