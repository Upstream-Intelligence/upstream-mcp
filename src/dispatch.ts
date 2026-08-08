import type { UpstreamDataClient } from './client.js';
import { MissingApiKeyError, ToolInputError, UpstreamAPIError } from './errors.js';
import type { ToolDefinition } from './tools/types.js';

export type ToolResponse = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

function errorResponse(text: string): ToolResponse {
  return { content: [{ type: 'text', text }], isError: true };
}

/**
 * Route one MCP tool call to its definition. Key-gated tools fail fast with an
 * actionable message when UPSTREAM_DATA_API_KEY is unset — before any network call.
 * API errors surface the API's structured code/message/recovery fields verbatim.
 */
export async function dispatchTool(
  client: UpstreamDataClient,
  tools: ToolDefinition[],
  name: string,
  args: unknown,
): Promise<ToolResponse> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return errorResponse(`Unknown tool: ${name}`);
  }

  try {
    if (tool.requiresKey && !client.hasApiKey) {
      throw new MissingApiKeyError(tool.name);
    }
    const result = await tool.execute(client, args ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    if (err instanceof UpstreamAPIError) {
      return errorResponse(err.describe());
    }
    if (err instanceof MissingApiKeyError || err instanceof ToolInputError) {
      return errorResponse(err.message);
    }
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return errorResponse(`${name}: ${message}`);
  }
}
