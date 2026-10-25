import { describe, expect, it } from 'vitest';
import type { JenisGalatAi } from '../src/ai/galat';
import { galatPerluTindakan, STATUS_PAKET, statusPaket, type KeadaanPengatur, type MasukanStatus, type StatusPaket } from '../src/app/status';

const dasar: MasukanStatus = { paketId: 'p1', status: 'siap', gagal: 0, galat: null, pengatur: null };
const jalan = (u: Partial<KeadaanPengatur> = {}): KeadaanPengatur => ({ paketId: 'p1', berjalan: true, menunggu: null, jenisGalat: null, ...u });

describe('peta status paket', () => {
  it('setiap status punya label sendiri dan satu nada', () => {
    const label = Object.values(STATUS_PAKET).map((s) => s.label);
    expect(new Set(label).size).toBe(label.length);
    expect(label).toEqual(['Sedang dibuat', 'Menunggu batas penyedia', 'Dijeda', 'Perlu perhatian', 'Siap diunduh']);
  });

  const kasus: [string, Partial<MasukanStatus>, StatusPaket][] = [
    ['sedang dibuat di tab ini', { status: 'membuat', pengatur: jalan() }, 'membuat'],
    ['GenSoal menjaga batas per menit sendiri', { status: 'membuat', pengatur: jalan({ menunggu: { alasan: 'Menjaga batas 5 permintaan per menit.' } }) }, 'membuat'],
    ['penyedia menolak karena batas', { status: 'membuat', pengatur: jalan({ menunggu: { alasan: 'Batas permintaan per menit Google Gemini tercapai.' } }) }, 'menunggu'],
    ['tersimpan "membuat" tanpa pengatur di tab ini', { status: 'membuat' }, 'membuat'],
    ['pengatur tab ini sedang membuat paket lain', { status: 'membuat', pengatur: jalan({ paketId: 'lain' }) }, 'membuat'],
    ['dijeda manual', { status: 'dijeda' }, 'dijeda'],
    ['dijeda karena tab ditutup', { status: 'dijeda', galat: 'Pembuatan terhenti karena tab ditutup. Tekan Lanjutkan; soal yang sudah jadi tetap tersimpan.' }, 'dijeda'],
    ['dijeda karena kuota harian', { status: 'dijeda', galat: 'Kuota harian Google Gemini untuk model ini sudah habis.' }, 'dijeda'],
    ['dijeda karena batas harian GenSoal', { status: 'dijeda', galat: 'Batas harian GenSoal (200 soal) tercapai.' }, 'dijeda'],
    ['kunci ditolak', { status: 'dijeda', galat: 'Kunci Google Gemini ditolak. Periksa kunci atau izin model.' }, 'perhatian'],
    ['model tidak ditemukan', { status: 'dijeda', galat: 'Model tidak ditemukan di OpenRouter.' }, 'perhatian'],
    ['jaringan putus', { status: 'dijeda', galat: 'Tidak dapat menghubungi Groq. Periksa koneksi internet.' }, 'perhatian'],
    ['jenis galat dari pengatur didahulukan atas teks', { status: 'dijeda', galat: 'Pesan apa pun', pengatur: jalan({ berjalan: false, jenisGalat: 'batas' }) }, 'dijeda'],
    ['siap tanpa soal gagal', { status: 'siap' }, 'siap'],
    ['siap dengan soal gagal dibuat', { status: 'siap', gagal: 2 }, 'perhatian'],
  ];
  for (const [nama, ubah, harap] of kasus) {
    it(nama, () => expect(statusPaket({ ...dasar, ...ubah })).toBe(harap));
  }

  it('setiap kombinasi status, galat, dan pengatur menghasilkan tepat satu status yang dikenal', () => {
    const galat = [null, 'Kuota harian habis.', 'Kunci ditolak.'];
    const jenis: (JenisGalatAi | null)[] = [null, 'batas', 'kunci', 'dibatalkan'];
    const pengatur: (KeadaanPengatur | null)[] = [null, jalan(), jalan({ menunggu: { alasan: 'Batas tercapai.' } }), jalan({ berjalan: false })];
    for (const status of ['membuat', 'dijeda', 'siap'] as const)
      for (const g of galat)
        for (const j of jenis)
          for (const p of pengatur)
            for (const gagal of [0, 1]) {
              const hasil = statusPaket({ paketId: 'p1', status, gagal, galat: g, pengatur: p ? { ...p, jenisGalat: j } : null });
              expect(Object.keys(STATUS_PAKET)).toContain(hasil);
            }
  });

  it('galat yang perlu tindakan', () => {
    expect(galatPerluTindakan(null)).toBe(false);
    expect(galatPerluTindakan('apa pun', 'kunci')).toBe(true);
    expect(galatPerluTindakan('Kunci ditolak.', 'dibatalkan')).toBe(false);
  });
});
