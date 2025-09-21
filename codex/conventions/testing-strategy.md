# Testing Strategy (All Languages)

## Layers
1. **Unit** — fast, isolated tests for functions/classes.
2. **Property** — invariants (e.g., nesting utilization monotonicity).
3. **Golden** — byte-stable artifacts under fixed seeds (SVGs, PDFs, JSON, G-code).
4. **E2E via MCP** — agent flow exercises tools and verifies outputs.

## Principles
- Tests must be deterministic; do not rely on current time or network.
- Keep fixtures small and readable; compress large artifacts only if necessary.
- Use CI to run full matrix (native, wasm, rust, ts) on every PR.

## Coverage
- Require tests for all public APIs and every bug fix.
- Treat lack of test as a change request in code review.
