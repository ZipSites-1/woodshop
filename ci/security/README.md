# CI Security Automation

This directory contains the tooling invoked by CI and local scripts to enforce security hygiene.

## Scripts
- `run-secret-scan.sh` — installs a pinned `gitleaks` binary (cached under `ci/bin/`) and scans the working tree using the allowlist in `ci/security/gitleaks.toml`. Results are written to `artifacts/security/gitleaks-report.json`.
- `generate-sbom.sh` — installs a pinned `syft` binary and emits an SPDX JSON SBOM to `artifacts/sbom/woodshop-<git>-<timestamp>.spdx.json`.

Both scripts are safe to run locally and are wired into CI workflows.
