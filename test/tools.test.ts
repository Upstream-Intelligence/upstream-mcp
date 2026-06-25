import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpstreamAPIClient, UPSTREAM_DATA_CONFIG } from '../src/client.js';
import { UpstreamAPIError } from '../src/errors.js';
import { checkNcciEdits } from '../src/tools/check_ncci_edits.js';
import { checkPriorAuthReadiness } from '../src/tools/check_prior_auth_readiness.js';
import { lookupDenialCode } from '../src/tools/lookup_denial_code.js';
import { lookupFeeSchedule } from '../src/tools/lookup_fee_schedule.js';
import { getDenialClusters } from '../src/tools/get_denial_clusters.js';
import { getModelScores } from '../src/tools/benchmark.js';
import {
  getDatasetReadiness,
  getDatasetRealism,
  getDatasetScenarios,
  getDatasetSchema,
  getDatasetSources,
  listDatasets,
} from '../src/tools/synthetic_data.js';

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

  it('passes an AbortSignal on every request for timeout enforcement', async () => {
    const mockFetch = makeFetchMock(200, { ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await apiClient.get('/api/v1/public/carc/97/');

    const [, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledInit.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws a 504 UpstreamAPIError with a timeout message when the request aborts', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    try {
      await apiClient.get('/api/v1/public/carc/97/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      const apiError = err as UpstreamAPIError;
      expect(apiError.statusCode).toBe(504);
      expect(apiError.message.toLowerCase()).toContain('timed out');
    }
  });

  it('returns a generic message on 5xx without leaking the server body', async () => {
    const leakyBody = { detail: 'Traceback: /app/secret/internal.py line 42 boom' };
    const mockFetch = makeFetchMock(500, leakyBody);
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    try {
      await apiClient.get('/api/v1/public/carc/97/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      const apiError = err as UpstreamAPIError;
      expect(apiError.statusCode).toBe(500);
      expect(apiError.message).toBe('Upstream API error (HTTP 500)');
      expect(apiError.message).not.toContain('Traceback');
      expect(apiError.message).not.toContain('internal.py');
    }
  });

  it('still surfaces the server body on 4xx for structured client errors', async () => {
    const mockFetch = makeFetchMock(400, { detail: 'cpt is required' });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    try {
      await apiClient.get('/api/v1/public/carc/97/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      const apiError = err as UpstreamAPIError;
      expect(apiError.statusCode).toBe(400);
      expect(apiError.message).toContain('cpt is required');
    }
  });

  it('rejects construction when UPSTREAM_BASE_URL uses an unsupported protocol', () => {
    process.env['UPSTREAM_BASE_URL'] = 'ftp://x';
    expect(() => new UpstreamAPIClient()).toThrow();
  });

  it('rejects construction for non-localhost http base URLs', () => {
    process.env['UPSTREAM_BASE_URL'] = 'http://evil.example.com';
    expect(() => new UpstreamAPIClient()).toThrow();
  });

  it('accepts the https default base URL', () => {
    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    expect(() => new UpstreamAPIClient()).not.toThrow();
  });

  it('accepts http for localhost dev', () => {
    process.env['UPSTREAM_BASE_URL'] = 'http://localhost:8000';
    expect(() => new UpstreamAPIClient()).not.toThrow();
  });

  it('warns on stderr when constructed without an API key', () => {
    delete process.env['UPSTREAM_API_KEY'];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    new UpstreamAPIClient();

    expect(errSpy).toHaveBeenCalledOnce();
    expect(errSpy.mock.calls[0]?.[0]).not.toContain('UPSTREAM_API_KEY');
  });
});

// ---------------------------------------------------------------------------
// UpstreamAPIClient configured for the Upstream Data synthetic service
// (separate host + key from the platform API; data.upstream.cx is marketing)
// ---------------------------------------------------------------------------

describe('UpstreamAPIClient (Upstream Data service config)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['UPSTREAM_DATA_SERVICE_URL'];
    delete process.env['UPSTREAM_DATA_API_KEY'];
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('defaults to the upstream-data Railway host and sends UPSTREAM_DATA_API_KEY', async () => {
    process.env['UPSTREAM_DATA_API_KEY'] = 'data_key_xyz';
    const mockFetch = makeFetchMock(200, { synthetic_only: true });
    vi.stubGlobal('fetch', mockFetch);

    const dataClient = new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);
    await dataClient.get('/api/v1/data/catalog/');

    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(calledUrl.toString()).toBe('https://upstream-data-production.up.railway.app/api/v1/data/catalog/');
    expect(calledInit.headers['X-API-Key']).toBe('data_key_xyz');
  });

  it('does not read the platform UPSTREAM_API_KEY for the data service', async () => {
    process.env['UPSTREAM_API_KEY'] = 'platform_sk_key'; // must NOT leak onto the data service
    const mockFetch = makeFetchMock(200, { synthetic_only: true });
    vi.stubGlobal('fetch', mockFetch);

    const dataClient = new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);
    await dataClient.get('/api/v1/data/catalog/');

    const [, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(calledInit.headers['X-API-Key']).toBeUndefined();
  });

  it('honors a localhost UPSTREAM_DATA_SERVICE_URL override for dev', () => {
    process.env['UPSTREAM_DATA_SERVICE_URL'] = 'http://localhost:9000';
    expect(() => new UpstreamAPIClient(UPSTREAM_DATA_CONFIG)).not.toThrow();
  });

  it('rejects a non-localhost http data service URL', () => {
    process.env['UPSTREAM_DATA_SERVICE_URL'] = 'http://evil.example.com';
    expect(() => new UpstreamAPIClient(UPSTREAM_DATA_CONFIG)).toThrow();
  });

  it('returns a generic 5xx message labeled for the data service, no body leak', async () => {
    process.env['UPSTREAM_DATA_API_KEY'] = 'data_key';
    const mockFetch = makeFetchMock(500, { detail: 'boom internal traceback' });
    vi.stubGlobal('fetch', mockFetch);

    const dataClient = new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);
    try {
      await dataClient.get('/api/v1/data/catalog/aba/schema/');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).message).toBe('Upstream Data error (HTTP 500)');
      expect((err as UpstreamAPIError).message).not.toContain('boom');
    }
  });

  it('warns without logging the data-service env var name', () => {
    delete process.env['UPSTREAM_DATA_API_KEY'];
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);

    expect(errSpy).toHaveBeenCalledOnce();
    expect(errSpy.mock.calls[0]?.[0]).not.toContain('UPSTREAM_DATA_API_KEY');
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
// Path-arg encoding (injection / traversal hardening)
// ---------------------------------------------------------------------------

describe('path-arg encoding', () => {
  beforeEach(() => {
    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'test_key';
  });
  afterEach(() => vi.restoreAllMocks());

  it('encodes a CARC code containing a slash so it cannot traverse the path', async () => {
    const mockFetch = makeFetchMock(200, { ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await lookupDenialCode.execute(apiClient, { code: '../admin/97' });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.pathname).toBe('/api/v1/public/carc/..%2Fadmin%2F97/');
    expect(calledUrl.pathname).not.toContain('/admin/');
  });

  it('encodes a CPT code containing a space', async () => {
    const mockFetch = makeFetchMock(200, { ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await lookupFeeSchedule.execute(apiClient, { cpt: '97 153' });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.pathname).toBe('/api/v1/public/fee-schedule/97%20153/');
  });
});

// ---------------------------------------------------------------------------
// get_denial_clusters (lookback as query param, not raw path interpolation)
// ---------------------------------------------------------------------------

describe('getDenialClusters.execute', () => {
  beforeEach(() => {
    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'test_key';
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends lookback_days as an encoded query param, not raw path interpolation', async () => {
    const mockFetch = makeFetchMock(200, { clusters: [] });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await getDenialClusters.execute(apiClient, { lookback_days: 90 });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.pathname).toBe('/api/v1/denial-clusters/');
    expect(calledUrl.searchParams.get('lookback_days')).toBe('90');
  });

  it('defaults lookback_days to 30 when omitted', async () => {
    const mockFetch = makeFetchMock(200, { clusters: [] });
    vi.stubGlobal('fetch', mockFetch);

    const apiClient = new UpstreamAPIClient();
    await getDenialClusters.execute(apiClient, {});

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.searchParams.get('lookback_days')).toBe('30');
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

// ---------------------------------------------------------------------------
// Synthetic data tools
// ---------------------------------------------------------------------------

describe('synthetic data (dataset catalog) tools', () => {
  beforeEach(() => {
    process.env = { ...process.env };
    process.env['UPSTREAM_DATA_API_KEY'] = 'data_key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function dataClient() {
    return new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);
  }

  it('list_datasets calls the live data-service catalog without embedding rows', async () => {
    const mockFetch = makeFetchMock(200, {
      synthetic_only: true,
      catalog: { listing_count: 20, listings: [] },
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await listDatasets.execute(dataClient());

    expect(result).toEqual({
      synthetic_only: true,
      catalog: { listing_count: 20, listings: [] },
    });
    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.toString()).toBe(
      'https://upstream-data-production.up.railway.app/api/v1/data/catalog/',
    );
  });

  it('routes each dataset detail tool to /api/v1/data/catalog/{slug}/{suffix}', async () => {
    const mockFetch = makeFetchMock(200, { synthetic_only: true, no_phi: true });
    vi.stubGlobal('fetch', mockFetch);

    const c = dataClient();
    await getDatasetSchema.execute(c, { dataset_id: 'aba' });
    await getDatasetSources.execute(c, { dataset_id: 'aba' });
    await getDatasetScenarios.execute(c, { dataset_id: 'aba' });
    await getDatasetRealism.execute(c, { dataset_id: 'aba' });
    await getDatasetReadiness.execute(c, { dataset_id: 'aba' });

    const paths = mockFetch.mock.calls.map(([url]) => (url as URL).pathname);
    expect(paths).toEqual([
      '/api/v1/data/catalog/aba/schema/',
      '/api/v1/data/catalog/aba/sources/',
      '/api/v1/data/catalog/aba/scenarios/',
      '/api/v1/data/catalog/aba/realism/',
      '/api/v1/data/catalog/aba/readiness/',
    ]);
  });

  it('encodes the dataset_id slug so it cannot traverse the path', async () => {
    const mockFetch = makeFetchMock(200, { ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await getDatasetSchema.execute(dataClient(), { dataset_id: '../admin/x' });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.pathname).toBe('/api/v1/data/catalog/..%2Fadmin%2Fx/schema/');
    expect(calledUrl.pathname).not.toContain('/admin/');
  });

  it('propagates a 401 on a paid detail tool when no data key is set', async () => {
    delete process.env['UPSTREAM_DATA_API_KEY'];
    const mockFetch = makeFetchMock(401, { detail: 'API key required' });
    vi.stubGlobal('fetch', mockFetch);

    try {
      await getDatasetSources.execute(dataClient(), { dataset_id: 'aba' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(401);
    }
  });

  it('marks every dataset tool for the data service, not the platform API', () => {
    for (const tool of [
      listDatasets,
      getDatasetSchema,
      getDatasetSources,
      getDatasetScenarios,
      getDatasetRealism,
      getDatasetReadiness,
    ]) {
      expect(tool.service).toBe('data');
    }
  });

  it('documents synthetic-only and no-PHI boundaries with no pack vocabulary', () => {
    const blob = [
      listDatasets,
      getDatasetSchema,
      getDatasetSources,
      getDatasetScenarios,
      getDatasetRealism,
      getDatasetReadiness,
    ]
      .map((tool) => `${tool.name} ${tool.description}`)
      .join('\n')
      .toLowerCase();

    expect(blob).toContain('synthetic');
    expect(blob).toContain('phi');
    expect(blob).not.toContain('de-identified');
    expect(blob).not.toContain('pack');
    expect(blob).toContain('not as proof of observed real payer frequencies');
  });
});

// ---------------------------------------------------------------------------
// checkPriorAuthReadiness tool (D2 contract)
// ---------------------------------------------------------------------------

describe('checkPriorAuthReadiness.execute', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls GET /data/v1/prior-auth-readiness/ with payer and cpt query params', async () => {
    const mockFetch = makeFetchMock(200, {
      coverage_state: 'active',
      prior_auth_required: true,
      readiness_state: 'ready_when_assembled',
    });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    const result = await checkPriorAuthReadiness.execute(apiClient, { payer: 'Aetna', cpt: '97153' });

    expect(result).toEqual({
      coverage_state: 'active',
      prior_auth_required: true,
      readiness_state: 'ready_when_assembled',
    });

    const [calledUrl, calledInit] = mockFetch.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(calledUrl.pathname).toBe('/data/v1/prior-auth-readiness/');
    expect(calledUrl.searchParams.get('payer')).toBe('Aetna');
    expect(calledUrl.searchParams.get('cpt')).toBe('97153');
    expect(calledInit.headers['X-API-Key']).toBe('sk_test_key');
  });

  it('sends optional line_of_business and conditions when provided', async () => {
    const mockFetch = makeFetchMock(200, { readiness_state: 'no_prior_auth_required' });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    await checkPriorAuthReadiness.execute(apiClient, {
      payer: 'UHC',
      cpt: '97155',
      line_of_business: 'commercial',
      conditions: 'F84.0,F84.5',
    });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.searchParams.get('line_of_business')).toBe('commercial');
    expect(calledUrl.searchParams.get('conditions')).toBe('F84.0,F84.5');
  });

  it('does NOT send line_of_business or conditions when omitted', async () => {
    const mockFetch = makeFetchMock(200, { readiness_state: 'ready_when_assembled' });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    await checkPriorAuthReadiness.execute(apiClient, { payer: 'Cigna', cpt: '97153' });

    const [calledUrl] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(calledUrl.searchParams.has('line_of_business')).toBe(false);
    expect(calledUrl.searchParams.has('conditions')).toBe(false);
  });

  it('returns readiness_state unknown verbatim (HTTP 200, not thrown, not remapped)', async () => {
    const unknownBody = { readiness_state: 'unknown', coverage_state: 'active', prior_auth_required: null };
    const mockFetch = makeFetchMock(200, unknownBody);
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    const result = await checkPriorAuthReadiness.execute(apiClient, { payer: 'Anthem', cpt: '97153' });

    expect(result).toEqual(unknownBody);
  });

  it('rejects with UpstreamAPIError statusCode 404 on not-found response', async () => {
    const mockFetch = makeFetchMock(404, { detail: 'Not found' });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    try {
      await checkPriorAuthReadiness.execute(apiClient, { payer: 'Aetna', cpt: '97153' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(404);
    }
  });

  it('rejects with UpstreamAPIError statusCode 401 on unauthorized response', async () => {
    const mockFetch = makeFetchMock(401, { detail: 'Unauthorized' });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    try {
      await checkPriorAuthReadiness.execute(apiClient, { payer: 'Aetna', cpt: '97153' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(401);
    }
  });

  it('rejects with UpstreamAPIError statusCode 400 on bad request response', async () => {
    const mockFetch = makeFetchMock(400, { detail: 'payer is required' });
    vi.stubGlobal('fetch', mockFetch);

    process.env['UPSTREAM_BASE_URL'] = 'https://api.upstream.cx';
    process.env['UPSTREAM_API_KEY'] = 'sk_test_key';

    const apiClient = new UpstreamAPIClient();
    try {
      await checkPriorAuthReadiness.execute(apiClient, { payer: '', cpt: '97153' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(400);
    }
  });
});

// ---------------------------------------------------------------------------
// Benchmark tools (getModelScores filtering)
// ---------------------------------------------------------------------------

describe('getModelScores.execute', () => {
  const mockLeaderboard = {
    leaderboard: [
      { rank: 1, model: 'claude-opus-4-8', accuracy: 0.94, f1: 0.92 },
      { rank: 2, model: 'gpt-4o', accuracy: 0.91, f1: 0.89 },
    ],
  };

  beforeEach(() => {
    process.env = { ...process.env };
    process.env['UPSTREAM_DATA_API_KEY'] = 'data_key';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns full leaderboard when no model_id specified', async () => {
    const mockFetch = makeFetchMock(200, mockLeaderboard);
    vi.stubGlobal('fetch', mockFetch);

    const result = await getModelScores.execute(new UpstreamAPIClient(UPSTREAM_DATA_CONFIG));
    expect(result).toEqual(mockLeaderboard);
  });

  it('returns single model entry when model_id matches', async () => {
    const mockFetch = makeFetchMock(200, mockLeaderboard);
    vi.stubGlobal('fetch', mockFetch);

    const result = await getModelScores.execute(
      new UpstreamAPIClient(UPSTREAM_DATA_CONFIG),
      { model_id: 'gpt-4o' },
    );
    expect(result).toEqual(mockLeaderboard.leaderboard[1]);
  });

  it('throws UpstreamAPIError 404 when model_id not found', async () => {
    const mockFetch = makeFetchMock(200, mockLeaderboard);
    vi.stubGlobal('fetch', mockFetch);

    try {
      await getModelScores.execute(
        new UpstreamAPIClient(UPSTREAM_DATA_CONFIG),
        { model_id: 'nonexistent' },
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(404);
    }
  });

  it('throws UpstreamAPIError 502 when leaderboard is missing from response', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    try {
      await getModelScores.execute(
        new UpstreamAPIClient(UPSTREAM_DATA_CONFIG),
        { model_id: 'claude-opus-4-8' },
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(UpstreamAPIError);
      expect((err as UpstreamAPIError).statusCode).toBe(502);
    }
  });

  it('marks benchmark tools for the data service', () => {
    expect(getModelScores.service).toBe('data');
  });
});
