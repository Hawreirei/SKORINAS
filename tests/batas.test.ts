import { describe, expect, it } from 'vitest';
import { galatDariRespons, uraiDurasi } from '../src/ai/galat';
import { waktuResetGemini } from '../src/generasi/pengatur';

function respons(status: number, badan: unknown, kepala: Record<string, string> = {}) {
  return new Response(JSON.stringify(badan), { status, headers: kepala });
}

describe('galat batas pemakaian (429)', () => {
  it('Gemini per menit: membaca RetryInfo', async () => {
    const g = await galatDariRespons(
      respons(429, {
        error: {
          code: 429,
          message: 'You exceeded your current quota. Please retry in 37.2s.',
          status: 'RESOURCE_EXHAUSTED',
          details: [
            { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] },
            { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '37s' },
          ],
        },
      }),
      'Gemini',
    );
    expect(g.jenis).toBe('batas');
    expect(g.batas).toEqual({ tungguMs: 37000, lingkup: 'menit' });
    expect(g.message).toBe('Batas permintaan per menit Gemini tercapai.');
    expect(g.rinci).toMatch(/exceeded your current quota/);
  });

  it('Gemini per hari: kuota harian, bukan ditunggu', async () => {
    const g = await galatDariRespons(
      respons(429, {
        error: {
          message: 'You exceeded your current quota, please check your plan and billing details. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests',
          details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }],
        },
      }),
      'Gemini',
    );
    expect(g.batas?.lingkup).toBe('harian');
    expect(g.message).toMatch(/Kuota harian/);
  });

  it('penyedia gaya OpenAI: header retry-after', async () => {
    const g = await galatDariRespons(respons(429, { error: { message: 'Rate limit reached for requests' } }, { 'retry-after': '20' }), 'Groq');
    expect(g.batas).toEqual({ tungguMs: 20000, lingkup: 'menit' });
  });

  it('mengurai durasi', () => {
    expect(uraiDurasi('2m59.56s')).toBe(179560);
    expect(uraiDurasi('1.5s')).toBe(1500);
    expect(uraiDurasi('120')).toBe(120000);
    expect(uraiDurasi('abc')).toBeNull();
  });

  it('waktu reset Gemini dalam format jam', () => {
    expect(waktuResetGemini(new Date('2026-10-24T08:00:00Z'))).toMatch(/^\d{2}[.:]\d{2}$/);
  });
});
