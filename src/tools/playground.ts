import type { UpstreamDataClient } from '../client.js';
import { asArgs, bodyFrom, optionalInt, optionalString, requireString } from './validate.js';
import { ToolInputError } from '../errors.js';
import type { ToolDefinition } from './types.js';

// Playground tools: interactive generation, scoring, diagnostics, and live reference data.
// All except playground_get_samples are key-gated (X-API-Key). POST tools pass unknown
// extra fields through to the API untouched — the schemas below type the documented
// surface, and additionalProperties stays true so the API remains the source of truth.

const CLAIM_FIELDS: Record<string, unknown> = {
  payer: { type: 'string', description: 'Payer name or identifier, e.g. "Aetna", "UnitedHealthcare".' },
  cpt: { type: 'string', description: 'CPT/HCPCS procedure code, e.g. "97153".' },
  charge_amount: { type: 'number', description: 'Charge amount in USD.' },
  has_prior_auth: { type: 'boolean', description: 'Whether prior authorization was obtained.' },
  place_of_service: { type: 'string', description: 'Place-of-service code, e.g. "11" (office).' },
  network_status: {
    type: 'string',
    enum: ['in_network', 'out_of_network', 'unknown'],
    description: 'Provider network status with the payer.',
  },
  line_of_business: { type: 'string', description: 'Line of business, e.g. "commercial", "medicare_advantage".' },
  specialty: { type: 'string', description: 'Provider specialty context, e.g. "aba", "dental".' },
  diagnosis_codes: {
    type: 'array',
    items: { type: 'string' },
    description: 'ICD-10 diagnosis codes on the claim.',
  },
};

function requireClaimCore(parsed: Record<string, unknown>): void {
  requireString(parsed, 'payer');
  requireString(parsed, 'cpt');
  const charge = parsed['charge_amount'];
  if (typeof charge !== 'number' || !Number.isFinite(charge)) {
    throw new ToolInputError('"charge_amount" is required and must be a number.');
  }
}

export const playgroundGetSamples: ToolDefinition = {
  name: 'playground_get_samples',
  description:
    'Get instant pre-generated sample datasets (small CSV row batches per specialty with ' +
    'time-limited download URLs). Public — no API key required. Fastest way to see the data ' +
    'shape before calling playground_generate or synthesize_create_dataset.',
  inputSchema: { type: 'object', properties: {}, required: [] },
  requiresKey: false,
  async execute(client: UpstreamDataClient) {
    return client.get('/api/v1/playground/samples');
  },
};

export const playgroundGenerate: ToolDefinition = {
  name: 'playground_generate',
  description:
    'Generate synthetic claims inline (returns rows directly in the response, max 1000). ' +
    'POSTs {specialty, rows, scenario} to /api/v1/playground/generate. Requires an API key. ' +
    'For larger batches use synthesize_create_dataset instead.',
  inputSchema: {
    type: 'object',
    properties: {
      specialty: { type: 'string', description: 'Dataset specialty, e.g. "aba", "dental", "snf-ma".' },
      rows: {
        type: 'integer',
        description: 'Rows to generate inline (1-1000). Larger requests are rejected — use synthesize_create_dataset.',
        minimum: 1,
        maximum: 1000,
      },
      scenario: { type: 'string', description: 'Scenario template; defaults to baseline.' },
      seed: { type: 'integer', description: 'Deterministic seed for reproducible output.' },
    },
    required: ['specialty'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    requireString(parsed, 'specialty');
    optionalInt(parsed, 'rows', { min: 1, max: 1000 });
    optionalString(parsed, 'scenario');
    optionalInt(parsed, 'seed');
    return client.post('/api/v1/playground/generate', parsed);
  },
};

export const playgroundEvaluate: ToolDefinition = {
  name: 'playground_evaluate',
  description:
    'Run a seeded evaluation: regenerates data with the same seed and scores realism/quality ' +
    'so runs are directly comparable. POSTs to /api/v1/playground/evaluate. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      specialty: { type: 'string', description: 'Dataset specialty, e.g. "aba", "dental", "snf-ma".' },
      rows: { type: 'integer', description: 'Rows to evaluate (1-1000).', minimum: 1, maximum: 1000 },
      scenario: { type: 'string', description: 'Scenario template; defaults to baseline.' },
      seed: { type: 'integer', description: 'Seed to reproduce — pass the same seed to compare runs.' },
    },
    required: ['specialty'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    requireString(parsed, 'specialty');
    optionalInt(parsed, 'rows', { min: 1, max: 1000 });
    optionalInt(parsed, 'seed');
    return client.post('/api/v1/playground/evaluate', parsed);
  },
};

