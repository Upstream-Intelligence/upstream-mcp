import { UpstreamAPIClient } from '../client.js';

// Benchmark leaderboard tools target the Upstream Data service (a separate host + key
// from the platform API). They are marked `service: 'data'` so index.ts dispatches
// them to the data-service client. All three are free/public tools — they access
// publicly available RCM Arena benchmark results with no API key required.

const BENCHMARKS_BASE = '/api/v1/benchmarks';

export const getBenchmarkLeaderboard = {
  name: 'get_benchmark_leaderboard',
  service: 'data' as const,
  description:
    'Get the latest RCM Arena benchmark leaderboard with model rankings across all ' +
    'RCM specialties. Returns rank, model name, overall accuracy, F1 score, and cost per run. ' +
    'Free/public tool — no API key required.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(client: UpstreamAPIClient) {
    return client.get(`${BENCHMARKS_BASE}/latest`);
  },
};

export const getModelScores = {
  name: 'get_model_scores',
  service: 'data' as const,
  description:
    'Get per-specialty benchmark scores for a specific model. If model_id is omitted, ' +
    'returns top-line scores for all models. Returns accuracy, F1, precision, and recall ' +
    'per RCM specialty. Free/public tool — no API key required.',
  inputSchema: {
    type: 'object',
    properties: {
      model_id: {
        type: 'string',
        description:
          'Model identifier from the leaderboard (e.g. "claude-opus-4-8", "gpt-4o"). ' +
          'If omitted, returns top-line scores for all ranked models.',
      },
    },
    required: [],
  },
  async execute(client: UpstreamAPIClient, args: { model_id?: string }) {
    const data = await client.get<Record<string, unknown>>(`${BENCHMARKS_BASE}/latest`);
    if (args.model_id) {
      const leaderboard = data.leaderboard as Array<Record<string, unknown>> | undefined;
      if (!leaderboard) {
        return { error: 'Leaderboard data not available' };
      }
      const model = leaderboard.find(
        (entry) =>
          String(entry.model || '').toLowerCase() === args.model_id!.toLowerCase(),
      );
      if (!model) {
        return { error: `Model "${args.model_id}" not found in leaderboard` };
      }
      return model;
    }
    return data;
  },
};

export const getBenchmarkHistory = {
  name: 'get_benchmark_history',
  service: 'data' as const,
  description:
    'Get the history of all past RCM Arena benchmark runs. Returns run_id, date, ' +
    'top model, and top accuracy for each run. Free/public tool — no API key required.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(client: UpstreamAPIClient) {
    return client.get(`${BENCHMARKS_BASE}/history`);
  },
};
