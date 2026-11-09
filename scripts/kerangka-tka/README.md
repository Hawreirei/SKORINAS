# Kerangka asesmen TKA dari situs pusmendik

Data `src/ujian/data/kerangka-tka.json` dan `kerangka-ringkas.json` diambil dari
https://pusmendik.kemendikdasmen.go.id/tka/kerangka/{sd,smp,sma}/ (76 halaman: mapel wajib SD, SMP, SMA dan
semua mapel pilihan termasuk program keahlian SMK), 9 November 2026.

Langkah mengulang (Python 3 dengan beautifulsoup4 dan lxml; server pusmendik tidak mengirim sertifikat perantara
DigiCert Global G2 TLS RSA SHA256 2020 CA1, jadi sertifikat itu diambil dari cacerts.digicert.com dan ditambahkan ke
bundel CA, tanpa mematikan verifikasi TLS):

1. Unduh `/tka/kerangka/{sd,smp,sma}/`, ambil setiap tautan `?jenis=...&mapel=...`, simpan ke `hal/<jenjang>_<jenis>_<mapel>.html`.
2. Unduh daftar nama mapel dari halaman SMA ke `nama.json` (slug → nama).
3. `python3 urai.py` mengurai tabel "Matriks Asesmen" (rowspan diperhitungkan) dan bagian Definisi, Muatan, Kompetensi ke `kerangka.json`.
4. `python3 bangun.py` merapikan teks, memecah daftar butir sub-elemen, dan menulis `keluar/kerangka-tka.json` serta `keluar/kerangka-ringkas.json`.

`bangun.py` memuat tambalan untuk bagian halaman resmi yang terpotong atau tanpa tabel (Matematika SMA bagian
Peluang, Matematika Tingkat Lanjut bagian Kalkulus, Kimia dari teks Muatan); baris tambalan bertanda `"tambalan": true`.
