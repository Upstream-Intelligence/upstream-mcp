import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpstreamAPIClient } from '../src/client.js';
import { UpstreamAPIError } from '../src/errors.js';
import { checkNcciEdits } from '../src/tools/check_ncci_edits.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpstreamAPIClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      UPSTREAM_BASE_URL: 'https://api.upstream.cx',
      UPSTREAM_API_KEY: 'test_key_abc123',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('sends correct URL and X-API-Key header on GET', async () => {
    const mockFetch = makeFetchMock(200, { result: 'ok' });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await apiClient.get('/api/v1/public/carc/97/');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];

    expect(calledUrl.toString()).toBe('https://api.upstream.cx/api/v1/public/carc/97/');
    expect(calledInit.headers['X-API-Key']).toBe('test_key_abc123');
    expect(calledInit.headers['Content-Type']).toBe('application/json');
    expect(calledInit.method).toBe('GET');
  });

  it('appends query params to GET request URL', async () => {
    const mockFetch = makeFetchMock(200, { allowed: true });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await apiClient.get('/api/v1/public/ncci/check/', { cpt_a: '97153', cpt_b: '97155' });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.searchParams.get('cpt_a')).toBe('97153');
    expect(calledUrl.searchParams.get('cpt_b')).toBe('97155');
  });

  it('omits X-API-Key header when no key is set', async () => {
    delete process.env['UPSTREAM_API_KEY'];
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await apiClient.get('/api/v1/public/carc/16/');

    const [, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(calledInit.headers['X-API-Key']).toBeUndefined();
  });

  it('throws UpstreamAPIError with status 429 on quota exceeded', async () => {
    const mockFetch = makeFetchMock(429, { tier: 'free' });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await expect(apiClient.get('/api/v1/public/carc/97/')).rejects.toThrow(UpstreamAPIError);
  });

  it('includes tier name and upgrade URL in 429 error message', async () => {
    const mockFetch = makeFetchMock(429, { tier: 'starter' });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    try {
      await apiClient.get('/api/v1/public/carc/97/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      const apiError = err as UpstreamAPIError;
      expect(apiError.statusCode).toBe(429);
      expect(apiError.message).toContain('starter');
      expect(apiError.message).toContain('https://upstream.cx/developers/keys');
    }
  });

  it('throws UpstreamAPIError on non-ok response', async () => {
    const mockFetch = makeFetchMock(404, { detail: 'Not found' });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    try {
      await apiClient.get('/api/v1/public/carc/9999/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(404);
    }
  });

  it('sends JSON body and correct method on POST', async () => {
    const mockFetch = makeFetchMock(200, { risk_score: 0.42 });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    const payload = { payer: 'Aetna', cpt_codes: ['97153'] };
    await apiClient.post('/api/v1/public/claim-scan/', payload);

    const [, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledInit.method).toBe('POST');
    expect(calledInit.body).toBe(JSON.stringify(payload));
  });
});

// ---------------------------------------------------------------------------
// checkNcciEdits tool
// ---------------------------------------------------------------------------

describe('checkNcciEdits.execute', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls GET with correct cpt_a and cpt_b query params', async () => {
    const mockFetch = makeFetchMock(200, { edit_type: 'PTP', modifier_allowed: true });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'test_key';

    const apiClient = new UpstreamAPIClient();
    const result = await checkNcciEdits.execute(apiClient, { cpt_a: '97153', cpt_b: '97155' });

    expect(result).toEqual({ edit_type: 'PTP', modifier_allowed: true });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.pathname).toBe('/api/v1/public/ncci/check/');
    expect(calledUrl.searchParams.get('cpt_a')).toBe('97153');
    expect(calledUrl.searchParams.get('cpt_b')).toBe('97155');
  });
});

// ---------------------------------------------------------------------------
// UpstreamAPIError
// ---------------------------------------------------------------------------

describe('UpstreamAPIError', () => {
  it('sets name, message, and statusCode correctly', () => {
    const err = new UpstreamAPIError('Something went wrong', 403);
    expect(err.name).toBe('UpstreamAPIError');
    expect(err.message).toBe('Something went wrong');
    expect(err.statusCode).toBe(403);
    expect(err).toBeInstanceOf(Error);
  });
});
