import { UpstreamAPIClient } from '../client.js';
import { UpstreamDataClient } from '../upstream_data_client.js';

interface PriorAuthReadinessArgs {
  payer: string;
  cpt: string;
  line_of_business?: string;
  conditions?: string;
}

export const checkPriorAuthReadiness = {
  name: 'check_prior_auth_readiness',
  description:
    'Check prior-authorization readiness for a payer and CPT code before submission. ' +
    'Returns coverage_state, prior_auth_required, readiness_state ' +
    '(ready_when_assembled | no_prior_auth_required | unknown), requirements, ' +
    'step_therapy, documentation, and next_safe_action. ' +
    'The unknown state (sparse policy) is returned verbatim as HTTP 200. ' +
    'Errors propagate as UpstreamAPIError. No PHI. Payer name and CPT code only.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: {
        type: 'string',
        description: 'Payer name (e.g. Aetna, UnitedHealthcare, Cigna)',
      },
      cpt: {
        type: 'string',
        description: 'CPT procedure code to check (e.g. 97153)',
      },
      line_of_business: {
        type: 'string',
        description: 'Optional line of business (e.g. commercial, medicaid, medicare)',
      },
      conditions: {
        type: 'string',
        description: 'Optional comma-separated ICD-10 diagnosis codes (e.g. F84.0,F84.5)',
      },
    },
    required: ['payer', 'cpt'],
  },
  async execute(client: UpstreamAPIClient, args: PriorAuthReadinessArgs) {
    const dataClient = new UpstreamDataClient(client);
    const params: Record<string, string> = { payer: args.payer, cpt: args.cpt };
    if (args.line_of_business) params['line_of_business'] = args.line_of_business;
    if (args.conditions) params['conditions'] = args.conditions;
    return dataClient.get('/prior-auth-readiness/', params);
  },
};
