export class UpstreamAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'UpstreamAPIError';
  }
}
