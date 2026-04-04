import { UpstreamAPIClient } from '../client.js';

export const checkPayerBehavior = {
  name: 'check_payer_behavior',
  description:
    'Returns behavioral risk score, cluster classification (Aggressive Denier / Slow Payer / Prompt Payer / Underpayer), ' +
    "and recent policy changes for a payer. Part of Upstream's Revenue Intelligence engine.",
  inputSchema: {
    type: 'object',
    properties: {
      payer_slug: {
        type: 'string',
        description: "Payer identifier (e.g., 'unitedhealthcare', 'aetna', 'cigna')",
      },
      specialty: {
        type: 'string',
        description: "Optional specialty filter (e.g., 'aba', 'pt_ot', 'snf')",
      },
    },
    required: ['payer_slug'],
  },
  async execute(client: UpstreamAPIClient, args: { payer_slug: string; specialty?: string }) {
    const params = new URLSearchParams({ payer: args.payer_slug });
    if (args.specialty) {
      params.set('specialty', args.specialty);
    }
    return client.get(`/api/v1/payers/behavioral-alerts/?${params.toString()}`);
  },
};
