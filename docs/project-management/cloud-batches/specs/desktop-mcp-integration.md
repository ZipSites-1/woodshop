# Desktop MCP Integration Spec — Workstream E

## Summary
- Upgrade the desktop chat app to communicate with the real MCP server using JSON-RPC transport.
- Bridge returned artifacts (SVG, G-code, reports) into the OCCT viewer and file panels without breaking undo/redo or consent flows.
- Provide configuration + test expectations so desktop engineers can begin wiring code immediately after stage-gate sign-off.

## Integration Plan
| Phase | Scope | Exit Criteria |
|---|---|---|
| Phase 0 — Plumbing | Replace simulated session with transport abstraction that supports stdio + TCP; add logging + feature flag for stub fallback. | Manual chat session exchanges messages with `woodshop_desktop --use-mcp-stub` and `WOODSHOP_DESKTOP_USE_MCP_STUB=true`. |
| Phase 1 — Tool Execution | Route real tool invocations through `McpSession`, update `AppController` to handle responses, consent prompts, and provenance. | Tool outputs render in chat, artifacts persisted locally, consent gating recorded in telemetry. |
| Phase 2 — Viewer Bridge | Wire `OcctViewerBridge` and artifact panel to load MCP-produced artifacts (SVG, PDF, G-code) and support open-in-external-app. | Demo script shows nesting > CAM > post chain in a single session with artifacts visible and undo functioning. |
| Phase 3 — Resilience | Implement retry/backoff, offline cache hydration, and transport reconnect logic. | Automated tests cover reconnect, offline replay, and telemetry shows zero unhandled transport exceptions. |

## Architecture & Interface Updates
| Component | Action Items |
|---|---|
| `McpSession` | Introduce transport adapters (`stdio`, `tcp`, `mock`), serialize JSON-RPC, map MCP errors to desktop notifications, and expose async `executeTool` API. |
| `AppController` | Subscribe to MCP responses, enforce consent prompts, log provenance IDs per action, update undo/redo stack with MCP-side revision tokens. |
| `OcctViewerBridge` | Add artifact loader registry keyed by MIME type; support streaming large files; emit telemetry for asset load failures. |
| Cache Layer | Persist conversations + artifacts to disk (per workspace) and hydrate during app start; coordinate with Workstream F consent storage requirements. |

## Configuration Matrix
| Setting | Location | Default | Purpose |
|---|---|---|---|
| `WOODSHOP_MCP_ENDPOINT` | Desktop env vars / preferences file | `stdio://` | Primary transport target; CLI overrides via `--mcp-endpoint`. |
| `WOODSHOP_DESKTOP_USE_MCP_STUB` | Env flag | `false` | Forces fallback to simulated responses for demos/tests. |
| `WOODSHOP_MCP_CONSENT_MODE` | Env flag | `strict` | Controls whether consent prompts block execution or auto-approve in test harnesses. |
| `desktop/config/mcp.json` | Config file | Generated | Stores cached endpoint, authentication, allow-list versions (synced with Workstream F). |

Configuration tasks:
1. Update desktop preferences schema to include MCP settings and validation.
2. Document overrides in `docs/project-management/playbook.md` (Desktop Ops section).
3. Ensure CI uses stub mode to avoid flaky transport tests unless explicitly opted-in.

## Testing Expectations
- **Unit**: QtTest suites for `McpSession` covering success, error, retry, timeout cases.
- **Integration**: Desktop harness launching mock MCP server (fixture-driven) to validate chat → tool → artifact flow; include consent + undo assertions.
- **Contract**: Reuse Workstream D fixtures to ensure desktop renders artifacts exactly as server produced them.
- **Manual**: Run `pnpm -w run desktop:e2e:mcp-demo` (new script) plus smoke checklist documenting consent prompts, artifact previews, offline replay, and viewer bridge rendering.
- Capture all results in stage-gate log and attach screen recording for Phase 2 exit.

## Observability & Telemetry
- Extend desktop logging to include MCP request IDs, transport state transitions, and consent outcomes.
- Emit metrics for round-trip latency, artifact load duration, and undo stack size.
- Surface telemetry in stage-gate review dashboard (follow Workstream F logging guidance).

## Dependencies & Coordination
- Depends on Workstream D delivering real engine adapters + fixtures.
- Viewer asset handling aligns with Workstream B (OCCT viewer) for MIME/format support.
- Consent storage/allow-list enforcement must match guidance from Workstream F.

## Stage-Gate Readiness
- Integration plan and configuration matrix documented ✅.
- Test expectations enumerated ✅.
- Desktop coding may begin immediately once Workstream D flags are available in the server environment.
