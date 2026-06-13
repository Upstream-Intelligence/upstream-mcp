# Upstream MCP

## What This Is

The MCP distribution surface for Upstream. This repo should expose canonical
workflow objects to agent clients without inventing a separate denial-first or
Claude-only product frame.

## Core Value

Agent clients can call Upstream using the same workflow semantics the runtime
and API use: case state, readiness, coverage changes, outcomes, and evidence.

## Requirements

### Validated

- MCP server exists and already exposes healthcare billing and prior-auth tools.
- The repo already has non-PHI tool patterns and a published install surface.

### Active

- Replace denial-first framing with canonical workflow-object framing.
- Align tool names and descriptions to `Case Trace`, `Criteria Proof`,
  `Coverage Watch`, `Outcome Pulse`, and `Assurance Packets` where appropriate.
- Keep assistant install guidance practical while removing assistant-specific
  product drift.
- Expose repo-owned contract surfaces for the shared Phase 1 ship point.

### Out of Scope

- Workflow runtime truth owned by `upstream-v2`
- Buyer-safe proof generation owned by `upstream-data`

## Current Milestone: Workflow Bridge From MCP

**Goal:** Make MCP the assistant-facing expression of the same workflow objects
the runtime uses, not a separate product taxonomy.
