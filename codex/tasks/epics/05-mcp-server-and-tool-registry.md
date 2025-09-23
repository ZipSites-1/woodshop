# Epic: MCP Server & Tool Registry

**Outcome:** Schema-validated tools, provenance logs, adapters.

**Dependencies (epic-level):** 08, 03, 04, 01

## Tasks
- [x] /codex/tasks/todo/mcp-registry-and-discovery.yaml
- [x] /codex/tasks/todo/mcp-schema-validation-middleware.yaml
- [x] /codex/tasks/todo/mcp-provenance-logging-seed-coreversion.yaml
- [x] /codex/tasks/todo/mcp-error-mapping-and-codes.yaml
- [x] /codex/tasks/todo/mcp-tool-create-project.yaml
- [x] /codex/tasks/todo/mcp-tool-param-update.yaml
- [x] /codex/tasks/todo/mcp-tool-apply-joinery.yaml
- [x] /codex/tasks/todo/mcp-tool-wood-movement-check.yaml
- [x] /codex/tasks/todo/mcp-tool-extract-cutlist.yaml
- [x] /codex/tasks/todo/mcp-tool-nest-parts.yaml
- [x] /codex/tasks/todo/mcp-tool-make-drawing.yaml
- [x] /codex/tasks/todo/mcp-tool-generate-toolpaths.yaml
- [x] /codex/tasks/todo/mcp-tool-postprocess-grbl.yaml

## Milestones

### MVP
- /codex/tasks/todo/mcp-registry-and-discovery.yaml
- /codex/tasks/todo/mcp-schema-validation-middleware.yaml
- /codex/tasks/todo/mcp-provenance-logging-seed-coreversion.yaml
- /codex/tasks/todo/mcp-error-mapping-and-codes.yaml
- Core tools: create_project, param_update, extract_cutlist, nest_parts, make_drawing, generate_toolpaths, postprocess_grbl

### V1
- /codex/tasks/todo/mcp-tool-clearance-check.yaml
- /codex/tasks/todo/mcp-consent-token-middleware.yaml
- /codex/tasks/todo/mcp-openrpc-export.yaml

### V1.1
- /codex/tasks/todo/mcp-governance-undo-redo-explain.yaml
- /codex/tasks/todo/mcp-idempotency-and-cache.yaml
- /codex/tasks/todo/mcp-progress-events-streaming.yaml

## Notes
- Added an `analyze_geometry` tool that parses STEP/IGES payloads, derives metrics, and exposes schemas via the registry HTTP endpoints.
