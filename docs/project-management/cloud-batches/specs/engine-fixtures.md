# Engine Fixture & Benchmark Spec

## Fixture Coverage
| Scenario | Engine | Description |
|---|---|---|
| `cabinet-20parts` | Nesting | Validate skyline vs. Rust placement and utilization |
| `drawer-imperial` | Nesting | Ensure imperial stock handling and kerf trimming |
| `demo_post` | CAM | Compare toolpath runtime/length metrics |
| `pocket_ramp` | CAM | Validate ramp strategies and warning generation |

## Benchmark Harness
- Command: `cargo bench --package nest --bench utilization`
- Additional script: `tools/bench/run_cam_bench.mjs`
- Output format: JSON with `seed`, `metric`, `baseline`, `candidate`, `delta`

## Reporting
1. Store raw outputs under `artifacts/perf/benchmarks/<date>/`.
2. Generate summary Markdown appended to `docs/perf/benchmarks.md`.
3. Flag thresholds exceeding limits by exiting non-zero in CI/nightly run.

## Open Items
- Determine reference hardware for official numbers.
- Automate fixture regeneration when schemas change.
- Integrate diff reports with MCP contract tests.
