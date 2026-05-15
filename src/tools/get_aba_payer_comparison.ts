import { UpstreamAPIClient } from '../client.js';

export const getAbaPayerComparison = {
  name: 'get_aba_payer_comparison',
  description:
    'Returns payer-side approval rates for the seven ABA CPT codes (97151-97158) across active payers. ' +
    'Use to identify which payers are denying the highest-revenue ABA codes, ' +
    'so you can target appeals, escalations, and contract renegotiations.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(client: UpstreamAPIClient) {
    return client.get(`/api/v1/aba/payer-comparison/`);
  },
};
