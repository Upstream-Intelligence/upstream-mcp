#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { UpstreamDataClient } from './client.js';
import { dispatchTool } from './dispatch.js';
import type { ToolDefinition } from './tools/types.js';
import {
  catalogGetActiveModel,
  catalogGetDatasetSchema,
  catalogListDatasets,
  catalogListPacks,
} from './tools/catalog.js';
import { synthesizeCreateDataset, synthesizeDownloadDataset } from './tools/synthesize.js';
import {
  playgroundDiagnostic,
  playgroundEvaluate,
  playgroundGenerate,
  playgroundGetSamples,
  playgroundLiveDataMedicareFee,
  playgroundLiveDataNcci,
  playgroundLiveDataNpi,
  playgroundRecoverDelivery,
  playgroundScoreDenialRisk,
  playgroundScoreWhatIf,
} from './tools/playground.js';

const SERVER_VERSION = '0.3.0';

const tools: ToolDefinition[] = [
  catalogListPacks,
  catalogListDatasets,
  catalogGetDatasetSchema,
  catalogGetActiveModel,
  synthesizeCreateDataset,
  synthesizeDownloadDataset,
  playgroundGetSamples,
  playgroundGenerate,
  playgroundEvaluate,
  playgroundScoreDenialRisk,
  playgroundScoreWhatIf,
  playgroundDiagnostic,
  playgroundRecoverDelivery,
  playgroundLiveDataNpi,
  playgroundLiveDataNcci,
  playgroundLiveDataMedicareFee,
];

const server = new Server(
  { name: 'upstream-mcp', version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

const client = new UpstreamDataClient();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, (request) =>
  dispatchTool(client, tools, request.params.name, request.params.arguments),
);

const transport = new StdioServerTransport();
await server.connect(transport);
