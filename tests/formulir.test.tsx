// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { kontras, MODE, tokenMode } from './bantu-kontras';
import { BagianLipat, IsianTeks, Pemberitahuan, Pilihan, Sakelar, WARNA_NADA, type NadaPemberitahuan } from '../src/komponen/Formulir';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let wadah: HTMLDivElement;
let akar: Root;
beforeEach(() => {
  wadah = document.createElement('div');
  document.body.append(wadah);
  akar = createRoot(wadah);
  localStorage.clear();
});
afterEach(() => {
  act(() => akar.unmount());
  wadah.remove();
});
const pasang = (el: React.ReactNode) => act(() => akar.render(el));

describe('Bidang', () => {
  it('menghubungkan label, isian, dan petunjuk', () => {
    pasang(<IsianTeks label="Topik atau mata pelajaran" petunjuk="mis. Matematika" value="" onChange={() => {}} />);
    const isian = wadah.querySelector('input')!;
    const label = wadah.querySelector('label')!;
    expect(label.htmlFor).toBe(isian.id);
    expect(document.getElementById(isian.getAttribute('aria-describedby')!)!.textContent).toBe('mis. Matematika');
    expect(isian.hasAttribute('aria-invalid')).toBe(false);
  });

  it('galat menggantikan petunjuk dan menandai isian tidak sah', () => {
    pasang(<IsianTeks label="Topik" petunjuk="mis. Matematika" galat="Isi topik atau mata pelajaran." value="" onChange={() => {}} />);
    const isian = wadah.querySelector('input')!;
    expect(isian.getAttribute('aria-invalid')).toBe('true');
    const ket = document.getElementById(isian.getAttribute('aria-describedby')!)!;
    expect(ket.textContent).toBe('Isi topik atau mata pelajaran.');
    expect(wadah.textContent).not.toContain('mis. Matematika');
  });
});

describe('Pilihan', () => {
  function Uji() {
    const [v, setV] = useState<'docx' | 'pdf' | 'tex'>('docx');
    return (
      <Pilihan
        label="Format"
        nilai={v}
        ubah={setV}
        opsi={[
          { nilai: 'docx', label: 'Word', keterangan: 'Bisa disunting' },
          { nilai: 'pdf', label: 'PDF' },
          { nilai: 'tex', label: 'LaTeX' },
        ]}
      />
    );
  }
  const radio = () => [...wadah.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const tekan = (el: HTMLElement, key: string) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));

  it('berlabel dan hanya opsi terpilih yang dapat difokus', () => {
    pasang(<Uji />);
    const grup = wadah.querySelector('[role="radiogroup"]')!;
    expect(document.getElementById(grup.getAttribute('aria-labelledby')!)!.textContent).toBe('Format');
    expect(radio().map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(radio().map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it('panah memindah pilihan dan fokus, berputar di ujung', () => {
    pasang(<Uji />);
    tekan(radio()[0], 'ArrowRight');
    expect(radio()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio()[1]);
    tekan(radio()[1], 'End');
    expect(radio()[2].getAttribute('aria-checked')).toBe('true');
    tekan(radio()[2], 'ArrowDown');
    expect(radio()[0].getAttribute('aria-checked')).toBe('true');
    tekan(radio()[0], 'ArrowLeft');
    expect(radio()[2].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radio()[2]);
  });
});

describe('Sakelar', () => {
  it('kotak centang berlabel dengan petunjuk', () => {
    let nilai = false;
    pasang(<Sakelar label="Kunci jawaban" petunjuk="Berkas terpisah" checked={false} ubah={(v) => (nilai = v)} />);
    const kotak = wadah.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(document.getElementById(kotak.getAttribute('aria-describedby')!)!.textContent).toBe('Berkas terpisah');
    act(() => kotak.click());
    expect(nilai).toBe(true);
  });
});

describe('BagianLipat', () => {
  const isi = () => (
    <BagianLipat judul="Pengaturan lanjutan" ringkasan="3 mudah" ingat="uji">
      <p>Isi lanjutan</p>
    </BagianLipat>
  );

  it('tertutup bawaan, dibuka dengan tombol berlabel aria-expanded', () => {
    pasang(isi());
    const tombol = wadah.querySelector('button')!;
    expect(tombol.getAttribute('aria-expanded')).toBe('false');
    expect(wadah.textContent).not.toContain('Isi lanjutan');
    act(() => tombol.click());
    expect(tombol.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById(tombol.getAttribute('aria-controls')!)!.textContent).toBe('Isi lanjutan');
  });

  it('mengingat status buka per perangkat', () => {
    pasang(isi());
    act(() => wadah.querySelector('button')!.click());
    act(() => akar.unmount());
    akar = createRoot(wadah);
    pasang(isi());
    expect(wadah.querySelector('button')!.getAttribute('aria-expanded')).toBe('true');
    expect(localStorage.getItem('gensoal:lipat:uji')).toBe('1');
  });
});

describe('Pemberitahuan', () => {
  it('nada galat memakai role alert, nada lain role status', () => {
    pasang(
      <>
        <Pemberitahuan nada="galat">Gagal</Pemberitahuan>
        <Pemberitahuan nada="berhasil">Tersimpan</Pemberitahuan>
      </>,
    );
    expect(wadah.querySelector('[data-nada="galat"]')!.getAttribute('role')).toBe('alert');
    expect(wadah.querySelector('[data-nada="berhasil"]')!.getAttribute('role')).toBe('status');
  });

  // Kontras dihitung dari token asli di src/index.css untuk mode terang dan gelap.
  for (const [tema, pemilih] of MODE) {
    it(`setiap nada berkontras minimal 4,5 : 1 di mode ${tema}`, () => {
      const token = tokenMode(pemilih);
      for (const nada of Object.keys(WARNA_NADA) as NadaPemberitahuan[]) {
        const { teks, latar } = WARNA_NADA[nada];
        expect(token[teks], `${teks} di ${pemilih}`).toBeDefined();
        expect(kontras(token[teks], token[latar]), `${nada} di mode ${tema}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
