# Rekap Desain UI/UX: A-Level Set Builder

Panduan desain yang diambil dari kode web ini (`src/index.css`, `src/app/components/`, `src/app/pages/`), untuk diterapkan di web lain yang serupa.

## 1. Fondasi teknis

| Aspek | Yang dipakai |
|---|---|
| Stack | React 19, Tailwind CSS v4 (`@tailwindcss/vite`), React Router |
| Ikon | Tanpa library ikon. Hanya karakter teks: `Σ`, `✕`, `⋯`, `▾`, `✓`, `🔒`, `★`, `+`/`−` |
| Font | Font sistem (`ui-sans-serif, system-ui, Segoe UI, Roboto`). `font-serif` khusus untuk tampilan "kertas", `font-mono` untuk nama model |
| Gaya umum | Minimalis, rapi, nuansa SaaS/alat kerja. Tanpa ilustrasi, gradien, atau animasi berat |

## 2. Design token (warna dan tema)

Didefinisikan di `src/index.css`:

```css
@import 'tailwindcss';
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --color-brand-50:  #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-500: #6366f1;  /* focus ring */
  --color-brand-600: #4f46e5;  /* tombol utama, item aktif */
  --color-brand-700: #4338ca;  /* hover */
}

@layer base {
  html { color-scheme: light; }
  html.dark { color-scheme: dark; }
  body { @apply bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100; }
}
```

- **Brand:** indigo. **Netral:** slate.
- **Warna status** (semantik, konsisten di semua halaman):
  - Info / sedang berjalan → brand (indigo)
  - Peringatan / dijeda / perlu dicek → amber
  - Error / hapus → red
  - Sukses / selesai → emerald
  - Draft → slate
- **Permukaan per tema:**
  - Light: latar `slate-50`, kartu `white`, border `slate-200`
  - Dark: latar `slate-950`, kartu `slate-900`, border `slate-800`

### Mode gelap

- Ada tiga pilihan: Auto, Light, Dark. Satu tombol di header menggilir ketiganya (`ThemeToggle.tsx`).
- Pilihan disimpan di `localStorage` (`src/app/theme.ts`).
- Script kecil di `index.html` memasang class `.dark` **sebelum halaman pertama dirender**, jadi tidak ada kedipan terang/gelap:

```html
<script>
  try {
    const t = localStorage.getItem('theme')
    const dark =
      t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  } catch {}
</script>
```

- `color-scheme` ikut diatur supaya scrollbar dan input bawaan browser ikut gelap.

## 3. Komponen dasar (utility classes)

```css
@utility card {
  @apply rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900;
}
@utility btn {
  @apply inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50;
}
@utility btn-primary {
  @apply btn bg-brand-600 text-white hover:bg-brand-700;
}
@utility btn-secondary {
  @apply btn border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700;
}
@utility btn-danger {
  @apply btn bg-red-600 text-white hover:bg-red-700;
}
```

**Input standar:**

```
w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm
focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30
disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800
```

**Skala radius:** `rounded-xl` untuk kartu dan modal, `rounded-lg` untuk tombol dan input, `rounded-md` untuk segmen, `rounded-full` untuk chip dan badge.

**Tipografi:**

| Elemen | Class |
|---|---|
| Judul halaman (H1) | `text-2xl font-semibold tracking-tight` |
| Judul kartu (H2) | `font-semibold` |
| Isi | `text-sm` |
| Petunjuk / hint | `text-xs text-slate-500 dark:text-slate-400` |
| Angka | `tabular-nums` |

## 4. Komponen form

Semua ada di `src/app/components/form.tsx`. Bisa disalin langsung.

| Komponen | Kegunaan dan pola |
|---|---|
| `Field` | Label `text-sm font-medium`, lalu input, lalu hint abu-abu. Kalau ada error, hint diganti teks merah |
| `TextInput`, `TextArea`, `NumberInput`, `Select` | Membungkus `Field`. Label dan input dihubungkan dengan `useId()` |
| `Segmented` | Pilihan 2–4 opsi (pengganti radio). Wadah ber-border, opsi aktif `bg-brand-600 text-white`, `role="radiogroup"` |
| `Chips` | Multi-pilih berbentuk pil `rounded-full`, memakai `aria-pressed` |
| `Toggle` | Checkbox dengan `accent-brand-600`, label tebal, hint di bawahnya |
| `Slider` | Range input, nilainya tampil di kanan (bisa diformat, misalnya "Board-like" atau "Creative") |
| `Section` | Kartu yang bisa dilipat. Judul dan subjudul jadi tombol, ada `+`/`−` di kanan, memakai `aria-expanded` |
| `Notice` | Kotak pesan dengan 4 nada: info, warn, error, success. Nada error memakai `role="alert"`, lainnya `role="status"` |

Warna `Notice`:

