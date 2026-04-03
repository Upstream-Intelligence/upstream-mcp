import { UpstreamAPIClient } from '../client.js';

export const lookupDenialCode = {
  name: 'lookup_denial_code',
  description:
    'Look up a CARC (Claim Adjustment Reason Code) denial reason code. ' +
    'Returns the plain-English explanation, common root causes, corrective actions, ' +
    'and the regulatory basis. Use whenever a claim is denied and you need to understand why.',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'CARC denial reason code (e.g. "97", "16", "29")',
      },
    },
    required: ['code'],
  },
  async execute(client: UpstreamAPIClient, args: { code: string }) {
    return client.get(`/api/v1/public/carc/${args.code}/`);
  },
};
