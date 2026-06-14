import { UpstreamAPIError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.upstream.cx';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY_CHARS = 500;

/**
 * Resolve and validate the API base URL. We require https in production and allow http only for
 * localhost dev, so a misconfigured base URL can never silently forward the API key over plaintext
 * (or to an unexpected host). Throws at construction — fail loud, not on the first request.
 */
function resolveBaseUrl(): string {
  const raw = process.env.UPSTREAM_BASE_URL ?? DEFAULT_BASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`UPSTREAM_BASE_URL is not a valid URL: ${raw}`);
  }
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const allowed = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhost);
  if (!allowed) {
    throw new Error(
      `UPSTREAM_BASE_URL must use https (http is allowed only for localhost): ${raw}`,
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

  constructor() {
    this.baseUrl = resolveBaseUrl();
    this.apiKey = process.env.UPSTREAM_API_KEY ?? '';
    this.timeoutMs = resolveTimeoutMs();
    if (!this.apiKey) {
      // stderr is safe for an MCP server (stdout is the JSON-RPC protocol channel).
      console.error(
        'upstream-mcp: UPSTREAM_API_KEY is not set; authenticated endpoints will fail. ' +
          'Set it to a key from https://upstream.cx/developers/keys',
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
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body) });
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
          `Request to Upstream API timed out after ${this.timeoutMs}ms`,
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
        throw new UpstreamAPIError(`Upstream API error (HTTP ${res.status})`, res.status);
      }
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new UpstreamAPIError(text.slice(0, MAX_ERROR_BODY_CHARS), res.status);
    }

    return res.json() as Promise<T>;
  }
}
