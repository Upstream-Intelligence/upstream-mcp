import { UpstreamAPIClient } from './client.js';

/**
 * UpstreamDataClient wraps UpstreamAPIClient and prefixes all paths with /data/v1.
 * Reuses the existing fetch transport, X-API-Key header, and error-throwing logic
 * from UpstreamAPIClient. Do not reimplement any of that here.
 */
export class UpstreamDataClient {
  private readonly client: UpstreamAPIClient;

  constructor(client: UpstreamAPIClient) {
    this.client = client;
  }

  get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.client.get<T>(`/data/v1${path}`, params);
  }
}
