# Requirements: Upstream MCP

**Defined:** 2026-06-12  
**Core Value:** MCP tools should speak the same workflow language as the runtime.

## Existing Surface

- [x] **MCP-01**: MCP server exists with published install flow
- [x] **MCP-02**: Prior-auth and payer-related tools already exist

## Active

- [ ] **MCP-03**: README and tool descriptions stop leading with denial-first or
  Claude-only framing
- [ ] **MCP-04**: Canonical workflow-object names appear in tool descriptions
  and examples where the runtime supports them
- [ ] **MCP-05**: Phase 1 observable ship point has an MCP-facing contract
- [ ] **MCP-06**: Unauthorized, empty, and drifted requests fail with explicit
  contract-safe errors

## Out Of Scope

- Runtime lifecycle ownership
- `upstream-data` provenance/replay implementation
