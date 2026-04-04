import { UpstreamAPIClient } from '../client.js';

export const getDenialClusters = {
  name: 'get_denial_clusters',
  description:
    'Returns active denial clusters with root cause labels, dollar impact, and cross-customer signal flags. ' +
    'A cross_customer_signal=true means the pattern is affecting multiple practices nationally.',
  inputSchema: {
    type: 'object',
    properties: {
      lookback_days: {
        type: 'number',
        description: 'Days to look back for cluster detection (default: 30)',
      },
    },
    required: [],
  },
  async execute(client: UpstreamAPIClient, args: { lookback_days?: number }) {
    const lookback = args.lookback_days ?? 30;
    return client.get(`/api/v1/denial-clusters/?lookback_days=${lookback}`);
  },
};
