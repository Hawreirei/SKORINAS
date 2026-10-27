import { describe, expect, it } from 'vitest';
import { gabungModel, jenisModel } from '../src/ai/registri';
import type { ModelRegistri, PenyediaRegistri } from '../src/ai/tipe';

function model(id: string, status: ModelRegistri['status']): ModelRegistri {
  return { id, label: id, status, tingkat: 'gratis', harga: null, golden: { status: 'belum', tanggal: null }, catatan: '' };
}

function penyedia(model: ModelRegistri[]): PenyediaRegistri {
  return { id: 'gemini', nama: 'Uji', tingkat_gratis: true, situs_kunci: 'https://contoh.id', awalan_kunci: '', peringatan_biaya: '', peringatan_privasi: '', akses: 'langsung', model };
}

const langsung = (...id: string[]) => id.map((x) => ({ id: x, nama: x }));

describe('jenis model', () => {
  it('model teks dari berbagai penyedia', () => {
    for (const id of ['gemini-3.8-flash', 'gemma-4-31b-it', 'openai/gpt-oss-120b', 'mistral-small-latest', 'pixtral-large-latest', 'claude-sonnet-5-5', 'gpt-6-luna', 'google/gemma-4-31b-it:free', 'openrouter/free']) expect(jenisModel(id), id).toBe('teks');
  });

  it('model gambar dan video', () => {
    for (const id of ['gemini-2.5-flash-image', 'imagen-4.0-generate-001', 'gpt-image-1', 'dall-e-3', 'veo-3.0-generate-preview', 'sora-2', 'black-forest-labs/flux-1.1-pro', 'google/gemini-2.5-flash-image-preview']) expect(jenisModel(id), id).toBe('gambar');
  });

  it('model suara', () => {
    for (const id of ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-native-audio-preview', 'whisper-large-v3', 'gpt-4o-mini-transcribe', 'gpt-realtime', 'voxtral-small-latest', 'playai-tts', 'gemini-live-2.5-flash']) expect(jenisModel(id), id).toBe('suara');
  });

  it('model lain yang tidak menulis soal', () => {
    for (const id of ['gemini-embedding-001', 'text-embedding-3-small', 'mistral-embed', 'omni-moderation-latest', 'meta-llama/llama-guard-4-12b', 'mistral-ocr-latest', 'aqa', 'gemini-robotics-er-1.5-preview', 'gemini-2.5-computer-use-preview', 'gpt-4o-search-preview', 'davinci-002']) expect(jenisModel(id), id).toBe('lain');
  });
});

describe('gabung model', () => {
  it('hanya model teks stabil dari registri yang disarankan; sisanya tetap ada tetapi tidak disarankan', () => {
    const p = penyedia([model('gemini-3.8-flash', 'stabil'), model('gemini-3.5-flash', 'stabil'), model('gemma-4-31b-it', 'pratinjau'), model('gemini-1.0-pro', 'usang')]);
    const baris = gabungModel(p, langsung('gemini-3.8-flash', 'gemini-3.5-flash', 'gemma-4-31b-it', 'gemini-9-eksperimen', 'gemini-2.5-flash-image', 'gemini-2.5-flash-preview-tts', 'gemini-embedding-001'));
    expect(baris.filter((b) => b.disarankan).map((b) => b.id)).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash']);
    expect(baris.filter((b) => !b.disarankan && b.jenis === 'teks').map((b) => b.id)).toEqual(['gemma-4-31b-it', 'gemini-9-eksperimen']);
    expect(Object.fromEntries(baris.filter((b) => b.jenis !== 'teks').map((b) => [b.id, b.jenis]))).toEqual({ 'gemini-2.5-flash-image': 'gambar', 'gemini-2.5-flash-preview-tts': 'suara', 'gemini-embedding-001': 'lain' });
    expect(baris.some((b) => b.id === 'gemini-1.0-pro')).toBe(false);
  });

  it('model registri yang tidak tersedia untuk kunci ini tidak disarankan', () => {
    const p = penyedia([model('gemini-3.8-flash', 'stabil'), model('gemini-3.5-flash', 'stabil')]);
    const baris = gabungModel(p, langsung('gemini-3.5-flash'));
    expect(baris.filter((b) => b.disarankan).map((b) => b.id)).toEqual(['gemini-3.5-flash']);
  });

  it('penyedia yang registrinya hanya berisi pratinjau tetap punya model disarankan', () => {
    const p = { ...penyedia([model('openrouter/free', 'pratinjau'), model('google/gemma-4-31b-it:free', 'pratinjau')]), id: 'openrouter' as const };
    const baris = gabungModel(p, langsung('google/gemma-4-31b-it:free', 'meta-llama/llama-5-70b', 'google/gemini-2.5-flash-image'));
    expect(baris.filter((b) => b.disarankan).map((b) => b.id)).toEqual(['openrouter/free', 'google/gemma-4-31b-it:free']);
    expect(baris.find((b) => b.id === 'meta-llama/llama-5-70b')?.disarankan).toBe(false);
  });

  it('sebelum kunci diuji, model registri tetap disarankan', () => {
    const baris = gabungModel(penyedia([model('gemini-3.8-flash', 'stabil')]), null);
    expect(baris[0]).toMatchObject({ id: 'gemini-3.8-flash', tersedia: null, disarankan: true, jenis: 'teks' });
  });
});
