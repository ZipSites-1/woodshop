# Cloud Batch 01 — OCCT + Engines Enablement

This batch covers the first set of cloud-executed tasks. Each workstream is tracked against the AI Assistant Development workflow: **Planning → Scaffolding → Coding**. Coding must only begin after the planning and scaffolding steps are marked complete.

## Workstream A — OCCT Build & Validation Kit
- **Planning**
  - ✅ Align scope with Epic 01 (`codex/tasks/epics/01-occt-core-geometry-and-io.md`) covering CMake presets, STEP/IGES fixtures, and CI coverage.
  - ✅ Identify environments: Ubuntu 22.04 and macOS 14 runners with OCCT 7.x dependencies.
  - ✅ Define success metrics: reproducible builds, <20 min CI runtime, fixture contract tests passing.
- **Scaffolding**
  - ✅ Created CI matrix design doc (`docs/project-management/ci/occt-build-plan.md`).
  - ✅ Documented fixture locations and requirements (fixtures to be populated under `artifacts/reference/geometry-fixtures/`).
  - ✅ Drafted preset template snippet (pending merge) for native & RelWithDebInfo builds.
- **Coding**
  - ☐ Implement GitHub workflow invoking OCCT build presets and uploading artifacts.
    - Create `ci/occt-build.yml` mirroring matrix in the design doc, running `cmake --preset occt-{platform}` and caching the OCCT source tree.
    - Publish build logs + packages to the `artifacts/reference/geometry-fixtures/` path and attach workflow artifacts for review.
  - ☐ Wire contract tests to execute fixtures via new validation harness.
    - Extend validation harness to ingest STEP/IGES fixtures, then add `pnpm -w run test:occt-contract` to CI with deterministic seeds.
    - Capture diff reports in `artifacts/reference/geometry-fixtures/diffs/` and link them in stage-gate notes.
  - ☐ Deliver build logs + artifact hashes back into repo for verification.
    - Store summarized hashes under `docs/project-management/cloud-batches/evidence/occt-build-hashes.md` and reference the workflow run ID.

## Workstream B — OCCT → Viewer Binding Scaffold
- **Planning**
  - ✅ Confirm dependency on Workstream A outputs before shipping viewer binary.
  - ✅ Document viewer performance targets and telemetry hooks in `codex/tasks/epics/02-wasm-viewer-and-occt-bindings.md` notes.
  - ✅ Align CSP/MIME requirements with security team (recorded in stage-gate notes template).
- **Scaffolding**
  - ✅ Generated placeholder WASM worker loader and viewer harness spec (`docs/project-management/cloud-batches/specs/wasm-loader.md`).
  - ✅ Documented synthetic geometry provider expectations to unblock front-end integration tests.
  - ✅ Added TODO list for browser matrix and fallback behaviour in the spec.
- **Coding**
  - ☐ Produce actual WASM loader and bindings leveraging OCCT artifacts.
    - Implement loader in `apps/web-viewer/src/loader/occtLoader.ts`, consuming the artifacts published by Workstream A.
    - Add initialization tests ensuring worker spin-up time stays within the documented budget.
  - ☐ Integrate scaffolding into desktop/web build targets with feature flag.
    - Introduce `WOODSHOP_VIEWER_USE_OCCT` gating across desktop + web bundles, defaulting to `false` until verification.
    - Ensure build scripts pull correct WASM binaries and document activation steps in `docs/project-management/playbook.md`.
  - ☐ Ship CSP/MIME config updates alongside documentation.
    - Update Electron + web server CSP headers to allow new MIME types (`model/step`, `model/iges`, `application/wasm`).
    - Record configuration diffs and testing evidence (security scans, browser smoke tests) in `docs/project-management/cloud-batches/evidence/viewer-csp-updates.md`.

## Workstream C — Engine Fixtures & Bench Harness
- **Planning**
  - ✅ Enumerated nesting + CAM scenarios requiring deterministic comparisons.
  - ✅ Agreed on nightly schedule and output storage (`artifacts/perf/benchmarks/`).
  - ✅ Defined acceptance thresholds (nest utilization delta <1%, CAM runtime delta <5%).
- **Scaffolding**
  - ✅ Authored fixture manifest template (`docs/project-management/cloud-batches/specs/engine-fixtures.md`).
  - ✅ Created benchmark harness outline referencing `cargo bench` and custom scripts within the spec.
  - ✅ Prepared reporting format for utilization/runtime diffs.
- **Coding**
  - ☐ Implement shared fixtures invoking Rust engines and capturing outputs.
    - Populate manifests with real parts under `artifacts/reference/engine-fixtures/` and ensure deterministic RNG seeds.
    - Add integration tests (`cargo test -p engines-nest fixtures_smoke`) verifying fixture round-trips.
  - ☐ Hook benchmarks into CI/nightly with artifact uploads for diff review.
    - Extend `ci/nightly/bench.yml` to run `cargo bench --bench skyline_diff` and `cargo bench --bench cam_runtime`, uploading CSV outputs.
    - Schedule nightly job summaries in `docs/project-management/cloud-batches/evidence/engine-benchmarks.md` with trend snapshots.
  - ☐ Publish diff reports and link them in `docs/project-management/delivery-roadmap.md`.
    - Generate markdown diff summaries using `tools/bench/compare.py` and commit the rendered reports.
    - Cross-link new evidence in the roadmap snapshot when benchmarks stabilize.

## Handoff Package
The cloud team should:
1. Work through each workstream in order, marking Coding tasks complete only when Planning + Scaffolding are confirmed.
2. Commit resulting changes referencing this batch document and the relevant epics.
3. Provide completion notes and evidence (logs, artifact hashes) back in a follow-up PR or issue for review.
