# Build Recipe — Docker Images

We use separate images for building (emsdk, native toolchains) and running (minimal runtime).

---

## 1) Emsdk builder (WASM)
`infra/docker/emsdk.Dockerfile` (example):
```dockerfile
FROM emscripten/emsdk:latest
RUN apt-get update && apt-get install -y cmake ninja-build python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
```
Build:
```bash
docker build -t woodshop/emsdk -f infra/docker/emsdk.Dockerfile .
```

## 2) occt-core native builder
`infra/docker/occt-core.Dockerfile` (example):
```dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y build-essential cmake ninja-build
WORKDIR /src
```
Use `--mount=type=cache` for CMake/Ninja build dirs when using `buildx`.

## 3) MCP server runtime
`infra/docker/mcp-server.Dockerfile` (example):
```dockerfile
FROM node:20-alpine as base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm i --frozen-lockfile
COPY . .
RUN pnpm -w build

FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=base /app/packages ./packages
ENV NODE_ENV=production
CMD ["node", "apps/mcp-server/dist/index.js"]
```

## Multi-platform
```
docker buildx build --platform linux/amd64,linux/arm64 -t woodshop/mcp-server:latest --push .
```

## Tips
- Keep build caches persistent in CI with `--cache-to/--cache-from`.
- Separate dev vs prod images to keep runtime small.
