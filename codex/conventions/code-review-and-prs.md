# Code Review & PRs

## PR Checklist
- [ ] Tests added/updated (unit/property/golden/E2E)
- [ ] Tool schemas/types aligned; breaking changes documented
- [ ] Determinism: seeds echoed; outputs sorted; goldens updated if needed
- [ ] Performance: benches unchanged or justified
- [ ] Security: inputs validated; no secrets logged
- [ ] Docs updated (README/ADR/changelog)

## Review Style
- Prefer small, focused PRs.
- NITs as comments; blockers as requests for changes with rationale.
