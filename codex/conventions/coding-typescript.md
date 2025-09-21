# Coding Conventions — TypeScript (MCP server, web, tools)

## Compiler & Lint
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`.
- ESLint with `@typescript-eslint/recommended` and import/order rules.

## Project Structure
- `apps/mcp-server` exposes MCP, thin adapters into engines.
- `packages/schemas` is the source of truth; `packages/types` is generated.
- No cross-package imports that bypass public entry points.

## Schemas & Validation
- Every tool call is validated at the boundary (zod or AJV with generated types).
- Do not use `any` in tool input/output paths; prefer generated types.

## Error Handling
- Return structured errors with `code`, `message`, `details`.
- Log tool name, duration, inputs hash; never log raw secrets or large payloads.

## Determinism
- Sort arrays before emit; stable stringification for logs and artifacts.
- Echo `seed`, `engine_versions`, `revision_id` in every MCP response.

## Security
- Enforce tool allow-list and per-tool confirmation for destructive ops.
- Sanitize file paths; never eval user input.

## Style
- Named exports; avoid default unless required.
- Keep modules small; one responsibility per file.
