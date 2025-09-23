# WEB-VIEWER\_BRIEF.md

Lightweight browser application for **viewing, reviewing, and safely tweaking** woodworking projects produced by the MCP-driven agent. Renders 3D geometry in-browser via **WASM** (OCCT build or OpenCascade.js), displays production artifacts (cutlists, nesting diagrams, drawings, G-code), and issues **non-destructive** MCP calls (parameter updates, re-nesting) with explicit consent for any write.

---

## 1) Goals

* Zero-install **share links** for stakeholders to review designs and artifacts.
* Smooth, accurate **3D visualization** with section/explode and per-part inspection.
* **Safe remote control** of select MCP tools (read-mostly; gated writes).
* Deterministic **artifact previews** (SVG/PDF/DXF/G-code) with utilization & diff overlays.

---

## 2) Scope

**In-scope**: 3D viewer, artifact panels, comments/annotations, parameter chips → MCP calls, read-mostly workflows, download/export of artifacts, session-level consent for writes.

**Out-of-scope**: heavy geometry authoring (kept in desktop), direct raw file content into LLM context.

---

## 3) Core Features

### A. 3D Viewer (WASM + WebGL)

* Load OCCT tessellations and metadata (part ids, names, grain, features).
* Controls: orbit/pan/zoom, explode, section planes (X/Y/Z), isolate/ghost parts, bounding-box fit.
* Visual hints: grain direction arrows, joinery overlays, face normals, material/finish color maps.
* Selection sync: selecting a part highlights its row in Cutlist/Nesting.

### B. Artifacts Panel

* **Cutlist**: sortable/grid view with search, grain/edge band indicators, CSV export.
* **Nesting**: per-sheet **SVG** preview with kerf/trim overlay, utilization %, offcuts list; download SVG/PDF.
* **Drawings**: **PDF/DXF** pages with zoom and layer toggles.
* **G-code**: path preview (2.5D) with play/pause/step, feed/rapid visualization, line inspector.

### C. Parameter Chips & Quick Actions

* Chips (immutable defaults, editable overrides): width/height/depth, material presets, joinery tolerance, nesting strategy, grain rules.
* Quick actions: *Re-nest 2440×1220*, *Tighten joinery by 0.2 mm*, *Regenerate drawings*.
* All actions map to **MCP tools**; any write requires consent prompt.

### D. Comments & Annotations

* Pin comments to parts/faces or to artifact coordinates (SVG/PDF annotations).
* Export comments to JSON; include in share links.

### E. Share Links & Access

* Signed links referencing project/revision and artifact set; optional expiry/passcode.
* View-only by default; enabling edits adds consent prompts for any write.

---

## 4) MCP Integration

* **Transport**: JSON-RPC over HTTPS/WebSocket to MCP endpoint (configurable).
* **Capabilities** (read-first): `extract_cutlist`, `nest_parts`, `make_drawing`, `param_update`, `wood_movement_check`, `export`.
* **Consent**: session-scoped token required for `nest_parts`, `make_drawing`, and any server-side artifact write; `postprocess` blocked in web (desktop-only by policy).
* **Provenance**: every response surfaced with `seed`, `engine_versions`, `revision_id`.

---

## 5) UX Spec

* **Layout**: Left—Project tree & comments; Center—3D viewer; Right—Artifacts panel; Top—Action bar with parameter chips; Bottom—status/provenance.
* **Keyboard**: `F` fit, `X` explode, `S` section toggle, `Shift+S` cycle planes, `I` isolate, `G` toggle grain, `L` toggle overlays.
* **Empty state**: drag-and-drop of artifact bundle or paste share link.
* **Error states**: schema validation errors shown inline; network/MCP timeouts with retry and fallbacks.

---

## 6) Performance Targets

* Initial load (viewer ready) ≤ **2 s** on mid-tier laptop; WASM payload < **8 MB gz** preferred.
* 3D interaction ≥ **60 FPS** at \~200k triangles.
* Artifact render latency: SVG/DXF < **150 ms**, PDF < **300 ms** per page.
* MCP round-trip (read ops) p50 **< 200 ms**, p95 **< 1 s**.

---

## 7) Reliability & Determinism

* Viewer state (camera/section/explode) shareable via URL params.
* Artifact previews generated from **server artifacts** (hash-addressed) to ensure bit-identical reproduction.
* MCP calls echo `seed`; web UI pins and replays it in follow-ups for deterministic diffs.

---

## 8) Security & Privacy

* Default **view-only**; consent token required for any tool that writes or regenerates artifacts.
* No raw CAD file contents pass through the model; the web app passes IDs/handles only.
* CSP locked down; no 3rd-party script origins; service worker caches only public artifacts.
* PII minimization in comments; redact file paths; store stable ids.

---

## 9) Offline & Caching

* **Service Worker** caches WASM, JS, and recent artifacts for offline viewing.
* Background refresh with ETag; stale-while-revalidate for large PDFs/SVGs.
* Local IndexedDB for comment drafts and viewer state.

---

## 10) Interop

* Accept artifact bundles: `manifest.json` + PDFs/SVGs/DXFs/JSON; no execution of foreign scripts.
* Export cutlist CSV and annotated PDFs/SVGs.

---

## 11) Observability

* Client events: load time, FPS buckets, artifact open latency, MCP p50/p95, schema-failure counts.
* Error reporting: sanitized stack traces; opt-in session id.

---

## 12) Build & Packaging

* **Vite + React/TS**; web worker for WASM; code-splitting for viewer vs panels.
* Either integrate **OpenCascade.js** or compile OCCT via Emscripten; version \*.wasm artifacts.
* CI size budget check; Lighthouse performance >90 on desktop.

---

## 13) Acceptance Criteria

* Loads reference project in ≤ 2 s; interactive ≥ 60 FPS at 200k tris.
* Cutlist/nesting/drawing/G-code previews match server artifacts byte-for-byte where applicable.
* Consent gating enforced; `postprocess` unavailable in web.
* Deterministic re-runs with fixed `seed` show identical SVG/PDF/G-code previews.

---

## 14) Test Plan

* **Unit**: schema adapters, consent gating, URL state.
* **Integration**: MCP mock + golden artifacts; e2e viewer interaction tests; accessibility (axe) pass.
* **Perf**: WASM cold cache load time, FPS stress tests, artifact rendering latency.

---

## 15) Roadmap

**MVP**: 3D viewer, artifact panels, parameter chips (read-mostly), comments, share links.

**V1**: selective edits via MCP (`param_update`, `nest_parts`, `make_drawing`), consent prompts, offline cache, utilization diff overlays.

**V1.1**: real-time co-viewing cursors, annotation export to desktop, review tasks.
