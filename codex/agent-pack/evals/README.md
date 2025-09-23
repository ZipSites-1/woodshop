# Agent Pack Evals

This directory will host deterministic scenarios executed against the MCP server.

## Structure
- `scenarios/*.yaml` — scenario definitions with prompts, expected tool sequences, artifact hashes.
- `runner.ts` — CLI runner that targets a configurable MCP endpoint and emits JUnit + trace bundles.
- `fixtures/` — Optional reference artifacts (hash-checked) for validation.

## Next Steps
- Draft scenarios for cabinet full-chain, tight nesting comparison, and STEP retrofit.
- Add negative tests for consent gating, schema failures, and infeasible nests.

