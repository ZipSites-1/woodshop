# Desktop MCP Integration Spec — Workstream E

## Objectives
- Replace the simulated `McpSession` with a real MCP client using stdio/socket transport.
- Wire consent prompts, undo/redo, and artifact viewing to MCP responses.
- Ensure offline cache and retry mechanisms operate with real tool calls.

## Architecture Notes
| Component | Updates |
|---|---|
| `McpSession` | Implement JSON-RPC transport, request/response lifecycle, error handling |
| `AppController` | Route tool outputs to chat/action cards, consent gating, revision tracking |
| `OcctViewerBridge` | Load artifacts emitted by MCP (SVG/PDF/G-code previews) |
| Offline Cache | Persist conversation/action cards using real outputs + provenance |

## Configuration
- Environment variables: `WOODSHOP_MCP_ENDPOINT=stdio://` (default) or `http://localhost:PORT`.
- Feature flags to enable synthetic responses for tests.

## Testing & QA
1. Unit tests for `McpSession` covering success/error responses.
2. Qt integration tests verifying chat flow, consent prompts, and artifact loading.
3. Manual checklist: run `pnpm -w run mcp:e2e:demo` plus desktop end-to-end session.

## Dependencies
- Workstream D must deliver real MCP tools before integration testing.
- Viewer bridge may rely on OCCT outputs; coordinate with Workstream B from Batch 01.

## Deliverables
- Updated documentation in `docs/project-management/playbook.md` and roadmap.
- Recorded demo or screenshot for stage-gate sign-off.
