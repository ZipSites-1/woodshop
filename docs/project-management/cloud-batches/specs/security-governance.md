# Security & Release Governance Spec — Workstream F

## Security Controls
- Tool allow-list configuration (`mcp.allowlist.json`) defining permitted MCP tools and access levels.
- Consent token validation for destructive operations (exports, G-code writes) with explicit UI prompts.
- SBOM generation using `ci/security/generate-sbom.sh` and secret scanning enforcement (`ci/security/run-secret-scan.sh`).

## Release Process
| Step | Description |
|---|---|
| Changesets | Adopt `pnpm changeset` workflow with semantic version categories |
| Required Checks | CI pipelines (build, test, security) must pass before merge |
| Release Notes | Auto-generate from changesets; include security advisories |
| Tagging | Create signed tags and update `codex/index-tasklist.md` |

## Documentation & Auditing
- Maintain policy docs in `docs/security/` (to be created/updated).
- Add runbooks for incident response and rollback procedures.
- Record stage-gate decisions and risk updates in `docs/project-management/risks.md`.

## Tasks
1. Implement runtime allow-list enforcement in MCP server and desktop client.
2. Integrate consent token handling across tools and surfaces.
3. Hook SBOM + secret scans as required GitHub checks.
4. Configure changeset pipeline and publish process.

## Open Questions
- Where to store consent tokens securely (local keystore vs. encrypted file).
- Handling third-party tool additions (governance workflow).
- Long-term storage of SBOM artifacts.
