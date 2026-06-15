#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { UpstreamAPIClient, UPSTREAM_DATA_CONFIG } from './client.js';
import { UpstreamAPIError } from './errors.js';
import { checkNcciEdits } from './tools/check_ncci_edits.js';
import { lookupDenialCode } from './tools/lookup_denial_code.js';
import { lookupFeeSchedule } from './tools/lookup_fee_schedule.js';
import { scanClaim } from './tools/scan_claim.js';
import { getPayerScorecard } from './tools/get_payer_scorecard.js';
import { comparePracticeToCommunity } from './tools/compare_practice_to_community.js';
import { checkPayerBehavior } from './tools/check_payer_behavior.js';
import { getIndustrySignals } from './tools/get_industry_signals.js';
import { checkPriorAuthReadiness } from './tools/check_prior_auth_readiness.js';
import { getDenialClusters } from './tools/get_denial_clusters.js';
import { getAbaSessionTracker } from './tools/get_aba_session_tracker.js';
import { getAbaPayerComparison } from './tools/get_aba_payer_comparison.js';
import { getPatientPropensity } from './tools/get_patient_propensity.js';
import { queryDentalFeeSchedule } from './tools/query_dental_fee_schedule.js';
import { scoreDentalClaimDenialRisk } from './tools/score_dental_claim_denial_risk.js';
import {
  getDatasetReadiness,
  getDatasetRealism,
  getDatasetScenarios,
  getDatasetSchema,
  getDatasetSources,
  listDatasets,
} from './tools/synthetic_data.js';
import { getDentalPayerDrift } from './tools/get_dental_payer_drift.js';
import { getBenchmarkHistory, getBenchmarkLeaderboard, getModelScores } from './tools/benchmark.js';

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  service?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(...args: any[]): Promise<unknown>;
};

const tools: ToolDefinition[] = [
  checkNcciEdits,
  lookupDenialCode,
  lookupFeeSchedule,
  scanClaim,
  getPayerScorecard,
  comparePracticeToCommunity,
  checkPayerBehavior,
  getIndustrySignals,
  checkPriorAuthReadiness,
  getDenialClusters,
  getAbaSessionTracker,
  getAbaPayerComparison,
  getPatientPropensity,
  queryDentalFeeSchedule,
  scoreDentalClaimDenialRisk,
  getDentalPayerDrift,
  listDatasets,
  getDatasetSchema,
  getDatasetSources,
  getDatasetScenarios,
  getDatasetRealism,
  getDatasetReadiness,
  getBenchmarkLeaderboard,
  getModelScores,
  getBenchmarkHistory,
];

const server = new Server(
  { name: 'upstream-mcp', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

// Two services, one hardened transport: the platform API (denial codes, fee schedules,
// prior-auth readiness) and the Upstream Data synthetic-claims service (a separate host + key).
// Tools marked `service: 'data'` dispatch to the data-service client.
const client = new UpstreamAPIClient();
const dataClient = new UpstreamAPIClient(UPSTREAM_DATA_CONFIG);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  try {
    const selected = tool.service === 'data' ? dataClient : client;
    const result = await tool.execute(selected, request.params.arguments ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    if (err instanceof UpstreamAPIError) {
      return {
        content: [{ type: 'text', text: err.message }],
        isError: true,
      };
    }
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return {
      content: [{ type: 'text', text: `${request.params.name}: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
