# Woodshop CAD — Index Tasklist

> Legend: ☐ TODO · ◐ IN-PROGRESS · ⊘ BLOCKED · ✔ DONE  
> Update rules: **check the box when DONE**; keep “◐/⊘” tags in the line for non-done states.  
> MCP/agent clients can discover and call tools via our MCP server during verification. [MCP overview] and [Agents MCP guide].  
> 
> [MCP overview]: https://modelcontextprotocol.io/docs/learn/architecture
> [Agents MCP guide]: https://cookbook.openai.com/examples/mcp/mcp_tool_guide

<!-- BEGIN_TASKLIST (Codex edits inside this block are allowed) -->

## Epic Summary

| Epic | Status | Done/Total | Notes |
|---|---:|---:|---|
| 00 – Foundations & Repo Health | ✔ | 7/7 | CI, caches, goldens, security baseline |
| 01 – OCCT Core: Geometry & I/O | ☐ | 0/7 | STEP/IGES, booleans, tessellation, WASM |
| 02 – WASM Viewer & OCCT Bindings | ☐ | 0/5 | Worker loader, previews, perf budgets |
| 03 – Nesting Engine v1 | ☐ | 0/8 | 1D/2D, grain/kerf, deterministic |
| 04 – CAM Engine & GRBL Post | ✔ | 9/9 | contour/pocket/drill, GRBL, simulator |
| 05 – MCP Server & Tool Registry | ✔ | 13/13 | schemas, provenance, adapters, tools |
| 06 – Desktop App: Chat & Viewer | ☐ | 0/6 | chat UI, action cards, viewer bridge |
| 07 – Web Viewer: Artifacts & Perf | ☐ | 0/5 | previews, budgets, optional MCP |
| 08 – Schemas, Types & Contracts | ☐ | 1/4 | source-of-truth schemas & typegen |
| 09 – Artifacts, Goldens & E2E CI | ☐ | 0/4 | reference runs + diffs in CI |
| 10 – Security, Secrets & MCP Perms | ☐ | 0/4 | allow-list, confirmations, SBOM |
| 11 – Release, Versioning & Docs | ☐ | 0/5 | changesets, changelog, ADR/docs |
| 12 – Agent MCP E2E Flows & UX | ☐ | 0/4 | trace UX + tool wiring |
| 13 – Performance & Benchmarks | ☐ | 0/3 | nest/cam benches, viewer budgets |

> **How to mark progress**
> - **DONE**: check the box `[x]`.
> - **IN-PROGRESS**: keep unchecked `[ ]` and add `◐` at the start of the line.
> - **BLOCKED**: keep unchecked `[ ]` and add `⊘` with a short reason and link.
> GitHub renders these task lists in Markdown and will show progress in issues/PRs. See: GitHub Task Lists.  
> Ref: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/about-tasklists

---

### 00 — Foundations & Repo Health  (0/7)
<details><summary>Open tasks</summary>

- [x] /codex/tasks/todo/ci-build-matrix-native-wasm-rust-ts.yaml
- [x] /codex/tasks/todo/ci-cache-strategy-pnpm-cargo-cmake.yaml
- [x] /codex/tasks/todo/artifacts-reference-projects-setup.yaml
- [x] /codex/tasks/todo/artifacts-byte-stability-and-seeds.yaml
- [x] /codex/tasks/todo/artifacts-diff-tool-and-report.yaml
- [x] /codex/tasks/todo/security-secrets-scan-and-policies.yaml
- [x] /codex/tasks/todo/security-sbom-and-dependency-pins.yaml
</details>

### 01 — OCCT Core: Geometry & I/O  (0/7)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/occt-cmake-presets-relwithdebinfo.yaml
- [ ] /codex/tasks/todo/occt-embind-minimal-surface.yaml
- [ ] /codex/tasks/todo/occt-tessellation-deflection-controls.yaml
- [ ] /codex/tasks/todo/occt-step-roundtrip-tests.yaml
- [ ] /codex/tasks/todo/occt-iges-import-export-smoke.yaml
- [ ] /codex/tasks/todo/occt-boolean-fuzz-suite.yaml
- [ ] /codex/tasks/todo/occt-wasm-build-and-loader-paths.yaml
</details>

### 02 — WASM Viewer & OCCT Bindings  (0/5)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/web-viewer-wasm-worker-loader.yaml
- [ ] /codex/tasks/todo/web-viewer-artifact-panel-pdf-svg-dxf.yaml
- [ ] /codex/tasks/todo/web-viewer-performance-budgets.yaml
- [ ] /codex/tasks/todo/web-viewer-mcp-client-optional.yaml
- [ ] /codex/tasks/todo/web-viewer-csp-and-mime-wasm.yaml
</details>