export const playgroundScoreDenialRisk: ToolDefinition = {
  name: 'playground_score_denial_risk',
  description:
    'Score a single claim for denial risk with the deployed CatBoost DenialBrain model. ' +
    'Returns denial probability and feature drivers. POSTs claim attributes to ' +
    '/api/v1/playground/score-denial-risk. Requires an API key. ' +
    'Check catalog_get_active_model for the live model version and feature list.',
  inputSchema: {
    type: 'object',
    properties: CLAIM_FIELDS,
    required: ['payer', 'cpt', 'charge_amount'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    requireClaimCore(parsed);
    return client.post('/api/v1/playground/score-denial-risk', parsed);
  },
};

export const playgroundScoreWhatIf: ToolDefinition = {
  name: 'playground_score_what_if',
  description:
    'What-if scenario scoring: re-score a claim under a hypothetical change (e.g. flip ' +
    'has_prior_auth, change network_status) to see the denial-risk delta. POSTs the base ' +
    'claim plus a "what_if" object of overridden fields to /api/v1/playground/score-what-if. ' +
    'Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      ...CLAIM_FIELDS,
      what_if: {
        type: 'object',
        description: 'Fields to override for the hypothetical, e.g. {"has_prior_auth": true}.',
      },
    },
    required: ['payer', 'cpt', 'charge_amount'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    requireClaimCore(parsed);
    return client.post('/api/v1/playground/score-what-if', parsed);
  },
};

export const playgroundDiagnostic: ToolDefinition = {
  name: 'playground_diagnostic',
  description:
    'Diagnose a denial: given claim attributes (and optionally the denial code received), ' +
    'returns the likely root causes and corrective actions. POSTs to /api/v1/playground/diagnostic. ' +
    'Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      ...CLAIM_FIELDS,
      denial_code: { type: 'string', description: 'CARC denial reason code received, e.g. "97".' },
    },
    required: ['payer', 'cpt'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    requireString(parsed, 'payer');
    requireString(parsed, 'cpt');
    return client.post('/api/v1/playground/diagnostic', parsed);
  },
};

export const playgroundRecoverDelivery: ToolDefinition = {
  name: 'playground_recover_delivery',
  description:
    'Recover delivery of a previously generated dataset (fresh download link for a past ' +
    'synthesis). POSTs {dataset_id} to /api/v1/playground/recover-delivery. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      dataset_id: { type: 'string', description: 'Dataset identifier from synthesize_create_dataset.' },
    },
    required: ['dataset_id'],
    additionalProperties: true,
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    const datasetId = requireString(parsed, 'dataset_id');
    return client.post('/api/v1/playground/recover-delivery', bodyFrom({ dataset_id: datasetId }));
  },
};

export const playgroundLiveDataNpi: ToolDefinition = {
  name: 'playground_live_data_npi',
  description:
    'Look up a provider in the live NPI registry (name, taxonomy, practice address). ' +
    'GETs /api/v1/playground/live-data/npi. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      npi: { type: 'string', description: '10-digit National Provider Identifier.' },
    },
    required: ['npi'],
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const npi = requireString(asArgs(args), 'npi');
    return client.get('/api/v1/playground/live-data/npi', { npi });
  },
};

export const playgroundLiveDataNcci: ToolDefinition = {
  name: 'playground_live_data_ncci',
  description:
    'Check the live NCCI edit tables for whether two CPT codes can be billed together ' +
    '(PTP edit, modifier allowance). GETs /api/v1/playground/live-data/ncci. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      cpt_a: { type: 'string', description: 'First CPT/HCPCS code, e.g. "97153".' },
      cpt_b: { type: 'string', description: 'Second CPT/HCPCS code, e.g. "97155".' },
    },
    required: ['cpt_a', 'cpt_b'],
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    return client.get('/api/v1/playground/live-data/ncci', {
      cpt_a: requireString(parsed, 'cpt_a'),
      cpt_b: requireString(parsed, 'cpt_b'),
    });
  },
};

export const playgroundLiveDataMedicareFee: ToolDefinition = {
  name: 'playground_live_data_medicare_fee',
  description:
    'Get the live Medicare Physician Fee Schedule rate for a CPT code (facility/non-facility ' +
    'amounts, RVUs). GETs /api/v1/playground/live-data/medicare-fee. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      cpt: { type: 'string', description: 'CPT/HCPCS code, e.g. "97153".' },
    },
    required: ['cpt'],
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const cpt = requireString(asArgs(args), 'cpt');
    return client.get('/api/v1/playground/live-data/medicare-fee', { cpt });
  },
};
