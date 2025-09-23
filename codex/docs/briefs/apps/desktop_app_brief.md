# DESKTOP\_APP\_BRIEF.md

Agent-first, offline-capable Qt/QML desktop application for designing/engineering woodworking projects via an MCP-connected agent. Provides chat-driven workflows, live 3D viewport (OCCT tessellation), deterministic outputs (cutlists, nests, drawings, G-code), and auditable action history.

---

## 1. Product Goals

* **NL → Shop outputs** in minutes with agent-managed tool sequencing.
* **Deterministic & auditable**: every change via MCP tool call; reproducible with `seed`/versions.
* **Offline-first** with optional cloud artifact sync.
* **Interoperable**: view/import/export STEP/DXF/SVG/PDF; preview G-code for GRBL.

## 2. Target Users

* Solo makers/small shops needing fast, reliable shop drawings & cutlists.
* Pro shops requiring parametric variants, labels, and CNC handoff.
* Educators/makerspaces prioritizing safe defaults and explainability.

## 3. Core Use Cases

* Design a cabinet from a prompt → cutlist → nested sheets → labeled diagrams → GRBL G-code.
* Import an existing STEP/DXF → retrofit joinery → re-nest and export.
* Parameter tweak (“+2 mm clearance”) → instant re-check + updated exports.

---

# FEATURES.md

### A. Chat + Action Cards

* **Chat pane** drives the agent. Each tool call renders an **Action Card** (inputs, outputs, artifacts, timing, seed/versions) with rollback links.
* One-click quick actions: *Show cutlist*, *Re-nest 2440×1220*, *Export GRBL*, *Open drawing*.

### B. Live Viewport (OCCT)

* High-quality tessellation with orbit/pan/zoom, explode, section planes.
* Select parts → highlight in cutlist/nesting; show grain direction and joinery annotations.

### C. Artifacts Panel

* Tabbed: **Cutlist**, **Nesting**, **Drawings**, **G-code**, **Imports/Exports**.
* Inline viewers for PDF/SVG/DXF previews; G-code preview (toolpath overlay + line inspector).

### D. Revision Journal

* Immutable ledger of MCP calls (time, inputs hash, outputs hash, seed, engine versions).
* **Explain Change** (human diff) view; **Undo/Redo** against revision ids.

### E. Safety & Consent

* Destructive ops (file writes, posting G-code) require explicit **consent token**.
* Wood-movement + clearance checks must pass before CAM/post (policy enforced via agent-pack + UI gates).

### F. Offline-First

* All features available with local MCP server; artifacts written to local workspace.
* Background sync optional (disabled by default).

### G. Performance Targets

* Cold start to interactive UI ≤ 3 s on mid-tier hardware.
* Viewport ≥ 60 FPS at 200k triangles; responsive selection < 50 ms.
* Cutlist/Nesting typical run < 2 s for \~20 parts; CAM preview < 3 s.

### H. Accessibility & UX

* Keyboard-first navigation; high-contrast theme; scalable UI text; WCAG AA color contrast.
* Screen-reader descriptions on action cards and artifact lists.

---

# UX\_SPEC.md

## Screens

1. **Main**: Chat (left), Viewport (center), Artifacts (right), Status bar (bottom).
2. **Settings**: Units, file locations, controller presets, privacy/telemetry toggles.
3. **Diff/Journal**: chronological MCP calls, filters, quick revert.

## Components

* **ChatPane**: message list, input box, tool chips, consent prompts, error toasts.
* **Viewport**: OCCT render, section controls, explode slider, object tree.
* **ActionCard**: title (tool name), summary, input/output snippets, artifacts list, timing, seed/versions, undo button.
* **ArtifactsPanel**: tabs for Cutlist/Nesting/Drawings/G-code.

## Keyboard Shortcuts

* `Ctrl/Cmd+K` command palette; `Ctrl/Cmd+Enter` send; `F` fit view; `X` explode toggle; `S` section plane toggle; `U` undo; `Shift+U` redo.

## Error Surfaces

* Schema validation → inline form-like hints on failing fields.
* Engine errors → action card with suggested next steps; link to playbook.

---

# MCP\_INTEGRATION.md

## Transport

* JSON-RPC client to local MCP server (stdio or localhost socket). Remote endpoint supported via settings.

## Tool Use Rules (enforced by UI + prompts)

* **No silent edits**: all mutations originate from explicit tool calls.
* **Consent**: destructive ops require a user-signed consent token injected into the next tool input.
* **Checks before CAM**: run wood-movement & clearance checks; block CAM/post if failing.

## Error Handling

