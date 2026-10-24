import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simpanProfil } from '../db/profil';
import { KepalaHalaman } from '../komponen/Kepala';
import { usePesan } from '../komponen/Pesan';
import { Label } from '../komponen/Status';
import { Chip, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';
import { terapkanTema } from './mulai';

const MAKS_LOGO = 300 * 1024;

export default function Pengaturan() {
  useJudulHalaman('Profil dan pengaturan');
  const profil = useProfil();
  const pesan = usePesan();
  const [nama, setNama] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [baris, setBaris] = useState('');
  const [alamat, setAlamat] = useState('');
  const [identitas, setIdentitas] = useState('');
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    if (siap || !profil.dibuat_pada) return;
    setNama(profil.nama);
    setSekolah(profil.sekolah);
    setBaris(profil.kop_json.baris.join('\n'));
    setAlamat(profil.kop_json.alamat);
    setIdentitas(profil.identitas_siswa.join(', '));
    setSiap(true);
  }, [profil, siap]);

  async function simpan() {
    await simpanProfil({
      nama: nama.trim(),
      sekolah: sekolah.trim(),
      kop_json: { baris: baris.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3), alamat: alamat.trim() },
      identitas_siswa: identitas.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4),
    });
    pesan('Profil disimpan.');
  }

  async function unggahLogo(f: File | undefined) {
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return pesan('Logo harus PNG atau JPG.', 'galat');
    if (f.size > MAKS_LOGO) return pesan('Ukuran logo maksimal 300 KB.', 'galat');
    const url = await new Promise<string>((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.readAsDataURL(f);
    });
    await simpanProfil({ logo_blob: url });
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-10 sm:px-8 lg:px-16 lg:pt-14">
      <KepalaHalaman label="Pengaturan" judul="Profil dan kop">
        Satu profil per perangkat, tanpa akun. Kop dan identitas siswa dipakai di berkas Word, PDF, dan LaTeX. <Link to="/pengaturan/ai" className="underline">Pengaturan AI</Link> ada di halaman terpisah.
      </KepalaHalaman>
      <div className="mt-10 grid gap-5 border-t border-garis pt-9 sm:grid-cols-2">
        <div>
          <Label htmlFor="nama">Nama guru</Label>
          <input id="nama" className="bidang mt-2" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sekolah">Nama sekolah</Label>
          <input id="sekolah" className="bidang mt-2" value={sekolah} onChange={(e) => setSekolah(e.target.value)} placeholder="SD Negeri 1 …" />
        </div>
        <div>
          <Label htmlFor="baris">Baris kop tambahan (maks. 3 baris)</Label>
          <textarea id="baris" className="bidang mt-2" rows={3} value={baris} onChange={(e) => setBaris(e.target.value)} placeholder={'Penilaian Sumatif Akhir Semester\nTahun Pelajaran 2026/2027'} />
        </div>
        <div>
          <Label htmlFor="alamat">Alamat sekolah</Label>
          <textarea id="alamat" className="bidang mt-2" rows={3} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="identitas">Identitas siswa di lembar soal (pisahkan dengan koma, maks. 4)</Label>
          <input id="identitas" className="bidang mt-2" value={identitas} onChange={(e) => setIdentitas(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Logo sekolah (PNG atau JPG, maks. 300 KB)</Label>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {profil.logo_blob ? <img src={profil.logo_blob} alt="Logo sekolah" className="size-16 border border-garis bg-white object-contain p-1" /> : null}
            <label className="mono inline-flex min-h-11 cursor-pointer items-center rounded-[2px] border border-garis-kuat px-5 hover:border-tinta">
              Pilih berkas
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => unggahLogo(e.target.files?.[0])} />
            </label>
            {profil.logo_blob ? (
              <button type="button" className="mono text-redup hover:text-buruk" onClick={() => simpanProfil({ logo_blob: null })}>
                Hapus logo
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <Tombol className="mt-8" onClick={simpan}>
        Simpan profil
      </Tombol>

      <div className="mt-14 border-t border-garis pt-9">
        <h2 className="text-xl font-light">Tampilan</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {(
            [
              ['sistem', 'Ikuti sistem'],
              ['terang', 'Terang'],
              ['gelap', 'Mode gelap'],
            ] as const
          ).map(([v, l]) => (
            <Chip
              key={v}
              aktif={profil.tema === v}
              onClick={async () => {
                await simpanProfil({ tema: v });
                terapkanTema(v);
              }}
            >
              {l}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
