# Woodshop CAD — Project Overview

## TL;DR

**Agent-first woodworking CAD**: a parametric design and engineering tool for furniture/joinery that speaks natural language through an **MCP** tool layer, produces **cutlists, nesting diagrams, drawings, and GRBL G-code**, and runs **offline-first** on desktop with a **WASM web viewer**. MCP provides a standard, model-agnostic way for LLMs to call our tools; OCCT ensures robust B-rep geometry and STEP/IGES I/O; GRBL covers the most common prosumer CNCs. ([Model Context Protocol][1])

---

## Product goals

* **Natural-language → shop-ready**: “Design a 1200 mm credenza in 18 mm birch ply with two doors” → parametric model, checks, cutlist, nesting, annotated drawings, G-code.
* **Wood-first intelligence**: species data and **radial/tangential** shrinkage drive wood-movement warnings and sizing hints. ([Forest Service R\&D][2])
* **Open ecosystem**: MCP tools are stable, typed contracts that any compatible client can call. ([Model Context Protocol][3])

---

## Architecture (logical view)

```
+---------------------+        +--------------------+        +----------------------------+
|  Agent Clients      |  MCP   |  MCP Server        |  FFI   |  Engines                   |
|  (Claude/ChatGPT/   +------->+  (JSON-RPC tools)  +------->+  - occt-core (C++)         |
|   others)           |        |                    |        |  - nest (Rust)             |
+---------------------+        |  - Auth/Schema      \       |  - cam  (Rust, GRBL post)  |
                               |  - Provenance logs   \      |  - wood (Rust, species DB) |
                               +-----------------------\     +----------------------------+
                                                            (OCCT, STEP/IGES; GRBL G-code)

        +--------------------+             +---------------------------+
        | Desktop App (Qt)   | <---------> | Artifact Store (PDF/SVG/  |
        | Chat + 3D viewer   |             | DXF/STEP/STL/GCODE)       |
        +--------------------+             +---------------------------+

        +--------------------+
        | Web Viewer (WASM) |
        | 3D + artifacts    |
        +--------------------+
```

* **MCP**: standardized, open protocol for tools/resources/prompts—“USB-C for AI apps.” ([Model Context Protocol][1])
* **OCCT**: Open CASCADE kernel for robust B-rep modeling and STEP/IGES translators; proven paths exist for WebAssembly bindings. ([Open CASCADE][4])
* **GRBL**: widely used open-source G-code controller—sensible first post target. ([GitHub][5])

---

## Agent behavior (ReAct planning)

Agents use a **Reason–Act** loop: plan → call tools → observe results → iterate. ReAct interleaves reasoning traces with tool actions for transparency and improved exception handling. **We implement tools as the only mutation path** and validate every call with JSON Schema. ([arXiv][6])

**Policy highlights**

* Tools are the **only** mutation path; schema-validation on every call (accept/reject with clear errors). ([Model Context Protocol][3])
* Always keep **units explicit**.
* Before posting G-code: run checks, preview, require confirmation. ([GitHub][5])
* Record **seed**, engine versions, revision id for determinism (echoed in every tool result).

---

## Major components

### 1) Desktop app (Qt/C++)

* Chat pane that drives tools; **action cards** summarize each tool call and artifacts produced.
* OCCT tessellation rendered locally; **offline-first**.
* Connects to local or remote MCP server.

### 2) Web viewer (WASM)

* Browser viewer built on **OCCT→WASM** bindings (Emscripten or OpenCascade.js); renders models and artifacts (PDF/SVG/DXF). ([Open CASCADE][7])

### 3) MCP server (TypeScript)

* Exposes tool registry over JSON-RPC 2.0 per **MCP**; wraps Engines behind stable schemas; records provenance. ([Model Context Protocol][1])

### 4) Engines

