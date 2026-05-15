import { UpstreamAPIClient } from '../client.js';

export const queryDentalFeeSchedule = {
  name: 'query_dental_fee_schedule',
  description:
    'Returns the current Upstream-tracked dental fee schedule for a given payer + CDT code. ' +
    'Includes posted rate, network status, last drift event, and reimbursement ratio versus UCR. ' +
    'Use to detect silent PPO leases, downcoding, and reimbursement drift before submitting claims.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description: 'Payer name as it appears in the dental fee schedule (e.g. "Delta Dental of Texas")',
      },
      cdt_code: {
        type: 'string',
        description: 'CDT procedure code (e.g. "D2740")',
      },
    },
    required: ['payer', 'cdt_code'],
  },
  async execute(client: UpstreamAPIClient, args: { payer: string; cdt_code: string }) {
    const qs = new URLSearchParams({ payer: args.payer, cdt: args.cdt_code });
    return client.get(`/api/v1/dental/fee-schedule/?${qs.toString()}`);
  },
};
