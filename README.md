# @upstream-health/mcp-server

MCP (Model Context Protocol) server that gives Claude direct access to Upstream's healthcare denial intelligence API. Ask Claude about CPT code edits, denial codes, fee schedules, claim risk, and payer behavior — without leaving your conversation.

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

| Tool | Description |
|------|-------------|
| `check_ncci_edits` | Check if two CPT codes can be billed together. Returns edit type (PTP/MUE), modifier options, and clinical rationale. |
| `lookup_denial_code` | Look up any CARC denial reason code. Returns plain-English explanation, root causes, corrective actions, and regulatory basis. |
| `lookup_fee_schedule` | Get CMS national fee schedule rates for a CPT code. Returns facility/non-facility rates, RVUs, and geographic adjusters. |
| `scan_claim` | Pre-submission claim risk scan. Checks NCCI edits, auth requirements, denial probability, and payer patterns. Returns a risk score and specific issues to fix. |
| `get_payer_scorecard` | Get a payer's A-F grade and denial rate by specialty. Includes top denial codes, payment timing, and appeal success rates. |
| `compare_payers` | Compare two payers side by side on denial rates, payment timing, and appeal success. |

---

## Example questions to ask Claude

- "Can I bill 97153 and 97155 together on the same claim?"
- "What does denial code 97 mean and how do I fix it?"
- "What's the Medicare rate for CPT 97153?"
- "Scan this claim for UnitedHealthcare: CPT 97153, 97155, diagnosis F84.0, POS 11"
- "What grade does Aetna get for ABA claims?"
- "Compare UnitedHealthcare and Cigna on denial rates"

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
