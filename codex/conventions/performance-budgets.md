# Performance Budgets

## Targets
- **Geometry ops**: < 100 ms typical features on reference models
- **Viewer WASM load**: < 2 s on mid-tier hardware
- **Nesting (20 parts)**: < 1 s in default strategy
- **CAM toolpath (simple panel)**: < 1 s
- **Memory (WASM)**: < 256 MB in normal projects

## Practices
- Add benches for hot paths; track regressions in CI.
- Avoid accidental quadratic behavior; test with large synthetic inputs.
- Defer heavy strategies to background jobs with progress feedback.