* Retries with exponential backoff for transient failures.
* Structured display of schema validation errors.
* Timeouts produce actionable prompts (e.g., switch to slower/tighter nesting).

## Offline Mode

* Endpoint defaults to local MCP; network failures never block local work.
* Artifact URIs resolve to local paths; cloud sync is best-effort.

---

# DATA\_MODEL.md

## Local Store

* **Project**: id, name, units, params, assemblies, materials, features, revision\_log, engine\_versions.
* **Artifacts**: type (cutlist|nest|drawing|gcode|step|svg|dxf|pdf), path/hash, metadata (utilization, sheet sizes, controller), source\_revision, seed.
* **Settings**: units, paths, controller presets, privacy flags, MCP endpoint.

## Provenance

* Every action card includes `inputs_hash`, `outputs_hash`, `seed`, `engine_versions`, `revision_id`.

---

# SECURITY\_MODEL.md

* **Default-deny** tool allow-list (only registered MCP tools visible).
* Consent token required for file writes & posting G-code.
* Sandboxed temp dir for intermediate artifacts; explicit move to workspace on consent.
* No raw CAD file contents sent to prompts; only opaque handles/ids.
* Telemetry off by default; when enabled, strips file paths and replaces with stable ids.

---

# BUILD\_AND\_PACKAGING.md

## Stack

* Qt 6 (QML + C++), OCCT native libs, JSON-RPC client, PDF/SVG/DXF previewers.

## Structure

* `src/app` (bootstrap), `src/mcp` (client), `src/viewer` (OCCT bridge), `src/state` (store), `src/actions` (dispatch).
* QML components: `Main.qml`, `ChatPane.qml`, `Viewport.qml`, `ActionCard.qml`, `Settings.qml`.

## Packaging

* Native installers per OS; include OCCT and runtime deps; code-signed.
* Separate optional package for controller presets.

---

# TELEMETRY\_AND\_OBSERVABILITY.md

* Local log file per session (JSON lines): tool name, duration, status, hashes.
* Crashes write minidumps (opt-in send).
* Perf traces for long-running ops (nesting/CAM) for troubleshooting.

---

# ACCEPTANCE\_CRITERIA.md

* **Determinism**: Given identical inputs + `seed`, UI shows identical artifacts (hash match) and identical action card summaries.
* **Policy**: UI blocks CAM/post without passing checks and consent token present.
* **Performance**: Meets stated targets on reference hardware.
* **Interop**: STEP/DXF/SVG/PDF previews load; export opens in third-party tools.
* **Offline**: All main flows succeed without network.

---

# TEST\_PLAN.md

* **Unit**: schema adapters, consent gating, file path resolvers, hashers.
* **Integration**: end-to-end flows with a local MCP stub; golden artifact diffing for cutlist/nest/drawings/G-code.
* **UI**: simulated chat interactions, keyboard navigation, accessibility labels.
* **Recovery**: engine error simulations; ensure playbook suggestions render.

---

# ROADMAP.md

**MVP**

* Chat + Action Cards; local MCP connection; viewport; cutlist/nesting/drawing previews; consent gating; offline operation.

**V1**

* G-code preview with line stepping; controller preset editor; advanced diffing; artefact label printing.

**V1.1**

* Cloud artifact sync; collaboration comments; plugin hooks for custom viewers.

---

# RISKS\_AND\_MITIGATIONS.md

* **Kernel edge cases** → surface clear failures; allow retry with simplified feature set; keep golden corpus.
* **User expectation of zero waste** → explain heuristic nesting; offer tight mode with ETA; show utilization and constraints.
* **Protocol drift** → pin MCP/tool schema versions; fail closed on mismatch; provide migration hints.

---

# ACCESSIBILITY.md

* Keyboard reachability for all actions; focus outlines.
* Screen-reader labels for action cards and artifact table cells.
* Adjustable font sizes; high-contrast theme.

---

# INTERNATIONALIZATION\_AND\_UNITS.md

* Full metric/imperial support; project-level units immutable after creation without explicit convert step.
* Localized number formatting; date/time in system locale; text resources externalized.

---

# UPDATE\_AND\_SUPPORT.md

* In-app updater (manual check by default); release notes show breaking changes.
* Troubleshooting mode: collect logs, environment, engine versions in a single zip (opt-in).

---

# SYSTEM\_REQUIREMENTS.md

* CPU: 4-core 64-bit; RAM: ≥ 8 GB; GPU: integrated OK; Disk: ≥ 1 GB free + artifacts.
* OS: Windows 11, macOS 13+, Ubuntu 22.04+.
