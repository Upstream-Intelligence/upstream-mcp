# @upstream-health/mcp-server

MCP (Model Context Protocol) server for Upstream's **Revenue Intelligence Platform** — giving Claude direct access to payer behavioral intelligence, denial prediction, claim risk, and network-wide industry signals. Built for RCM directors, billing teams, and ABA/SNF/PT operators who need answers without leaving their workflow.

Upstream monitors payer behavior across 200+ practices in real time. When UHC quietly shifts adjudication criteria, Upstream sees the pattern network-wide before it reaches your claims. This MCP brings that intelligence into Claude.

## Install

### Claude Desktop (recommended)

Add to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Claude Code (CLI)

```bash
claude mcp add upstream -- npx -y @upstream-health/mcp-server
```

Then set your key:

```bash
export UPSTREAM_API_KEY=your_key_here
```

Get a free API key at **https://upstream.cx/developers/keys**

---

## Tools

### Claim Intelligence

| Tool | Description |
|------|-------------|
| `scan_claim` | Pre-submission claim risk scan. Checks NCCI edits, auth requirements, denial probability, and payer patterns. Returns a risk score (0–100) and specific issues to fix before submission. |
| `check_ncci_edits` | Check if two CPT codes can be billed together. Returns edit type (PTP/MUE), modifier options, and clinical rationale. |
| `check_prior_auth_readiness` | Score a prior auth 0–100 before submission. Returns risk factors with specific fix instructions and estimated approval probability. Specialties: ABA, Dental, PT/OT, SNF. |

### Denial Intelligence

| Tool | Description |
|------|-------------|
| `lookup_denial_code` | Look up any CARC denial reason code. Returns plain-English explanation, root causes, corrective actions, and regulatory basis. |
| `get_denial_clusters` | Active denial clusters with root cause labels and dollar impact. `cross_customer_signal: true` means the pattern is affecting multiple practices nationally — not just yours. |
| `get_industry_signals` | Cross-customer network anomalies: denial patterns affecting multiple practices simultaneously. Upstream's network moat — intelligence neither Silna nor Adonis can replicate. |

### Payer Intelligence

| Tool | Description |
|------|-------------|
| `get_payer_scorecard` | A–F grade and denial rate for a payer by specialty. Includes top denial codes, payment timing, and appeal success rates. |
| `compare_payers` | Compare two payers side by side on denial rates, payment timing, and appeal success. |
| `check_payer_behavior` | Behavioral risk score, cluster classification (Aggressive Denier / Slow Payer / Prompt Payer / Underpayer), and recent policy changes for a payer. |

### Fee Schedule & Reimbursement

| Tool | Description |
|------|-------------|
| `lookup_fee_schedule` | CMS national fee schedule rates for any CPT code. Returns facility/non-facility rates, RVUs, and geographic adjusters. |

### Specialty Workflows

| Tool | Description |
|------|-------------|
| `get_aba_session_tracker` | ABA authorization status for a patient: authorized hours, sessions used, hours remaining, expiry date, renewal urgency (red/amber/green). Use in ABA billing workflows. |
| `get_patient_propensity` | Patient collectibility score (0–100), collection probability, and recommended collection approach, powered by Upstream's ML propensity model. |

---

## Example questions to ask Claude

**Claim checks:**
- "Scan this claim for UnitedHealthcare: CPT 97153, 97155, diagnosis F84.0, POS 11"
- "Can I bill 97153 and 97155 together on the same claim?"
- "Score this prior auth before I submit it — auth ID 441-B"

**Denial work:**
- "What does denial code 97 mean and how do I fix it?"
- "What denial clusters are active in my account right now?"
- "Are there any industry-wide signals for ABA denials this month?"

**Payer intelligence:**
- "What grade does Aetna get for ABA claims?"
- "Compare UnitedHealthcare and Cigna on denial rates"
- "Is UHC an aggressive denier for SNF claims right now? Any recent policy changes?"

**Reimbursement:**
- "What's the Medicare rate for CPT 97153?"
- "What are the RVUs for 97155, facility vs non-facility?"

**Specialty workflows:**
- "Check ABA session status for patient ref UP-4492"
- "What's the collectibility score for patient ref UP-8831?"

---

## What makes Upstream different

Upstream is not a rules engine. It's a behavioral monitoring network.

| Capability | Upstream | Silna | Adonis |
|-----------|---------|-------|--------|
| Payer behavioral fingerprinting | ✓ | — | — |
| Cross-customer network signals | ✓ | — | — |
| Pre-submission denial probability | ✓ | ✓ | ✓ |
| NCCI/fee schedule lookup | ✓ | ✓ | — |
| Adjudication shift early warning | ✓ (26 days avg) | — | — |
| ABA session authorization tracking | ✓ | — | — |

The network effect compounds with scale. 200+ practices means patterns surface 3–4 weeks before isolated practices notice anything.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UPSTREAM_API_KEY` | No (free tier) | — | API key from upstream.cx/developers/keys |
| `UPSTREAM_BASE_URL` | No | `https://api.upstream.cx` | Override for local dev or staging |

---

## Local development

```bash
git clone https://github.com/upstream-health/mcp-server
cd mcp-server
npm install
cp .env.example .env   # add your key
npm run build
npm test
```

Run the server locally against Claude Desktop by pointing to the built output:

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

The free tier includes 100 API calls/month. Paid tiers start at $49/month. Upgrade at https://upstream.cx/developers/keys.

When the monthly quota is exceeded, tools return a clear error message with your current tier and a direct link to upgrade — no silent failures.

---

## Related

- [upstream.cx](https://upstream.cx) — Revenue Intelligence Platform
- [upstream.cx/developers](https://upstream.cx/developers) — API documentation
- [upstream-community](https://github.com/upstream-cx/upstream-community) — Open-source ML reference implementations
