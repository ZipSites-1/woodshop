# mcp-server — Task Checklist

## Scope
TypeScript MCP server exposing tools with JSON Schemas, validation, provenance logging, and adapters to engines.

## Definition of Done
- `mcp.config.json` exposes registry
- All tool inputs/outputs validated
- Provenance (seed, engine versions, revision) echoed
- E2E ReAct trace executes (smoke)

## Tasks
- [ ] Registry: list tools; serve JSON Schemas from `/packages/schemas`
- [ ] Middleware: auth, schema-validate, provenance, error mapping
- [ ] Adapters: `occt`, `nest`, `cam`, `wood`
- [ ] Tools: `create_project`, `param_update`, `apply_joinery`, `wood_movement_check`,
      `extract_cutlist`, `nest_parts`, `make_drawing`, `generate_toolpaths`, `postprocess`
- [ ] Logging: structured (tool, duration, inputs hash)
- [ ] Tests: contract tests using schema-generated types

## Commands
```bash
pnpm -w dev:mcp
pnpm -w test:mcp
```

## Acceptance
- [ ] Tool discovery works in client
- [ ] Contract tests pass; provenance fields present
- [ ] Sample flows create artifacts
