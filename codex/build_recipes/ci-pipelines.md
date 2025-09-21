# Build Recipe — CI Pipelines

A balanced set of GitHub Actions (or similar) jobs that build native, wasm, rust, and ts targets and then run artifact diffs.

---

## Suggested jobs
1. **setup**: checkout, node, pnpm, rust toolchain, cmake, emsdk
2. **build-native**: `cmake --preset relwithdebinfo` + `ctest`
3. **build-wasm**: emsdk + wasm build, upload wasm artifacts
4. **rust**: `cargo test` + optional benches
5. **ts**: `pnpm -w build && pnpm -w test`
6. **e2e-artifacts**: start MCP → run scenario → diff against goldens

## Caching
- pnpm: cache store + node_modules
- cargo: registry + target
- cmake: build directory (or ccache/sccache)
- wasm: emsdk cache + build dir

## Concurrency
- Use `concurrency: group: ${{ github.ref }}-ci, cancel-in-progress: true`

## Required checks
- Lint, typecheck, tests, artifacts-diff

## Artifacts
- Upload wasm bundles, PDFs/SVGs, G-code, and test reports as build artifacts
