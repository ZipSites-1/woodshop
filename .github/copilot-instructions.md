# Copilot / Automated Assistant Instructions

This file tells an automated coding assistant (Copilot-style) how to work in this repository. It's intentionally concise, action-oriented, and tailored to the Woodshop CAD monorepo.

Principles
- Be conservative: prefer small, incremental changes. Open a PR for any change that affects more than a single file or touches build configs.
- Respect project structure: the monorepo contains `apps/`, `engines/`, `packages/`. Make changes in the correct package and update its manifest only.
- Preserve history: don't rewrite unrelated files or reformat large files unless requested.

Safety and destructive actions
- Never generate or write G-code directly without an explicit dry-run flag in the task and a human review step.
- Never store secrets in repository files. If a secret-like string is needed for local testing, use environment variables and .env.local configured in `.gitignore`.
- For MCP tool changes, always validate JSON-Schema inputs/outputs. Prefer adding/modifying schemas in `packages/schemas/`.

Coding & style
- TypeScript/Node:
  - Follow existing `tsconfig.json` and `package.json` scripts. Use `pnpm` for installs and runs when adding dependencies.
  - Keep changes typed. Add or update types in `packages/types/` when public API shapes change.
- Rust:
  - Use the workspace Cargo configuration in the repo root. Run `cargo fmt` and `cargo clippy` locally if making changes.
- C++/CMake (OCCT):
  - Use the top-level `CMakePresets.json` for building. Avoid changing global presets; add new presets only if necessary and describe them in the PR.

Build, test and verification
- For TS packages: run `pnpm --filter <package> test` or the appropriate script in `package.json`.
- For Rust crates: add unit tests and run `cargo test -p <crate>`.
- Always run lints and fix warnings locally: `pnpm -w lint` / `cargo clippy` / `clang-format` for C++.

PR & commit guidance
- Commit messages: short imperative summary + scope: `feat(mcp-server): add tool schema for nest_parts`.
- PR description should include:
  - What changed and why
  - How to run and test locally (commands)
  - Any migration steps or schema changes
  - Notes about backwards compatibility or breaking changes
- If a PR touches multiple packages, split work into multiple smaller PRs unless there's a strong reason.

Testing & golden artifacts
- When producing artifacts for deterministic outputs (nests, cutlists, G-code), include a `seed` value and add a golden under `artifacts/demo/` for CI comparisons.
- MSRV / deterministic builds: record engine versions and seed values in artifact metadata.

MCP-specific guidance
- Tools are the only mutation surface. Avoid direct DB migrations unless coordinated with the MCP server team.
- Every tool call must include `units` and provenance metadata. If adding a new tool, add a schema and a minimal integration test in `apps/mcp-server/test`.

Common tasks examples
- Add a new MCP tool:
  1. Add schema in `packages/schemas/`.
  2. Add TypeScript wrapper types in `packages/types/`.
  3. Implement the tool in `apps/mcp-server/src/tools/...` with JSON-RPC handlers.
  4. Add unit tests in `apps/mcp-server/test` and golden artifacts as needed.
  5. Run `pnpm -w test` and open a PR.

When you're unsure
- Ask a human reviewer. Add a draft PR and request early feedback.
- If you need to change CI or build presets, open an RFC-style PR describing the motivation and rollback plan.

Contact & ownership
- Primary owner: Ben (listed in `codex/project_overview.md`). If changes affect multiple components, request a cross-team review.

---

This file is intentionally short. For more detailed policies see `codex/` and package READMEs.