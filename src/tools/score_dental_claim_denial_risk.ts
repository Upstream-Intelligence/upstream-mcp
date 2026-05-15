import { UpstreamAPIClient } from '../client.js';

export const scoreDentalClaimDenialRisk = {
  name: 'score_dental_claim_denial_risk',
  description:
    'Scores pending/recent dental claims for denial risk using the trained CatBoost model. ' +
    'Returns per-claim risk score (0-100), risk band, top contributing factors (SHAP attribution), ' +
    'and recommended pre-submission actions. Falls back to heuristic when CatBoost model is not trained.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        description: 'Maximum claims to score (default 25, max 100)',
        default: 25,
      },
      status_filter: {
        type: 'string',
        description: 'Optional filter: "pending" or "recent". Default returns both.',
      },
    },
    required: [],
  },
  async execute(client: UpstreamAPIClient, args: { limit?: number; status_filter?: string }) {
    const qs = new URLSearchParams();
    if (args.limit) qs.set('limit', String(args.limit));
    if (args.status_filter) qs.set('status', args.status_filter);
    return client.get(`/api/v1/dental/claims-intelligence/?${qs.toString()}`);
  },
};
