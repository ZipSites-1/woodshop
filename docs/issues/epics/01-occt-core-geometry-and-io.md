# Epic: OCCT Core — Geometry & Data Exchange

**Outcome:** Robust B-rep operations, tessellation, and STEP/IGES I/O with tests and WASM-ready build.

## Goals
- Boolean/feature/tessellation APIs.
- STEP/IGES round-trip tests with tolerances.
- WASM build via Emscripten and minimal bindings.

## Success metrics
- Native + WASM builds green in CI.
- STEP round-trips within tolerance on samples.
- Fuzz suite for booleans passing.

## Related TODOs
- occt-cmake-presets-relwithdebinfo.yaml
- occt-embind-minimal-surface.yaml
- occt-tessellation-deflection-controls.yaml
- occt-step-roundtrip-tests.yaml
- occt-iges-import-export-smoke.yaml
- occt-boolean-fuzz-suite.yaml
- occt-wasm-build-and-loader-paths.yaml
