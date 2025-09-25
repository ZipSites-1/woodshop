# Cloud Batch 02 — MCP Integration, Desktop Wiring, Security Hardening

The second cloud handoff focuses on wiring real engines into the MCP server, updating the desktop client to consume those tools, and establishing security/release governance. Each workstream follows the AI Assistant Development workflow (**Planning → Scaffolding → Coding**); coding must wait until the earlier phases are complete.

## Workstream D — MCP Server: Real Engine Integrations
- **Planning**
  - ✅ Confirm scope with Epic 05 (`codex/tasks/epics/05-mcp-server-and-tool-registry.md`): replace stub implementations for `nest_parts`, `generate_toolpaths`, `postprocess_grbl`, and `wood_movement_check`.
  - ✅ Identify engine crates, inputs/outputs, and deterministic requirements; update task notes with provenance expectations.
  - ✅ Define validation strategy (contract tests + reference artifact regeneration) and establish logging/metrics requirements.
- **Scaffolding**
  - ✅ Document adapter design (`docs/project-management/cloud-batches/specs/mcp-integration.md`).
  - ✅ Add feature flags/config to toggle between stubbed and real engines.
  - ✅ Prepare test fixtures mapping MCP payloads to engine calls; ensure CI can execute Rust tests alongside MCP contract tests.
- **Coding**
  - ☐ Implement adapters calling into the Rust engines and ensure provenance metadata reflects real engine versions.
  - ☐ Regenerate reference artifacts and update contract tests to verify deterministic outputs.
  - ☐ Capture telemetry/log entries for success/error paths and update docs accordingly.

## Workstream E — Desktop App: MCP Wiring & Viewer Bridge
- **Planning**
  - ✅ Coordinate with Epic 06 (`codex/tasks/epics/06-desktop-app-chat-and-viewer.md`) to sequence chat, consent, offline cache, and viewer updates.
  - ✅ Specify UX flows for consent prompts, error handling, and artifact viewing in the stage-gate agenda.
  - ✅ Define integration test coverage (Qt model tests + manual checklist) and artifact verification steps.
- **Scaffolding**
  - ✅ Outline desktop integration plan (`docs/project-management/cloud-batches/specs/desktop-mcp-integration.md`).
  - ✅ Provide environment/profile configuration to point at local/remote MCP servers.
  - ✅ Stub viewer bridge calls that accept the new artifact metadata schemas.
- **Coding**
  - ☐ Replace the simulated MCP session with real JSON-RPC transport handling tool calls/results.
  - ☐ Implement consent gating, undo/redo wiring, and artifact panel updates consuming real outputs.
  - ☐ Add automated UI/unit tests and update documentation/playbooks with verification steps.

## Workstream F — Security & Release Governance
- **Planning**
  - ✅ Align with Epics 10 and 11 to enumerate security controls (tool allow-list, consent enforcement, SBOM) and release processes (changesets, required checks).
  - ✅ Record policy requirements and audit expectations in the stage-gate agenda.
  - ✅ Determine release cadence and roles for approval, rollback, and communications.
- **Scaffolding**
  - ✅ Produce governance blueprint (`docs/project-management/cloud-batches/specs/security-governance.md`).
  - ✅ Draft allow-list/consent configuration schema; prepare CI scripts for SBOM generation and secret scanning enforcement.
  - ✅ Template release notes, changeset categories, and ADR forms for future iterations.
- **Coding**
  - ☐ Implement runtime allow-lists/consent validation within the MCP server and desktop client.
  - ☐ Integrate SBOM + secret scan automation into CI and document incident response steps.
  - ☐ Stand up release tooling (changesets, changelog automation) and finalize governance documentation.

## Handoff Expectations
1. Execute workstreams in order D → E → F, observing planning/scaffolding gates before coding.
2. Commit changes referencing this batch document and the associated epics/tasks.
3. Provide evidence (logs, test outputs, artifact hashes) on completion; update `docs/project-management/delivery-roadmap.md` and stage-gate notes with outcomes.
