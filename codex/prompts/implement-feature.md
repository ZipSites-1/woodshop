# Prompt — Implement Feature

You are contributing to a production repo.

**Task:** {clear task statement}

**Constraints**
- Modify only: {paths}
- Preserve public APIs unless explicitly allowed
- Add tests (unit/property/golden) as needed
- Follow: `/codex/conventions/*`

**Acceptance**
- `pnpm -w test` green (TS)
- `cargo test` green (Rust)
- `ctest` green (C++)
- If artifacts change: golden diffs approved

**Deliverables**
- Code diff + tests + brief rationale
