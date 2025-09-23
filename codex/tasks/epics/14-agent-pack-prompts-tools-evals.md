# Epic: Agent Pack — Prompts, Catalog, Evals

**Outcome:** A self-contained agent pack with strict tool-only policies, discoverable catalog, deterministic evals, and trace templates aligned with MCP.

**Dependencies (epic-level):** 05, 08, 09, 12

## Tasks
- [ ] /codex/tasks/todo/agent-pack-prompts-system-and-developer.yaml
- [ ] /codex/tasks/todo/agent-pack-fewshots-cabinet-tight-retrofit.yaml
- [ ] /codex/tasks/todo/agent-pack-tool-catalog.yaml
- [ ] /codex/tasks/todo/agent-pack-openrpc-export.yaml
- [ ] /codex/tasks/todo/agent-pack-evals-runner-and-scenarios.yaml
- [ ] /codex/tasks/todo/agent-pack-trace-templates-and-playbooks.yaml

## Validation
- All scenario evals pass with fixed seed and byte-stable artifacts; policy gates exercised by negative tests.

## Milestones

### MVP
- /codex/tasks/todo/agent-pack-prompts-system-and-developer.yaml
- /codex/tasks/todo/agent-pack-fewshots-cabinet-tight-retrofit.yaml
- /codex/tasks/todo/agent-pack-tool-catalog.yaml
- /codex/tasks/todo/agent-pack-evals-runner-and-scenarios.yaml
- /codex/tasks/todo/agent-pack-trace-templates-and-playbooks.yaml

### V1
- /codex/tasks/todo/agent-pack-openrpc-export.yaml
- Expand eval scenarios (tight nesting trade-offs, interop STEP retrofit) — tracked via evals runner

### V1.1
- Harden consent/registry wording and negative tests for destructive ops in evals
- Add richer trace renderers and policy-violation counters
