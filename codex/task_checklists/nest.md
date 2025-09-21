# nest — Task Checklist

## Scope
Deterministic 1D/2D nesting with strategies: first-fit, best-fit, skyline; grain + kerf constraints; utilization metrics.

## Definition of Done
- Strategies compile and pass golden tests
- Utilization monotonicity property holds (tighter stock ≥ utilization)
- Results byte-stable given same seed
- Benchmarks tracked

## Tasks
- [ ] Library surface: `plan(strategy, kerf, grain, seed) -> {layouts, utilization, offcuts}`
- [ ] Implement strategies:
  - [ ] 1D linear (boards)
  - [ ] 2D first-fit / best-fit / skyline (sheets)
- [ ] Constraints:
  - [ ] Kerf & trim margins
  - [ ] Grain alignment rules (strict/relaxed/none)
  - [ ] Guillotine and non-guillotine modes
- [ ] Determinism:
  - [ ] Seeded RNG wrapper
  - [ ] Stable sorts and tie-breakers
- [ ] Metrics:
  - [ ] Utilization %, per-sheet metrics, offcut registry
- [ ] Tests:
  - [ ] Golden layouts for sample projects
  - [ ] Property tests (utilization monotonicity)
  - [ ] Edge cases (thin strips, rotated parts disabled)

## Commands
```bash
cargo test -p nest
cargo bench -p nest
```

## Acceptance
- [ ] Golden and property suites pass
- [ ] Bench variance within budget (±5%)
- [ ] API unchanged; docs updated
