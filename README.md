<div align="center">

<img src="https://upstream.cx/brand/upstream-wordmark-light.svg" alt="Upstream" width="220" />

# upstream-mcp

### Bring Upstream Care Intelligence into Claude.

Pre-submission claim risk. Live denial intelligence. Payer behavioral signals. Without leaving your Claude workflow.

[![License](https://img.shields.io/github/license/Upstream-Intelligence/upstream-mcp?color=0454F1)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Upstream-Intelligence/upstream-mcp?style=flat&color=0454F1)](https://github.com/Upstream-Intelligence/upstream-mcp/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/Upstream-Intelligence/upstream-mcp?color=0454F1)](https://github.com/Upstream-Intelligence/upstream-mcp/commits/main)
[![Issues](https://img.shields.io/github/issues/Upstream-Intelligence/upstream-mcp?color=0454F1)](https://github.com/Upstream-Intelligence/upstream-mcp/issues)
[![upstream.cx](https://img.shields.io/badge/upstream-cx-0454F1)](https://upstream.cx)
[![Newsletter](https://img.shields.io/badge/newsletter-subscribe-0454F1)](https://upstream.cx/newsletter)

</div>

---

## What this is

A Model Context Protocol server that exposes Upstream's Care Intelligence Platform as a set of tools Claude can call directly.

Your billing team is in Claude already. They are asking Claude to draft appeals, decode denial codes, and explain payer behavior. With this MCP installed, Claude does not guess. Claude calls Upstream's network of operators and gets the real answer with specific dollar impact and the recommended fix.

Works across ABA, SNF, PT/OT, dental, dialysis, imaging, home health, and behavioral health. The MCP routes specialty queries to the right backend.

## What it looks like

```json
{
  "alert_type": "denial_risk",
  "payer": "Anthem BCBS",
  "cpt_code": "99214",
  "risk_score": 0.87,
  "primary_reason": "Missing modifier 25 for same-day E&M + procedure",
  "action": "Add modifier 25 before claim submission",
  "estimated_denial_dollar": 312.00
}
```

This is what a high-risk denial alert looks like before you submit the claim. No PHI — aggregate payer behavior patterns only.

---

## Install

### Claude Code

```bash
claude mcp add upstream -- npx -y @upstream-health/mcp-server
export UPSTREAM_API_KEY=your_key_here
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "upstream": {
      "command": "npx",
      "args": ["-y", "@upstream-health/mcp-server"],
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

### Claim intelligence

| Tool | What it does |
|---|---|
| `scan_claim` | Pre-submission claim risk scan. Checks NCCI edits, authorization requirements, denial probability, and payer specific patterns. Returns a risk score from 0 to 100 with specific issues to fix before submission. |
| `check_ncci_edits` | Check whether two CPT codes can be billed together. Returns edit type (PTP or MUE), modifier options, and clinical rationale. |
| `check_prior_auth_readiness` | Score a prior authorization request from 0 to 100 before submission. Returns risk factors with specific fix instructions and estimated approval probability. Specialty support: ABA, dental, PT/OT, SNF, with more added quarterly. |

### Denial intelligence

| Tool | What it does |
|---|---|
| `lookup_denial_code` | Look up any CARC denial reason code. Returns plain English explanation, root causes, corrective actions, and the regulatory basis. |
| `get_denial_clusters` | Active denial clusters with root cause labels and dollar impact. When `cross_customer_signal: true`, the pattern is affecting multiple operators in the network simultaneously. Not just yours. |
| `get_industry_signals` | Network wide anomalies. Denial patterns affecting multiple practices on the same day. The early warning that no single practice tool can produce. |

### Payer intelligence

| Tool | What it does |
|---|---|
| `get_payer_scorecard` | A to F grade and denial rate for a payer by specialty. Includes top denial codes, payment timing percentiles, and historical appeal success rates. |
| `compare_payers` | Side by side comparison of two payers on denial rates, payment timing, and appeal success. |
| `check_payer_behavior` | Behavioral risk score and cluster classification (Aggressive Denier, Slow Payer, Prompt Payer, Underpayer). Includes recent policy changes and the specific dates of detection. |

### Reimbursement

| Tool | What it does |
|---|---|
| `lookup_fee_schedule` | CMS national fee schedule rates for any CPT code. Returns facility and non facility rates, RVUs, and geographic adjusters. |

### Specialty workflows

| Tool | What it does |
|---|---|
| `get_authorization_status` | Authorization state for a patient. Hours or units authorized, used, remaining, expiry date, and renewal urgency (red, amber, green). Routes per specialty (ABA session units, SNF stay days, dental procedure caps, PT/OT visit limits, imaging procedure approvals, dialysis treatment authorizations). |
| `get_patient_propensity` | Patient collectibility score from 0 to 100 with collection probability and recommended approach. Powered by Upstream's propensity model. |

---

## Example questions Claude can answer

**Claim work:**
- "Scan this claim for UnitedHealthcare. CPT 97153, 97155. Diagnosis F84.0. POS 11."
- "Can I bill 97153 and 97155 together on the same claim?"
- "Score this prior auth before I submit. Auth ID 441-B."

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

**Specialty workflows:**
- "Check authorization status for patient ref UP-4492."
- "What is the collectibility score for patient ref UP-8831?"

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
| Pioneer (beta) | 5,000 | $49 |
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

## Related

- [upstream.cx](https://upstream.cx) Care Intelligence Platform
- [upstream-skills](https://github.com/Upstream-Intelligence/upstream-skills) Claude Code skill pack for billing teams
- [upstream-community](https://github.com/Upstream-Intelligence/upstream-community) Open ML reference implementations
- [upstream.cx/developers](https://upstream.cx/developers) Full API documentation
- [Newsletter](https://upstream.cx/newsletter) Monthly network signals digest

---

---

Built by [Upstream Intelligence](https://upstream.cx). Read the methodology at [engine.upstream.cx](https://engine.upstream.cx). Pioneer Program: [upstream.cx/pioneer](https://upstream.cx/pioneer).

<div align="center">

**[upstream.cx](https://upstream.cx)** · hello@upstream.cx

Care Intelligence Platform.

</div>
