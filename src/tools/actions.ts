import { UpstreamAPIClient } from '../client.js';

export const conveneLlmCouncil = {
  name: 'convene_llm_council',
  service: 'data' as const,
  description:
    'Convene a panel of frontier LLMs (GPT-4o, Claude, Gemini) to debate and score ' +
    'the denial risk of a complex claim. Use this when you need an ensemble verdict.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: { type: 'string', description: 'Payer archetype or ID' },
      cpt: { type: 'string', description: 'Primary CPT code' },
      has_prior_auth: { type: 'boolean', description: 'Whether prior auth is on file' },
      charge_amount: { type: 'number', description: 'Total billed charge' },
      allowed_amount: { type: 'number', description: 'Expected allowed amount' },
    },
    required: ['payer', 'cpt', 'has_prior_auth', 'charge_amount', 'allowed_amount'],
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post('/api/v1/score/council', args);
  },
};

export const draftCareAction = {
  name: 'draft_care_action',
  service: 'data' as const,
  description:
    'Draft a care action (e.g., appeal letter, prior auth justification) based on a ' +
    "claim's risk score. Returns professional, authoritative text.",
  inputSchema: {
    type: 'object',
    properties: {
      claim: { type: 'object', description: 'The original claim details' },
      target_action: {
        type: 'string',
        description:
          "Type of action to draft: 'appeal_letter', 'prior_auth_justification', or 'claim_correction'",
      },
      risk_context: {
        type: 'object',
        description: 'The risk context object (either DenialRiskScore or CouncilResult)',
      },
    },
    required: ['claim', 'target_action', 'risk_context'],
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post('/api/v1/actions/draft', args);
  },
};
