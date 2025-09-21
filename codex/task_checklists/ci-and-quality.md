# ci & quality — Task Checklist

## Scope
Build/test/bench pipelines across C++, Rust, TS; cache WASM; artifact diffs; quality gates.

## Definition of Done
- CI green on clean checkout
- Caches effective (node_modules, cargo, wasm)
- Artifact diff job active and readable

## Tasks
- [ ] Workflows: native (CMake), wasm (emscripten), rust (workspace), ts (pnpm)
- [ ] Cache strategies per job
- [ ] Benchmarks reported (nest); thresholds enforced
- [ ] Artifact diff step with seed pins
- [ ] PR labels → conditional jobs (e.g., `codex:refactor`)

## Acceptance
- [ ] All pipelines green and reproducible
- [ ] Cache hit rates visible
