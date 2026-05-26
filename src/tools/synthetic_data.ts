import { UpstreamAPIClient } from '../client.js';

const PACK_ID_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    pack_id: {
      type: 'string',
      description: 'Synthetic data pack id, for example "aba", "dental", or "snf-ma".',
    },
  },
  required: ['pack_id'],
} as const;

function packPath(packId: string, suffix: string) {
  return `/api/v1/data/packs/${encodeURIComponent(packId)}/${suffix}/`;
}

export const listSyntheticDataPacks = {
  name: 'list_synthetic_data_packs',
  description:
    'List Upstream Data synthetic healthcare data packs with public-safe catalog metadata. ' +
    'Returns metadata only; never returns PHI, customer data, or generated dataset rows.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(client: UpstreamAPIClient) {
    return client.get('/api/v1/data/catalog/');
  },
};

export const getSyntheticPackSchema = {
  name: 'get_synthetic_pack_schema',
  description:
    'Get the public schema for one generated-from-scratch synthetic claims data pack. ' +
    'Use this for QA, demos, and agent evaluation without embedding real patient data.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'schema'));
  },
};

export const getSyntheticPackSources = {
  name: 'get_synthetic_pack_sources',
  description:
    'Paid API-key tool. Get source/provenance coverage for a synthetic data pack. ' +
    'Returns source summaries only, not proprietary payer distributions, generated rows, or real-payer-truth claims.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'sources'));
  },
};

export const getSyntheticPackScenarios = {
  name: 'get_synthetic_pack_scenarios',
  description:
    'Paid API-key tool. Get buyer-relevant synthetic scenario templates for one pack, such as payer tightening, ' +
    'authorization surge, documentation crackdown, reimbursement slowdown, and regional friction.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'scenarios'));
  },
};

export const getSyntheticPackReadiness = {
  name: 'get_synthetic_pack_readiness',
  description:
    'Paid API-key tool. Get commercial readiness and safety metadata for one synthetic pack. ' +
    'Preserves synthetic-only wording and no-PHI/no-customer-data boundaries.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'readiness'));
  },
};
