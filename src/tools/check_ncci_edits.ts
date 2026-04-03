import { UpstreamAPIClient } from '../client.js';

export const checkNcciEdits = {
  name: 'check_ncci_edits',
  description:
    'Check if two CPT procedure codes can be billed together on the same claim. ' +
    'Returns the edit type (PTP or MUE), whether a modifier resolves the conflict, ' +
    'and the clinical rationale. Use this before submitting any claim with multiple procedure codes.',
  inputSchema: {
    type: 'object',
    properties: {
      cpt_a: {
        type: 'string',
        description: 'First CPT code (e.g. "97153")',
      },
      cpt_b: {
        type: 'string',
        description: 'Second CPT code (e.g. "97155")',
      },
    },
    required: ['cpt_a', 'cpt_b'],
  },
  async execute(client: UpstreamAPIClient, args: { cpt_a: string; cpt_b: string }) {
    return client.get('/api/v1/public/ncci/check/', {
      cpt_a: args.cpt_a,
      cpt_b: args.cpt_b,
    });
  },
};
