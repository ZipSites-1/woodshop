# Woodshop CAD — Project Overview

## TL;DR

**Agent-first woodworking CAD**: a parametric design and engineering tool for furniture/joinery that speaks natural language through an **MCP** tool layer, produces **cutlists, nesting diagrams, drawings, and GRBL G-code**, and runs **offline-first** on desktop with a **WASM web viewer**. MCP gives a standard, model-agnostic way for LLMs to call our tools; OCCT ensures robust B-rep geometry and STEP/IGES I/O; GRBL covers the most common prosumer CNCs. ([Model Context Protocol][1])

---

## Product goals

* **Natural-language to shop-ready**: “Design a 1200 mm credenza in 18 mm birch ply with two doors” → parametric model, checks, cutlist, nesting, annotated drawings, G-code.
* **Wood-first intelligence**: species data and **radial/tangential** shrinkage drive wood-movement warnings and sizing hints. ([US Forest Service R\&D][2])
* **Open ecosystem**: MCP tools are stable, typed contracts any MCP-capable client can call (Claude, others). ([Model Context Protocol][1])

---

## Architecture (logical view)

```
+---------------------+        +--------------------+        +----------------------------+
|  Agent Clients      |  MCP   |  MCP Server        |  FFI   |  Engines                   |
|  (Claude/ChatGPT/   +------->+  (JSON-RPC tools)  +------->+  - occt-core (C++)         |
|   Windows AI, etc.) |        |                    |        |  - nest (Rust)             |
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

* **MCP**: standardized, open-source protocol for tools/resources/prompts; think “USB-C for AI apps.” ([Model Context Protocol][1])
* **OCCT**: Open CASCADE kernel provides robust B-rep modeling and STEP/IGES translators; **OpenCascade.js** and community wrappers show proven WebAssembly routes. ([Open CASCADE][3])
* **GRBL**: widely used open-source G-code CNC controller—good first post target. ([GitHub][4])

---

## Agent behavior (ReAct planning)

Agents use a **Reason-Act** loop: plan → call tools → observe results → iterate. ReAct interleaves reasoning traces with tool actions for transparency and better exception handling. ([arXiv][5])

**Policy highlights**

* Tools are the **only** mutation path; JSON-Schema validation on every call.
* Always keep **units explicit**.
* Before posting G-code: run checks, preview, ask for confirmation.
* Record **seed**, engine versions, revision id for determinism.

---

## Major components

### 1) Desktop app (Qt/C++)

* Chat pane that drives tools; **action cards** summarize each tool call and artifacts produced.
* OCCT tessellation rendered locally; runs **offline-first**.
* Connects to local or remote MCP server.

### 2) Web viewer (WASM)

* Browser viewer built on **OCCT→WASM** bindings (Emscripten or OpenCascade.js); renders models and artifacts (PDF/SVG/DXF). ([Open CASCADE][6])

### 3) MCP server (TypeScript)

* Exposes tool registry over JSON-RPC 2.0 per **MCP**; wraps Engines behind stable schemas; records provenance. ([modelcontextprotocol.info][7])

### 4) Engines

* **occt-core (C++)**: sketches, features, booleans, tessellation, STEP/IGES I/O. ([Open CASCADE][3])
* **nest (Rust)**: 1D/2D packers (first/best-fit, skyline; guillotine/non-guillotine). 2D cutting/packing is **NP-hard**, so we use heuristics with deterministic seeding. ([Stirling Computing Science][8])
* **cam (Rust)**: 2.5D pocket/contour/drill, lead-ins/ramps/tabs; **GRBL** post (RS-274 dialect). ([GitHub][4])
* **wood (Rust)**: species database + shrinkage model (radial/tangential), based on **USDA Wood Handbook** and consolidated ranges from **The Wood Database**. ([US Forest Service R\&D][2])

---

## Tool surface (MCP)

**Design & Params**

* `create_project`, `add_parts`, `apply_joinery`, `set_constraints`, `param_update`

**Checks**

* `wood_movement_check(ambient_RH, temp)` → movement per part & warnings (species shrinkage tables). ([US Forest Service R\&D][2])
* `clearance_check(tool_radius, tolerance)`

**Outputs**

* `extract_cutlist`
* `nest_parts(stock, kerf, grain_rules, strategy, seed)` → layouts, utilization, offcuts; deterministic via `seed`. NP-hard → heuristic strategies (skyline/maxrects/guillotine) with practical constraints. ([Stirling Computing Science][8])
* `make_drawing(views, dims, explode)`
* `generate_toolpaths(ops, safe_Z, tabs)` → `postprocess(controller="grbl")` (G-code). ([GitHub][4])

**Interoperability**

* `import_geometry(dxf|svg|step|stl)` / `export(pdf|dxf|svg|step|stl|gcode)` — STEP is the preferred precise B-rep exchange; IGES is less reliable for solids; STL/mesh for visualization. ([opencascade.wikidot.com][9])

**Why these outputs (market parity)**

* Feature parity with popular **OpenCutList** expectations: parts lists, cutting diagrams, labels, cost/weight, DXF/SVG export. ([SketchUp Extension Warehouse][10])

---

## Data model (essentials)

* **Project**: `id, units, params, assemblies[], materials[], revision_log[], engine_versions{occt,nest,cam,wood}`
* **Part**: `id, name, L/W/T, material_id, grain_dir, features[], stock_orientation`
* **Artifacts**: `type (cutlist|nest|drawing|gcode|step|svg|dxf|pdf), hash, seed, source_revision, meta{utilization,sheet_size,controller}`
* **Provenance**: every tool result echoes **seed**, engine versions, inputs hash, revision id → deterministic rebuilds.

---

## Build & repo strategy

* **Monorepo** with `apps/` (desktop, web-viewer, mcp-server, agent-pack), `engines/` (occt-core, nest, cam, wood), `packages/` (schemas, types, ui-kit), `artifacts/` (goldens).
* **OCCT** built via **CMakePresets** for native/RelWithDebInfo and **Emscripten** for WASM; either reference the **Emscripten toolchain** directly or use `emcmake`. ([Stunlock][11])
* **Rust workspace** for `nest/cam/wood`.
* **Task runner** (Nx/Turborepo) for TS packages and the MCP server.

---

## Security & safety

* **MCP allow-list** and OS-level consent (Windows platforms are moving toward a controlled registry/permission model for AI-tooling). ([GitHub][12])
* JSON-Schema validation; enums instead of free-text for risky params; dry-run → confirm for destructive actions (writing G-code).
* No raw DXF/SVG embedded into prompts; pass handles and parse server-side.

---

## Testing & QA

* **Golden artifacts**: for reference projects, check byte-stable cutlists/nests/G-code under fixed `seed`.
* **Property tests**: nesting utilization monotonicity; CAM self-intersection guards; OCCT boolean/tessellation fuzzing.
* **Controller conformance**: quick checks against GRBL command set/examples. ([GitHub][13])

---

## Roadmap (capability milestones)

1. **MCP Skeleton** — `create_project`, `param_update`, `extract_cutlist`, `export(pdf|dxf|svg)`; web viewer (read-only). ([modelcontextprotocol.info][7])
2. **Maker-Ready** — `apply_joinery`, `wood_movement_check`, `nest_parts`, `make_drawing`; OpenCutList-level outputs (parts/labels/diagrams/cost). ([SketchUp Extension Warehouse][10])
3. **Shop-Ready** — `generate_toolpaths` + `postprocess(grbl)`; presets; conformance suite. ([GitHub][4])

---

## References

* **MCP**: Intro & docs; GitHub org; community servers. ([Model Context Protocol][1])
* **OCCT**: STEP/IGES translators; OpenCascade.js; OCCT data-exchange notes. ([Open CASCADE][3])
* **WASM build**: Emscripten + CMake options. ([Stunlock][11])
* **GRBL**: repository & wiki. ([GitHub][4])
* **Wood movement**: USDA Wood Handbook; Wood Database (radial/tangential ranges). ([US Forest Service R\&D][2])
* **Nesting**: 2D packing is NP-hard → heuristics (skyline/maxrects/guillotine) & literature. ([Stirling Computing Science][8])
* **Market parity**: OpenCutList features (cutlists, diagrams, labels, DXF/SVG). ([SketchUp Extension Warehouse][10])

---

## Appendix: agent prompting (ReAct)

* Use ReAct few-shot traces to guide the plan→act loop; good interpretability and error recovery when interacting with tools. ([arXiv][5])

---

**Ownership:** Ben (product/engineering).
**This doc** is the top-level orientation for new contributors; see `/apps/mcp-server/registry.ts` and `/packages/schemas/` for the authoritative tool contracts.

[1]: https://modelcontextprotocol.io/introduction?utm_source=chatgpt.com "What is the Model Context Protocol (MCP)?"
[2]: https://research.fs.usda.gov/treesearch/62200?utm_source=chatgpt.com "Wood handbook: Wood as an engineering material - US Forest Service ..."
[3]: https://dev.opencascade.org/doc/overview/html/occt_user_guides__step.html?utm_source=chatgpt.com "Open CASCADE Technology: STEP Translator"
[4]: https://github.com/gnea/grbl?utm_source=chatgpt.com "GitHub - gnea/grbl: An open source, embedded, high performance g-code ..."
[5]: https://arxiv.org/abs/2210.03629?utm_source=chatgpt.com "ReAct: Synergizing Reasoning and Acting in Language Models"
[6]: https://dev.opencascade.org/project/opencascadejs?utm_source=chatgpt.com "OpenCascade.js | Open CASCADE Technology"
[7]: https://modelcontextprotocol.info/docs/?utm_source=chatgpt.com "MCP Docs – Model Context Protocol （MCP）"
[8]: https://www.cs.stir.ac.uk/~goc/papers/EffectiveHueristic2DAOR2013.pdf?utm_source=chatgpt.com "An effective heuristic for the two-dimensional irregular bin packing ..."
[9]: https://opencascade.wikidot.com/dataexchange?utm_source=chatgpt.com "CAD Data Exchange with Open CASCADE"
[10]: https://extensions.sketchup.com/extension/00f0bf69-7a42-4295-9e1c-226080814e3e/open-cut-list?utm_source=chatgpt.com "OpenCutList | SketchUp Extension Warehouse"
[11]: https://stunlock.gg/posts/emscripten_with_cmake/?utm_source=chatgpt.com "Emscripten with CMake | Jesse Janzer"
[12]: https://github.com/modelcontextprotocol/servers?utm_source=chatgpt.com "Model Context Protocol servers - GitHub"
[13]: https://github.com/grbl/grbl/wiki/_pages?utm_source=chatgpt.com "Pages · grbl/grbl Wiki · GitHub"
