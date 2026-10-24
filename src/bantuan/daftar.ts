// Bantuan di aplikasi: satu tugas per video (1–3 menit), dengan langkah teks di bawahnya.
// youtube_id null berarti video belum direkam; langkah teks tetap tampil dan aplikasi tetap jalan tanpa internet.

export interface VideoBantuan {
  id: string;
  judul: string;
  durasi: string;
  youtube_id: string | null;
  langkah: string[];
}

export const BANTUAN: Record<string, VideoBantuan> = {
  'kunci-api': {
    id: 'kunci-api',
    judul: 'Memasang kunci API',
    durasi: '2 menit',
    youtube_id: null,
    langkah: [
      'Buka halaman kunci API penyedia (tautan ada di bawah kolom kunci).',
      'Buat akun bila belum punya, lalu buat kunci baru khusus GenSoal.',
      'Atur batas pengeluaran di akun penyedia bila penyedia berbayar.',
      'Salin kunci dan tempel di kolom Kunci API.',
      'Tekan Uji kunci. Bila berfungsi, pilih model utama dan model cadangan.',
    ],
  },
  'soal-pertama': {
    id: 'soal-pertama',
    judul: 'Membuat soal pertama',
    durasi: '3 menit',
    youtube_id: null,
    langkah: [
      'Pilih kurikulum, kelas, dan mata pelajaran.',
      'Tulis TP satu per baris, atau tekan Ambil dari kurikulum resmi.',
      'Atur jumlah soal dan persentase mudah, sedang, sulit.',
      'Pilih bentuk soal, bahasa, gaya, dan pilihan gambar.',
      'Centang Simpan sebagai preset bila ingin memakai isian yang sama lain kali, lalu tekan Generate.',
      'Telaah soal di layar Peninjauan, lalu unduh Word atau PDF dari layar Ekspor.',
    ],
  },
  'kurikulum-sendiri': {
    id: 'kurikulum-sendiri',
    judul: 'Menulis kurikulum sendiri',
    durasi: '2 menit',
    youtube_id: null,
    langkah: [
      'Di formulir Buat soal, pilih Kurikulum: Kustom saya.',
      'Isi nama kurikulum, kelas, mata pelajaran, dan rumpun mapel (rumpun menentukan pemeriksa jawaban).',
      'Tulis CP (boleh kosong) dan TP satu per baris. Ikuti saran pemeriksa TP agar rumusan jelas.',
      'Simpan sebagai preset agar lain kali cukup pilih preset lalu Generate.',
    ],
  },
  cadangan: {
    id: 'cadangan',
    judul: 'Cadangan dan pindah perangkat',
    durasi: '1 menit',
    youtube_id: null,
    langkah: [
      'Buka layar Cadangan lalu tekan Unduh berkas .gensoal.',
      'Simpan berkas di Google Drive, flashdisk, atau surel Anda sendiri.',
      'Di perangkat baru, buka GenSoal, masuk ke Cadangan, lalu pilih Impor dan berkas .gensoal.',
      'Kunci API tidak ikut cadangan; pasang ulang di Pengaturan AI.',
    ],
  },
};
