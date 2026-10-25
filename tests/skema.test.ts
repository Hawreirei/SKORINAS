import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { bacaCadangan } from '../src/db/cadangan';
import { GenSoalDb } from '../src/db/skema';
import { rumpunDariMapel } from '../src/paket';

describe('migrasi skema versi 2 (rancangan v0.4)', () => {
  it('menghapus toko tp_kustom dan melengkapi cara_bs pada preset dan paket lama', async () => {
    const nama = `uji-migrasi-${Math.random()}`;
    const lama = new Dexie(nama);
    lama.version(1).stores({
      profil: 'id',
      kunci_api: 'penyedia',
      preset: 'id, nama, terakhir_dipakai',
      paket_soal: 'id, status, dibuat_pada, dihapus_pada',
      soal: 'id, paket_id, status_mutu, status_telaah, dihapus_pada, [paket_id+urutan]',
      soal_gambar: 'id, soal_id',
      pekerjaan_generasi: 'id, paket_id, status',
      pemakaian_ai: 'id, tanggal, model, paket_id',
      log_soal: 'id, soal_id, dibuat_pada',
      tp_kustom: 'id, garis_id, [mapel+kelas]',
    });
    await lama.open();
    const param = { kurikulum_id: 'merdeka-2024', kelas: 4, mapel: 'Matematika', tp: [{ id: 't', rumusan: 'x', sumber: 'resmi', versi: '2024.1' }] };
    await lama.table('preset').add({ id: 'p1', nama: 'Lama', parameter_json: param, terakhir_dipakai: 0 });
    await lama.table('paket_soal').add({ id: 'k1', judul: 'Lama', parameter_json: param, status: 'siap', dibuat_pada: 0, dihapus_pada: null });
    await lama.table('tp_kustom').add({ id: 'tk', garis_id: 'g', mapel: 'Matematika', kelas: 4 });
    lama.close();

    const baru = new GenSoalDb(nama);
    await baru.open();
    expect(baru.tables.map((t) => t.name)).not.toContain('tp_kustom');
    expect((await baru.preset.get('p1'))!.parameter_json.cara_bs).toBe('centang');
    const paket = (await baru.paket_soal.get('k1'))!;
    expect(paket.parameter_json.cara_bs).toBe('centang');
    // TP yang sudah tersalin di paket tetap utuh.
    expect(paket.parameter_json.tp[0].rumusan).toBe('x');
    baru.close();
    await Dexie.delete(nama);
  });

  it('cadangan versi 0.3 berisi tp_kustom tetap dapat dibaca', () => {
    const b = bacaCadangan(JSON.stringify({ format: 'gensoal', versi: 1, versi_aplikasi: '0.3.0', dibuat_pada: '', data: { tp_kustom: [{ id: 'a' }], preset: [{ id: 'p', parameter_json: { kelas: 4 } }] } }));
    expect('tp_kustom' in b.data).toBe(false);
    expect((b.data.preset![0] as { parameter_json: { cara_bs: string } }).parameter_json.cara_bs).toBe('centang');
  });
});

describe('data persetujuan lama (sebelum v0.5)', () => {
  it('cadangan berisi soal yang pernah disetujui tetap dapat dibaca', () => {
    const soal = { id: 's1', paket_id: 'k1', status_mutu: 'perlu_telaah', status_telaah: 'ditelaah_guru', sumber_dicek: true };
    const b = bacaCadangan(JSON.stringify({ format: 'gensoal', versi: 1, versi_aplikasi: '0.4.0', dibuat_pada: '', data: { soal: [soal] } }));
    expect(b.data.soal).toEqual([soal]);
  });
});

describe('rumpun dari nama mapel', () => {
  it.each([
    ['Matematika', 'matematika'],
    ['matematika – pecahan', 'matematika'],
    ['IPAS', 'ipa'],
    ['Fisika', 'ipa'],
    ['Bahasa Indonesia', 'bahasa'],
    ['English', 'bahasa'],
    ['Pendidikan Pancasila', 'pancasila_agama'],
    ['Pendidikan Agama Islam dan Budi Pekerti', 'pancasila_agama'],
    ['Sejarah', 'ips'],
    ['PJOK', 'seni_pjok_informatika'],
    ['Informatika', 'seni_pjok_informatika'],
    ['Muatan lokal batik', null],
    ['', null],
  ])('%s → %s', (mapel, rumpun) => {
    expect(rumpunDariMapel(mapel)).toBe(rumpun);
  });
});
