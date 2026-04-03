import { UpstreamAPIClient } from '../client.js';

export const lookupFeeSchedule = {
  name: 'lookup_fee_schedule',
  description:
    'Get the CMS national fee schedule rate for a CPT procedure code. ' +
    'Returns the facility and non-facility rates, RVUs, and geographic adjustment factors. ' +
    'Useful for checking expected reimbursement before billing.',
  inputSchema: {
    type: 'object',
    properties: {
      cpt: {
        type: 'string',
        description: 'CPT procedure code (e.g. "97153")',
      },
    },
    required: ['cpt'],
  },
  async execute(client: UpstreamAPIClient, args: { cpt: string }) {
    return client.get(`/api/v1/public/fee-schedule/${args.cpt}/`);
  },
};
