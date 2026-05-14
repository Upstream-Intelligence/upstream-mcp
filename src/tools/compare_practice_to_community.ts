import { UpstreamAPIClient } from '../client.js';

export const comparePracticeToCommunity = {
  name: 'compare_practice_to_community',
  description:
    "Compare your practice's payer-specific metrics (denial rate, days-to-pay, appeal " +
    'win rate) against the Upstream network aggregate for that payer + specialty. ' +
    'Lead-capture endpoint — requires email. Returns delta metrics and a risk-adjusted CTA.',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'Work email — saved as a lead and returned with results',
      },
      payer: {
        type: 'string',
        description: 'Payer name to compare against (e.g. "UnitedHealthcare", "Aetna")',
      },
      specialty: {
        type: 'string',
        description: 'Specialty for the community aggregate (e.g. "ABA", "PT/OT", "dental")',
      },
      your_denial_rate: {
        type: 'number',
        description: 'Your practice denial rate as a decimal (e.g. 0.18 = 18%)',
      },
      your_days_to_pay: {
        type: 'number',
        description: 'Average days from claim submission to payment for your practice',
      },
      your_appeal_win_rate: {
        type: 'number',
        description: 'Your appeal win rate as a decimal (e.g. 0.62 = 62%)',
      },
    },
    required: ['email', 'payer', 'specialty'],
  },
  async execute(
    client: UpstreamAPIClient,
    args: {
      email: string;
      payer: string;
      specialty: string;
      your_denial_rate?: number;
      your_days_to_pay?: number;
      your_appeal_win_rate?: number;
    },
  ) {
    return client.post('/api/v1/public/payer-scorecard/compare/', args);
  },
};
