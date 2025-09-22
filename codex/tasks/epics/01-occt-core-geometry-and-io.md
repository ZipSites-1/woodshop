# Epic: OCCT Core: Geometry & I/O

**Outcome:** B-rep ops, tessellation, STEP/IGES, WASM-ready builds.

**Dependencies (epic-level):** 00

## Tasks
- [x] /codex/tasks/todo/occt-cmake-presets-relwithdebinfo.yaml
- [x] /codex/tasks/todo/occt-embind-minimal-surface.yaml
- [x] /codex/tasks/todo/occt-tessellation-deflection-controls.yaml
- [x] /codex/tasks/todo/occt-step-roundtrip-tests.yaml
- [x] /codex/tasks/todo/occt-iges-import-export-smoke.yaml
- [x] /codex/tasks/todo/occt-boolean-fuzz-suite.yaml
- [x] /codex/tasks/todo/occt-wasm-build-and-loader-paths.yaml

## Notes
- Mesh library now computes per-vertex normals, axis-aligned bounds, and tessellates cylinders alongside spheres; STEP/IGES round-trips persist normals, and new mesh ops tests cover metrics and surface area.
