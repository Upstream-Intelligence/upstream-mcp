import { UpstreamAPIClient } from '../client.js';

export const scanClaim = {
  name: 'scan_claim',
  description:
    'Run a pre-submission claim risk scan. Checks NCCI edits, authorization requirements, ' +
    'denial probability, and payer-specific patterns. Returns a risk score and specific ' +
    'issues to fix before submitting. Use before submitting any claim to catch likely denials.',
  inputSchema: {
    type: 'object',
    properties: {
      payer: { type: 'string', description: 'Payer name (e.g. "UnitedHealthcare")' },
      cpt_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of CPT codes on the claim',
      },
      diagnosis_codes: {
        type: 'array',
        items: { type: 'string' },
        description: 'ICD-10 diagnosis codes',
      },
      place_of_service: {
        type: 'string',
        description: 'Place of service code (e.g. "11" for office)',
      },
    },
    required: ['payer', 'cpt_codes'],
  },
  async execute(
    client: UpstreamAPIClient,
    args: {
      payer: string;
      cpt_codes: string[];
      diagnosis_codes?: string[];
      place_of_service?: string;
    },
  ) {
    return client.post('/api/v1/public/claim-scan/', args);
  },
};
