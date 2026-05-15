# Changelog

All notable changes to `@upstream-intelligence/mcp` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- `list_payer_scorecards` — list every tracked payer, filterable by vertical
  (ABA, SNF, PT/OT, dental, etc.).
- `compare_payers` — side-by-side comparison of 2-5 payers (replaced in 0.2.0
  by `compare_practice_to_community` — see 0.2.0 notes).
