import { UpstreamAPIClient } from '../client.js';

const SYNTHESIZE_BASE = '/api/v1/synthesize';
const SCORE_BASE = '/api/v1/score';
const BENCHMARKS_BASE = '/api/v1/benchmarks';

export const synthesizeClaims = {
  name: 'synthesize_claims',
  service: 'data' as const,
  description:
    'Generate synthetic healthcare claims on demand from the Upstream Data service. ' +
    'Supports professional, institutional, and dental claim types with configurable scenario ' +
    'templates, row counts, and output format. Returns a dataset_id, download_url, quality ' +
    'metrics, and the expected denial_rate for the generated batch. Paid API-key tool.',
  inputSchema: {
    type: 'object',
    properties: {
      claim_type: {
        type: 'string',
        description:
          'Type of synthetic claims to generate. One of: "professional", "institutional", "dental".',
        enum: ['professional', 'institutional', 'dental'],
      },
      rows: {
        type: 'integer',
        description: 'Number of claims to synthesize (default 100, max 10 000).',
        default: 100,
      },
      scenario: {
        type: 'string',
        description:
          'Synthetic scenario template to apply — e.g. "payer_tightening", "auth_surge", ' +
          '"documentation_crackdown", "reimbursement_slowdown", "regional_friction". ' +
          'If omitted, draws from the default distribution.',
      },
      seed: {
        type: 'integer',
        description: 'Deterministic seed for reproducible generation. If omitted, random.',
      },
      format: {
        type: 'string',
        description: 'Output format. One of: "json", "csv", "parquet".',
        enum: ['json', 'csv', 'parquet'],
        default: 'json',
      },
    },
    required: ['claim_type'],
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post(SYNTHESIZE_BASE, args);
  },
};

export const scoreClaim = {
  name: 'score_claim',
  service: 'data' as const,
  description:
    'Score a single claim for denial risk using the CatBoost / DenialBrain model. ' +
    'Accepts payer, CPT, charge_amount, prior-auth status, place of service, network status, ' +
    'and other claim attributes. Returns denial_probability, confidence, top-3 SHAP feature ' +
    'drivers, and the model_version used. Paid API-key tool.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description:
          'Payer identifier or name for the claim (e.g. "Aetna", "UnitedHealthcare").',
      },
      cpt: {
        type: 'string',
        description: 'CPT or HCPCS code on the claim (e.g. "97153").',
      },
      charge_amount: {
        type: 'number',
        description: 'Charge amount in USD for the claim line.',
      },
      has_prior_auth: {
        type: 'boolean',
        description: 'Whether prior authorization was obtained before submission.',
      },
      place_of_service: {
        type: 'string',
        description: 'Place-of-service code (e.g. "11" for office, "21" for inpatient).',
      },
      network_status: {
        type: 'string',
        description: 'Provider network status with the payer: "in_network", "out_of_network", or "unknown".',
        enum: ['in_network', 'out_of_network', 'unknown'],
      },
      diagnosis_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'ICD-10 diagnosis codes linked to the claim (e.g. ["F84.0", "Z00.0"]).',
      },
      modifiers: {
        type: 'array',
        items: { type: 'string' },
        description: 'CPT modifiers applied (e.g. ["25", "59"]).',
      },
      units: {
        type: 'integer',
        description: 'Number of service units billed.',
        default: 1,
      },
      specialty: {
        type: 'string',
        description:
          'Provider specialty context for the model (e.g. "aba", "physical_therapy", "dental").',
      },
    },
    required: ['payer', 'cpt', 'charge_amount'],
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post(`${SCORE_BASE}/denial-risk`, args);
  },
};

export const runBenchmark = {
  name: 'run_benchmark',
  service: 'data' as const,
  description:
    'Trigger a new RCM Arena benchmark run comparing multiple models against synthetic ' +
    'claims across selected specialties. Launches an async benchmark job and returns the ' +
    'run_id and status. Use get_benchmark_report to retrieve results once complete. ' +
    'Paid API-key tool.',
  inputSchema: {
    type: 'object',
    properties: {
      specialties: {
        type: 'string',
        description:
          'Comma-separated RCM specialties to benchmark (e.g. "aba,dental,physical_therapy,chiropractic").',
      },
      models: {
        type: 'string',
        description:
          'Comma-separated model identifiers to compare (e.g. "claude-opus-4-8,gpt-4o,grok-3").',
      },
      rows: {
        type: 'integer',
        description: 'Number of synthetic claims per specialty (default 500, max 10 000).',
        default: 500,
      },
      scenario: {
        type: 'string',
        description:
          'Synthetic scenario template (e.g. "payer_tightening", "auth_surge"). ' +
          'If omitted, uses the default distribution.',
      },
    },
    required: ['specialties', 'models'],
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post(`${BENCHMARKS_BASE}/run`, args);
  },
};

export const getBenchmarkReport = {
  name: 'get_benchmark_report',
  service: 'data' as const,
  description:
    'Get a comprehensive RCM Arena benchmark report with per-specialty breakdowns ' +
    'and CatBoost baseline comparison. Includes overall rankings, per-specialty accuracy/F1/' +
    'precision/recall scores, cost-per-run analysis, and model-vs-CatBoost deltas. ' +
    'Accepts optional run_id to target a specific benchmark run. Free/public tool.',
  inputSchema: {
    type: 'object',
    properties: {
      run_id: {
        type: 'string',
        description:
          'Specific benchmark run ID to retrieve. If omitted, returns the latest run report.',
      },
    },
    required: [],
  },
  async execute(client: UpstreamAPIClient, args?: { run_id?: string }) {
    if (args?.run_id) {
      return client.get(`${BENCHMARKS_BASE}/report/${encodeURIComponent(args.run_id)}`);
    }
    return client.get(`${BENCHMARKS_BASE}/report/latest`);
  },
};
