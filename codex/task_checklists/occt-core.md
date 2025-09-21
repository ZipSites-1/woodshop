# occt-core — Task Checklist

## Scope
C++ core built on Open CASCADE (OCCT): sketches, features, booleans, tessellation, STEP/IGES I/O, and optional WASM bindings.

## Definition of Done (DoD)
- Native `RelWithDebInfo` builds succeed on macOS/Linux/Windows.
- WASM bundle (Emscripten) loads in demo page (no console errors).
- STEP round-trip test within geometric tolerance passes.
- Golden geometry and fuzz tests pass.
- Public headers stable; ABI changes documented.

## Pre-flight
- Read `/codex/conventions/coding-cpp-occt.md`
- Have OCCT toolchain installed or vendored
- Configure CMake presets (native + wasm)

## Tasks
- [ ] **Project scaffolding**
  - [ ] Add `CMakeLists.txt` with targets: `occt_core`, `occt_core_tests`
  - [ ] Add `CMakePresets.json` with `default`, `relwithdebinfo`, `wasm`
  - [ ] Add `cmake/toolchains/Emscripten.cmake`
- [ ] **Geometry API**
  - [ ] `include/woodshop/geom/Sketch.hpp` (+ impl)
  - [ ] `include/woodshop/geom/Features.hpp` (+ impl)
  - [ ] `include/woodshop/geom/Boolean.hpp` (+ impl)
  - [ ] `include/woodshop/geom/Tessellate.hpp` (+ impl)
- [ ] **I/O**
  - [ ] `include/woodshop/io/StepIo.hpp` (read/write)
  - [ ] `include/woodshop/io/IgesIo.hpp` (read/write)
  - [ ] Optional: DXF/SVG exporters (polyline-based)
- [ ] **WASM bindings (optional for this task)**
  - [ ] `src/bindings/embind.cpp` (minimal surface)
  - [ ] Emscripten flags (`-sMODULARIZE`, `-sALLOW_MEMORY_GROWTH`)
- [ ] **Testing**
  - [ ] Golden geometry corpus under `tests/golden/`
  - [ ] Fuzz: randomized boolean ops (bounded complexity)
  - [ ] STEP round-trip: load → export → re-load → compare
- [ ] **Docs**
  - [ ] README with build instructions
  - [ ] API overview + examples (sketch → extrude → boolean)

## Commands
```bash
cmake --preset relwithdebinfo && cmake --build --preset relwithdebinfo
ctest --preset relwithdebinfo
emcmake cmake --preset wasm && cmake --build --preset wasm
```

## Acceptance
- [ ] CI: native build + tests green
- [ ] CI: wasm build artifact published
- [ ] Round-trip and fuzz suites green
