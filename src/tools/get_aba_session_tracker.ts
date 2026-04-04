import { UpstreamAPIClient } from '../client.js';

export const getAbaSessionTracker = {
  name: 'get_aba_session_tracker',
  description:
    'Returns ABA session authorization status for a patient: authorized hours, sessions used, hours remaining, ' +
    'expiry date, risk level (red/amber/green), and renewal urgency. Use this in ABA billing workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      patient_ref: {
        type: 'string',
        description:
          'Anonymized patient reference (not PHI — use the reference token from your Upstream dashboard)',
      },
    },
    required: ['patient_ref'],
  },
  async execute(client: UpstreamAPIClient, args: { patient_ref: string }) {
    return client.get(
      `/api/v1/aba/retro-denial-risk/?patient_ref=${encodeURIComponent(args.patient_ref)}`,
    );
  },
};
