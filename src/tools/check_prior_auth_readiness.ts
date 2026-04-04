import { UpstreamAPIClient } from '../client.js';

export const checkPriorAuthReadiness = {
  name: 'check_prior_auth_readiness',
  description:
    'Returns a 0-100 readiness score for a prior auth before submission. Includes risk factors with specific fix instructions ' +
    'and estimated approval probability. Specialties: ABA, Dental, PT/OT, SNF.',
  inputSchema: {
    type: 'object',
    properties: {
      claim_id: {
        type: 'string',
        description: 'Claim or authorization ID to score',
      },
    },
    required: ['claim_id'],
  },
  async execute(client: UpstreamAPIClient, args: { claim_id: string }) {
    return client.get(`/api/v1/prior-auth/readiness/${encodeURIComponent(args.claim_id)}/`);
  },
};
