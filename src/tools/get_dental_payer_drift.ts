import { UpstreamAPIClient } from '../client.js';

export const getDentalPayerDrift = {
  name: 'get_dental_payer_drift',
  description:
    'Returns dental payer behavioral drift: reimbursement ratio drops, denial rate spikes, ' +
    'silent PPO indicators, and downcoding patterns over the last 90 days. ' +
    'Used to detect payers quietly changing their dental contracts before they cost you revenue.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description: 'Optional payer filter; omit to get all payers',
      },
    },
    required: [],
  },
  async execute(client: UpstreamAPIClient, args: { payer?: string }) {
    const qs = new URLSearchParams();
    if (args.payer) qs.set('payer', args.payer);
    return client.get(`/api/v1/dental/payer-drift/?${qs.toString()}`);
  },
};
