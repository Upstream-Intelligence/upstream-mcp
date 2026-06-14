---
gsd_state_version: 1.0
milestone: phase-1-canon-anchor
milestone_name: canon-anchor
status: initialized
last_updated: "2026-06-13T22:00:00-05:00"
last_activity: 2026-06-13
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
product_readiness:
  status: initialized
  estimated_completion_band: "not started"
  note: "This repo tracks MCP-side workflow-bridge alignment."
---

# State

See: `.planning/PROJECT.md` and `../docs/plans/2026-06-12-002-feat-prior-auth-assurance-ecosystem-plan.md`

This repo is not the milestone control plane for this lane. The controlling GSD
phase is `../.planning/phases/02-shared-phase-1-ship-point/`, and this repo
owns the MCP slice of Plan `02-03`.

## Status (2026-06-13)

The MCP slice of `02-03` is DONE and pushed (commits `8205d32` test / `d6be9a8`
feat / `d12a1f4` wording): `check_prior_auth_readiness` rewired off the phantom
`claim_id` path to the real D2 contract `GET /data/v1/prior-auth-readiness/`
(payer+cpt, `sk_` auth) behind a shared `UpstreamDataClient`; 7 vitest cases pin
the contract incl. the `unknown` verbatim passthrough and 400/401/404 propagation;
README/package on Workflow Bridge framing; Upstream Data referenced generically.

This repo is NON-DEPLOYING. The milestone SHIPPED: PR #27 merged to v2 `main`
(`5774fa4`), backend `upstream-v2-api-00048-srd` live, `/data/v1/prior-auth-readiness/`
live (404 -> 401), so this tool is functional end-to-end.

## Status (2026-06-13, Phase 4 - No-Packs Framing Convergence)

Category A DONE + pushed (`chore: drop pack/vertical platform framing + add
legacy-identifier canon guard`): CHANGELOG "filterable by vertical" -> "specialty";
README "Specialty workflows" -> "Workflows by practice type"; added vitest
`test/canon.test.ts` (bans the nine legacy identifiers, proven able to FAIL,
CI-enforced via the reusable-ci `npm test` step). `npm test` 21 passed, `tsc` clean.

**Category B: RESOLVED 2026-06-14** (was deferred/blocked). The synthetic-data
product surface re-derived to the dataset catalog; details in the 2026-06-14 status
section below. See `../.planning/phases/04-no-packs-framing-convergence/04-B-SUMMARY.md`.

## Status (2026-06-14, security hardening shipped out-of-band + Cat B unblocked)

Two updates recorded by the root control plane (see `../.planning/STATE.md` ->
"Drift Reconciliation + Cat B Unblock (2026-06-14)").

- **Contract Hardening (most of Phase 3 / MCP-06) shipped AHEAD of its plan** as
  part of a cross-repo security burn-down: `client.ts` hardened (base-URL
  https/localhost validation, `AbortSignal.timeout` -> 504, 5xx body sanitized, 4xx
  capped, empty-key stderr warn, 429 preserved); `encodeURIComponent` on path args
  (`lookup_denial_code`, `lookup_fee_schedule`, synthetic tools);
  `get_denial_clusters` query fix; `npm audit fix` (0 CVEs); +34 tests. Phase 3
  ROADMAP status is reconciled when the phase is formally closed.
- **Category B is now UNBLOCKED.** upstream-data v3.40 is live on Railway
  (`https://upstream-data-production.up.railway.app`). The synthetic-data MCP
  surface re-derives against `/api/v1/data/catalog/{slug}/*` on that host via a
  SECOND client (`UPSTREAM_DATA_SERVICE_URL` + `UPSTREAM_DATA_API_KEY`, separate
  from the v2 `sk_`/`api.upstream.cx` client), pruning 14 tools -> 6. Plan:
  `../.planning/phases/04-no-packs-framing-convergence/04-B-PLAN-synthetic-data-redrive.md`.
