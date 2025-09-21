# Build Recipe — TypeScript Monorepo (pnpm + turbo/nx)

The monorepo contains the MCP server, schemas, typegen, and shared UI.

---

## Setup
```bash
# install deps once at root
pnpm i

# generate types from JSON Schemas
pnpm -w run codegen:schemas

# build all packages
pnpm -w build

# test everything
pnpm -w test
```

## Useful scripts (suggested)
- `dev:mcp` — start the MCP server with live reload
- `codegen:schemas` — emit `packages/types` from `packages/schemas`
- `lint` — eslint across packages
- `typecheck` — tsc --noEmit

## Task runner
Use Turborepo or Nx for caching and task graph orchestration. Configure pipelines so `packages/schemas` is built before `packages/types`, which is built before `apps/mcp-server`.
