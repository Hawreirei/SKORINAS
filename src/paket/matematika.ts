import { periksaHitung } from '../verifikasi/matematika';
import type { PaketMapel } from './tipe';

export const paketMatematika: PaketMapel = {
  rumpun: 'matematika',
  nama: 'Matematika',
  statusLolos: 'terverifikasi_hitung',
  pemeriksa: periksaHitung,
  risikoTinggi: false,
  templatGambar: ['garis_bilangan', 'pecahan_batang', 'pecahan_lingkaran', 'bangun_datar', 'grid_luas', 'diagram_batang', 'piktogram', 'jam_analog', 'blok_nilai_tempat', 'penggaris'],
  aturanPenulisan: [
    'Tulis setiap pecahan dalam LaTeX sebaris, mis. $\\frac{3}{4}$, dan bilangan campuran sebagai $2\\frac{1}{3}$. Jangan menulis 3/4 di teks soal.',
    'Perkalian ditulis $\\times$, pembagian $:$ atau $\\div$ sesuai kebiasaan jenjang; jangan memakai * atau / di teks soal.',
    'Pada soal berbahasa Indonesia, desimal memakai koma (2,5) dan ribuan memakai titik (12.500).',
    'Opsi bilangan ditulis tanpa kalimat; satuan boleh ditulis di belakang bilangan (mis. 24 cm).',
    'Pengecoh berasal dari kesalahan konsep nyata: menjumlah pembilang dengan pembilang dan penyebut dengan penyebut, lupa menyamakan penyebut, salah nilai tempat, salah satuan, salah urutan operasi.',
    'Angka dalam pokok, opsi, gambar, dan pembahasan harus konsisten.',
    'Bila soal memakai gambar terprogram, bilangan yang terlihat di gambar harus berasal dari parameter gambar, dan ekspresi verifikasi sebaiknya memakai variabel gambar.',
  ],
  contohAcuan: [
    {
      bentuk: 'pilihan_ganda',
      pokok: 'Hasil dari $\\frac{3}{4} + \\frac{1}{8}$ adalah ...',
      opsi: { A: '$\\frac{7}{8}$', B: '$\\frac{4}{12}$', C: '$1$', D: '$\\frac{3}{8}$' },
      kunci: 'A',
      pembahasan: ['Samakan penyebut: $\\frac{3}{4} = \\frac{6}{8}$.', '$\\frac{6}{8} + \\frac{1}{8} = \\frac{7}{8}$.'],
      verifikasi: { tipe: 'ekspresi', ekspresi: '3/4 + 1/8', nilai: '7/8' },
      gambar: null,
    },
    {
      bentuk: 'isian_singkat',
      pokok: 'Perhatikan gambar. Pecahan yang ditunjukkan oleh bagian yang diarsir adalah ....',
      kunci: '$\\frac{3}{8}$',
      pembahasan: ['Batang dibagi 8 bagian sama besar.', 'Bagian yang diarsir ada 3, jadi pecahannya $\\frac{3}{8}$.'],
      verifikasi: { tipe: 'ekspresi', ekspresi: 'pecahan', nilai: '3/8' },
      gambar: { templat: 'pecahan_batang', parameter: { penyebut: 8, diarsir: 3 } },
    },
    {
      bentuk: 'benar_salah',
      pokok: '$\\frac{5}{8}$ lebih besar daripada $\\frac{3}{4}$.',
      kunci: 'S',
      pembahasan: ['$\\frac{3}{4} = \\frac{6}{8}$.', 'Karena $5 < 6$, maka $\\frac{5}{8} < \\frac{3}{4}$. Pernyataan salah.'],
      verifikasi: { tipe: 'perbandingan', kiri: '5/8', relasi: '>', kanan: '3/4' },
      gambar: null,
    },
  ],
};
