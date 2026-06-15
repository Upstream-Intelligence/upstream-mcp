<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)"
          srcset="https://raw.githubusercontent.com/Upstream-Intelligence/.github/main/.github/assets/upstream-wordmark-dark.svg">
  <img src="https://raw.githubusercontent.com/Upstream-Intelligence/.github/main/.github/assets/upstream-wordmark-light.svg"
       alt="Upstream" width="220" />
</picture>

# upstream-mcp

### Care Intelligence tools for any workflow.

Pre-submission claim risk. Live denial intelligence. Payer behavioral signals. Prior-auth readiness. The Workflow Bridge between clinical operations and payer systems.

[![npm](https://img.shields.io/npm/v/@upstream-intelligence/mcp?color=0454F1)](https://www.npmjs.com/package/@upstream-intelligence/mcp)
[![License](https://img.shields.io/github/license/Upstream-Intelligence/upstream-mcp?color=0454F1)](LICENSE)
[![Issues](https://img.shields.io/github/issues/Upstream-Intelligence/upstream-mcp?color=0454F1)](https://github.com/Upstream-Intelligence/upstream-mcp/issues)
[![upstream.cx](https://img.shields.io/badge/upstream-cx-0454F1)](https://upstream.cx)
[![Newsletter](https://img.shields.io/badge/newsletter-subscribe-0454F1)](https://upstream.cx/newsletter)

</div>

---

## What this is

A Model Context Protocol server that exposes Upstream's Care Intelligence Platform as MCP tools. The Workflow Bridge pattern connects your clinical operations tooling to live payer intelligence without shipping PHI upstream.

Billing teams use it to get real answers on claim risk, denial codes, payer behavior, and prior-auth readiness. With upstream-mcp installed, the assistant calls Upstream's network of operators and returns the real signal with specific dollar impact and the recommended fix.

Built for healthcare specialty practices with high prior-authorization burden. One connected platform, specialty-aware: the MCP routes specialty queries to the right backend.

## What it looks like

```json
{
  "coverage_state": "active",
  "prior_auth_required": true,
  "readiness_state": "ready_when_assembled",
  "requirements": ["Diagnosis on payer's covered list", "Step therapy documented"],
  "step_therapy": "completed",
  "documentation": ["Chart notes supporting medical necessity", "Prior treatment history"],
  "next_safe_action": "Gather documentation before submitting. All requirements can be satisfied."
}
```

Prior-auth readiness for a payer + CPT check. No PHI. Payer name and CPT code only.

The Upstream Data ecosystem at [data.upstream.cx](https://data.upstream.cx) provides structured payer intelligence via the `/data/v1` API surface (prior-auth readiness, requirements benchmarks, denial risk). This MCP is the Workflow Bridge to those surfaces.

---

## Install

### Claude Code

```bash
claude mcp add upstream -- npx -y @upstream-intelligence/mcp
export UPSTREAM_API_KEY=your_key_here
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "upstream": {
      "command": "npx",
      "args": ["-y", "@upstream-intelligence/mcp"],
      "env": {
        "UPSTREAM_API_KEY": "your_key_here"
      }
    }
  }
}
```

Free API key (500 calls per month, no credit card): [upstream.cx/developers/keys](https://upstream.cx/developers/keys)

---

## Tools available to Claude

`[Free]` tools work on the free evaluation tier (rate limited, no PHI).
`[Paid]` tools require a paid API tier (see [upstream.cx/pricing](https://upstream.cx/pricing)). See [Code license vs. service terms](#code-license-vs-service-terms) below.

### Claim intelligence

| Tool | Tier | What it does |
|---|---|---|
| `scan_claim` | `[Free]` rate limited | Pre-submission claim risk scan. Checks NCCI edits, authorization requirements, denial probability, and payer specific patterns. Returns a risk signal with the specific issues to fix before submission. |
| `check_ncci_edits` | `[Free]` | Check whether two CPT codes can be billed together. Returns edit type (PTP or MUE), modifier options, and clinical rationale. |
| `check_prior_auth_readiness` | `[Free]` rate limited | Check prior-auth readiness for a payer and CPT code. Returns readiness_state (ready_when_assembled, no_prior_auth_required, or unknown), requirements, documentation needed, and next_safe_action. Specialty-aware, with coverage expanding over time. |

### Denial intelligence

| Tool | Tier | What it does |
|---|---|---|
| `lookup_denial_code` | `[Free]` | Look up any CARC denial reason code. Returns plain English explanation, root causes, corrective actions, and the regulatory basis. |
| `get_denial_clusters` | `[Paid]` | Active denial clusters with root cause labels and dollar impact. When `cross_customer_signal: true`, the pattern is affecting multiple operators in the network simultaneously. Not just yours. |
| `get_industry_signals` | `[Paid]` | Network wide anomalies. Denial patterns affecting multiple practices on the same day. The early warning that no single practice tool can produce. |

### Payer intelligence

| Tool | Tier | What it does |
|---|---|---|
| `get_payer_scorecard` | `[Paid]` | A to F grade and denial rate for a payer by specialty. Includes top denial codes, payment timing percentiles, and historical appeal success rates. |
| `compare_practice_to_community` | `[Free, lead-capture]` | Compare your practice's payer-specific metrics (denial rate, days-to-pay, appeal win rate) against the Upstream network aggregate for that payer + specialty. Requires email — saved as a lead. Returns delta metrics + risk-adjusted CTA. |
| `check_payer_behavior` | `[Paid]` | Behavioral risk score and cluster classification (Aggressive Denier, Slow Payer, Prompt Payer, Underpayer). Includes recent policy changes and the specific dates of detection. |

### Reimbursement

| Tool | Tier | What it does |
|---|---|---|
| `lookup_fee_schedule` | `[Free]` | CMS national fee schedule rates for any CPT code. Returns facility and non facility rates, RVUs, and geographic adjusters. |

### Benchmark leaderboard

| Tool | Tier | What it does |
|---|---|---|
| `get_benchmark_leaderboard` | `[Free]` | Get the latest RCM Arena benchmark leaderboard with model rankings across all RCM specialties. Returns rank, model name, overall accuracy, F1 score, and cost per run. |
| `get_model_scores` | `[Free]` | Get per-specialty benchmark scores for a specific model (or all models if model_id omitted). Returns accuracy, F1, precision, and recall per RCM specialty. |
| `get_benchmark_history` | `[Free]` | Get the history of all past RCM Arena benchmark runs. Returns run_id, date, top model, and top accuracy for each run. |

### ABA workflow

| Tool | Tier | What it does |
|---|---|---|
| `get_aba_session_tracker` | `[Paid]` | ABA session authorization status by patient reference: authorized hours, sessions used, hours remaining, expiry date, risk level (red / amber / green), renewal urgency. Use in ABA billing workflows. Patient reference is the anonymized token from your Upstream dashboard — never PHI. |
| `get_aba_payer_comparison` | `[Paid]` | Payer-side approval rates for the seven ABA CPT codes (97151-97158) across active payers. Use to identify which payers are denying the highest-revenue ABA codes. |

### Dental workflow

| Tool | Tier | What it does |
|---|---|---|
| `query_dental_fee_schedule` | `[Paid]` | Upstream-tracked dental fee schedule for a payer + CDT code. Includes posted rate, network status, last drift event, and reimbursement ratio versus UCR. |
| `score_dental_claim_denial_risk` | `[Paid]` | Scores pending/recent dental claims with CatBoost risk model. Returns per-claim risk score (0-100), risk band, SHAP factors, and pre-submission actions. |
| `get_dental_payer_drift` | `[Paid]` | Dental payer behavioral drift: reimbursement drops, denial spikes, silent PPO indicators, downcoding over 90 days. Detects payers quietly changing contracts. |

### Patient workflow

| Tool | Tier | What it does |
|---|---|---|
| `get_patient_propensity` | `[Paid]` | Patient collectibility signal with collection probability and recommended approach. Powered by Upstream's propensity model. |

---

## Example questions Claude can answer

**Claim work:**
- "Scan this claim for UnitedHealthcare. CPT 96413, 96415. POS 11."
- "Can I bill 97153 and 97155 together on the same claim?"
- "Check prior-auth readiness for Aetna CPT 96365 before I submit."

**Denial work:**
- "What does denial code 97 mean and how do I fix it?"
- "What denial clusters are active in my account right now?"
- "Show me network wide denial signals from the last 7 days."

**Payer intelligence:**
- "What grade does Aetna get for this specialty?"
- "Compare UnitedHealthcare and Cigna on denial rates."
- "Has UnitedHealthcare made any recent policy changes for SNF claims?"

**Reimbursement:**
- "What is the Medicare rate for CPT 97153?"
- "Show me RVUs for 97155 facility versus non facility."

**Dental:**
- "Query Delta Dental's fee schedule for CDT code D2740."
- "Score my pending dental claims for denial risk."
- "Show me payer drift for Delta Dental over the last 90 days."
- "Compare payer approval rates for ABA CPT codes."

---

## Why an MCP

Most generic chat assistants hallucinate on healthcare billing. They give plausible CARC interpretations that are wrong. They confidently state Aetna's denial rate when no one ever measured it.

Upstream's MCP gives Claude actual data. Real CMS reference tables. Real network behavioral signals. Real payer scorecards measured against operator outcomes.

Claude becomes accurate. Your team trusts the answer.

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `UPSTREAM_API_KEY` | Optional for free tier | (none) | Get one at [upstream.cx/developers/keys](https://upstream.cx/developers/keys) |
| `UPSTREAM_BASE_URL` | Optional | `https://api.upstream.cx` | Override for local development or sandbox testing |

---

## Local development

```bash
git clone https://github.com/Upstream-Intelligence/upstream-mcp
cd upstream-mcp
npm install
cp .env.example .env
npm run build
npm test
```

Point Claude at the local build:

```json
{
  "mcpServers": {
    "upstream": {
      "command": "node",
      "args": ["/absolute/path/to/upstream-mcp/dist/index.js"],
      "env": {
        "UPSTREAM_API_KEY": "your_key_here"
      }
    }
  }
}
```

---

## Rate limits

| Tier | Calls per month | Cost |
|---|---|---|
| Free | 500 | $0 |
| Production | Higher caps available | See [upstream.cx/pricing](https://upstream.cx/pricing) |

When the monthly quota is exceeded, tools return a clear error with current tier and a direct upgrade link. No silent failures. No degraded responses.

---

## What people ask

**Does this work without the paid platform?**
Yes. The free tier gives you 500 calls per month with no credit card. Claim scanning, denial code lookups, fee schedule queries, and CARC parsing all work on the free tier.

**What does the network signal include?**
When `get_industry_signals` returns a result, it means multiple operators across the network are seeing the same pattern simultaneously. Aggregated. Anonymized. Statistically validated. Never PHI.

**How fresh is the data?**
Payer scorecards refresh nightly. Network signals fire in near real time when significance thresholds are crossed. CMS reference tables update on the CMS publication cadence (CARC quarterly, NCCI quarterly, fee schedule annual).

**Is my data secure?**
Calls to the MCP server are encrypted in transit. Free tier queries are stateless. Paid tier queries are scoped to your customer tenant. The MCP works on patient reference IDs (your internal IDs), not on patient names or DOB.

**Why not just use Claude with web search?**
Public web data on payer behavior is incomplete, stale, and often wrong. Upstream measures payer behavior against the operator network's actual claim outcomes. The signal is what is happening, not what someone said is happening.

**How does Upstream compare to traditional clearinghouses?**
Clearinghouses move claims. Upstream interprets payer behavior. Different lane. Most operators run both.

---

## Code license vs. service terms

The MCP client code in this repository is **MIT licensed**. Fork it, audit it, embed it in your stack.

The Upstream API service that this client calls is governed by separate **Service Terms of Use** at [upstream.cx/terms](https://upstream.cx/terms), including:

- Paid plan rate limits and tier-gated tools (see `[Free]` / `[Paid]` markers in the tool tables above).
- BAA required for any workflow involving Protected Health Information.
- Acceptable use policy.
- Free evaluation tier: 500 calls/month, no PHI, restricted to `[Free]` tools.

The license on the client code does not grant API service access. Production usage requires an organization-scoped paid key. Request access at [upstream.cx/developers/keys](https://upstream.cx/developers/keys).

---

## Related

Part of the [Upstream Intelligence ecosystem](https://github.com/Upstream-Intelligence).

- **upstream-mcp** — you are here
- [upstream-skills](https://github.com/Upstream-Intelligence/upstream-skills) — Claude Code skills for billing teams
- [upstream-community](https://github.com/Upstream-Intelligence/upstream-community) — open ML methodology
- [awesome-payer-risk](https://github.com/Upstream-Intelligence/awesome-payer-risk) — curated RCM resources

Product: [upstream.cx](https://upstream.cx) · [Newsletter](https://upstream.cx/newsletter) · [Pricing](https://upstream.cx/pricing)

---

Built by [Upstream Intelligence](https://upstream.cx).

<div align="center">

**[upstream.cx](https://upstream.cx)** · hello@upstream.cx

Care Intelligence Platform.

</div>
