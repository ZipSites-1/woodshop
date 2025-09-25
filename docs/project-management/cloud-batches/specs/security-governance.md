# Security & Release Governance Spec — Workstream F

## Blueprint Overview
- Establish unified governance for MCP tooling, desktop consent flows, SBOM generation, and release automation.
- Provide scaffolding that security + release engineers can extend during Coding without revisiting planning.
- Align policies with stage-gate reviews so risk decisions, approvals, and audit records are captured centrally.

## Allow-List Governance
| Artifact | Location | Owner | Notes |
|---|---|---|---|
| MCP Tool Allow-List | `configs/mcp.allowlist.json` | MCP Lead | Defines tool IDs, permitted operations, consent requirements, and output artifact types. |
| Desktop Allow-List Cache | `~/Library/Application Support/Woodshop/mcp-allowlist.json` | Desktop Lead | Synced from server on first connection; stored with checksum + version. |
| CI Validation Script | `ci/security/validate-allowlist.sh` | Security Engineer | Fails builds if allow-list changes lack ADR reference and approvals. |

Controls:
- All allow-list updates require an ADR (`docs/adr/ADR-00xx.md`) referencing the stage-gate decision and security review sign-off.
- MCP server enforces allow-list before executing tools; desktop verifies cached version matches server hash and prompts for update when drifting.
- Audit log entries stored in `artifacts/security/allowlist-log/` with timestamped diffs.

## Consent Management
- Consent modes: `strict` (default) and `test-only`; actual value stored in `configs/consent-policy.json` and mirrored in desktop settings.
- Consent tokens issued per user session, stored encrypted using OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret) with fallback to encrypted file via Workstream F helper library.
- UI prompts must display operation summary, artifacts affected, and require user acknowledgement for destructive operations.
- Non-consented attempts are logged with `consent.status=denied`; repeated denials trigger security alerts.

Implementation scaffolds:
1. Shared TypeScript definitions for consent tokens under `packages/contracts/src/security.ts`.
2. Middleware hooks (`apps/mcp-server/src/middleware/consent.ts`) exposing `requireConsent(operation, context)`.
3. Desktop bridge storing consent receipts alongside artifacts for auditing.

## SBOM & Supply Chain Controls
| Task | Tooling | Output |
|---|---|---|
| Dependency SBOM | `ci/security/generate-sbom.sh` (Syft) | `artifacts/security/sbom/software-bill-of-materials.json` |
| Container SBOM | `ci/security/generate-sbom-container.sh` (Syft + Grype) | OCI layer SBOM, vulnerability report |
| Secret Scanning | `ci/security/run-secret-scan.sh` (gitleaks) | `artifacts/security/gitleaks-report.json` |
| License Audit | `ci/security/license-audit.sh` | `artifacts/security/license-report.json` |

Scaffolding notes:
- SBOM scripts run on every release candidate build; results archived with build number + commit SHA.
- Add GitHub Action workflow `ci/security/sbom.yml` that uploads SBOM artifacts and blocks release if severity ≥ High vulnerabilities exist without approved waiver.
- Document remediation process in `docs/security/incident-response.md` (new doc to be created during Coding).

## Release Tooling Scaffolds
- Adopt `changeset` workflow: `pnpm changeset` required for feature PRs; enforce via status check `changesets/verify`.
- Release automation script `tools/release/prepare-release.mjs` generates changelog, updates versions, and creates signed Git tags (`git tag -s`).
- Stage-gate template in `docs/project-management/playbook.md` updated to include:
  - Verification that SBOM + security scans passed.
  - Confirmation of consent/allow-list review.
  - Link to release checklist stored in `docs/project-management/checklists/release.md` (to author during Coding).
- Distribution artifacts stored in `artifacts/releases/` with checksums (`sha256sum.txt`).

## Stage-Gate Checklist
- Allow-list governance policy documented and scripts outlined ✅.
- Consent handling blueprint agreed with desktop/server teams ✅.
- SBOM + release scaffolds identified and automation entry points defined ✅.
- Coding phase tasks: implement runtime enforcement, author missing docs (`incident-response`, `release` checklist), and wire CI jobs.

## Risks & Follow-Ups
- Need secure secret storage for consent tokens on headless CI agents (investigate HashiCorp Vault integration).
- Clarify retention policy for SBOM artifacts beyond 1 year.
- Decide on release signing key management and rotation cadence.
