import { UpstreamAPIClient } from '../client.js';

export const comparePayers = {
  name: 'compare_payers',
  description:
    'Compare two payers side by side on denial rates, payment timing, and appeal success. ' +
    "Useful when choosing network participation or explaining a payer's behavior relative to peers.",
  inputSchema: {
    type: 'object',
    properties: {
      payer_a: { type: 'string', description: 'First payer name' },
      payer_b: { type: 'string', description: 'Second payer name' },
    },
    required: ['payer_a', 'payer_b'],
  },
  async execute(client: UpstreamAPIClient, args: { payer_a: string; payer_b: string }) {
    return client.post('/api/v1/public/payer-scorecard/compare/', {
      payer_a: args.payer_a,
      payer_b: args.payer_b,
    });
  },
};
