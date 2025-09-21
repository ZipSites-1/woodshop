# Determinism & Provenance Policy

## Must-do on every tool
- Accept `seed` (if randomness used) and **echo it** in output.
- Include `{ seed, engine_versions, revision_id, inputs_hash }` in responses.
- Sort arrays and maps before serializing JSON.

## Build & Runtime
- Pin toolchains (Rust, Node, compilers). Normalize TZ to UTC in tests.
- Avoid locale-dependent formatting. Fix floating precision in all writers.

## Golden Artifacts
- Store goldens for reference projects. CI diffs artifacts and fails on drift.
- When algorithms evolve, update goldens with explicit changelog entries.
