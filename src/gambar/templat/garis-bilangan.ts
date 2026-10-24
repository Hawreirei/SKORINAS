import { GalatTemplat, angka, fmt, sebagaiPecahan } from '../bantu';
import type { Primitif } from '../primitif';
import type { Templat } from './tipe';

interface P {
  min: number;
  maks: number;
  langkah: number;
  titik: { nilai: number; label: string }[];
  lompatan: { dari: number; ke: number }[];
}

export const garisBilangan: Templat<P> = {
  id: 'garis_bilangan',
  nama: 'Garis bilangan',
  dipakai: 'Bilangan bulat, pecahan, penjumlahan pada garis',
  parameter:
    'min, maks, langkah (bilangan atau pecahan "1/4"); titik: [{nilai, label}] (label "?" untuk titik yang ditanyakan); lompatan: [{dari, ke}]',
  contoh: { min: 0, maks: 2, langkah: '1/4', titik: [{ nilai: '3/4', label: '?' }], lompatan: [] },
  baca(m) {
    const min = angka(m, 'min', { min: -1000, maks: 1000 });
    const maks = angka(m, 'maks', { min: -1000, maks: 1000 });
    const langkah = angka(m, 'langkah', { min: 1e-6 });
    if (maks <= min) throw new GalatTemplat('maks harus lebih besar dari min.');
    const jumlah = (maks - min) / langkah;
    if (Math.abs(jumlah - Math.round(jumlah)) > 1e-6) throw new GalatTemplat('Rentang harus habis dibagi langkah.');
    if (jumlah > 24) throw new GalatTemplat('Terlalu banyak garis skala (maksimal 24).');
    const titik = (Array.isArray(m.titik) ? m.titik : []).slice(0, 6).map((t: unknown) => {
      const o = (t ?? {}) as Record<string, unknown>;
      const nilai = angka(o, 'nilai', { min, maks });
      return { nilai, label: o.label === undefined ? '' : String(o.label).slice(0, 4) };
    });
    const lompatan = (Array.isArray(m.lompatan) ? m.lompatan : []).slice(0, 8).map((t: unknown) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return { dari: angka(o, 'dari', { min, maks }), ke: angka(o, 'ke', { min, maks }) };
    });
    return { min, maks, langkah, titik, lompatan };
  },
  gambar(p) {
    const W = 520;
    const kiri = 30;
    const kanan = W - 30;
    const y = 70;
    const sx = (v: number) => kiri + ((v - p.min) / (p.maks - p.min)) * (kanan - kiri);
    const pr: Primitif[] = [{ t: 'garis', x1: kiri - 18, y1: y, x2: kanan + 18, y2: y, panah: 'dua' }];
    const jumlah = Math.round((p.maks - p.min) / p.langkah);
    const pecahanLangkah = Number.isInteger(p.langkah) ? null : sebagaiPecahan(p.langkah);
    for (let i = 0; i <= jumlah; i++) {
      const v = p.min + i * p.langkah;
      const x = sx(v);
      const bulat = Math.abs(v - Math.round(v)) < 1e-9;
      pr.push({ t: 'garis', x1: x, y1: y - (bulat ? 9 : 6), x2: x, y2: y + (bulat ? 9 : 6) });
      if (bulat || !pecahanLangkah) pr.push({ t: 'teks', x, y: y + 24, s: fmt(Math.round(v * 1000) / 1000) });
      else {
        const d = pecahanLangkah[1];
        pr.push({ t: 'pecahan', x, y: y + 22, atas: String(Math.round(v * d)), bawah: String(d), ukuran: 11 });
      }
    }
    for (const l of p.lompatan) {
      const x1 = sx(l.dari);
      const x2 = sx(l.ke);
      pr.push({ t: 'kurva', x1, y1: y - 4, cx: (x1 + x2) / 2, cy: y - 40, x2, y2: y - 4, panah: true });
    }
    for (const t of p.titik) {
      const x = sx(t.nilai);
      pr.push({ t: 'lingkaran', cx: x, cy: y, r: 4.5, isi: 'hitam' });
      if (t.label) pr.push({ t: 'teks', x, y: y - (p.lompatan.length ? 50 : 20), s: t.label, tebal: true });
    }
    const ditanya = p.titik.filter((t) => t.label === '?').length;
    return {
      lebar: W,
      tinggi: 110,
      primitif: pr,
      alt: `Garis bilangan dari ${fmt(p.min)} sampai ${fmt(p.maks)} dengan langkah ${fmt(p.langkah)}${p.titik.length ? `, ${p.titik.length} titik ditandai${ditanya ? ' (satu ditanyakan)' : ''}` : ''}${p.lompatan.length ? `, ${p.lompatan.length} lompatan` : ''}.`,
    };
  },
  lingkup(p) {
    const ditanya = p.titik.find((t) => t.label === '?') ?? p.titik[0];
    return {
      min: p.min,
      maks: p.maks,
      langkah: p.langkah,
      titik: p.titik.map((t) => t.nilai),
      lompatan: p.lompatan.map((l) => l.ke - l.dari),
      ...(ditanya ? { nilai: ditanya.nilai } : {}),
    };
  },
};