* **occt-core (C++)**: sketches, features, booleans, tessellation, STEP/IGES I/O. ([Open CASCADE][4])
* **nest (Rust)**: 1D/2D packers (first/best-fit, skyline; guillotine/non-guillotine). 2D cutting/packing is **NP-hard**, so we use seeded heuristics. ([cs.stir.ac.uk][8])
* **cam (Rust)**: 2.5D pocket/contour/drill, leads/ramps/tabs; **GRBL** post (RS-274 dialect). ([GitHub][5])
* **wood (Rust)**: species DB + shrinkage model (radial/tangential) from the **USDA Wood Handbook**. ([Forest Service R\&D][2])

---

## Tool surface (MCP)

**Design & Params**

* `create_project`, `add_parts`, `apply_joinery`, `set_constraints`, `param_update`

**Checks**

* `wood_movement_check(ambient_RH, temp)` → movement per part & warnings (species shrinkage tables). ([Forest Service R\&D][2])
* `clearance_check(tool_radius, tolerance)`

**Outputs**

* `extract_cutlist`
* `nest_parts(stock, kerf, grain_rules, strategy, seed)` → layouts, utilization, offcuts; deterministic via `seed`. (Heuristic strategies like skyline/maxrects/guillotine.) ([cs.stir.ac.uk][8])
* `make_drawing(views, dims, explode)`
* `generate_toolpaths(ops, safe_Z, tabs)` → `postprocess(controller="grbl")` (G-code). ([GitHub][5])

**Interoperability**

* `import_geometry(dxf|svg|step|stl)` / `export(pdf|dxf|svg|step|stl|gcode)` — **STEP** is the preferred precise B-rep exchange; **IGES** is older and less reliable for solids; **STL** is mesh/vis. ([Open CASCADE][4])

**Why these outputs (market parity)**

* Parity with popular **OpenCutList** expectations: parts lists, cutting diagrams, labels, cost/weight, DXF/SVG export. ([extensions.sketchup.com][9])

---

## Data model (essentials)

* **Project**: `id, units, params, assemblies[], materials[], revision_log[], engine_versions{occt,nest,cam,wood}`
* **Part**: `id, name, L/W/T, material_id, grain_dir, features[], stock_orientation`
* **Artifacts**: `type (cutlist|nest|drawing|gcode|step|svg|dxf|pdf), hash, seed, source_revision, meta{utilization,sheet_size,controller}`
* **Provenance**: every tool result echoes **seed**, engine versions, inputs hash, revision id → deterministic rebuilds.

---

## Build & repo strategy

* **Monorepo** with `apps/` (desktop, web-viewer, mcp-server, agent-pack), `engines/` (occt-core, nest, cam, wood), `packages/` (schemas, types, ui-kit), `artifacts/` (goldens).
* **OCCT** built via **CMakePresets** for native/RelWithDebInfo and **Emscripten** for WASM; either use `emcmake` or set `CMAKE_TOOLCHAIN_FILE` to Emscripten’s toolchain. ([Emscripten][10])
* **Rust workspace** for `nest/cam/wood`.
* **Task runner** (Nx/Turborepo) for TS packages and the MCP server.

---

## Security & safety

* **MCP allow-list**, schema-validated inputs/outputs, and client-side user consent before running risky tool actions (e.g., writing G-code). ([Model Context Protocol][3])
* Use enums/number ranges instead of free-text for destructive parameters; dry-run → confirm for postprocessing. ([GitHub][5])
* Do not embed raw DXF/SVG into prompts; pass handles and parse server-side.

---

## Testing & QA

* **Golden artifacts**: for reference projects, check byte-stable cutlists/nests/G-code under fixed `seed`.
* **Property tests**: nesting utilization monotonicity; CAM self-intersection guards; OCCT boolean/tessellation fuzzing.
* **Controller conformance**: quick checks against GRBL command set/examples. ([GitHub][11])

---

## Roadmap (capability milestones)

