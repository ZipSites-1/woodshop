# Build Recipe — MCP Server Development

Run the MCP tool server locally, validate schemas, and smoke-test JSON-RPC calls.

---

## Start the server
```bash
pnpm -w dev:mcp
# or directly
node apps/mcp-server/dist/index.js
```

## Environment
- `MCP_BIND=stdio` (default) or `MCP_BIND=ws://127.0.0.1:4000`
- `LOG_LEVEL=info`

## Smoke test (JSON-RPC)
Use a node script or any RPC client to send:
1) `initialize`  
2) `tools/list`  
3) Call `create_project`

Expected: response contains `seed`, `engine_versions`, `revision_id` (provenance).

## Contract tests
```bash
pnpm -w test:mcp   # runs zod/json-schema validation + example payloads
```
