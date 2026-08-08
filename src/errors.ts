/**
 * Error thrown for any failed call to the Upstream Data API.
 *
 * The API returns structured errors as `{ "error": { code, message, recovery } }`
 * (some routes use `detail` instead of `message` and may add a `request_id`).
 * All available fields are preserved here so MCP tools can surface the API's own
 * recovery guidance verbatim instead of inventing copy.
 */
export class UpstreamAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly recovery?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'UpstreamAPIError';
  }

  /** One-line rendering for MCP tool responses: code, message, recovery, request id. */
  describe(): string {
    const parts = [
      this.code ? `${this.code}: ${this.message}` : this.message,
    ];
    if (this.recovery) {
      parts.push(`Recovery: ${this.recovery}`);
    }
    if (this.requestId) {
      parts.push(`(request_id: ${this.requestId})`);
    }
    return parts.join(' — ');
  }
}

/** Thrown when a tool's arguments fail local validation before any network call. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

/** Thrown when a key-gated tool is invoked without UPSTREAM_DATA_API_KEY set. */
export class MissingApiKeyError extends Error {
  constructor(toolName: string) {
    super(
      `${toolName} requires an Upstream Data API key, but UPSTREAM_DATA_API_KEY is not set. ` +
        'Set the UPSTREAM_DATA_API_KEY environment variable (get a key at ' +
        'https://data.upstream.cx) and restart the MCP server.',
    );
    this.name = 'MissingApiKeyError';
  }
}
