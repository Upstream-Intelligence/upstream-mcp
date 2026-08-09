import type { UpstreamDataClient } from '../client.js';
import { asArgs, requireString } from './validate.js';
import type { ToolDefinition } from './types.js';

// Catalog tools: the public discovery surface of the Upstream Data API.
// Verified live 2026-08: /api/v1/packs, /api/v1/models/active return 200 with no key;
// /api/v1/data/catalog currently answers 401 API_KEY_REQUIRED without one, so these
// tools do not require a key locally but pass the API's structured error through.

export const catalogListPacks: ToolDefinition = {
  name: 'catalog_list_packs',
  description:
    'List the Upstream Data pack catalog: available claim types with their scenario ' +
    'templates, plus pricing tiers with row volumes. Public — no API key required. ' +
    'Use this first to discover which specialties and scenarios synthesize_create_dataset ' +
    'and playground_generate accept.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  requiresKey: false,
  async execute(client: UpstreamDataClient) {
    return client.get('/api/v1/packs');
  },
};

export const catalogListDatasets: ToolDefinition = {
  name: 'catalog_list_datasets',
  description:
    'List the synthetic dataset catalog (general procedural and specialty datasets such ' +
    'as specialty-clinic, oncology, pain-management) with catalog metadata per entry. ' +
    'Public — no API key required. Use catalog_get_dataset_schema with a slug from this ' +
    'listing to inspect column layouts before generating data.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  requiresKey: false,
  async execute(client: UpstreamDataClient) {
    return client.get('/api/v1/data/catalog');
  },
};

export const catalogGetDatasetSchema: ToolDefinition = {
  name: 'catalog_get_dataset_schema',
  description:
    'Get the schema (columns, types, value distributions) for one synthetic dataset by ' +
    'catalog slug, e.g. "specialty-clinic", "oncology", or "pain-management". Public — ' +
    'no API key required. Returns a 404 structured error for an unknown slug.',
  inputSchema: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        description: 'Dataset slug from catalog_list_datasets, e.g. "specialty-clinic", "oncology", "pain-management".',
      },
    },
    required: ['slug'],
  },
  requiresKey: false,
  async execute(client: UpstreamDataClient, args: unknown) {
    const slug = requireString(asArgs(args), 'slug');
    return client.get(`/api/v1/data/catalog/${encodeURIComponent(slug)}/schema`);
  },
};

export const catalogGetActiveModel: ToolDefinition = {
  name: 'catalog_get_active_model',
  description:
    'Get the currently deployed denial-risk model: model_id, version, training date, AUC, ' +
    'sample/feature counts, and the serve-time feature list. Public — no API key required. ' +
    'Use to confirm which model playground_score_denial_risk will run before scoring.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  requiresKey: false,
  async execute(client: UpstreamDataClient) {
    return client.get('/api/v1/models/active');
  },
};
