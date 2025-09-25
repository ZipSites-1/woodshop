# Ordered Delivery Roadmap

This document tracks progress across the staged delivery sequence defined in the playbook. Update it during stage-gate reviews and whenever milestones change state.

## Snapshot (update date: YYYY-MM-DD)
| Order | Epic / Workstream | Stage | Owner | Status | Evidence / Links |
|---|---|---|---|---|---|
| 1 | Foundations & Repo Health (`codex/tasks/epics/00-foundations-and-repo-health.md`) | N/A | Product Lead | ✅ Complete | `codex/index-tasklist.md` row for epic 00 checked |
| 2 | OCCT Core: Geometry & I/O (`codex/tasks/epics/01-occt-core-geometry-and-io.md`) | Discovery | Technical Lead | ☐ Outstanding | Pending stage-gate review |
| 3 | WASM Viewer & OCCT Bindings (`codex/tasks/epics/02-wasm-viewer-and-occt-bindings.md`) | Discovery | Technical Lead | ☐ Outstanding | Blocked by epic 01 |
| 4 | Nesting Engine v1 (`codex/tasks/epics/03-nesting-engine-v1.md`) | Planning | Nesting Lead | ☐ Outstanding | Requires integration with Rust engine |
| 4 | CAM Engine & GRBL Post (`codex/tasks/epics/04-cam-engine-and-grbl-post.md`) | Verification | CAM Lead | ◐ In Progress | Contract tests in `pnpm -w test:mcp` |
| 5 | MCP Server & Tool Registry (`codex/tasks/epics/05-mcp-server-and-tool-registry.md`) | Verification | MCP Lead | ◐ In Progress | Awaiting deterministic backends |
| 6 | Desktop App: Chat & Viewer (`codex/tasks/epics/06-desktop-app-chat-and-viewer.md`) | Planning | Desktop Lead | ☐ Outstanding | MCP dependency noted |
| 6 | Web Viewer: Artifacts & Performance (`codex/tasks/epics/07-web-viewer-artifacts-and-performance.md`) | Verification | Web Lead | ✅ Complete | Reference artifacts in `artifacts/demo` |
| 7 | Security, Secrets & MCP Permissions (`codex/tasks/epics/10-security-secrets-and-mcp-permissions.md`) | Discovery | Security Engineer | ☐ Outstanding | Allow-list/consent tooling pending |
| 7 | Release, Versioning & Docs (`codex/tasks/epics/11-release-versioning-and-docs.md`) | Discovery | Documentation Steward | ☐ Outstanding | Changesets/changelog work pending |

## Milestone Detail

### 1. Foundations & Repo Health — ✅ Complete
- Evidence: CI matrix, caches, security baselines validated. No further action unless regressions occur.
- **Planning:** Confirm maintenance cadence for CI, caches, secret scanning; identify owners for ongoing health checks; review backlog for new foundational debt.
- **Scaffolding:** Keep baseline scripts in `ci/` current; retain golden artifacts and reference data; ensure automation templates are reusable for later stages.
- **Coding Start:** Already complete; future maintenance work should only begin after refreshed planning/scaffolding assess new needs.

### 2. OCCT Core: Geometry & I/O — ☐ Outstanding
- Next Steps: Complete CMake presets, embedding tasks, tessellation controls, STEP/IGES tests.
- Blockers: Requires dedicated OCCT expertise; tracked in risk `R-001`.
- **Planning:** Define scope for geometry import/export MVP; align with desktop and web viewer teams on tessellation requirements; enumerate test fixtures and performance targets.
- **Scaffolding:** Draft OCCT build presets (native + WASM); stub out geometry service modules; prepare sample STEP/IGES assets and validation harness.
- **Coding Start:** Kick off OCCT implementation only after Planning and Scaffolding checklist items are signed off at the stage gate.
- **Cloud Batch Reference:** See `docs/project-management/cloud-batches/batch-01.md` (Workstream A) for detailed handoff instructions.

### 3. WASM Viewer & OCCT Bindings — ☐ Outstanding
- Next Steps: Build worker loader, viewer previews, CSP rules, optional MCP client.
- Dependencies: OCCT epic must supply compliant bindings.
- **Planning:** Sequence viewer tasks once OCCT bindings are ready; sync with security on CSP and MIME constraints; document performance budgets and telemetry hooks.
- **Scaffolding:** Generate initial WASM loader structure; create placeholder viewer components; set up integration tests that consume synthetic geometry.
- **Coding Start:** Begin viewer feature development once the planning artifacts and scaffolding prototypes above are completed.
- **Cloud Batch Reference:** See `docs/project-management/cloud-batches/batch-01.md` (Workstream B).

### 4. Engines — Mixed
- Nesting v1: outstanding integration with Rust engine to replace JS skyline implementation.
- CAM Engine: testing/verification ongoing; ensure G-code conformance and benches are green.
- **Planning:** Finalize engine API surfaces required by MCP; schedule benchmarking windows; coordinate with QA on artifact diffs and determinism criteria.
- **Scaffolding:** Build shared fixtures for nesting/CAM comparisons; provision benchmark harnesses (`cargo bench` / scripted runs); prepare mock inputs for MCP contract tests.
- **Coding Start:** Proceed with engine integration work after planning approvals and scaffolding (fixtures/bench harnesses) are in place.
- **Cloud Batch Reference:** See `docs/project-management/cloud-batches/batch-01.md` (Workstream C).

### 5. MCP Server & Tool Registry — ◐ In Progress
- Remaining Work: Replace stub data with real engine integrations, finalize provenance, extend contract tests.
- **Planning:** Map each MCP tool to its engine dependency; create rollout plan for provenance enhancements and consent enforcement; align with desktop integration milestones.
- **Scaffolding:** Implement feature flags or adapters for swapping stub vs. real engines; expand schema validation coverage; scaffold telemetry/logging hooks for provenance data.
- **Coding Start:** Only enable coding on new MCP tool features once the dependency mapping and scaffolding layers are approved.

### 6. Surface Apps & Agent Pack — Mixed
- Desktop App: still relying on stub MCP session; integrate real server and viewer bridge.
- Web Viewer: epic 07 complete; monitor for regressions.
- **Planning:** Produce sequencing plan for desktop integration (chat, viewer, consent flows); outline agent-pack updates once server V1 is live; set acceptance criteria for cross-surface parity.
- **Scaffolding:** Introduce environment config for real MCP endpoints; set up mock sessions for automated UI tests; prepare documentation templates for agent-pack updates.
- **Coding Start:** Commence desktop/agent coding after planning deliverables and scaffolding environments/configs are ready.

### 7. Security / Governance / Release — ☐ Outstanding
- Security (Epic 10): implement tool allow-list, consent confirmations, SBOM updates.
- Release (Epic 11): establish changeset workflow, changelog automation, ADR cadence.
- **Planning:** Draft security review checklist; determine release cadence and gating criteria; identify compliance artifacts required pre-GA.
- **Scaffolding:** Create allow-list configuration files; set up automated changeset enforcement; scaffold ADR templates and release note generators.
- **Coding Start:** Begin implementing security and release automation once planning outputs and scaffolding artifacts are complete and reviewed.

## Updating This Document
1. Adjust the snapshot table with the latest stage, status, and evidence links.
2. Append or revise milestone detail sections to highlight next actions and blockers.
3. Reference this roadmap during stage-gate reviews and link the meeting notes in the Evidence column.
