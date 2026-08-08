import { describe, it, expect, vi, afterEach } from 'vitest';
import { UpstreamDataClient } from '../src/client.js';
import { UpstreamAPIError } from '../src/errors.js';

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

const KEYED_ENV = { UPSTREAM_DATA_API_KEY: 'test_key_abc123' };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UpstreamDataClient requests', () => {
  it('sends the X-API-Key header when the key is set', async () => {
    const mockFetch = makeFetchMock(200, { ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs');

    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(url.toString()).toBe('https://api.data.upstream.cx/api/v1/packs');
    expect(init.headers['X-API-Key']).toBe('test_key_abc123');
    expect(init.method).toBe('GET');
  });

  it('omits the X-API-Key header when no key is set', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await new UpstreamDataClient({}).get('/api/v1/packs');

    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(init.headers['X-API-Key']).toBeUndefined();
  });

  it('appends query params to GET URLs', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await new UpstreamDataClient(KEYED_ENV).get('/api/v1/playground/live-data/npi', { npi: '1234567890' });

    const [url] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get('npi')).toBe('1234567890');
  });

  it('sends a JSON body on POST', async () => {
    const mockFetch = makeFetchMock(200, { dataset_id: 'ds_1' });
    vi.stubGlobal('fetch', mockFetch);

    const payload = { specialty: 'aba', rows: 100 };
    await new UpstreamDataClient(KEYED_ENV).post('/api/v1/synthesize', payload);

    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(payload));
  });

  it('passes an AbortSignal for timeout enforcement', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs');

    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('never logs the API key', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    const key = 'super_secret_key_do_not_log';
    await new UpstreamDataClient({ UPSTREAM_DATA_API_KEY: key }).get('/api/v1/packs');

    for (const spy of [logSpy, errSpy, warnSpy]) {
      for (const call of spy.mock.calls) {
        expect(String(call[0])).not.toContain(key);
      }
    }
  });
});

describe('UpstreamDataClient structured error passthrough', () => {
  it('surfaces code, message, and recovery from the error envelope', async () => {
    const mockFetch = makeFetchMock(400, {
      error: {
        code: 'ROWS_LIMIT_EXCEEDED',
        message: 'playground generate is limited to 1000 rows',
        recovery: 'Use /api/v1/synthesize for larger batches',
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await new UpstreamDataClient(KEYED_ENV).post('/api/v1/playground/generate', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.statusCode).toBe(400);
      expect(apiErr.code).toBe('ROWS_LIMIT_EXCEEDED');
      expect(apiErr.message).toBe('playground generate is limited to 1000 rows');
      expect(apiErr.recovery).toBe('Use /api/v1/synthesize for larger batches');
      const rendered = apiErr.describe();
      expect(rendered).toContain('ROWS_LIMIT_EXCEEDED');
      expect(rendered).toContain('limited to 1000 rows');
      expect(rendered).toContain('Recovery: Use /api/v1/synthesize for larger batches');
    }
  });

  it('accepts the detail/request_id variant of the error envelope', async () => {
    const mockFetch = makeFetchMock(401, {
      error: {
        code: 'API_KEY_REQUIRED',
        detail: 'A valid X-API-Key header is required for this endpoint.',
        request_id: 'abc123',
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await new UpstreamDataClient({}).get('/api/v1/data/catalog');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.code).toBe('API_KEY_REQUIRED');
      expect(apiErr.message).toContain('X-API-Key');
      expect(apiErr.requestId).toBe('abc123');
      expect(apiErr.describe()).toContain('request_id: abc123');
    }
  });

  it('falls back to a top-level detail field when there is no error envelope', async () => {
    const mockFetch = makeFetchMock(503, { detail: 'Service is temporarily read-only during maintenance' });
    vi.stubGlobal('fetch', mockFetch);

    // 503 >= 500 is treated as a server error: generic message, no body passthrough.
    try {
      await new UpstreamDataClient(KEYED_ENV).post('/api/v1/synthesize', {});
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.statusCode).toBe(503);
      expect(apiErr.message).toBe('Upstream Data API error (HTTP 503)');
      expect(apiErr.message).not.toContain('maintenance');
    }
  });

  it('surfaces 4xx detail fields verbatim', async () => {
    const mockFetch = makeFetchMock(404, { detail: 'Dataset not found' });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await new UpstreamDataClient(KEYED_ENV).get('/api/v1/data/catalog/nope/schema');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.statusCode).toBe(404);
      expect(apiErr.message).toBe('Dataset not found');
    }
  });

  it('never leaks 5xx server bodies', async () => {
    const mockFetch = makeFetchMock(500, { detail: 'Traceback: /app/internal.py boom' });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs');
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.message).toBe('Upstream Data API error (HTTP 500)');
      expect(apiErr.message).not.toContain('Traceback');
    }
  });
});

