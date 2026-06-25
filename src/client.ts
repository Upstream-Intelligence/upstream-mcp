import { UpstreamAPIError } from './errors.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY_CHARS = 500;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

/**
 * Transport configuration for one upstream service. The same hardened client serves both the
 * platform API and the synthetic-data service — they differ only in which env vars hold the base
 * URL and key, the fallback host, and the label used in error messages.
 */
export interface UpstreamClientConfig {
  baseUrlEnv: string;
  apiKeyEnv: string;
  defaultBaseUrl: string;
  serviceLabel: string;
}

/** The live Upstream platform API: denial codes, fee schedules, prior-auth readiness. */
export const UPSTREAM_API_CONFIG: UpstreamClientConfig = {
  baseUrlEnv: 'UPSTREAM_BASE_URL',
  apiKeyEnv: 'UPSTREAM_API_KEY',
  defaultBaseUrl: 'https://api.upstream.cx',
  serviceLabel: 'Upstream API',
};

/**
 * The Upstream Data synthetic-claims service — a SEPARATE host and key from the platform API.
 * `data.upstream.cx` is the marketing site, NOT the API; the API is the Railway service below,
 * overridable via UPSTREAM_DATA_SERVICE_URL (e.g. once a stable branded subdomain is wired).
 */
export const UPSTREAM_DATA_CONFIG: UpstreamClientConfig = {
  baseUrlEnv: 'UPSTREAM_DATA_SERVICE_URL',
  apiKeyEnv: 'UPSTREAM_DATA_API_KEY',
  defaultBaseUrl: 'https://upstream-data-production.up.railway.app',
  serviceLabel: 'Upstream Data',
};

/**
 * Resolve and validate the base URL for one service. We require https in production and allow http
 * only for localhost dev, so a misconfigured base URL can never silently forward the API key over
 * plaintext (or to an unexpected host). Throws at construction — fail loud, not on the first request.
 */
function resolveBaseUrl(config: UpstreamClientConfig): string {
  const raw = process.env[config.baseUrlEnv] ?? config.defaultBaseUrl;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    const colonIdx = raw.indexOf(':');
    const protocol = colonIdx > 0 ? raw.slice(0, colonIdx) : 'missing';
    throw new Error(
      `${config.baseUrlEnv} is not a valid URL (protocol: ${protocol})`,
    );
  }
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const allowed = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhost);
  if (!allowed) {
    throw new Error(
      `${config.baseUrlEnv} must use https (http is allowed only for localhost). Got protocol: ${parsed.protocol}`,
    );
  }
  return raw.replace(/\/+$/, ''); // strip trailing slash so `${base}${path}` never doubles it
}

function resolveTimeoutMs(): number {
  const raw = process.env.UPSTREAM_REQUEST_TIMEOUT_MS;
  if (raw === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export class UpstreamAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly serviceLabel: string;

  constructor(config: UpstreamClientConfig = UPSTREAM_API_CONFIG) {
    this.baseUrl = resolveBaseUrl(config);
    this.apiKey = process.env[config.apiKeyEnv] ?? '';
    this.timeoutMs = resolveTimeoutMs();
    this.serviceLabel = config.serviceLabel;
    if (!this.apiKey) {
      // stderr is safe for an MCP server (stdout is the JSON-RPC protocol channel).
      console.error(
        `upstream-mcp: API key is not set; authenticated ${config.serviceLabel} ` +
          'endpoints will fail. Set it from https://upstream.cx/developers/keys',
      );
    }
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    return this.requestWithRetry<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    return this.requestWithRetry<T>(url, { method: 'POST', body: JSON.stringify(body) });
  }

  private async requestWithRetry<T>(url: URL, init: RequestInit): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.request<T>(url, init);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (err instanceof UpstreamAPIError && RETRYABLE_STATUS_CODES.has(err.statusCode) && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError!;
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    let res: Response;
    try {
      res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        throw new UpstreamAPIError(
          `Request to ${this.serviceLabel} timed out after ${this.timeoutMs}ms`,
          504,
        );
      }
      throw err;
    }

    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new UpstreamAPIError(
        `Monthly quota exceeded. Tier: ${String(data['tier'] ?? 'free')}. ` +
          `Upgrade at https://upstream.cx/developers/keys`,
        429,
      );
    }

    if (!res.ok) {
      // 5xx bodies can carry server internals or stack traces — never propagate them to the caller.
      // 4xx bodies are the API's own structured client errors (e.g. "cpt is required"); keep those.
      if (res.status >= 500) {
        throw new UpstreamAPIError(`${this.serviceLabel} error (HTTP ${res.status})`, res.status);
      }
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new UpstreamAPIError(text.slice(0, MAX_ERROR_BODY_CHARS), res.status);
    }

    return res.json() as Promise<T>;
  }
}
