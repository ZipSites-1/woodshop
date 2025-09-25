# MCP Integration Spec — Workstream D

## Goals
- Replace stubbed MCP tool implementations with calls into the Rust engines (`nest`, `cam`, `wood`).
- Preserve deterministic outputs with provenance metadata and artifact writes.
- Maintain schema compatibility and contract-test coverage.

## Key Components
| Tool | Engine | Notes |
|---|---|---|
| `nest_parts` | `engines/nest` | Use `skyline_sheets` API with deterministic seed/kerf handling |
| `generate_toolpaths` | `engines/cam` | Delegate to CAM ops for contour/pocket/drill; ensure warnings propagate |
| `postprocess_grbl` | `engines/cam` | Leverage post module for GRBL generation |
| `wood_movement_check` | `engines/wood` | Use new moisture delta implementation |

## Adapter Requirements
1. Inject engine version info into provenance logging (`apps/mcp-server/src/middleware/provenance.ts`).
2. Implement feature flag: `WOODSHOP_MCP_USE_REAL_ENGINES` (default `true`, fallback to stubs for tests).
3. Ensure filesystem writes go through deterministic helpers and respect repo root.

## Testing
- Expand contract tests to compare outputs against reference fixtures.
- Add Rust integration tests invoking engines with representative payloads.
- Regenerate `artifacts/reference` and diff before/after.

## Open Questions
- How to surface engine warnings/errors in Action Cards.
- Whether to cache engine results for idempotent runs (future work).
FYI: Document decisions in epic notes after stage-gate review.
