# Secret Handling & Incident Response

These guidelines define how the team detects, triages, and remediates secret exposures in the Woodshop monorepo.

## Detection Sources
- Automated scans (`pnpm -w run security:secrets` → wraps `ci/security/run-secret-scan.sh` and produces `artifacts/security/gitleaks-report.json`).
- Manual reports from contributors or CI gate failures.

## Immediate Actions
1. Revoke exposed credentials immediately (rotate keys with the owning system).
2. Purge affected artifacts/logs and force-push removal if the secret landed in git history; document the rewrite.
3. File an incident in the engineering tracker including impacted systems, rotation status, and remediation timeline.

## Communication Plan
- Primary contact: security@woodshop.local (update with production mailbox during launch).
- Escalation path: notify the on-call engineering lead and product owner; page infra if cloud credentials are involved.
- External notifications: coordinate with legal/comms once customer data access is suspected.

## Log Masking Policy
- High-risk keys (tokens, passwords) must be redacted using shared helper (`apps/mcp-server/src/middleware/maskSecrets.ts`).
- Avoid printing user-provided secrets to console/UI. Add regression tests around masking.

## False Positives
- Manage exclusions through `ci/security/gitleaks.toml` for generated artifacts and commit fixtures. Each entry must include a justification comment.
- Track temporary waivers in the incident log and set an expiry date for re-validation.
