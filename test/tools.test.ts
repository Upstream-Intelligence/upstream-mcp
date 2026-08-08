import { describe, it, expect, vi, afterEach } from 'vitest';
import { UpstreamDataClient } from '../src/client.js';
import { dispatchTool } from '../src/dispatch.js';
import { ToolInputError } from '../src/errors.js';
import {
  catalogGetActiveModel,
  catalogGetDatasetSchema,
  catalogListDatasets,
  catalogListPacks,
} from '../src/tools/catalog.js';
import { synthesizeCreateDataset, synthesizeDownloadDataset } from '../src/tools/synthesize.js';
import {
  playgroundDiagnostic,
  playgroundEvaluate,
  playgroundGenerate,
  playgroundGetSamples,
  playgroundLiveDataMedicareFee,
  playgroundLiveDataNcci,
  playgroundLiveDataNpi,
  playgroundRecoverDelivery,
  playgroundScoreDenialRisk,
  playgroundScoreWhatIf,
} from '../src/tools/playground.js';
import type { ToolDefinition } from '../src/tools/types.js';

const ALL_TOOLS: ToolDefinition[] = [
  catalogListPacks,
  catalogListDatasets,
  catalogGetDatasetSchema,
  catalogGetActiveModel,
  synthesizeCreateDataset,
  synthesizeDownloadDataset,
  playgroundGetSamples,
  playgroundGenerate,
  playgroundEvaluate,
  playgroundScoreDenialRisk,
  playgroundScoreWhatIf,
  playgroundDiagnostic,
  playgroundRecoverDelivery,
  playgroundLiveDataNpi,
  playgroundLiveDataNcci,
  playgroundLiveDataMedicareFee,
];

const KEYED_ENV = { UPSTREAM_DATA_API_KEY: 'test_key' };

function makeFetchMock(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function lastCalledUrl(mockFetch: ReturnType<typeof vi.fn>): URL {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1]?.[0] as URL;
}

function lastRequestInit(mockFetch: ReturnType<typeof vi.fn>): RequestInit {
  return mockFetch.mock.calls[mockFetch.mock.calls.length - 1]?.[1] as RequestInit;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('tool surface', () => {
  it('exposes exactly 16 tools with unique names and schemas', () => {
    expect(ALL_TOOLS).toHaveLength(16);
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(16);
    for (const tool of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema['type']).toBe('object');
    }
  });

  it('marks the public tools as not requiring a key', () => {
    const publicTools = [
      catalogListPacks,
      catalogListDatasets,
      catalogGetDatasetSchema,
      catalogGetActiveModel,
      playgroundGetSamples,
    ];
    for (const tool of publicTools) {
      expect(tool.requiresKey).toBe(false);
    }
    for (const tool of ALL_TOOLS.filter((t) => !publicTools.includes(t))) {
      expect(tool.requiresKey).toBe(true);
    }
  });
});

