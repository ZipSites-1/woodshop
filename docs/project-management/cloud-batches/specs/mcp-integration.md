# MCP Integration Spec — Workstream D

## Summary
- Replace stub MCP tool implementations with the real Rust engine pipelines while keeping deterministic outputs and provenance intact.
- Provide a reversible rollout path via feature flags so we can fall back during verification or contract-test runs.
- Ship refreshed fixtures so downstream contract tests and demo assets immediately benefit from the new engines.

## Design Notes
### Execution Flow
1. `apps/mcp-server` receives a tool invocation and resolves the adapter (`nest`, `cam`, `wood`).
2. Adapter marshals inputs into the engine crate (`engines/nest`, `engines/cam`, `engines/wood`) and executes within a deterministic context (seed + temp dirs).
3. Engine responses are normalized into the tool schema, provenance metadata is enriched with engine version/hash, and outputs are written through `artifactStore` helpers.
4. The MCP response returns payload + provenance + artifact handles to clients (desktop, web, agent-pack).

### Determinism & Error Surfacing
- All adapters must set the deterministic RNG seed and kerf/tolerance configuration that lives in existing skyline helpers.
- Engine warnings surface in the MCP payload `meta.warnings[]`; errors map to typed MCP errors with machine-readable codes.
- Provenance logging appends `engine.name`, `engine.version`, and `engine.commit_sha` for traceability.

### Observability
- Extend structured logging to include tool name, execution duration, warnings count, and feature-flag state.
- Emit metrics events via existing telemetry hooks (`mcp.execute_tool`) for stage-gate verification and runtime trending.

## Feature Flag Strategy
| Flag | Default | Scope | Notes |
|---|---|---|---|
| `WOODSHOP_MCP_USE_REAL_ENGINES` | `true` | Server runtime + contract tests | Controls whether adapters call engines or fallback stubs. Test harnesses can override to `false` to compare against historical fixtures. |
| `WOODSHOP_MCP_RECORD_FIXTURES` | `false` | Contract-test CLI | When toggled, replays requests and writes fresh fixtures under `artifacts/reference/mcp/real-engines/`. |
| `WOODSHOP_MCP_WARN_ON_FALLBACK` | `true` | Server runtime | Forces a warning log + provenance note when stubs are used so QA can detect unintended rollbacks. |

Rollout plan:
- Stage 0 (current): flag default `false` in CI smoke jobs to gather diff until fixtures regenerated.
- Stage 1: flip to `true` in mainline, retain ability to disable per environment.
- Stage 2: remove stub path once desktop + web verification complete (tracked as follow-up decision).

## Fixtures & Reference Data
- Golden outputs stored under `artifacts/reference/mcp/real-engines/` with subfolders per tool (`nest_parts`, `generate_toolpaths`, `postprocess_grbl`, `wood_movement_check`).
- Each fixture bundle includes: `request.json`, `response.json`, generated artifacts (SVG/G-code) and provenance snapshot.
- Regeneration flow: run `pnpm -w run mcp:record --flag WOODSHOP_MCP_RECORD_FIXTURES=1`, review git diff, and capture approval in stage-gate notes.
- Keep legacy stub fixtures in `artifacts/reference/mcp/stubs/` for regression comparisons until Stage 2 of rollout.

## Implementation Checklist
1. Implement adapter modules that translate MCP payloads to engine calls and back.
2. Update provenance middleware to append engine metadata and feature-flag state.
3. Wire feature flags into config loader (`apps/mcp-server/src/config/runtime.ts`) with env + CLI overrides.
4. Ensure filesystem writes use deterministic helpers and respect repository root sandboxing.
5. Document runtime options in `docs/project-management/playbook.md` under MCP operations.

## Testing & Validation
- Extend contract tests to load both stub and engine fixtures, failing on mismatched schema or artifacts.
- Add Rust integration tests under each engine crate verifying adapter payloads (`cargo test -p engines-nest integration_mcp`).
- Execute smoke runs: `pnpm -w run mcp:execute --tool nest_parts` (flagged) and diff artifacts before/after.
- Capture performance metrics and compare against baseline to ensure no >5% regression.

## Stage-Gate Readiness
- Design and flag strategy documented (this file) ✅.
- Fixture regeneration plan in place ✅.
- Coding can begin once Workstream D team receives stage-gate approval to implement adapters and regenerate fixtures.

## Open Questions
- Should engine results cache for idempotent payloads? (defer to Workstream C benchmarking).
- Confirm storage footprint budget for expanded fixture sets.
- Align on how desktop/web surface warning metadata (coordinate with Workstream E).
