// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBackendPreflight } from './backendPreflight';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.__MHUB_API_ORIGIN_OVERRIDE__;
});

describe('runBackendPreflight', () => {
  it('resolves backend origin when health probe succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ status: 'ok', db: 'connected' }))
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runBackendPreflight();

    expect(result.ok).toBe(true);
    expect(result.healthUrl).toContain('/api/health');
    expect(result.resolvedOrigin).toBe(window.location.origin);
    expect(window.__MHUB_API_ORIGIN_OVERRIDE__).toBe(window.location.origin);
  });

  it('fails fast when all health probes fail', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{"error":"Route not found"}')
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await runBackendPreflight();

    expect(result.ok).toBe(false);
    expect(result.failure).toBeTruthy();
    expect(result.failure.status).toBe(404);
  });
});
