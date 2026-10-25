import { describe, expect, it } from 'vitest';
import { kontras, MODE, tokenMode } from './bantu-kontras';

/**
 * Audit kontras UI-12: setiap pasangan teks dan latar yang dipakai layar, di mode terang dan gelap,
 * minimal 4,5 : 1 (WCAG AA untuk teks 16 px). Pasangan nada Pemberitahuan dan lencana status diuji di
 * tests/formulir.test.tsx.
 */
const TEKS = ['--gs-ink', '--gs-body', '--gs-muted', '--gs-main', '--gs-head', '--gs-good', '--gs-bad', '--gs-warn'];
const PERMUKAAN = ['--gs-bg', '--gs-card', '--gs-soft', '--gs-panel'];

const PASANGAN_KHUSUS: [teks: string, latar: string, dipakai: string][] = [
  ['--gs-on-ink', '--gs-main-fill', 'tombol utama, chip aktif, opsi terpilih Pilihan, nomor Langkah awal'],
  ['--gs-on-ink', '--gs-main-fill-hover', 'tombol utama saat disorot'],
  ['--gs-bg', '--gs-head', 'pesan melayang'],
  ['--gs-bad', '--gs-bad-bg', 'pesan melayang galat, tombol bahaya disorot'],
];

describe('kontras token warna', () => {
  for (const [tema, pemilih] of MODE) {
    const token = tokenMode(pemilih);
    it(`teks di setiap permukaan, mode ${tema}`, () => {
      for (const t of TEKS)
        for (const l of PERMUKAAN) {
          expect(token[t], t).toBeDefined();
          expect(kontras(token[t], token[l]), `${t} di ${l}, mode ${tema}`).toBeGreaterThanOrEqual(4.5);
        }
    });
    it(`pasangan khusus, mode ${tema}`, () => {
      for (const [t, l, dipakai] of PASANGAN_KHUSUS) expect(kontras(token[t], token[l]), `${t} di ${l} (${dipakai}), mode ${tema}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('pilihan jenis ganti soal: biru tua di biru lembut (terang)', () => {
    const t = tokenMode(':root');
    expect(kontras(t['--gs-main-dark'], t['--gs-main-soft'])).toBeGreaterThanOrEqual(4.5);
  });
});
