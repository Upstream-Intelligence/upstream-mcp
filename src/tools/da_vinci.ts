import { UpstreamAPIClient } from '../client.js';

export const generatePasPayload = {
  name: "generate_pas_payload",
  service: "data" as const,
  description:
    "Generate an HL7 Da Vinci Prior Authorization Support (PAS) intelligence payload. " +
    "Combines CatBoost denial risk scoring with CQL (Clinical Quality Language) rule evaluation.",
  inputSchema: {
    type: "object",
    properties: {
      payer: { type: "string", description: "Payer archetype or ID" },
      cpt: { type: "string", description: "Primary CPT code" },
      has_prior_auth: { type: "boolean", description: "Whether prior auth is on file" },
      charge_amount: { type: "number", description: "Total billed charge" },
      allowed_amount: { type: "number", description: "Expected allowed amount" },
    },
    required: ["payer", "cpt", "has_prior_auth", "charge_amount", "allowed_amount"],
  },
  annotations: {
    title: "Generate Da Vinci PAS Payload",
  },
  async execute(client: UpstreamAPIClient, args: Record<string, unknown>) {
    return client.post('/api/v1/score/da-vinci-pas', args);
  },
};
