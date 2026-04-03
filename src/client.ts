import { UpstreamAPIError } from './errors.js';

export class UpstreamAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.UPSTREAM_BASE_URL ?? 'https://api.upstream.cx';
    this.apiKey = process.env.UPSTREAM_API_KEY ?? '';
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
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const res = await fetch(url, { ...init, headers });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new UpstreamAPIError(
        `Monthly quota exceeded. Tier: ${String(data['tier'] ?? 'free')}. ` +
          `Upgrade at https://upstream.cx/developers/keys`,
        429,
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => `HTTP ${res.status}`);
      throw new UpstreamAPIError(text, res.status);
    }

    return res.json() as Promise<T>;
  }
}
