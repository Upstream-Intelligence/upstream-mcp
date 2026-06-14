import { UpstreamAPIClient } from '../client.js';

// The synthetic-data tools target the Upstream Data service (a separate host + key from the
// platform API). They are marked `service: 'data'` so index.ts dispatches them to the data-service
// client. The public contract is the dataset catalog: a listing keyed by dataset_id, plus per-dataset
// detail metadata. `pack` is an internal upstream-data implementation detail and never appears here.

const CATALOG_BASE = '/api/v1/data/catalog';

const DATASET_ID_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    dataset_id: {
      type: 'string',
      description:
        'Catalog dataset slug from list_datasets, for example "aba", "dental", or "snf-ma". ' +
        'This stable identifier (dataset_id) doubles as the catalog path key.',
    },
  },
  required: ['dataset_id'],
} as const;

function catalogDetailPath(datasetId: string, suffix: string) {
  return `${CATALOG_BASE}/${encodeURIComponent(datasetId)}/${suffix}/`;
}

export const listDatasets = {
  name: 'list_datasets',
  service: 'data' as const,
  description:
    'List Upstream Data synthetic healthcare datasets with public catalog metadata ' +
    '(dataset_id + specialty per entry). Returns metadata only; never returns PHI, ' +
    'customer data, or generated dataset rows.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(client: UpstreamAPIClient) {
    return client.get(`${CATALOG_BASE}/`);
  },
};

export const getDatasetSchema = {
  name: 'get_dataset_schema',
  service: 'data' as const,
  description:
    'Public tool. Get the schema for one synthetic claims dataset by dataset_id. ' +
    'Use for QA, demos, and agent evaluation without embedding real patient data. ' +
    'Returns synthetic-only schema metadata; never PHI or generated rows.',
  inputSchema: DATASET_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { dataset_id: string }) {
    return client.get(catalogDetailPath(args.dataset_id, 'schema'));
  },
};

export const getDatasetSources = {
  name: 'get_dataset_sources',
  service: 'data' as const,
  description:
    'Paid API-key tool. Get source/provenance coverage for a synthetic dataset by dataset_id. ' +
    'Returns source summaries only, not proprietary payer distributions, generated rows, or real-payer-truth claims.',
  inputSchema: DATASET_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { dataset_id: string }) {
    return client.get(catalogDetailPath(args.dataset_id, 'sources'));
  },
};

export const getDatasetScenarios = {
  name: 'get_dataset_scenarios',
  service: 'data' as const,
  description:
    'Paid API-key tool. Get buyer-relevant synthetic scenario templates for one dataset, such as payer tightening, ' +
    'authorization surge, documentation crackdown, reimbursement slowdown, and regional friction.',
  inputSchema: DATASET_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { dataset_id: string }) {
    return client.get(catalogDetailPath(args.dataset_id, 'scenarios'));
  },
};

export const getDatasetRealism = {
  name: 'get_dataset_realism',
  service: 'data' as const,
  description:
    'Paid API-key tool. Get realism and readiness score metadata for a synthetic dataset. ' +
    'Use for validation planning, not as proof of observed real payer frequencies.',
  inputSchema: DATASET_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { dataset_id: string }) {
    return client.get(catalogDetailPath(args.dataset_id, 'realism'));
  },
};

export const getDatasetReadiness = {
  name: 'get_dataset_readiness',
  service: 'data' as const,
  description:
    'Paid API-key tool. Get commercial readiness and safety metadata for one synthetic dataset. ' +
    'Preserves synthetic-only wording and no-PHI/no-customer-data boundaries.',
  inputSchema: DATASET_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { dataset_id: string }) {
    return client.get(catalogDetailPath(args.dataset_id, 'readiness'));
  },
};
