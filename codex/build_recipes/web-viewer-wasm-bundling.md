# Build Recipe — Web Viewer (WASM bundling with Vite)

Bundle the WASM viewer with code-splitting, workers, and caching.

---

## Dev
```bash
pnpm -w --filter @woodshop/web-viewer dev
```

## Build
```bash
pnpm -w --filter @woodshop/web-viewer build
```

## Vite notes
- Set `optimizeDeps.exclude` for large wasm wrappers if needed.
- Put `.wasm` files under `apps/web-viewer/wasm/occt/` and reference by absolute path (`/wasm/occt/...`).
- Load the wasm from a **web worker** to keep the main thread responsive.

## Caching
- Set long `Cache-Control` for `.wasm` and `.js` glue with content hashes.
- Keep the viewer small; lazy-load artifact panels.

## Troubleshooting
- Mixed content (HTTP/HTTPS): match protocols.
- CSP: allow `worker-src` and `wasm-unsafe-eval` if required by toolchain.
