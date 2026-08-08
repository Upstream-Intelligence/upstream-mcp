import { UpstreamAPIError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.data.upstream.cx';
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 500;
const MAX_ERROR_BODY_CHARS = 500;

/**
 * Thin HTTP client for the Upstream Data API (https://api.data.upstream.cx).
 *
 * - Base URL: UPSTREAM_DATA_BASE_URL, default https://api.data.upstream.cx.
 *   https is required except for localhost dev, so a misconfigured URL can never
 *   silently forward the API key over plaintext.
 * - Auth: X-API-Key header from UPSTREAM_DATA_API_KEY. The key is never logged.
 * - Timeout: every request carries an AbortSignal (UPSTREAM_DATA_TIMEOUT_MS,
 *   default 30s).
 * - Retry: GETs retry exactly once with backoff on network errors (DNS, refused,
 *   reset, timeout). POSTs are never retried — synthesis and scoring are not
 *   idempotent, and HTTP error statuses are never retried.
 */
export class UpstreamDataClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = resolveBaseUrl(env.UPSTREAM_DATA_BASE_URL ?? DEFAULT_BASE_URL);
    this.apiKey = env.UPSTREAM_DATA_API_KEY ?? '';
    this.timeoutMs = resolveTimeoutMs(env.UPSTREAM_DATA_TIMEOUT_MS);
  }

  get hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    try {
      return await this.request<T>(url, { method: 'GET' });
    } catch (err) {
      if (isNetworkError(err)) {
        await sleep(RETRY_DELAY_MS);
        return this.request<T>(url, { method: 'GET' });
      }
      throw err;
    }
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
          `Request to Upstream Data API timed out after ${this.timeoutMs}ms`,
          504,
          'TIMEOUT',
          'Retry the request. If timeouts persist, raise UPSTREAM_DATA_TIMEOUT_MS or check network connectivity.',
        );
      }
      throw err;
    }

    if (!res.ok) {
      throw await this.toError(res);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Map an error response to UpstreamAPIError, preserving the API's structured
   * `{error: {code, message, recovery}}` fields. 5xx bodies can carry server
   * internals, so only the status is surfaced for those.
   */
  private async toError(res: Response): Promise<UpstreamAPIError> {
    if (res.status >= 500) {
      return new UpstreamAPIError(
        `Upstream Data API error (HTTP ${res.status})`,
        res.status,
        'UPSTREAM_SERVER_ERROR',
        'Retry shortly. If the error persists, check https://data.upstream.cx for service status.',
      );
    }

    const text = await res.text().catch(() => '');
    const body = safeJson(text.slice(0, MAX_ERROR_BODY_CHARS * 4));
    const err = body?.['error'];
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      const message = String(e['message'] ?? e['detail'] ?? `HTTP ${res.status}`);
      return new UpstreamAPIError(
        message.slice(0, MAX_ERROR_BODY_CHARS),
        res.status,
        typeof e['code'] === 'string' ? e['code'] : undefined,
        typeof e['recovery'] === 'string' ? e['recovery'] : undefined,
        typeof e['request_id'] === 'string' ? e['request_id'] : undefined,
      );
    }

    const fallback =
      body && typeof body['detail'] === 'string'
        ? String(body['detail'])
        : text || `HTTP ${res.status}`;
    return new UpstreamAPIError(fallback.slice(0, MAX_ERROR_BODY_CHARS), res.status);
  }
}

function resolveBaseUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`UPSTREAM_DATA_BASE_URL is not a valid URL: ${raw}`);
  }
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    throw new Error(
      `UPSTREAM_DATA_BASE_URL must use https (http is allowed only for localhost). Got: ${parsed.protocol}`,
    );
  }
  return raw.replace(/\/+$/, '');
}

function resolveTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * True only for transport-level failures (fetch could not get a response).
 * UpstreamAPIError means the server answered — never retried.
 */
function isNetworkError(err: unknown): boolean {
  if (err instanceof UpstreamAPIError) {
    return err.code === 'TIMEOUT';
  }
  return err instanceof TypeError || err instanceof DOMException;
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
