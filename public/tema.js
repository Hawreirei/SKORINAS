// Pasang tema sebelum render pertama agar mode gelap tidak berkedip terang (rancangan UI v0.5, UI-01).
// Berkas terpisah, bukan skrip sebaris, agar lolos CSP script-src 'self'. Profil di IndexedDB tetap
// sumber utama; localStorage hanya cerminnya (ditulis oleh terapkanTema di src/app/mulai.ts).
(function () {
  try {
    var tema = localStorage.getItem('gensoal:tema');
    if (!tema) return;
    var gelap = tema === 'gelap' || (tema === 'sistem' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', gelap);
  } catch (e) {
    // localStorage dapat ditolak (mode privat); tema tetap dipasang setelah profil terbaca.
  }
})();
