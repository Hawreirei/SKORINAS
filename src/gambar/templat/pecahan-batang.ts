import { GalatTemplat, angka } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface Batang {
  penyebut: number;
  diarsir: number;
}
interface P {
  batang: Batang[];
  label: boolean;
  bentukTunggal: boolean;
}

export const pecahanBatang: Templat<P> = {
  id: 'pecahan_batang',
  nama: 'Pecahan batang',
  dipakai: 'Pecahan, perbandingan, kesetaraan',
  parameter:
    'penyebut (1–12), diarsir, jumlah_batang (1–4; arsiran berlanjut ke batang berikutnya untuk pecahan lebih dari 1). Untuk membandingkan: batang: [{penyebut, diarsir}, ...] (maks 4). label: true untuk menampilkan pecahan di kanan batang',
  contoh: { batang: [{ penyebut: 2, diarsir: 1 }, { penyebut: 4, diarsir: 2 }], label: true },
  baca(m) {
    const label = m.label === true;
    if (Array.isArray(m.batang)) {
      if (m.batang.length < 1 || m.batang.length > 4) throw new GalatTemplat('batang harus berisi 1–4 batang.');
      const batang = m.batang.map((x: unknown) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const penyebut = angka(o, 'penyebut', { min: 1, maks: 12, bulat: true });
        const diarsir = angka(o, 'diarsir', { min: 0, maks: penyebut, bulat: true });
        return { penyebut, diarsir };
      });
      return { batang, label, bentukTunggal: false };
    }
    const penyebut = angka(m, 'penyebut', { min: 1, maks: 12, bulat: true });
    const jumlah = angka(m, 'jumlah_batang', { min: 1, maks: 4, bulat: true, bawaan: 1 });
    const diarsir = angka(m, 'diarsir', { min: 0, maks: penyebut * jumlah, bulat: true });
    const batang: Batang[] = [];
    let sisa = diarsir;
    for (let i = 0; i < jumlah; i++) {
      const isi = Math.min(penyebut, sisa);
      batang.push({ penyebut, diarsir: isi });
      sisa -= isi;
    }
    return { batang, label, bentukTunggal: true };
  },
  gambar(p) {
    const W = 520;
    const lebarBatang = p.label ? 400 : 480;
    const tinggiBatang = 44;
    const jarak = 16;
    const pr: Primitif[] = [];
    p.batang.forEach((bt, i) => {
      const y = 12 + i * (tinggiBatang + jarak);
      const w = lebarBatang / bt.penyebut;
      for (let k = 0; k < bt.penyebut; k++) {
        pr.push({ t: 'kotak', x: 10 + k * w, y, w, h: tinggiBatang, isi: k < bt.diarsir ? 'arsir' : 'kosong' });
      }
      if (p.label) pr.push({ t: 'pecahan', x: 10 + lebarBatang + 40, y: y + tinggiBatang / 2, atas: String(bt.diarsir), bawah: String(bt.penyebut) });
    });
    const tinggi = 24 + p.batang.length * (tinggiBatang + jarak) - jarak;
    const uraian = p.batang.map((bt) => `${bt.diarsir} dari ${bt.penyebut} bagian diarsir`).join('; ');
    return { lebar: W, tinggi, primitif: pr, alt: `${p.batang.length} batang pecahan: ${uraian}.` };
  },
  lingkup(p) {
    const pecahan = p.batang.map((bt) => bt.diarsir / bt.penyebut);
    const totalDiarsir = p.batang.reduce((a, bt) => a + bt.diarsir, 0);
    return {
      batang: pecahan,
      diarsir: p.bentukTunggal ? totalDiarsir : p.batang.map((bt) => bt.diarsir),
      penyebut: p.bentukTunggal ? p.batang[0].penyebut : p.batang.map((bt) => bt.penyebut),
      pecahan: p.bentukTunggal ? totalDiarsir / p.batang[0].penyebut : pecahan[0],
    };
  },
};
