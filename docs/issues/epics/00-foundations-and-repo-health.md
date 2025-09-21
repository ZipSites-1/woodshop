# Epic: Foundations & Repo Health

**Outcome:** A healthy, reproducible monorepo with CI, caching, golden artifacts, and deterministic builds.

## Goals
- Reproducible builds for C++, Rust, and TypeScript.
- Deterministic artifacts with seeds & provenance.
- CI caches (pnpm, cargo, cmake/emsdk) and artifact diff job.
- Security baseline: secret scanning, SBOM, dependency pins.

## Success metrics
- CI green on clean clone; cache hit rate ≥ 70%.
- Artifact diffs pass on reference projects.
- No secret-leak or license violations in scans.

## Related TODOs
- ci-build-matrix-native-wasm-rust-ts.yaml
- ci-cache-strategy-pnpm-cargo-cmake.yaml
- artifacts-reference-projects-setup.yaml
- artifacts-byte-stability-and-seeds.yaml
- artifacts-diff-tool-and-report.yaml
- security-secrets-scan-and-policies.yaml
- security-sbom-and-dependency-pins.yaml
