import { db } from '../db/skema';
import type { PenyediaId, Profil } from '../db/tipe';
import { GalatAi } from './galat';
import type { Registri } from './tipe';

// Pembatas laju: jangan melewati batas permintaan per menit (RPM) dan per hari (RPD) model yang dipakai.
// RPM dijaga dengan jendela geser 60 detik atas waktu kirim; RPD dihitung dari catatan pemakaian di perangkat.

export interface BatasLaju {
  rpm: number | null;
  rpd: number | null;
}

export const JENDELA_MS = 60_000;
const SELA_AMAN_MS = 1_500;

export function kunciModel(penyedia: PenyediaId, model: string): string {
  return `${penyedia}|${model}`;
}

/** Angka dari guru (Pengaturan AI) didahulukan, lalu angka registri. */
export function batasEfektif(profil: Pick<Profil, 'batas_model'>, reg: Registri | null, penyedia: PenyediaId, model: string): BatasLaju {
  const atur = profil.batas_model?.[kunciModel(penyedia, model)];
  const bawaan = reg?.penyedia.find((p) => p.id === penyedia)?.model.find((m) => m.id === model)?.batas_gratis ?? null;
  return { rpm: atur?.rpm ?? bawaan?.rpm ?? null, rpd: atur?.rpd ?? bawaan?.rpd ?? null };
}

/** Awal "hari" kuota: Gemini pulih tengah malam waktu Pasifik; penyedia lain memakai tengah malam lokal. */
export function awalHariKuota(penyedia: PenyediaId, kini = new Date()): number {
  if (penyedia !== 'gemini') {
    const d = new Date(kini);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  const b = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(kini)
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>;
  const selisih = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, b.second) - Math.floor(kini.getTime() / 1000) * 1000;
  return Date.UTC(b.year, b.month - 1, b.day, 0, 0, 0) - selisih;
}

/** Permintaan ke model ini sejak awal hari kuota, dari catatan pemakaian. */
export async function permintaanHariIni(penyedia: PenyediaId, model: string, kini = new Date()): Promise<number> {
  const awal = awalHariKuota(penyedia, kini);
  return db.pemakaian_ai.where('model').equals(model).filter((p) => p.penyedia === penyedia && p.dibuat_pada >= awal).count();
}

export interface OpsiIzin {
  signal?: AbortSignal;
  /** Dipanggil sebelum menunggu, untuk ditampilkan di layar. */
  saatMenunggu?: (ms: number, alasan: string) => void;
  tunda?: (ms: number, signal?: AbortSignal) => Promise<void>;
  sekarang?: () => number;
  hitungHarian?: () => Promise<number>;
  namaPenyedia?: string;
}

const tundaBawaan = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((selesai, gagal) => {
    const t = setTimeout(selesai, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      gagal(new GalatAi('dibatalkan', 'Dijeda.'));
    });
  });

export class PembatasLaju {
  private kirim = new Map<string, number[]>();

  /** Lama tunggu agar permintaan berikutnya tidak melewati RPM (0 bila boleh langsung). */
  tungguRpm(kunci: string, rpm: number | null, kini: number): number {
    if (!rpm || rpm <= 0) return 0;
    const daftar = (this.kirim.get(kunci) ?? []).filter((t) => kini - t < JENDELA_MS);
    this.kirim.set(kunci, daftar);
    if (daftar.length < rpm) return 0;
    return daftar[daftar.length - rpm] + JENDELA_MS + SELA_AMAN_MS - kini;
  }

  catat(kunci: string, waktu: number) {
    this.kirim.set(kunci, [...(this.kirim.get(kunci) ?? []), waktu]);
  }

  /** Tunggu sampai boleh mengirim, lalu catat waktu kirim. Melempar GalatAi 'batas' harian bila RPD habis. */
  async izin(penyedia: PenyediaId, model: string, batas: BatasLaju, o: OpsiIzin = {}): Promise<void> {
    const kunci = kunciModel(penyedia, model);
    const sekarang = o.sekarang ?? Date.now;
    const tunda = o.tunda ?? tundaBawaan;
    if (batas.rpd) {
      const terpakai = await (o.hitungHarian ?? (() => permintaanHariIni(penyedia, model)))();
      if (terpakai >= batas.rpd)
        throw new GalatAi(
          'batas',
          `Kuota harian ${o.namaPenyedia ?? penyedia} untuk model ini (${batas.rpd} permintaan) sudah terpakai.`,
          429,
          { tungguMs: null, lingkup: 'harian' },
          `Dihitung GenSoal dari catatan pemakaian di perangkat ini: ${terpakai} permintaan sejak kuota terakhir pulih. Ubah angka di Pengaturan AI bila kuota Anda lebih besar.`,
        );
    }
    for (;;) {
      const ms = this.tungguRpm(kunci, batas.rpm, sekarang());
      if (ms <= 0) break;
      o.saatMenunggu?.(ms, `Menjaga batas ${batas.rpm} permintaan per menit.`);
      await tunda(ms, o.signal);
    }
    this.catat(kunci, sekarang());
  }
}

export const pembatas = new PembatasLaju();
