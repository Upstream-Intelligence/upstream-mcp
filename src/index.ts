#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { UpstreamAPIClient } from './client.js';
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
  getSyntheticPackReadiness,
  getSyntheticPackScenarios,
  getSyntheticPackSchema,
  getSyntheticPackSources,
  listSyntheticDataPacks,
} from './tools/synthetic_data.js';
import { getDentalPayerDrift } from './tools/get_dental_payer_drift.js';

const tools = [
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
  listSyntheticDataPacks,
  getSyntheticPackSchema,
  getSyntheticPackSources,
  getSyntheticPackScenarios,
  getSyntheticPackReadiness,
];

const server = new Server(
  { name: 'upstream-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const client = new UpstreamAPIClient();

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (tool as any).execute(client, request.params.arguments ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message =
      err instanceof UpstreamAPIError ? err.message : 'Unexpected error';
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
