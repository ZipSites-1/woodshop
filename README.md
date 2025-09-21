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

## Follow-up

- See `docs/issues/0001-emsdk-setup.md` for the emsdk installation follow-up required for WASM builds.
