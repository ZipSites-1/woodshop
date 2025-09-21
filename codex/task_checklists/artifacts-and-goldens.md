# artifacts & goldens — Task Checklist

## Scope
Deterministic artifacts (cutlists, nests, drawings, gcode) and diffing in CI.

## Definition of Done
- Golden set for 2–3 reference projects
- Byte-stable under fixed seed
- CI diff job fails on drift with readable report

## Tasks
- [ ] Select references (cabinet-20parts, box-with-dado)
- [ ] Pin engine versions and seeds
- [ ] Store: `artifacts/<project>/{cutlist.json,nests/*.svg,drawings/*.pdf,gcode/*.nc}`
- [ ] Diff tool: highlight changes + root cause hints
- [ ] CI workflow to run tools and compare

## Commands
```bash
pnpm -w run mcp:e2e:cabinet
node ci/scripts/diff-artifacts.js artifacts/cabinet-20parts current/
```

## Acceptance
- [ ] E2E job green
- [ ] Drift produces actionable diff
