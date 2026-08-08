<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="https://raw.githubusercontent.com/Upstream-Intelligence/.github/main/.github/assets/upstream-wordmark-dark.svg">
  <img src="https://raw.githubusercontent.com/Upstream-Intelligence/.github/main/.github/assets/upstream-wordmark-light.svg"
       alt="Upstream" width="220" />
</picture>

# upstream-mcp

### Synthetic payer and claims data, as MCP tools.

The Model Context Protocol server for the [Upstream Data API](https://data.upstream.cx) — synthetic claims generation, dataset catalogs, and CatBoost denial-risk scoring for developer agents.

[![npm](https://img.shields.io/npm/v/@upstream-intelligence/mcp?color=0454F1)](https://www.npmjs.com/package/@upstream-intelligence/mcp)
[![License](https://img.shields.io/github/license/Upstream-Intelligence/upstream-mcp?color=0454F1)](LICENSE)
[![Issues](https://img.shields.io/github/issues/Upstream-Intelligence/upstream-mcp?color=0454F1)](https://github.com/Upstream-Intelligence/upstream-mcp/issues)

</div>

---

## What this is

A thin MCP server that exposes the Upstream Data API (`https://api.data.upstream.cx`) to any MCP-capable agent. Sixteen tools in three groups:

- **`catalog_*`** — discover data packs, datasets, schemas, and the live model. Public, no key.
- **`synthesize_*`** — full batch dataset generation and download. Key-gated.
- **`playground_*`** — inline generation (≤1000 rows), seeded evaluation, denial-risk scoring, what-if scoring, denial diagnostics, delivery recovery, and live reference data (NPI, NCCI, Medicare fee). Samples are public; the rest are key-gated.

All data is synthetic. No PHI crosses this server.

## Install

### Claude Code

```bash
claude mcp add upstream-data -- npx -y @upstream-intelligence/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "upstream-data": {
      "command": "npx",
      "args": ["-y", "@upstream-intelligence/mcp"],
      "env": {
        "UPSTREAM_DATA_API_KEY": "your_key_here"
      }
    }
  }
}
```

Get an API key at [data.upstream.cx](https://data.upstream.cx). Public tools work without one.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `UPSTREAM_DATA_API_KEY` | For key-gated tools | (none) | Sent as the `X-API-Key` header. Never logged. |
| `UPSTREAM_DATA_BASE_URL` | No | `https://api.data.upstream.cx` | Override for staging/local. https required; http allowed only for localhost. |
| `UPSTREAM_DATA_TIMEOUT_MS` | No | `30000` | Per-request timeout in milliseconds. |

Key-gated tools fail fast with an actionable message when `UPSTREAM_DATA_API_KEY` is unset — no network call is made.

## Tools

### Catalog (public)

| Tool | What it does |
|---|---|
| `catalog_list_packs` | List data packs: claim types (professional 837P, institutional 837I, dental 837D), their scenario templates, and pricing tiers. |
| `catalog_list_datasets` | List the synthetic dataset catalog (aba, dental, snf-ma, …) with catalog metadata. |
| `catalog_get_dataset_schema` | Get the column schema for one dataset by slug. 404 structured error on unknown slugs. |
| `catalog_get_active_model` | Get the deployed denial-risk model: version, AUC, training date, feature list. |

### Synthesis (key-gated)

| Tool | What it does |
|---|---|
| `synthesize_create_dataset` | Generate a full synthetic claims dataset: `{specialty, rows, scenario}` → `dataset_id` + quality metadata. |
| `synthesize_download_dataset` | Get the download for a `dataset_id` returned by `synthesize_create_dataset`. |

### Playground

| Tool | Key | What it does |
|---|---|---|
| `playground_get_samples` | No | Instant pre-generated sample datasets with time-limited download URLs. |
| `playground_generate` | Yes | Generate rows inline (≤1000, enforced client-side) for interactive exploration. |
| `playground_evaluate` | Yes | Seeded evaluation: reproduce a run with the same seed and score data quality. |
| `playground_score_denial_risk` | Yes | Score one claim's denial probability with the deployed CatBoost model. |
| `playground_score_what_if` | Yes | Re-score a claim under a hypothetical change (`what_if` overrides) for the risk delta. |
| `playground_diagnostic` | Yes | Diagnose a denial: likely root causes and corrective actions for a claim. |
| `playground_recover_delivery` | Yes | Recover a fresh download link for a previously generated dataset. |
| `playground_live_data_npi` | Yes | Live NPI registry lookup for a provider. |
| `playground_live_data_ncci` | Yes | Live NCCI edit check for a CPT pair. |
| `playground_live_data_medicare_fee` | Yes | Live Medicare fee schedule rate for a CPT code. |

### Errors

The API returns structured errors as `{error: {code, message, recovery}}`. All three fields are surfaced verbatim in the tool response, e.g.:

```
ROWS_LIMIT_EXCEEDED: playground generate is limited to 1000 rows — Recovery: Use synthesize_create_dataset for larger batches
```

Timeouts return a 504 with retry guidance. GETs retry once on network errors; POSTs are never retried (synthesis and scoring are not idempotent).

## Example agent session

```
> What synthetic datasets can I generate?

  → catalog_list_packs {}
  {"claim_types": [{"claim_type": "professional", "name": "Professional (837P)",
    "scenarios": ["baseline", "authorization_surge", ...]}, ...],
   "pricing": [{"id": "sample", "rows": 1000, "price": 0, ...}, ...]}

  → catalog_list_datasets {}
  {"datasets": [{"slug": "aba", ...}, {"slug": "dental", ...}, {"slug": "snf-ma", ...}]}

> Show me the ABA schema, then score a claim: Aetna, CPT 97153, $350, no prior auth.

  → catalog_get_dataset_schema {"slug": "aba"}
  {"columns": [{"name": "payer", "type": "string", ...}, ...]}

  → catalog_get_active_model {}
  {"model_id": "upstream-denialbrain-v2.0", "version": "2.0.0", "auc": 0.9946, ...}

  → playground_score_denial_risk {"payer": "Aetna", "cpt": "97153",
      "charge_amount": 350, "has_prior_auth": false}
  {"denial_probability": 0.41, "drivers": [...], "model_version": "2.0.0"}

> Generate 500 baseline ABA rows to test against.

  → playground_generate {"specialty": "aba", "rows": 500, "scenario": "baseline"}
  {"rows": [...500 synthetic claim rows...], "quality": {...}}
```

## Local development

```bash
git clone https://github.com/Upstream-Intelligence/upstream-mcp
cd upstream-mcp
npm install
cp .env.example .env
npm run build
npm test
```

Point an agent at the local build:

```json
{
  "mcpServers": {
    "upstream-data": {
      "command": "node",
      "args": ["/absolute/path/to/upstream-mcp/dist/index.js"],
      "env": {
        "UPSTREAM_DATA_API_KEY": "your_key_here"
      }
    }
  }
}
```

---

## Code license vs. service terms

The MCP client code in this repository is **MIT licensed**. Fork it, audit it, embed it in your stack.

The Upstream Data API service that this client calls is governed by separate terms at [upstream.cx/terms](https://upstream.cx/terms). The license on the client code does not grant API service access.

## Related

Part of the [Upstream Intelligence ecosystem](https://github.com/Upstream-Intelligence).

- **upstream-mcp** — you are here
- [upstream-skills](https://github.com/Upstream-Intelligence/upstream-skills) — Claude Code skills for billing teams
- [upstream-community](https://github.com/Upstream-Intelligence/upstream-community) — open ML methodology
- [awesome-payer-risk](https://github.com/Upstream-Intelligence/awesome-payer-risk) — curated RCM resources

---

Built by [Upstream Intelligence](https://upstream.cx).