describe('auth fail-fast', () => {
  it('fails key-gated tools with an actionable message and no network call', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    const res = await dispatchTool(new UpstreamDataClient({}), ALL_TOOLS, 'synthesize_create_dataset', {
      specialty: 'aba',
    });

    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('UPSTREAM_DATA_API_KEY');
    expect(res.content[0]?.text).toContain('synthesize_create_dataset');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('lets public tools run without a key', async () => {
    const mockFetch = makeFetchMock(200, { claim_types: [] });
    vi.stubGlobal('fetch', mockFetch);

    const res = await dispatchTool(new UpstreamDataClient({}), ALL_TOOLS, 'catalog_list_packs', {});

    expect(res.isError).toBeUndefined();
    expect(res.content[0]?.text).toContain('claim_types');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('returns isError for unknown tools', async () => {
    const res = await dispatchTool(new UpstreamDataClient({}), ALL_TOOLS, 'nope_tool', {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('Unknown tool: nope_tool');
  });

  it('surfaces structured API errors (code, message, recovery) in the tool response', async () => {
    const mockFetch = makeFetchMock(400, {
      error: {
        code: 'ROWS_LIMIT_EXCEEDED',
        message: 'playground generate is limited to 1000 rows',
        recovery: 'Use synthesize_create_dataset for larger batches',
      },
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await dispatchTool(new UpstreamDataClient(KEYED_ENV), ALL_TOOLS, 'playground_generate', {
      specialty: 'aba',
      rows: 1000,
    });

    expect(res.isError).toBe(true);
    const text = res.content[0]?.text ?? '';
    expect(text).toContain('ROWS_LIMIT_EXCEEDED');
    expect(text).toContain('limited to 1000 rows');
    expect(text).toContain('Recovery: Use synthesize_create_dataset for larger batches');
  });
});

describe('catalog tools', () => {
  it('catalog_list_packs hits /api/v1/packs', async () => {
    const mockFetch = makeFetchMock(200, { claim_types: [] });
    vi.stubGlobal('fetch', mockFetch);

    await catalogListPacks.execute(new UpstreamDataClient({}), {});
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/packs');
  });

  it('catalog_list_datasets hits /api/v1/data/catalog', async () => {
    const mockFetch = makeFetchMock(200, { datasets: [] });
    vi.stubGlobal('fetch', mockFetch);

    await catalogListDatasets.execute(new UpstreamDataClient({}), {});
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/data/catalog');
  });

  it('catalog_get_dataset_schema interpolates the slug', async () => {
    const mockFetch = makeFetchMock(200, { columns: [] });
    vi.stubGlobal('fetch', mockFetch);

    await catalogGetDatasetSchema.execute(new UpstreamDataClient({}), { slug: 'aba' });
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/data/catalog/aba/schema');
  });

  it('catalog_get_dataset_schema rejects a missing slug before any network call', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await expect(catalogGetDatasetSchema.execute(new UpstreamDataClient({}), {})).rejects.toThrow(
      ToolInputError,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('catalog_get_dataset_schema encodes traversal attempts in the slug', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await catalogGetDatasetSchema.execute(new UpstreamDataClient({}), { slug: '../admin/x' });
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/data/catalog/..%2Fadmin%2Fx/schema');
  });

  it('catalog_get_active_model hits /api/v1/models/active', async () => {
    const mockFetch = makeFetchMock(200, { model_id: 'm' });
    vi.stubGlobal('fetch', mockFetch);

    await catalogGetActiveModel.execute(new UpstreamDataClient({}), {});
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/models/active');
  });
});

describe('synthesize tools', () => {
  it('synthesize_create_dataset POSTs specialty, rows, and scenario', async () => {
    const mockFetch = makeFetchMock(200, { dataset_id: 'ds_1' });
    vi.stubGlobal('fetch', mockFetch);

    await synthesizeCreateDataset.execute(new UpstreamDataClient(KEYED_ENV), {
      specialty: 'aba',
      rows: 500,
      scenario: 'authorization_surge',
    });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/synthesize');
    expect(lastRequestInit(mockFetch).method).toBe('POST');
    expect(JSON.parse(String(lastRequestInit(mockFetch).body))).toEqual({
      specialty: 'aba',
      rows: 500,
      scenario: 'authorization_surge',
    });
  });

  it('synthesize_create_dataset omits unset optional fields', async () => {
    const mockFetch = makeFetchMock(200, { dataset_id: 'ds_1' });
    vi.stubGlobal('fetch', mockFetch);

    await synthesizeCreateDataset.execute(new UpstreamDataClient(KEYED_ENV), { specialty: 'dental' });

    expect(JSON.parse(String(lastRequestInit(mockFetch).body))).toEqual({ specialty: 'dental' });
  });

  it('synthesize_create_dataset requires specialty', async () => {
    await expect(
      synthesizeCreateDataset.execute(new UpstreamDataClient(KEYED_ENV), { rows: 100 }),
    ).rejects.toThrow(ToolInputError);
  });

  it('synthesize_create_dataset rejects non-integer rows', async () => {
    await expect(
      synthesizeCreateDataset.execute(new UpstreamDataClient(KEYED_ENV), { specialty: 'aba', rows: 2.5 }),
    ).rejects.toThrow(ToolInputError);
  });

  it('synthesize_download_dataset GETs the encoded dataset path', async () => {
    const mockFetch = makeFetchMock(200, { url: 'https://download' });
    vi.stubGlobal('fetch', mockFetch);

    await synthesizeDownloadDataset.execute(new UpstreamDataClient(KEYED_ENV), { dataset_id: 'ds 1' });
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/synthesize/ds%201/download');
  });
});

describe('playground tools', () => {
  it('playground_get_samples hits the public samples endpoint', async () => {
    const mockFetch = makeFetchMock(200, { samples: [] });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundGetSamples.execute(new UpstreamDataClient({}), {});
    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/samples');
  });

  it('playground_generate POSTs to the inline generation endpoint', async () => {
    const mockFetch = makeFetchMock(200, { rows: [] });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundGenerate.execute(new UpstreamDataClient(KEYED_ENV), {
      specialty: 'aba',
      rows: 250,
      seed: 42,
    });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/generate');
    expect(JSON.parse(String(lastRequestInit(mockFetch).body))).toEqual({
      specialty: 'aba',
      rows: 250,
      seed: 42,
    });
  });

  it('playground_generate rejects rows above 1000 locally', async () => {
    const mockFetch = makeFetchMock(200, {});
    vi.stubGlobal('fetch', mockFetch);

    await expect(
      playgroundGenerate.execute(new UpstreamDataClient(KEYED_ENV), { specialty: 'aba', rows: 5000 }),
    ).rejects.toThrow(/1000/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('playground_evaluate passes the seed through for the same-seed dance', async () => {
    const mockFetch = makeFetchMock(200, { score: 0.9 });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundEvaluate.execute(new UpstreamDataClient(KEYED_ENV), { specialty: 'dental', seed: 7 });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/evaluate');
    expect(JSON.parse(String(lastRequestInit(mockFetch).body))).toEqual({ specialty: 'dental', seed: 7 });
  });

  it('playground_score_denial_risk requires payer, cpt, and charge_amount', async () => {
    const client = new UpstreamDataClient(KEYED_ENV);
    await expect(
      playgroundScoreDenialRisk.execute(client, { payer: 'Aetna', cpt: '97153' }),
    ).rejects.toThrow(/charge_amount/);
    await expect(
      playgroundScoreDenialRisk.execute(client, { cpt: '97153', charge_amount: 350 }),
    ).rejects.toThrow(/payer/);
  });

  it('playground_score_denial_risk POSTs claim fields and passes extras through', async () => {
    const mockFetch = makeFetchMock(200, { denial_probability: 0.31 });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundScoreDenialRisk.execute(new UpstreamDataClient(KEYED_ENV), {
      payer: 'Aetna',
      cpt: '97153',
      charge_amount: 350,
      has_prior_auth: true,
      network_status: 'in_network',
    });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/score-denial-risk');
    const body = JSON.parse(String(lastRequestInit(mockFetch).body)) as Record<string, unknown>;
    expect(body['payer']).toBe('Aetna');
    expect(body['has_prior_auth']).toBe(true);
  });

  it('playground_score_what_if POSTs the base claim with what_if overrides', async () => {
    const mockFetch = makeFetchMock(200, { delta: -0.12 });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundScoreWhatIf.execute(new UpstreamDataClient(KEYED_ENV), {
      payer: 'UHC',
      cpt: '97155',
      charge_amount: 200,
      what_if: { has_prior_auth: true },
    });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/score-what-if');
    const body = JSON.parse(String(lastRequestInit(mockFetch).body)) as Record<string, unknown>;
    expect(body['what_if']).toEqual({ has_prior_auth: true });
  });

  it('playground_diagnostic requires payer and cpt', async () => {
    await expect(
      playgroundDiagnostic.execute(new UpstreamDataClient(KEYED_ENV), { payer: 'Aetna' }),
    ).rejects.toThrow(/cpt/);
  });

  it('playground_recover_delivery POSTs the dataset_id', async () => {
    const mockFetch = makeFetchMock(200, { url: 'https://fresh-link' });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundRecoverDelivery.execute(new UpstreamDataClient(KEYED_ENV), { dataset_id: 'ds_9' });

    expect(lastCalledUrl(mockFetch).pathname).toBe('/api/v1/playground/recover-delivery');
    expect(JSON.parse(String(lastRequestInit(mockFetch).body))).toEqual({ dataset_id: 'ds_9' });
  });

  it('playground_recover_delivery rejects a missing dataset_id', async () => {
    await expect(
      playgroundRecoverDelivery.execute(new UpstreamDataClient(KEYED_ENV), {}),
    ).rejects.toThrow(ToolInputError);
  });
});

describe('live data tools', () => {
  it('playground_live_data_npi sends the npi query param', async () => {
    const mockFetch = makeFetchMock(200, { name: 'Dr. Example' });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundLiveDataNpi.execute(new UpstreamDataClient(KEYED_ENV), { npi: '1234567890' });

    const url = lastCalledUrl(mockFetch);
    expect(url.pathname).toBe('/api/v1/playground/live-data/npi');
    expect(url.searchParams.get('npi')).toBe('1234567890');
  });

  it('playground_live_data_npi requires npi', async () => {
    await expect(
      playgroundLiveDataNpi.execute(new UpstreamDataClient(KEYED_ENV), {}),
    ).rejects.toThrow(ToolInputError);
  });

  it('playground_live_data_ncci sends both cpt params', async () => {
    const mockFetch = makeFetchMock(200, { allowed: true });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundLiveDataNcci.execute(new UpstreamDataClient(KEYED_ENV), {
      cpt_a: '97153',
      cpt_b: '97155',
    });

    const url = lastCalledUrl(mockFetch);
    expect(url.pathname).toBe('/api/v1/playground/live-data/ncci');
    expect(url.searchParams.get('cpt_a')).toBe('97153');
    expect(url.searchParams.get('cpt_b')).toBe('97155');
  });

  it('playground_live_data_medicare_fee sends the cpt param', async () => {
    const mockFetch = makeFetchMock(200, { rate: 62.5 });
    vi.stubGlobal('fetch', mockFetch);

    await playgroundLiveDataMedicareFee.execute(new UpstreamDataClient(KEYED_ENV), { cpt: '97153' });

    const url = lastCalledUrl(mockFetch);
    expect(url.pathname).toBe('/api/v1/playground/live-data/medicare-fee');
    expect(url.searchParams.get('cpt')).toBe('97153');
  });
});