1. **MCP Skeleton** — `create_project`, `param_update`, `extract_cutlist`, `export(pdf|dxf|svg)`; web viewer (read-only). ([Model Context Protocol][3])
2. **Maker-Ready** — `apply_joinery`, `wood_movement_check`, `nest_parts`, `make_drawing`; OpenCutList-level outputs (parts/labels/diagrams/cost). ([docs.opencutlist.org][12])
3. **Shop-Ready** — `generate_toolpaths` + `postprocess(grbl)`; presets; conformance smoke. ([GitHub][5])

---

## References (selected)

* **MCP**: Intro & architecture docs; GitHub org. ([Model Context Protocol][1])
* **OCCT**: STEP/IGES translators and user guide; OCCT/OpenCascade.js. ([Open CASCADE][4])
* **WASM build**: Emscripten build system integration (`emcmake`, CMake toolchain). ([Emscripten][10])
* **GRBL**: repository & wiki. ([GitHub][5])
* **Wood movement**: USDA Wood Handbook. ([Forest Service R\&D][2])
* **Nesting**: heuristics for 2D packing. ([cs.stir.ac.uk][8])
* **Market parity**: OpenCutList features/docs. ([extensions.sketchup.com][9])

---

## Appendix: agent prompting (ReAct)

Use ReAct few-shot traces to guide the plan→act loop; strong interpretability and recovery during tool use. ([arXiv][6])

---

**Ownership:** Ben (product/engineering).
**This doc** is the top-level orientation for new contributors; see `/apps/mcp-server/registry.ts` and `/packages/schemas/` for the authoritative tool contracts.

---

### What changed vs. your previous draft

* Switched MCP links to the current **modelcontextprotocol.io** docs and added the architecture page. ([Model Context Protocol][1])
* Pointed OCCT/STEP references to maintained docs and the OCCT repo’s STEP guide; kept OpenCascade.js info current. ([Open CASCADE][4])
* Tightened security language to MCP allow-lists + client consent, rather than OS-specific claims (future-proof, standards-based). ([Model Context Protocol][3])
* Confirmed GRBL and OpenCutList references and added current docs pages. ([GitHub][5])

If you want, I can drop this updated file into your repo (or package it as `project_overview.md` for download).

[1]: https://modelcontextprotocol.io/introduction?utm_source=chatgpt.com "What is the Model Context Protocol (MCP)?"
[2]: https://research.fs.usda.gov/treesearch/62200?utm_source=chatgpt.com "Wood handbook: Wood as an engineering material - US Forest Service ..."
[3]: https://modelcontextprotocol.io/docs/learn/architecture?utm_source=chatgpt.com "Architecture overview - Model Context Protocol"
[4]: https://dev.opencascade.org/doc/occt-7.6.0/overview/html/occt_user_guides__step.html?utm_source=chatgpt.com "STEP Translator - Open CASCADE Technology Documentation"
[5]: https://github.com/gnea/grbl?utm_source=chatgpt.com "GitHub - gnea/grbl: An open source, embedded, high performance g-code ..."
[6]: https://arxiv.org/abs/2210.03629?utm_source=chatgpt.com "ReAct: Synergizing Reasoning and Acting in Language Models"
[7]: https://dev.opencascade.org/project/opencascadejs?utm_source=chatgpt.com "OpenCascade.js | Open CASCADE Technology"
[8]: https://www.cs.stir.ac.uk/~goc/papers/EffectiveHueristic2DAOR2013.pdf?utm_source=chatgpt.com "An effective heuristic for the two-dimensional irregular bin packing ..."
[9]: https://extensions.sketchup.com/extension/00f0bf69-7a42-4295-9e1c-226080814e3e/open-cut-list?utm_source=chatgpt.com "OpenCutList | SketchUp Extension Warehouse"
[10]: https://emscripten.org/docs/compiling/Building-Projects.html?utm_source=chatgpt.com "Building Projects — Emscripten 4.0.11-git (dev) documentation"
[11]: https://github.com/gnea/grbl?search=1&utm_source=chatgpt.com "grbl/ at master · gnea/grbl · GitHub"
[12]: https://docs.opencutlist.org/?utm_source=chatgpt.com "Introduction | OpenCutList"
