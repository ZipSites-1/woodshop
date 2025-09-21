# Build Recipe — Reproducible Builds & Seeds

We aim for deterministic artifacts (cutlists, nests, drawings, G-code) under fixed seeds and pinned engine versions.

---

## Seed policy
- Every tool that uses randomness accepts a `seed` and **echoes it back** in outputs.
- Seeds are pinned in test scenarios and goldens.
- The MCP server includes `seed`, `engine_versions`, `revision_id` in every response.

## Sorting and formatting
- Sort all JSON arrays before emit to avoid nondeterministic ordering.
- Use fixed numeric precision for floats; avoid locale-dependent formatting.

## Environment controls
- Normalize time zone to UTC during tests.
- Ensure identical compiler flags across CI agents.
- Pin toolchains (Rust/C++/Node) to known versions.

## Verifying determinism
1) Run E2E with fixed seeds → produce artifacts
2) Re-run on a clean checkout → compare byte-for-byte
3) Fail CI if drift is detected

## Drift handling
- If algorithms evolve, update goldens with a **changelog note** and PR approval.
