import { UpstreamAPIClient } from '../client.js';

export const getIndustrySignals = {
  name: 'get_industry_signals',
  description:
    'Returns active cross-customer network anomalies — denial patterns affecting multiple practices simultaneously. ' +
    "This is Upstream's unique moat: network intelligence neither Silna nor Adonis can replicate.",
  inputSchema: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description: "Specialty filter (e.g., 'aba', 'pt_ot', 'snf', 'dental')",
      },
      cpt_family: {
        type: 'string',
        description: "Optional CPT family prefix (e.g., '971', '97')",
      },
    },
    required: ['specialty'],
  },
  async execute(client: UpstreamAPIClient, args: { specialty: string; cpt_family?: string }) {
    const params = new URLSearchParams({ specialty: args.specialty });
    if (args.cpt_family) {
      params.set('cpt_family', args.cpt_family);
    }
    return client.get(`/api/v1/payers/industry-signals/?${params.toString()}`);
  },
};
