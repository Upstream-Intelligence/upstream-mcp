import type { UpstreamDataClient } from '../client.js';
import { asArgs, bodyFrom, optionalInt, optionalString, requireString } from './validate.js';
import type { ToolDefinition } from './types.js';

// Synthesis tools: full batch dataset generation (key-gated).
// synthesize_create_dataset starts a generation job; synthesize_download_dataset
// retrieves the result for a dataset_id returned by it.

export const synthesizeCreateDataset: ToolDefinition = {
  name: 'synthesize_create_dataset',
  description:
    'Generate a full synthetic claims dataset. POSTs {specialty, rows, scenario} to ' +
    '/api/v1/synthesize and returns a dataset_id plus quality metadata; download the rows ' +
    'with synthesize_download_dataset. Requires an API key. For quick interactive runs of ' +
    '1000 rows or fewer, prefer playground_generate (returns rows inline).',
  inputSchema: {
    type: 'object',
    properties: {
      specialty: {
        type: 'string',
        description:
          'Dataset specialty to generate, e.g. "aba", "dental", "snf-ma". ' +
          'See catalog_list_packs / catalog_list_datasets for available values.',
      },
      rows: {
        type: 'integer',
        description: 'Number of claim rows to generate (server default applies if omitted).',
        minimum: 1,
      },
      scenario: {
        type: 'string',
        description:
          'Scenario template, e.g. "baseline", "authorization_surge", "documentation_crackdown". ' +
          'Valid scenarios per claim type are listed by catalog_list_packs. Defaults to baseline.',
      },
    },
    required: ['specialty'],
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const parsed = asArgs(args);
    const body = bodyFrom({
      specialty: requireString(parsed, 'specialty'),
      rows: optionalInt(parsed, 'rows', { min: 1 }),
      scenario: optionalString(parsed, 'scenario'),
    });
    return client.post('/api/v1/synthesize', body);
  },
};

export const synthesizeDownloadDataset: ToolDefinition = {
  name: 'synthesize_download_dataset',
  description:
    'Get the download for a dataset previously created by synthesize_create_dataset. ' +
    'Pass the dataset_id from the synthesis response; returns a signed download URL or the ' +
    'dataset payload. Requires an API key.',
  inputSchema: {
    type: 'object',
    properties: {
      dataset_id: {
        type: 'string',
        description: 'Dataset identifier returned by synthesize_create_dataset.',
      },
    },
    required: ['dataset_id'],
  },
  requiresKey: true,
  async execute(client: UpstreamDataClient, args: unknown) {
    const datasetId = requireString(asArgs(args), 'dataset_id');
    return client.get(`/api/v1/synthesize/${encodeURIComponent(datasetId)}/download`);
  },
};
