// CSV kurator (data/sumber) -> JSON berversi (public/kurikulum). Jalankan: npm run kurikulum
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BerkasMapel, ElemenResmi, IndeksKurikulum, KurikulumResmi, MapelResmi } from '../src/kurikulum/tipe.ts';
import { uraiCsv } from './csv.ts';

const akar = join(dirname(fileURLToPath(import.meta.url)), '..');
const sumber = (n: string) => uraiCsv(readFileSync(join(akar, 'data/sumber', n), 'utf8'));
const RUMPUN = ['matematika', 'ipa', 'bahasa', 'ips', 'pancasila_agama', 'seni_pjok_informatika'];

const galat: string[] = [];
const kurikulum = sumber('kurikulum.csv');
const fase = sumber('fase.csv');
const mapel = sumber('mapel.csv');
const cp = sumber('cp.csv');
const tp = sumber('tp.csv');

const indeks: IndeksKurikulum = { versi_data: '', dibangun_pada: new Date().toISOString(), kurikulum: [] };
const versiData: string[] = [];

for (const k of kurikulum) {
  const daftarFase = fase
    .filter((f) => f.kurikulum_id === k.id)
    .map((f) => ({ id: `${k.id}.${f.kode}`, kurikulum_id: k.id, kode: f.kode, kelas_dari: Number(f.kelas_dari), kelas_sampai: Number(f.kelas_sampai) }));
  const daftarMapel: MapelResmi[] = [];
  for (const m of mapel.filter((x) => x.kurikulum_id === k.id)) {
    if (!RUMPUN.includes(m.rumpun)) galat.push(`mapel ${m.kode}: rumpun tidak dikenal ${m.rumpun}`);
    const id = `${k.id}.${m.kode}`;
    const cpMapel = cp.filter((c) => c.kurikulum_id === k.id && c.mapel === m.kode);
    const tpMapel = tp.filter((t) => t.kurikulum_id === k.id && t.mapel === m.kode);
    const info: MapelResmi = {
      id,
      kurikulum_id: k.id,
      kode: m.kode,
      nama: m.nama,
      rumpun: m.rumpun as MapelResmi['rumpun'],
      fase: m.fase.split(';').map((x) => x.trim()),
      paket_aktif: m.paket_aktif === '1',
      berkas: cpMapel.length ? `${k.id}/${m.kode}.json` : null,
    };
    daftarMapel.push(info);
    if (!cpMapel.length) continue;
    const berkas: BerkasMapel = { kurikulum_id: k.id, kurikulum_versi: k.versi, mapel: info, fase: {} };
    for (const c of cpMapel) {
      const elemenId = `${id}.${c.fase}.${c.elemen.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const tpElemen = tpMapel.filter((t) => t.fase === c.fase && t.elemen === c.elemen);
      const faseInfo = daftarFase.find((f) => f.kode === c.fase);
      if (!faseInfo) galat.push(`CP ${elemenId}: fase ${c.fase} tidak ada`);
      const elemen: ElemenResmi = {
        id: elemenId,
        mapel_id: id,
        nama: c.elemen,
        urutan: Number(c.elemen_urutan),
        cp: { id: `${elemenId}.cp`, elemen_id: elemenId, teks: c.teks, sumber_dokumen: c.sumber_dokumen },
        tp: tpElemen.map((t) => {
          const kelas = Number(t.kelas);
          if (faseInfo && (kelas < faseInfo.kelas_dari || kelas > faseInfo.kelas_sampai)) galat.push(`TP ${t.kode}: kelas ${kelas} di luar fase ${c.fase}`);
          if (!['draf', 'tervalidasi'].includes(t.status_validasi)) galat.push(`TP ${t.kode}: status_validasi tidak dikenal`);
          return {
            id: `${k.id}.${t.kode}`,
            cp_id: `${elemenId}.cp`,
            kode: t.kode,
            kelas,
            rumusan: t.rumusan,
            lingkup_materi: t.lingkup_materi,
            status_validasi: t.status_validasi as 'draf' | 'tervalidasi',
          };
        }),
      };
      (berkas.fase[c.fase] ??= []).push(elemen);
    }
    for (const t of tpMapel) if (!cpMapel.some((c) => c.fase === t.fase && c.elemen === t.elemen)) galat.push(`TP ${t.kode}: tidak ada CP untuk ${t.fase}/${t.elemen}`);
    const kodeGanda = tpMapel.map((t) => t.kode).filter((x, i, a) => a.indexOf(x) !== i);
    if (kodeGanda.length) galat.push(`Kode TP ganda: ${kodeGanda.join(', ')}`);
    for (const daftar of Object.values(berkas.fase)) daftar.sort((a, b) => a.urutan - b.urutan);
    const tujuan = join(akar, 'public/kurikulum', info.berkas!);
    mkdirSync(dirname(tujuan), { recursive: true });
    writeFileSync(tujuan, JSON.stringify(berkas, null, 1) + '\n');
  }
  const entri: KurikulumResmi = {
    id: k.id,
    nama: k.nama,
    versi: k.versi,
    dasar_hukum: k.dasar_hukum,
    berlaku_dari: k.berlaku_dari,
    aktif: k.aktif === '1',
    fase: daftarFase,
    mapel: daftarMapel,
  };
  indeks.kurikulum.push(entri);
  versiData.push(`${k.id}@${k.versi}`);
}

if (galat.length) {
  console.error('Data kurikulum tidak sah:\n- ' + galat.join('\n- '));
  process.exit(1);
}
indeks.versi_data = versiData.join(',');
// dibangun_pada sengaja tidak ikut berubah bila isi sama, agar diff repositori bersih.
const jalurIndeks = join(akar, 'public/kurikulum/index.json');
try {
  const lama = JSON.parse(readFileSync(jalurIndeks, 'utf8')) as IndeksKurikulum;
  if (JSON.stringify({ ...lama, dibangun_pada: '' }) === JSON.stringify({ ...indeks, dibangun_pada: '' })) indeks.dibangun_pada = lama.dibangun_pada;
} catch {
  /* berkas belum ada */
}
mkdirSync(dirname(jalurIndeks), { recursive: true });
writeFileSync(jalurIndeks, JSON.stringify(indeks, null, 1) + '\n');
const jumlahTp = tp.length;
console.log(`Kurikulum dibangun: ${indeks.kurikulum.length} kurikulum, ${mapel.length} mapel, ${cp.length} CP, ${jumlahTp} TP.`);
