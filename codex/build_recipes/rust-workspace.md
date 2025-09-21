# Build Recipe — Rust Workspace (nest, cam, wood)

The Rust workspace hosts performance-critical engines with deterministic behavior.

---

## Commands
```bash
# compile everything
cargo build

# test individual crates
cargo test -p nest
cargo test -p cam
cargo test -p wood

# run benches (nightly/criterion if enabled)
cargo bench -p nest
```

## Features & Profiles
- Use crate features for heavy strategies (e.g., `--features tight`).
- Set release profile for benches in `Cargo.toml`:
```toml
[profile.release]
lto = "fat"
codegen-units = 1
```

## Determinism
- Inject seeded RNG via a trait or constructor param.
- Avoid `Instant::now()` in algorithms; pass timestamps in tests if needed.
- Keep float formatting localized (use explicit format options).

## Toolchain tips
- Use `rustup` to pin the toolchain (e.g., `stable-2025-06-01`).
- Cache `~/.cargo/registry` and `target/` in CI.
