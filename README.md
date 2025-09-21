# Woodshop MCP Skeleton

![MCP E2E](https://github.com/ben/woodshop/actions/workflows/mcp-e2e.yml/badge.svg)

Agent-first woodworking CAD tools exposed over the Model Context Protocol.
This repository currently ships a deterministic MCP skeleton around three core tools:

- `create_project` – initialize a project with deterministic IDs and materials
- `extract_cutlist` – return a cutlist table with materials and totals
- `export_artifacts` – write demo artifacts in PDF, DXF, and SVG formats

## Quickstart

```bash
pnpm -w run codegen:schemas
pnpm -w --filter @woodshop/mcp-server build
pnpm -w test:mcp
pnpm -w run mcp:e2e:demo
```

The E2E run places byte-stable outputs under `artifacts/demo/`.

## Provenance & Determinism

All tool responses include `{ seed, engine_versions, revision_id, inputs_hash }` to make
runs reproducible. Inputs are validated against JSON Schemas located in `packages/schemas`,
and TypeScript types are generated into `packages/types` via `tools/codegen/generate-schema-types.mjs`.

## Calling The Tools

MCP clients hit the JSON-RPC surface using `tools/call`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_project",
    "arguments": { "units": "mm", "seed": 42 }
  }
}
```

Successful responses include a textual summary and structured payload:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Project proj_842ca66e834c created with units mm." }],
    "structuredContent": {
      "project_id": "proj_842ca66e834c",
      "units": "mm",
      "template": null,
      "materials": ["…"],
      "seed": 42,
      "engine_versions": {
        "occt": "0.0.0",
        "nest": "0.0.0",
        "cam": "0.0.0",
        "wood": "0.0.0",
        "schemas": "0.0.0"
      },
      "revision_id": "<git-sha>",
      "inputs_hash": "<sha256>"
    }
  }
}
```

Invalid payloads are surfaced as structured errors by the middleware:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "isError": true,
    "content": [{ "type": "text", "text": "create_project failed: Request failed schema validation." }],
    "structuredContent": {
      "code": "INVALID_INPUT",
      "message": "Request failed schema validation.",
      "details": {
        "issues": [{ "path": "units", "message": "Required" }]
      }
    }
  }
}
```

## Follow-up

- See `docs/issues/0001-emsdk-setup.md` for the emsdk installation follow-up required for WASM builds.