### 03 — Nesting Engine v1  (0/8)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/nest-first-fit-boards.yaml
- [ ] /codex/tasks/todo/nest-best-fit-sheets.yaml
- [ ] /codex/tasks/todo/nest-skyline-sheets.yaml
- [ ] /codex/tasks/todo/nest-grain-constraints-and-rotation.yaml
- [ ] /codex/tasks/todo/nest-kerf-trim-and-offcuts.yaml
- [ ] /codex/tasks/todo/nest-utilization-metrics-and-report.yaml
- [ ] /codex/tasks/todo/nest-seed-determinism-and-stable-sorts.yaml
- [ ] /codex/tasks/todo/nest-benchmarks-and-thresholds.yaml
</details>

### 04 — CAM Engine & GRBL Post  (9/9)
<details><summary>Open tasks</summary>

- [x] /codex/tasks/todo/cam-contour-operation.yaml
- [x] /codex/tasks/todo/cam-pocket-operation.yaml
- [x] /codex/tasks/todo/cam-drill-operation.yaml
- [x] /codex/tasks/todo/cam-linking-leads-ramps-safez.yaml
- [x] /codex/tasks/todo/cam-tabs-and-holddowns.yaml
- [x] /codex/tasks/todo/cam-gcode-writer-rs274-blocks.yaml
- [x] /codex/tasks/todo/cam-grbl-post-writer.yaml
- [x] /codex/tasks/todo/cam-gcode-conformance-smoke.yaml
- [x] /codex/tasks/todo/cam-simulator-dryrun-collisions.yaml
</details>

### 05 — MCP Server & Tool Registry  (1/13)
<details><summary>Open tasks</summary>

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
</details>

### 06 — Desktop App: Chat & Viewer  (0/6)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/desktop-chat-pane-and-react-trace.yaml
- [ ] /codex/tasks/todo/desktop-action-cards-and-artifacts.yaml
- [ ] /codex/tasks/todo/desktop-viewer-bridge-occt.yaml
- [ ] /codex/tasks/todo/desktop-undo-redo-revisions.yaml
- [ ] /codex/tasks/todo/desktop-offline-cache-and-retry.yaml
- [ ] /codex/tasks/todo/desktop-packaging-installers.yaml
</details>

### 07 — Web Viewer: Artifacts & Performance  (0/5)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/web-viewer-wasm-worker-loader.yaml
- [ ] /codex/tasks/todo/web-viewer-artifact-panel-pdf-svg-dxf.yaml
- [ ] /codex/tasks/todo/web-viewer-performance-budgets.yaml
- [ ] /codex/tasks/todo/web-viewer-mcp-client-optional.yaml
- [ ] /codex/tasks/todo/web-viewer-csp-and-mime-wasm.yaml
</details>

### 08 — Schemas, Types & Contract Tests  (0/4)
<details><summary>Open tasks</summary>

- [x] /codex/tasks/todo/schemas-authoritative-json-and-refs.yaml
- [ ] /codex/tasks/todo/schemas-typegen-to-packages-types.yaml
- [ ] /codex/tasks/todo/schemas-examples-valid-invalid.yaml
- [ ] /codex/tasks/todo/schemas-backcompat-contract-tests.yaml
</details>

### 09 — Artifacts, Goldens & E2E CI  (0/4)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/artifacts-reference-projects-setup.yaml
- [ ] /codex/tasks/todo/artifacts-byte-stability-and-seeds.yaml
- [ ] /codex/tasks/todo/artifacts-diff-tool-and-report.yaml
- [ ] /codex/tasks/todo/artifacts-ci-e2e-workflow.yaml
</details>

### 10 — Security, Secrets & MCP Permissions  (0/4)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/security-mcp-tool-allowlist.yaml
- [ ] /codex/tasks/todo/security-destructive-ops-confirmation.yaml
- [ ] /codex/tasks/todo/security-secrets-scan-and-policies.yaml
- [ ] /codex/tasks/todo/security-sbom-and-dependency-pins.yaml
</details>

### 11 — Release, Versioning & Docs  (0/5)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/release-changesets-and-semver.yaml
- [ ] /codex/tasks/todo/release-changelog-and-tags.yaml
- [ ] /codex/tasks/todo/docs-adrs-bootstrap-and-style.yaml
- [ ] /codex/tasks/todo/docs-project-overview-sync.yaml
- [ ] /codex/tasks/todo/ci-required-checks-and-statuses.yaml
</details>

### 12 — Agent MCP E2E Flows & UX  (0/4)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/mcp-registry-and-discovery.yaml
- [ ] /codex/tasks/todo/mcp-schema-validation-middleware.yaml
- [ ] /codex/tasks/todo/desktop-action-cards-and-artifacts.yaml
- [ ] /codex/tasks/todo/web-viewer-wasm-worker-loader.yaml
</details>

### 13 — Performance & Benchmarks  (0/3)
<details><summary>Open tasks</summary>

- [ ] /codex/tasks/todo/nest-benchmarks-and-thresholds.yaml
- [x] /codex/tasks/todo/cam-simulator-dryrun-collisions.yaml
- [ ] /codex/tasks/todo/web-viewer-performance-budgets.yaml
</details>

<!-- END_TASKLIST -->
