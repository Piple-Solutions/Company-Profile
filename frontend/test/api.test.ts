import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiRequestError, api, isNotFound, isSessionExpired,
  loginErrorMessage, messageForApiError,
} from '../src/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('frontend API client error contract', () => {
  it('preserves HTTP status, stable API code, message, and field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: {
        code: 'VALIDATION_ERROR',
        message_id: 'Data tidak valid.',
        fields: { name: 'Nama minimal 2 karakter' },
      },
    }, 400)));

    const err = await api('/api/v1/test').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Data tidak valid.',
      fields: { name: 'Nama minimal 2 karakter' },
    });
  });

  it('turns a network failure into a distinct NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const err = await api('/api/v1/test').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(messageForApiError(err)).toContain('Tidak dapat menghubungi server');
  });

  it('maps 429, 5xx, 404, and expired sessions to honest messages', () => {
    expect(messageForApiError(new ApiRequestError('RATE_LIMITED', 429, 'Terlalu banyak.')))
      .toContain('Terlalu banyak permintaan');
    expect(messageForApiError(new ApiRequestError('INTERNAL_ERROR', 503, 'Internal')))
      .toContain('Server sedang bermasalah');
    const missing = new ApiRequestError('NOT_FOUND', 404, 'Data tidak ditemukan.');
    expect(messageForApiError(missing)).toBe('Data tidak ditemukan.');
    expect(isNotFound(missing)).toBe(true);
    expect(isSessionExpired(new ApiRequestError('UNAUTHENTICATED', 401, 'Sesi tidak valid.'))).toBe(true);
  });

  it('does not present rate limits or outages as bad login credentials', () => {
    expect(loginErrorMessage(new ApiRequestError('UNAUTHENTICATED', 401, 'Email atau kata sandi salah.')))
      .toBe('Email atau kata sandi salah.');
    expect(loginErrorMessage(new ApiRequestError('RATE_LIMITED', 429, 'Terlalu banyak.')))
      .toContain('Terlalu banyak percobaan masuk');
    expect(loginErrorMessage(new ApiRequestError('INTERNAL_ERROR', 500, 'Internal')))
      .toContain('Server sedang bermasalah');
    expect(loginErrorMessage(new ApiRequestError('NETWORK_ERROR', 0, 'Network')))
      .toContain('Tidak dapat menghubungi server');
  });

  it('returns a successful empty array as success, not an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })));
    await expect(api<{ data: unknown[] }>('/api/v1/products')).resolves.toEqual({ data: [] });
  });
});
