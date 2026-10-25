import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simpanProfil } from '../db/profil';
import type { Profil } from '../db/tipe';
import { Bidang, IsianPanjang, IsianTeks, Pemberitahuan, Pilihan } from '../komponen/Formulir';
import { KepalaHalaman } from '../komponen/Kepala';
import { KopLembar } from '../komponen/LembarCetak';
import { KartuBagian } from '../komponen/Status';
import { kelasTombol, Tombol } from '../komponen/Tombol';
import { useJudulHalaman, useProfil } from './kait';
import { terapkanTema } from './mulai';

const MAKS_LOGO = 300 * 1024;

const pisahBaris = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 3);
const pisahKoma = (t: string) => t.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4);

/** Profil dan kop (rancangan UI v0.5, UI-11): kartu per bagian, pratinjau kop, umpan balik simpan di samping tombol. */
export default function Pengaturan() {
  useJudulHalaman('Profil dan pengaturan');
  const profil = useProfil();
  const [nama, setNama] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [baris, setBaris] = useState('');
  const [alamat, setAlamat] = useState('');
  const [identitas, setIdentitas] = useState('');
  const [siap, setSiap] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [galatLogo, setGalatLogo] = useState<string | null>(null);

  useEffect(() => {
    if (siap || !profil.dibuat_pada) return;
    setNama(profil.nama);
    setSekolah(profil.sekolah);
    setBaris(profil.kop_json.baris.join('\n'));
    setAlamat(profil.kop_json.alamat);
    setIdentitas(profil.identitas_siswa.join(', '));
    setSiap(true);
  }, [profil, siap]);

  /** Setiap ketikan menyembunyikan "Profil tersimpan." sampai Simpan ditekan lagi. */
  const ubah = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    setTersimpan(false);
  };

  async function simpan() {
    await simpanProfil({
      nama: nama.trim(),
      sekolah: sekolah.trim(),
      kop_json: { baris: pisahBaris(baris), alamat: alamat.trim() },
      identitas_siswa: pisahKoma(identitas),
    });
    setTersimpan(true);
  }

  async function unggahLogo(f: File | undefined) {
    setGalatLogo(null);
    if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return setGalatLogo('Logo harus PNG atau JPG.');
    if (f.size > MAKS_LOGO) return setGalatLogo('Ukuran logo maksimal 300 KB.');
    const url = await new Promise<string>((ok) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.readAsDataURL(f);
    });
    await simpanProfil({ logo_blob: url });
  }

  const kop = { sekolah: sekolah.trim() || 'NAMA SEKOLAH', baris: pisahBaris(baris), alamat: alamat.trim(), logo: profil.logo_blob };

  return (
    <div className="mx-auto max-w-[960px] px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
      <KepalaHalaman
        judul="Profil dan kop"
        subjudul={
          <>
            Kop dan identitas siswa dipakai di berkas Word, PDF, dan LaTeX. Tersimpan di perangkat ini, tanpa akun. Kunci AI ada di <Link to="/pengaturan/ai" className="underline">Pengaturan AI</Link>.
          </>
        }
      />

      <div className="mt-8 space-y-6">
        <KartuBagian judul="Guru dan sekolah">
          <div className="grid gap-5 sm:grid-cols-2">
            <IsianTeks id="nama" label="Nama guru" value={nama} onChange={ubah(setNama)} autoComplete="name" />
            <IsianTeks id="sekolah" label="Nama sekolah" value={sekolah} onChange={ubah(setSekolah)} placeholder="SD Negeri 1 …" petunjuk="Tampil di kop lembar soal." />
          </div>
        </KartuBagian>

        <KartuBagian judul="Kop lembar soal" ket="Dipakai bila “dengan kop sekolah” dipilih saat mengunduh.">
          <div className="grid gap-5 sm:grid-cols-2">
            <IsianPanjang id="baris" label="Baris kop tambahan" petunjuk="Maksimal 3 baris." rows={3} value={baris} onChange={ubah(setBaris)} placeholder={'Penilaian Sumatif Akhir Semester\nTahun Pelajaran 2026/2027'} />
            <IsianPanjang id="alamat" label="Alamat sekolah" rows={3} value={alamat} onChange={ubah(setAlamat)} />
            <IsianTeks id="identitas" className="sm:col-span-2" label="Identitas siswa di lembar soal" petunjuk="Pisahkan dengan koma, maksimal 4. Misalnya: Nama, Kelas, No. absen." value={identitas} onChange={ubah(setIdentitas)} />
            <Bidang id="logo" className="sm:col-span-2" label="Logo sekolah" petunjuk="PNG atau JPG, maksimal 300 KB. Langsung tersimpan." galat={galatLogo}>
              {(p) => (
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {profil.logo_blob ? <img src={profil.logo_blob} alt="Logo sekolah" className="size-16 rounded border border-garis bg-white object-contain p-1" /> : null}
                  <label className={`${kelasTombol('garis')} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-utama`}>
                    {profil.logo_blob ? 'Ganti logo' : 'Pilih berkas'}
                    <input {...p} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => unggahLogo(e.target.files?.[0])} />
                  </label>
                  {profil.logo_blob ? (
                    <Tombol varian="hantu" onClick={() => simpanProfil({ logo_blob: null })}>
                      Hapus logo
                    </Tombol>
                  ) : null}
                </div>
              )}
            </Bidang>
          </div>

          <figure className="mt-6">
            <figcaption className="text-base font-bold text-tinta">Pratinjau kop</figcaption>
            <div className="kertas mt-2 overflow-hidden rounded-lg border border-garis px-4 py-4 text-[15px] leading-snug sm:px-6 sm:text-[16px]">
              <KopLembar kop={kop} identitas={pisahKoma(identitas)} mapelKelas="Mapel · Kelas" />
            </div>
          </figure>
        </KartuBagian>

        <div className="flex flex-wrap items-center gap-4">
          <Tombol ukuran="besar" onClick={simpan} className="w-full sm:w-auto">
            Simpan profil
          </Tombol>
          {tersimpan ? (
            <Pemberitahuan nada="berhasil" className="w-full !py-2 sm:w-auto">
              Profil tersimpan.
            </Pemberitahuan>
          ) : null}
        </div>

        <KartuBagian judul="Tampilan" pita="kuning">
          <Pilihan<Profil['tema']>
            label="Tema"
            className="sm:max-w-md"
            nilai={profil.tema}
            ubah={async (v) => {
              await simpanProfil({ tema: v });
              terapkanTema(v);
            }}
            opsi={[
              { nilai: 'sistem', label: 'Ikuti sistem' },
              { nilai: 'terang', label: 'Terang' },
              { nilai: 'gelap', label: 'Gelap' },
            ]}
          />
        </KartuBagian>
      </div>
    </div>
  );
}
