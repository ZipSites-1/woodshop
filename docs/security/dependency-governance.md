# Dependency Governance

## Pinning Strategy
- **JavaScript/TypeScript**: manage through `pnpm-lock.yaml`; forbid caret/latest ranges for production packages.
- **Rust**: keep `Cargo.lock` committed; use `[patch]` table for overrides when necessary.
- **CMake/OCCT**: record third-party version in `CMakePresets.json` or toolchain files; avoid `GIT_TAG master` style fetches.

## Automated Checks
- SBOM generation: `pnpm -w run security:sbom` → wraps `ci/security/generate-sbom.sh` (Anchore syft) and stores results in `artifacts/sbom/`.
- Secret scan gate: `pnpm -w run security:secrets` (ensures dependency updates do not introduce secrets alongside).
- Future additions: `pnpm audit --production`, `cargo deny check`.

## SBOM Artifacts
- Target directory: `artifacts/sbom/`
- Naming convention: `woodshop-<gitsha>-<timestamp>.spdx.json`
- Provenance metadata: syft embeds package versions; attach SBOM artifact to release bundles.

## Review Policy
- Every dependency update PR must link to scan results and SBOM diff (once tooling is live).
- Document exceptions and temporary pins here with expiration dates.
