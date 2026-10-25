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
      'Di layar Buat, isi kelas, topik atau mata pelajaran, dan jumlah soal.',
      'Bila perlu, tulis CP dan TP (satu TP satu baris); jumlah soal dibagi ke tiap TP.',
      'Buka Pengaturan lanjutan untuk mengubah komposisi mudah, sedang, sulit, bentuk soal, bahasa, gaya, dan gambar.',
      'Centang Simpan pengaturan ini bila ingin memakai isian yang sama lain kali, lalu tekan Buat soal.',
      'Soal muncul satu per satu. Baca sekali soal yang bertanda "Kunci tidak dicek otomatis", lalu tekan Unduh.',
      'Pilih Word atau PDF, lalu tekan tombol unduh.',
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