```ts
const cls = {
  info: 'border-brand-100 bg-brand-50 dark:border-brand-700 dark:bg-brand-600/10',
  warn: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40',
  error: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40',
  success: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
}
```

## 5. Komponen interaktif lain

- **Modal** (`Modal.tsx`)
  - Overlay `bg-slate-950/50`, isinya memakai class `card`.
  - Lebar `max-w-lg`, atau `max-w-3xl` kalau prop `wide` dipakai.
  - Fokus otomatis pindah ke input pertama dan kembali ke elemen semula saat ditutup. Tombol Escape menutup modal.
  - Footer berisi tombol rata kanan.
- **Menu dropdown** (`Menu.tsx`)
  - Tombol "More ▾" atau "⋯" membuka daftar aksi.
  - Tertutup saat memilih, saat klik di luar, atau saat menekan Escape.
  - Item berbahaya berwarna merah. Item bisa disembunyikan secara kondisional (`false` atau `null` di daftar item).
- **Badge status:** `rounded-full px-2.5 py-1 text-xs` dengan warna dari satu peta status pusat (`sessionStatus.ts`). Label dan warna ditentukan di satu tempat.
- **Progress bar:** `h-2 rounded-full`, isinya brand. Berubah amber saat sedang menunggu rate limit. Memakai `role="progressbar"` dengan `aria-valuenow`.
- **Tab:** garis bawah `border-b-2`. Tab aktif `border-brand-600 text-brand-700`, memakai `role="tablist"`/`"tab"`. Tab aktif disimpan di URL (`?tab=`) supaya bisa dibagikan dan tetap ada setelah refresh.
- **Navigasi cepat:** deretan tombol kecil Q1, Q2, … yang scroll halus ke item. Item bermasalah diberi border amber.

Contoh peta status pusat:

```ts
export const STATUS_LABEL = {
  draft: 'Not started',
  running: 'Generating',
  'paused-limit': 'Paused: limit reached',
  'paused-manual': 'Paused',
  error: 'Needs attention',
  complete: 'Complete',
}

export const STATUS_CLASS = {
  draft: 'bg-slate-100 dark:bg-slate-800',
  running: 'bg-brand-100 text-brand-700 dark:bg-brand-600/30 dark:text-brand-100',
  'paused-limit': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'paused-manual': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  complete: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
}
```

## 6. Layout dan struktur halaman

**Kerangka aplikasi** (`Layout.tsx`):

- Tautan "Skip to content" di paling atas (untuk aksesibilitas).
- Header sticky `h-14`, semi-transparan (`bg-white/90 backdrop-blur dark:bg-slate-900/90`).
  - Logo: kotak brand `h-8 w-8 rounded-lg bg-brand-600` berisi satu simbol (Σ), lalu nama aplikasi (disembunyikan di layar kecil).
  - Navigasi di kanan. Item aktif memakai `bg-brand-50 text-brand-700`, item lain `text-slate-600 hover:bg-slate-100`.
  - Tombol tema, dan tombol "Menu" di layar `< xl` yang membuka navigasi vertikal.
- Area konten `mx-auto max-w-6xl px-4 py-8`.
- Footer kecil di tengah (`text-xs text-slate-500`) berisi disclaimer dan keterangan privasi ("All data stays in this browser").

**Header halaman** (`PageHeader`): judul dan subjudul satu kalimat di kiri, tombol aksi utama di kanan. Pola ini dipakai di setiap halaman.

```tsx
<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
  </div>
  {actions && <div className="flex gap-2">{actions}</div>}
</div>
```

**Pola grid yang dipakai berulang:**

| Pola | Class | Dipakai di |
|---|---|---|
| Konten + sidebar sticky | `grid gap-6 lg:grid-cols-[1fr_320px]`, sidebar `lg:sticky lg:top-20 lg:self-start` | Halaman *New set* (form + panel rencana), Dashboard |
| Kotak statistik | `grid gap-4 sm:grid-cols-3` | Dashboard |
| Form multi-kolom | `grid gap-4 md:grid-cols-2` / `md:grid-cols-3` | Isi form |
| Daftar | `divide-y divide-slate-200 dark:divide-slate-800`, baris berisi nama tebal + meta abu-abu + badge status di kanan | Saved sets, Recent sets |

## 7. Pola UX per halaman

