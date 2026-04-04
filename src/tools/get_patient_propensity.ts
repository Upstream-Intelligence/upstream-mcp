import { UpstreamAPIClient } from '../client.js';

export const getPatientPropensity = {
  name: 'get_patient_propensity',
  description:
    'Returns patient collectibility score (0-100), collection probability, and recommended collection approach. ' +
    "Powered by Upstream's ML propensity model.",
  inputSchema: {
    type: 'object',
    properties: {
      patient_ref: {
        type: 'string',
        description: 'Anonymized patient reference token from Upstream dashboard',
      },
    },
    required: ['patient_ref'],
  },
  async execute(client: UpstreamAPIClient, args: { patient_ref: string }) {
    return client.get(
      `/api/v1/patients/propensity/?patient_ref=${encodeURIComponent(args.patient_ref)}`,
    );
  },
};
