// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Dialog } from '../src/komponen/Dialog';
import { PenyediaKonfirmasi, useKonfirmasi } from '../src/komponen/Konfirmasi';
import { MenuLainnya } from '../src/komponen/MenuLainnya';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let wadah: HTMLDivElement;
let akar: Root;
beforeEach(() => {
  wadah = document.createElement('div');
  document.body.append(wadah);
  akar = createRoot(wadah);
});
afterEach(() => {
  act(() => akar.unmount());
  wadah.remove();
});
const pasang = (el: React.ReactNode) => act(() => akar.render(el));
const tekan = (key: string) => act(() => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
const klik = (el: Element) => act(() => (el as HTMLElement).click());
const tombol = (teks: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === teks)!;

describe('MenuLainnya', () => {
  const dipilih: string[] = [];
  const menu = (adaHapus: boolean) => (
    <MenuLainnya
      butir={[
        { label: 'Ganti soal…', onClick: () => dipilih.push('ganti') },
        null,
        { label: 'Buat ulang…', onClick: () => dipilih.push('ulang') },
        adaHapus && { label: 'Hapus soal…', bahaya: true, onClick: () => dipilih.push('hapus') },
      ]}
    />
  );
  const butir = () => [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];

  it('melewati butir kosong, fokus ke butir pertama, dan berpindah dengan panah', () => {
    pasang(menu(true));
    const pemicu = wadah.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
    klik(pemicu);
    expect(pemicu.getAttribute('aria-expanded')).toBe('true');
    expect(butir().map((b) => b.textContent)).toEqual(['Ganti soal…', 'Buat ulang…', 'Hapus soal…']);
    expect(document.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe(pemicu.id);
    expect(document.activeElement).toBe(butir()[0]);
    tekan('ArrowDown');
    expect(document.activeElement).toBe(butir()[1]);
    tekan('End');
    expect(document.activeElement).toBe(butir()[2]);
    tekan('ArrowDown');
    expect(document.activeElement).toBe(butir()[0]);
    tekan('ArrowUp');
    expect(document.activeElement).toBe(butir()[2]);
    expect(butir()[2].className).toContain('text-buruk');
  });

  it('Escape menutup dan mengembalikan fokus ke tombol; butir menjalankan aksinya', () => {
    pasang(menu(false));
    const pemicu = wadah.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
    klik(pemicu);
    expect(butir()).toHaveLength(2);
    tekan('Escape');
    expect(butir()).toHaveLength(0);
    expect(document.activeElement).toBe(pemicu);
    klik(pemicu);
    tekan('ArrowDown');
    klik(document.activeElement!);
    expect(dipilih.at(-1)).toBe('ulang');
    expect(butir()).toHaveLength(0);
  });

  it('varian ikon tetap bernama untuk pembaca layar', () => {
    pasang(<MenuLainnya ikon label="Aksi paket Penjumlahan pecahan" butir={[{ label: 'Buka', onClick: () => {} }]} />);
    const pemicu = wadah.querySelector('[aria-haspopup="menu"]')!;
    expect(pemicu.getAttribute('aria-label')).toBe('Aksi paket Penjumlahan pecahan');
    expect(pemicu.textContent).toBe('⋯');
  });
});

describe('Dialog', () => {
  it('judul terhubung lewat aria-labelledby, kaki tampil, fokus kembali ke pemicu', () => {
    function Uji() {
      const [buka, setBuka] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setBuka(true)}>
            Sunting…
          </button>
          <Dialog buka={buka} tutup={() => setBuka(false)} judul="Sunting soal" kaki={<button type="button">Simpan</button>}>
            isi
          </Dialog>
        </>
      );
    }
    pasang(<Uji />);
    const pemicu = tombol('Sunting…');
    pemicu.focus();
    klik(pemicu);
    const d = document.querySelector('dialog')!;
    expect(d.hasAttribute('open')).toBe(true);
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)!.textContent).toBe('Sunting soal');
    expect(tombol('Simpan')).toBeTruthy();
    klik(tombol('Tutup'));
    expect(d.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(pemicu);
  });
});

describe('Konfirmasi', () => {
  const jawaban: boolean[] = [];
  function Uji() {
    const konfirmasi = useKonfirmasi();
    return (
      <button type="button" onClick={async () => jawaban.push(await konfirmasi({ judul: 'Hapus paket "Pecahan"?', pesan: 'Paket pindah ke tong sampah.', aksi: 'Hapus paket', bahaya: true }))}>
        Hapus…
      </button>
    );
  }

  it('menyebut item dan akibatnya, fokus awal di Batal, dan menjawab ya atau tidak', async () => {
    pasang(
      <PenyediaKonfirmasi>
        <Uji />
      </PenyediaKonfirmasi>,
    );
    const pemicu = tombol('Hapus…');
    pemicu.focus();
    klik(pemicu);
    const d = document.querySelector('dialog')!;
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)!.textContent).toBe('Hapus paket "Pecahan"?');
    expect(d.textContent).toContain('Paket pindah ke tong sampah.');
    expect(document.activeElement).toBe(tombol('Batal'));
    expect(tombol('Hapus paket').className).toContain('tombol-bahaya');
    await act(async () => tombol('Hapus paket').click());
    expect(jawaban).toEqual([true]);
    expect(d.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(pemicu);

    klik(pemicu);
    await act(async () => tombol('Batal').click());
    expect(jawaban).toEqual([true, false]);
  });
});