| Halaman | Pola yang bisa ditiru |
|---|---|
| **Dashboard** | 3 kartu statistik yang bisa diklik (kartu berubah amber kalau ada yang perlu perhatian), daftar 5 item terbaru, kartu "How it works" 3 langkah bernomor. Langkah yang sudah selesai jadi ✓ hijau |
| **Form buat baru** | Kartu **Essentials** hanya berisi field penting. Sisanya di balik satu tombol **More options** (status buka/tutupnya diingat). Ada bar **preset** di atas. Sidebar **Plan** menampilkan biaya, waktu, dan jumlah request **sebelum** aksi, daftar error/peringatan, lalu satu tombol utama lebar penuh ("Generate"). Draft tersimpan otomatis |
| **Daftar (Saved sets)** | Kotak pencarian + filter Segmented (All / Unfinished / Complete), baris dengan menu ⋯ (rename, duplicate, export, delete) |
| **Halaman detail** | Satu tombol utama tetap terlihat ("Download"), aksi lain di menu **More ▾**. Ada panel progres (stop, continue, budget). Banner amber "N item perlu dicek" punya tombol perbaikan massal. Aksi per item: Edit, Rewrite, dan sisanya di ⋯ |
| **Settings** | Dibagi per kartu: tampilan, backup, dan **Danger zone** di paling bawah (judul merah, tombol `btn-danger`) |
| **Gate / lock** | Kalau syarat belum terpenuhi (misalnya belum ada API key), pengguna langsung diarahkan ke halaman pengaturannya. Halaman Help dan Settings tetap bisa dibuka |

## 8. Prinsip UX yang konsisten

1. **Progressive disclosure.** Yang penting tampil duluan, opsi lanjutan disembunyikan (More options, Section yang terlipat, `<details>` untuk rincian teknis, menu ⋯).
2. **Satu aksi utama per layar.** Hanya satu tombol `btn-primary` per area. Sisanya secondary atau masuk menu.
3. **Transparansi sebelum aksi.** Biaya, waktu, dan jumlah request ditampilkan dulu. Peringatan merah muncul kalau estimasi melewati budget.
4. **Tidak ada pekerjaan yang hilang.** Tersimpan otomatis. Proses bisa dihentikan dan dilanjutkan. Ada peringatan `beforeunload` saat proses sedang berjalan.
5. **Status selalu jelas.** Label manusiawi ("Paused: limit reached", "Needs attention") dengan warna semantik yang sama di semua halaman.
6. **Empty state yang membantu.** Contoh: "No sets yet. Make your first set." dengan tautan ke aksinya. Teks loading cukup "Loading…".
7. **Konfirmasi untuk aksi destruktif.** Pesannya menyebut nama item dan akibatnya ("This cannot be undone").
8. **Umpan balik inline.** Pesan `Notice` setelah aksi ("Question 3 saved."), error tepat di bawah field, dan "Spec is ready." berwarna hijau.

## 9. Gaya penulisan (UX copy)

- Bahasa sederhana dan langsung. Tanpa jargon di label utama, jargon hanya muncul di hint.
- Label tombol berupa kata kerja singkat: *Generate, Continue, Stop and save, Download, Rewrite…*
- Tombol yang membuka dialog diberi `…` (misalnya *Rewrite…*). Saat sedang proses, labelnya berubah (*Starting…*, *Stopping…*).
- Subjudul halaman satu kalimat yang menjelaskan fungsi halaman dan, kalau relevan, soal privasi.
- Hint menjelaskan **akibat** dari sebuah pilihan, misalnya "Deeper explanations use more tokens."

## 10. Aksesibilitas

- Skip link, `aria-label` pada nav, `aria-expanded`, `aria-pressed`, `aria-checked`, dan `aria-live="polite"` pada panel progres.
- Focus ring `focus-visible` berwarna brand di semua tombol.
- Modal punya `aria-modal`, judulnya terhubung lewat `aria-labelledby`, dan fokus dikelola.
- Setiap input punya label. Status tidak hanya disampaikan lewat warna, tapi juga lewat teks.

## 11. Mode cetak / dokumen

- `.paper`: area dokumen yang **selalu hitam di atas putih**, bahkan di mode gelap, memakai font serif seperti kertas asli.

```css
@utility paper {
  @apply rounded-xl border border-slate-200 bg-white p-5 font-serif text-[15px] text-slate-900 shadow-sm sm:p-10 dark:border-slate-700;
}
```

- Di `@media print`, header, footer, tab, dan semua yang berclass `.no-print` disembunyikan. Ada helper `.page-break` (`break-before: page`) dan `.keep-together` (`break-inside: avoid`).

## Checklist untuk web baru

1. Salin blok `@theme`, `@layer base`, dan `@utility` dari `src/index.css`. Ganti warna `brand-*` sesuai merek baru.
2. Salin script anti-kedip tema dari `index.html` dan `src/app/theme.ts`.
3. Salin `Layout.tsx`, `PageHeader.tsx`, `form.tsx`, `Modal.tsx`, `Menu.tsx`, dan `ThemeToggle.tsx`. Ganti isi `NAV` dan logo.
4. Buat satu peta status pusat (label + class warna), seperti `sessionStatus.ts`.
5. Pakai pola: Essentials + More options + sidebar ringkasan sticky untuk form panjang, dan aksi utama + menu "More" untuk halaman detail.
