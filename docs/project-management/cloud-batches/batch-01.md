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
  - ☐ Wire contract tests to execute fixtures via new validation harness.
  - ☐ Deliver build logs + artifact hashes back into repo for verification.

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
  - ☐ Integrate scaffolding into desktop/web build targets with feature flag.
  - ☐ Ship CSP/MIME config updates alongside documentation.

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
  - ☐ Hook benchmarks into CI/nightly with artifact uploads for diff review.
  - ☐ Publish diff reports and link them in `docs/project-management/delivery-roadmap.md`.

## Handoff Package
The cloud team should:
1. Work through each workstream in order, marking Coding tasks complete only when Planning + Scaffolding are confirmed.
2. Commit resulting changes referencing this batch document and the relevant epics.
3. Provide completion notes and evidence (logs, artifact hashes) back in a follow-up PR or issue for review.
