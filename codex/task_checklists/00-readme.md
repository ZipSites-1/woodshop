# Task Checklists — README

Welcome! This folder contains actionable, verifiable task checklists for each major area of the Woodshop CAD project.
Use them to scope work, collaborate with agents/Codex, and keep PRs shippable.

## How to use
1) Pick the checklist for your area.
2) Copy the **Tasks** section into your issue/PR.
3) Keep commits small and end tasks with a build/test or artifact diff.
4) Update the checklist and docs if you change public APIs.

## Definition of Done (project-wide)
- Builds and tests pass (`pnpm -w test`, `cargo test`, `ctest` where applicable).
- If artifacts are affected, golden diffs are reviewed/approved and seeds pinned.
- MCP tool schemas/types updated and validated.
- README/docs updated for user-visible changes.
- Security posture maintained (no secrets; allow-list unchanged unless intentional).

## Conventions you must follow
- See `/codex/conventions/*` (coding style, determinism, commits/semver, security).
- Agent/Codex prompts live in `/codex/prompts/*` — use them for repeatable work.
