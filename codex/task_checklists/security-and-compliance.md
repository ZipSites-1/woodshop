# security & compliance — Task Checklist

## Scope
MCP permissions, schema-only inputs, secrets policy, SBOM, dependency pinning.

## Definition of Done
- MCP allow-list in place
- Secret scanning enabled
- SBOM generated for releases
- Supply-chain pins recorded

## Tasks
- [ ] MCP: enforce allow-list per tool; confirm prompts for destructive ops
- [ ] Inputs: enums, numbers; no free-text where avoidable
- [ ] Secrets: .env templates, CI masked vars, scanning
- [ ] SBOM: build step for engines and TS packages
- [ ] Dependency pins: lockfiles committed; update policy documented

## Acceptance
- [ ] Security checklist green; audit docs updated
