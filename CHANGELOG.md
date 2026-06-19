# Changelog

All notable changes to `@upstream-intelligence/mcp` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (breaking)

- **Synthetic-data tool surface re-derived to the dataset catalog** (Phase 4
  Category B). The 14 `get_synthetic_pack_*` / `list_synthetic_data_packs` /
  `compile_synthetic_scenario_dsl` tools are replaced by 6 dataset tools:
  `list_datasets`, `get_dataset_schema` (public), and `get_dataset_sources`,
  `get_dataset_scenarios`, `get_dataset_realism`, `get_dataset_readiness`
  (paid API key). The tool argument `pack_id` becomes `dataset_id` (the stable
  catalog slug). `pack` was an internal upstream-data detail and no longer appears
  on the MCP surface. The 8 zero-count manifest tools (world, episode, payer-policy,
  contract-fee-schedule, payer-contract-simulation, evaluation, adjudication-trace,
  transaction-surface) and the scenario-DSL tool are removed — they returned
  misleading empty stubs.
- **Synthetic-data tools now target the Upstream Data service**, not the platform
  API. Configure `UPSTREAM_DATA_SERVICE_URL` (defaults to the live host) and
  `UPSTREAM_DATA_API_KEY` (separate from the platform `UPSTREAM_API_KEY`). The
  paths move from `/api/v1/data/packs/{id}/*` to
  `/api/v1/data/catalog/{dataset_id}/*`.

### Removed

- **Three unfinished agentic tools removed before any release** (`convene_llm_council`,
  `draft_care_action`, `generate_pas_payload`). They were imported but never added to the
  served tools array, shipped without tests, CHANGELOG, or README, and were unreachable as
  dead code. Two of them (`convene_llm_council`, `draft_care_action`) forward to the
  upstream-data `/api/v1/score/council` and `/api/v1/actions/draft` endpoints, which call
  frontier LLMs through OpenRouter — a provider with no HIPAA BAA — and the council endpoint
  performs no DLP scrub on its input, so exposing them on a public MCP client would re-open
  the PHI boundary the dataset tools were re-derived to close. Removed rather than registered;
  git history retains the source if a properly bounded, tested version is wired in later.

### Added

- `UpstreamClientConfig` + `UPSTREAM_DATA_CONFIG`: the hardened API client is now
  configurable for a second service (host, key env, label) without duplicating its
  timeout, error-sanitization, and URL-validation logic.
- Canon guard extended: `test/canon.test.ts` now also fails CI if the legacy
  synthetic-data pack surface (`get_synthetic_pack*`, `/api/v1/data/packs/`,
  `pack_id`, etc.) reappears under `src/`.

### Security

- API client hardened: https/localhost base-URL validation (fail at construction),
  request timeout via `AbortSignal.timeout` → 504, 5xx bodies sanitized (no server
  internals leaked), 4xx bodies capped, empty-key stderr warning, 429 preserved.
- Path arguments URL-encoded across tools (`lookup_denial_code`,
  `lookup_fee_schedule`, dataset tools) to prevent path traversal.
- Patched moderate dependency CVEs in `hono` + `qs` (`npm audit` → 0).

## [0.2.0] - 2026-05-14

The 0.1.0 release shipped the original single-file MCP server from the
`Upstream-Intelligence/upstream` monorepo at `packages/mcp-server/`. The 0.2.0
release ships the new multi-file rewrite from the
`Upstream-Intelligence/upstream-mcp` standalone repo, which is now the canonical
source. The monorepo duplicate was removed in
[upstream#346](https://github.com/Upstream-Intelligence/upstream/pull/346).

### Fixed

- **`scan_claim`**: path was hitting `/api/v1/public/claim-scan/` which 404s.
  Corrected to `/api/v1/public/claim-review/` per the Django route at
  `upstream/api/v1/public/claim_scanner.py:281`. Every prior invocation was
  silently failing.
- **`compare_payers` → `compare_practice_to_community`**: backend endpoint
  `/api/v1/public/payer-scorecard/compare/` is an email-gated "compare YOUR
  practice against the community" lead-capture endpoint, not a two-payer
  comparison. Renamed tool and replaced schema to match: required `email`,
  `payer`, `specialty`; optional `your_denial_rate`, `your_days_to_pay`,
  `your_appeal_win_rate`.
- **`fast-uri` HIGH CVE**: transitive through `@modelcontextprotocol/sdk → ajv`.
  Bumped to a patched release. Clears GHSA-q3j6-qgpj-74h6 (path traversal via
  percent-encoded dot segments) and GHSA-v39h-62p7-jpjc (host confusion via
  percent-encoded authority delimiters). `npm audit` clean.

### Added

- **`get_aba_session_tracker`**: documented in README. Tool was already
  registered in `src/index.ts` since the initial implementation but absent
  from the public tool table.
- **`.env.example`**: the README told users to `cp .env.example .env`, but the
  file did not exist. Added with `UPSTREAM_API_KEY` and two optional knobs.

## [0.1.0] - 2026-04-23

Initial public release from `Upstream-Intelligence/upstream` monorepo.

### Added

- `lookup_carc` — decode any CARC code with plain-English meaning and appeal
  strategy.
- `check_ncci_edit` — check whether two CPT/HCPCS codes are subject to NCCI
  bundling, MUE unit limits, or modifier-allowed overrides.
- `fee_schedule_lookup` — CMS Medicare Physician Fee Schedule rates with RVU
  components.
- `payer_scorecard` — public Payer Behavior Scorecard with denial rate,
  days-to-pay, overturn rate, top denial reasons.
- `list_payer_scorecards` — list every tracked payer, filterable by specialty
  (ABA, SNF, PT/OT, dental, etc.).
- `compare_payers` — side-by-side comparison of 2-5 payers (replaced in 0.2.0
  by `compare_practice_to_community` — see 0.2.0 notes).
