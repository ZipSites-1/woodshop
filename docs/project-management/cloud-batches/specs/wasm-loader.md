# WASM Loader Scaffold Spec

## Goals
- Provide a deterministic loader that initializes OCCT bindings in a Web Worker.
- Allow desktop/web clients to feature-flag the real OCCT pipeline versus synthetic geometry.

## Components
| File | Purpose |
|---|---|
| `apps/web-viewer/src/workers/occt-loader.ts` | Bootstrap worker and expose message API |
| `apps/shared/geometry/synthetic.ts` | Generate placeholder mesh data for tests |
| `apps/shared/flags/viewerConfig.ts` | Toggle between synthetic and real pipelines |

## Required Deliverables
1. Type-safe message schema (`Init`, `LoadGeometry`, `Dispose`).
2. CSP + MIME doc snippets for hosting the WASM bundle.
3. Unit tests ensuring synthetic geometry path works without OCCT.

## Pending Decisions
- Final directory structure for shared viewer code between desktop and web.
- WASM bundle size budget (< 25 MB compressed).
- Logging strategy for worker errors (console vs. custom telemetry).
