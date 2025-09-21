# Coding Conventions — Rust (nest, cam, wood)

## Language & Toolchain
- Stable toolchain pinned via `rust-toolchain.toml`.
- Deny warnings in CI; enable `clippy` with the recommended lint set.

## API Design
- Library crates return `Result<T, Error>` with `thiserror` enumerations.
- Do not `panic!` in library code; panics are allowed only in tests and binaries.
- Keep feature flags for heavy strategies (e.g., `tight` nesting).

## Determinism
- Inject RNG via trait or constructor (`RngLike`) and fix seeds in tests/CI.
- Avoid `SystemTime` and non-deterministic ordering in outputs.
- Serialize JSON with stable key ordering.

## Performance
- Use `#[inline]` and small structs where it matters; profile before optimizing.
- Avoid unnecessary allocations in hot loops; prefer `SmallVec` or stack buffers where safe.

## Error Handling
- Prefer early returns with context (`anyhow::Context` in bins; `thiserror` in libs).
- Never swallow errors; propagate with context.

## Testing
- Unit tests close to the code.
- Property tests for invariants (e.g., utilization monotonicity).
- Golden artifact tests for byte-stability under fixed seeds.
