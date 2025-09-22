# Epic: Web Viewer — Artifacts & Performance

**Outcome:** WASM viewer with responsive UI and artifact previews under strict performance budgets.
**Status:** COMPLETE

## Highlights
- Worker bootstrap posts progress events so the viewer surfaces percentage-based feedback while occt-core.wasm loads.
- Artifact panel lists mocked signed URLs and provides inline previews for SVG/PDF plus download for DXF.
- Vite security plugin stamps CSP, COOP/COEP, and WASM MIME headers for both dev and production builds.
- Optional MCP provenance probe issues authenticated requests without blocking primary viewer workflows.
- Asset budget plugin halts builds if JS/CSS/WASM bundles regress past agreed thresholds.

## Validation
- `pnpm -w --filter @woodshop/web-viewer build`
- Manual: open the viewer, confirm PDF/SVG previews render and console remains free of CSP/MIME warnings.

## Related TODOs
- web-viewer-wasm-worker-loader.yaml
- web-viewer-artifact-panel-pdf-svg-dxf.yaml
- web-viewer-performance-budgets.yaml
- web-viewer-mcp-client-optional.yaml
- web-viewer-csp-and-mime-wasm.yaml
