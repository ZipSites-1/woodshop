# Epic: Web Viewer: Artifacts & Performance

**Outcome:** WASM viewer, previews, optional MCP calls.

**Dependencies (epic-level):** 02, 05

## Tasks
- [x] /codex/tasks/todo/web-viewer-wasm-worker-loader.yaml
- [x] /codex/tasks/todo/web-viewer-artifact-panel-pdf-svg-dxf.yaml
- [x] /codex/tasks/todo/web-viewer-performance-budgets.yaml
- [x] /codex/tasks/todo/web-viewer-mcp-client-optional.yaml
- [x] /codex/tasks/todo/web-viewer-csp-and-mime-wasm.yaml

## Milestones

### MVP
- /codex/tasks/todo/web-viewer-wasm-worker-loader.yaml
- /codex/tasks/todo/web-viewer-artifact-panel-pdf-svg-dxf.yaml
- /codex/tasks/todo/web-viewer-performance-budgets.yaml
- /codex/tasks/todo/web-viewer-csp-and-mime-wasm.yaml

### V1
- /codex/tasks/todo/web-viewer-occt-opencascadejs-integration.yaml
- /codex/tasks/todo/web-viewer-parameter-chips-to-mcp.yaml
- /codex/tasks/todo/web-viewer-consent-prompts.yaml
- /codex/tasks/todo/web-viewer-offline-cache-indexeddb.yaml

### V1.1
- /codex/tasks/todo/web-viewer-gcode-stepper.yaml
- /codex/tasks/todo/web-viewer-utilization-diff-overlays.yaml
- /codex/tasks/todo/web-viewer-share-links-and-comments.yaml

## Validation
- `pnpm -w --filter @woodshop/web-viewer build`

## Notes
- Worker loader feeds progress updates via `monitorRunDependencies`, exposing load percentages in the viewer UI.
- Artifact panel demonstrates PDF/SVG previews and makes DXF downloads available through signed mock URLs.
- Vite plugin enforces size budgets and emits Netlify-compatible headers for CSP and WASM MIME defaults.
- Optional MCP probe form exercises authenticated provenance requests without blocking the viewer.
