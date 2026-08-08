import type { UpstreamDataClient } from '../client.js';

/**
 * A single MCP tool: typed schema + execute against the Upstream Data client.
 * `requiresKey` tools fail fast in index.ts when UPSTREAM_DATA_API_KEY is unset,
 * before any network call.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  requiresKey: boolean;
  execute(client: UpstreamDataClient, args: unknown): Promise<unknown>;
}
