import { ToolInputError } from '../errors.js';

/** JSON-Schema-shaped input schema for an MCP tool definition. */
export type InputSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties?: boolean;
};

/** Shallow check that a value is a plain object suitable for tool args. */
export function asArgs(args: unknown): Record<string, unknown> {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new ToolInputError('Tool arguments must be a JSON object.');
  }
  return args as Record<string, unknown>;
}

export function requireString(args: Record<string, unknown>, name: string): string {
  const value = args[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ToolInputError(`"${name}" is required and must be a non-empty string.`);
  }
  return value;
}

export function optionalString(args: Record<string, unknown>, name: string): string | undefined {
  const value = args[name];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ToolInputError(`"${name}" must be a string.`);
  }
  return value;
}

export function optionalInt(
  args: Record<string, unknown>,
  name: string,
  bounds: { min?: number; max?: number } = {},
): number | undefined {
  const value = args[name];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ToolInputError(`"${name}" must be an integer.`);
  }
  if (bounds.min !== undefined && value < bounds.min) {
    throw new ToolInputError(`"${name}" must be >= ${bounds.min}.`);
  }
  if (bounds.max !== undefined && value > bounds.max) {
    throw new ToolInputError(`"${name}" must be <= ${bounds.max}.`);
  }
  return value;
}

/** Build a POST body from validated fields, dropping undefined so defaults stay server-side. */
export function bodyFrom(fields: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) {
      body[k] = v;
    }
  }
  return body;
}