describe('UpstreamDataClient retry policy', () => {
  it('retries a GET exactly once on a network error, then succeeds', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ recovered: true }),
        text: () => Promise.resolve('{}'),
      });
    vi.stubGlobal('fetch', mockFetch);

    const result = await new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs');

    expect(result).toEqual({ recovered: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after the single retry when the network keeps failing', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs')).rejects.toThrow('fetch failed');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('never retries a POST on network errors (non-idempotent)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      new UpstreamDataClient(KEYED_ENV).post('/api/v1/synthesize', { specialty: 'aba' }),
    ).rejects.toThrow('fetch failed');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('never retries HTTP error statuses, even on GET', async () => {
    const mockFetch = makeFetchMock(503, { detail: 'down' });
    vi.stubGlobal('fetch', mockFetch);

    await expect(new UpstreamDataClient(KEYED_ENV).get('/api/v1/packs')).rejects.toThrow(UpstreamAPIError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('maps a request timeout to a 504 UpstreamAPIError with recovery guidance', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await new UpstreamDataClient(KEYED_ENV).post('/api/v1/synthesize', {});
      expect.fail('Should have thrown');
    } catch (err) {
      const apiErr = err as UpstreamAPIError;
      expect(apiErr.statusCode).toBe(504);
      expect(apiErr.code).toBe('TIMEOUT');
      expect(apiErr.recovery).toContain('UPSTREAM_DATA_TIMEOUT_MS');
    }
    // POSTs: no retry even on timeout.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('UpstreamDataClient configuration', () => {
  it('honors a UPSTREAM_DATA_BASE_URL override', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    const client = new UpstreamDataClient({
      UPSTREAM_DATA_BASE_URL: 'https://staging.data.upstream.cx/',
    });
    await client.get('/api/v1/packs');

    const [url] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://staging.data.upstream.cx/api/v1/packs');
  });

  it('rejects a non-localhost http base URL', () => {
    expect(
      () => new UpstreamDataClient({ UPSTREAM_DATA_BASE_URL: 'http://evil.example.com' }),
    ).toThrow(/https/);
  });

  it('accepts http for localhost dev', () => {
    expect(
      () => new UpstreamDataClient({ UPSTREAM_DATA_BASE_URL: 'http://localhost:8000' }),
    ).not.toThrow();
  });

  it('rejects a malformed base URL', () => {
    expect(() => new UpstreamDataClient({ UPSTREAM_DATA_BASE_URL: 'not a url' })).toThrow();
  });

  it('falls back to the default timeout for invalid UPSTREAM_DATA_TIMEOUT_MS', () => {
    expect(
      () => new UpstreamDataClient({ UPSTREAM_DATA_TIMEOUT_MS: 'banana' }),
    ).not.toThrow();
  });

  it('exposes hasApiKey', () => {
    expect(new UpstreamDataClient(KEYED_ENV).hasApiKey).toBe(true);
    expect(new UpstreamDataClient({}).hasApiKey).toBe(false);
  });
});
