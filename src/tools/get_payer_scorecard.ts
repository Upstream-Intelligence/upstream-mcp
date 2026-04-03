import { UpstreamAPIClient } from '../client.js';

export const getPayerScorecard = {
  name: 'get_payer_scorecard',
  description:
    "Get a payer's A-F grade and denial rate by specialty. Shows overall denial behavior, " +
    'top denial codes, payment timing, and appeal success rates. ' +
    'Use to understand a payer before submitting or to contextualize a denial.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description: 'Payer name (e.g. "UnitedHealthcare", "Aetna", "BCBS")',
      },
    },
    required: ['payer'],
  },
  async execute(client: UpstreamAPIClient, args: { payer: string }) {
    return client.get(`/api/v1/public/payer-scorecard/${encodeURIComponent(args.payer)}/`);
  },
};
