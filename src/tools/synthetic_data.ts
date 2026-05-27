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

const SCENARIO_DSL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    pack_id: {
      type: 'string',
      description: 'Synthetic data pack id, for example "aba", "asc", or "specialty-pharmacy".',
    },
    scenario_type: {
      type: 'string',
      description: 'Canonical scenario DSL type such as "payer-tightening" or "authorization-surge".',
    },
  },
  required: ['pack_id', 'scenario_type'],
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

export const getSyntheticPackWorldManifest = {
  name: 'get_synthetic_pack_world_manifest',
  description:
    'Paid API-key tool. Get the metadata-only synthetic world manifest for a pack. ' +
    'Returns entity and lineage references only; never returns generated rows, PHI, customer data, or paid datasets.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'world/manifest'));
  },
};

export const getSyntheticPackEpisodeManifest = {
  name: 'get_synthetic_pack_episode_manifest',
  description:
    'Paid API-key tool. Get episode/lifecycle manifest references for a synthetic pack. ' +
    'Use this for workflow planning only; do not expose episode journeys or generated artifacts in public responses.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'episodes/manifest'));
  },
};

export const getSyntheticPackPayerPolicySummary = {
  name: 'get_synthetic_pack_payer_policy_summary',
  description:
    'Paid API-key tool. Get metadata-only payer policy axes for a synthetic pack. ' +
    'Does not claim real payer truth or proprietary payer distributions.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'payer-policy/summary'));
  },
};

export const getSyntheticPackContractFeeSchedule = {
  name: 'get_synthetic_pack_contract_fee_schedule',
  description:
    'Paid API-key tool. Get metadata-only contract and fee-schedule axes for a synthetic pack. ' +
    'Returns synthetic contract shape only, not official fee schedules or customer contracts.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'contracts/fee-schedule/summary'));
  },
};

export const getSyntheticPackPayerContractSimulation = {
  name: 'get_synthetic_pack_payer_contract_simulation',
  description:
    'Paid API-key tool. Get payer/contract simulation metadata for a synthetic pack. ' +
    'Preserves synthetic-only wording and exposes no proprietary payer weights.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'payer-contract-simulator/report'));
  },
};

export const getSyntheticPackEvaluationManifest = {
  name: 'get_synthetic_pack_evaluation_manifest',
  description:
    'Paid API-key tool. Get metadata-only agent evaluation manifest references for actual Upstream workflows. ' +
    'Returns task families and artifact references only, not generated eval corpora.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'evaluation/manifest'));
  },
};

export const getSyntheticPackAdjudicationTraceSummary = {
  name: 'get_synthetic_pack_adjudication_trace_summary',
  description:
    'Paid API-key tool. Get adjudication trace summary metadata for a synthetic pack. ' +
    'Never returns line-level paid traces, generated rows, PHI, customer data, or real-payer-truth claims.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'adjudication-trace/summary'));
  },
};

export const getSyntheticPackTransactionSurfaceManifest = {
  name: 'get_synthetic_pack_transaction_surface_manifest',
  description:
    'Paid API-key tool. Get transaction-surface manifest metadata for a synthetic pack. ' +
    'Surfaces non-certified synthetic 837/835/276/277/275/FHIR-like mapping references only.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'transaction-surface/manifest'));
  },
};

export const getSyntheticPackRealism = {
  name: 'get_synthetic_pack_realism',
  description:
    'Paid API-key tool. Get realism and readiness score metadata for a synthetic pack. ' +
    'Use for validation planning, not as proof of observed real payer frequencies.',
  inputSchema: PACK_ID_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string }) {
    return client.get(packPath(args.pack_id, 'realism'));
  },
};

export const compileSyntheticScenarioDsl = {
  name: 'compile_synthetic_scenario_dsl',
  description:
    'Paid API-key tool. Compile a canonical Upstream Data scenario DSL request into a metadata-only scenario contract. ' +
    'Does not return generated datasets or paid scenario artifacts.',
  inputSchema: SCENARIO_DSL_INPUT_SCHEMA,
  async execute(client: UpstreamAPIClient, args: { pack_id: string; scenario_type: string }) {
    return client.post('/api/v1/data/scenario-dsl/compile/', args);
  },
};
