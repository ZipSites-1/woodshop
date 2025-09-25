# Woodshop Project Management Playbook

## Purpose
Woodshop delivers agent-first woodworking CAD across multiple surfaces (MCP server, desktop app, web viewer, engines). This playbook defines how requirements flow from ideation to release so that every epic, task, and artifact is executed in the correct order with auditable evidence.

## Core Roles and Ownership
| Role | Primary Owner | Responsibilities |
|---|---|---|
| Product Lead | Ben (or delegate) | Prioritises epics, validates customer value, maintains `codex/index-tasklist.md`. |
| Technical Lead | Engineering Lead | Approves architecture, signs off on stage gates, ensures cross-engine alignment. |
| Delivery Manager | Project/Program Manager | Runs cadence, enforces checklists, tracks risk log under `docs/project-management`. |
| QA & Verification | QA Lead | Owns test strategy, contract and e2e coverage, keeps `artifacts/reference` in sync. |
| Security & Compliance | Security Engineer | Maintains security epics, SBOM, policies, approves consent/allow-list changes. |
| Documentation Steward | Tech Writer | Curates briefs, epics, release notes, ensures ADRs and changelogs remain current. |

## Requirement Hierarchy and Traceability
Requirements cascade as Epics → Tasks → Acceptance Criteria → Verification. Epics live in `codex/tasks/epics`, executable tasks in `codex/tasks/todo`, and acceptance criteria stay inline with each task. For every shipped change:
1. Link implementation PRs back to a task slug.
2. Update the relevant epic and the top-level tracker at `codex/index-tasklist.md`.
3. Capture verification evidence (tests, artifact hashes) in the task or epic notes.

## Delivery Lifecycle and Stage Gates
| Stage | Entry Criteria | Exit Criteria | Required Artifacts |
|---|---|---|---|
| 1. Discovery & Framing | Opportunity captured; stakeholders identified; product brief opened. | Problem statement approved; success metrics defined; dependencies listed. | Updated brief in `codex/docs/briefs`; backlog item seeded in `codex/index-tasklist.md`. |
| 2. Architecture & Planning | Discovery exit met; technical lead engaged; constraints understood. | Architecture sketch signed off; Definition of Ready checklist passed. | Architecture doc or ADR; epic in `codex/tasks/epics`; task backlog populated. |
| 3. Implementation | Definition of Ready satisfied; sprint backlog committed. | Code merged; Definition of Done met; verification evidence attached. | Linked PRs; schema/type diffs; updated task checkboxes. |
| 4. Verification & Hardening | Implementation done; CI green; artifacts generated. | All acceptance tests pass; reference artifacts updated; sign-offs recorded. | Test summary; updated `artifacts/reference`; verification log. |
| 5. Release & Adoption | Verification exit met; release scope frozen; comms drafted. | Release notes published; changesets applied; deployment or package complete. | Release checklist; CHANGELOG entry; SBOM and security attestations. |

## Definitions of Ready and Done
| Checklist | Criteria |
|---|---|
| Definition of Ready | Clear user value; acceptance criteria enumerated; dependencies resolved or scheduled; impacted components listed; test strategy outlined. |
| Definition of Done | Code merged with approvals; automated tests updated and passing; documentation and task lists refreshed; provenance data verified; rollback plan captured. |

## Ordered Delivery Sequence
1. Foundations (`codex/tasks/epics/00-foundations-and-repo-health.md`) completed before any engine or surface work.
2. Geometry & IO (`codex/tasks/epics/01-occt-core-geometry-and-io.md`) precedes viewer and nesting epics.
3. WASM viewer bindings (`codex/tasks/epics/02-wasm-viewer-and-occt-bindings.md`) unblock web and desktop visualization.
4. Engines (`codex/tasks/epics/03-nesting-engine-v1.md`, `codex/tasks/epics/04-cam-engine-and-grbl-post.md`) mature prior to MCP tool general availability.
5. MCP server and registry (`codex/tasks/epics/05-mcp-server-and-tool-registry.md`) must reach V1 before desktop or agent-pack releases.
6. Surface apps (desktop, web) and agent-pack epics execute once upstream engines and MCP server are versioned.
7. Security, governance, and release epics (`codex/tasks/epics/10`–`12`) stay open until every release candidate passes hardening.

## Execution Cadence
| Ceremony | Frequency | Participants | Outcomes |
|---|---|---|---|
| Backlog Grooming | Weekly | Product Lead, Technical Lead, QA | Prioritised tasks, Definition of Ready validation. |
| Stage Gate Review | End of each stage | Technical Lead, Delivery Manager, QA, Security | Exit criteria confirmation, risk updates. |
| Engineering Sync | Twice weekly | Engineering squads | Blocker removal, dependency alignment. |
| Release Readiness | Before every release | Delivery Manager, QA, Security, Docs | Checklist sign-off, release comms approval. |
| Retrospective | After milestones | Cross-functional team | Action items for process improvements. |

## Change Control and Risk Management
1. Maintain a risk register at `docs/project-management/risks.md` (create if absent). Update probability, impact, owner, and mitigation at every stage gate.
2. All scope or schedule changes require Product Lead and Technical Lead approval, recorded in the relevant epic notes.
3. Security-impacting changes trigger a security review and an update to `ci/security` tooling or policies as needed.
4. For urgent hotfixes, document rationale, testing, and rollback steps in `docs/project-management/hotfix-log.md`.

## Verification Strategy
1. Schema and contract tests (`pnpm -w run test:mcp`) must pass before merging tool or schema changes.
2. Engine modifications require `cargo test` across all members and targeted benches (`pnpm -w run perf:test` where applicable).
3. Desktop changes must include Qt unit tests (`ctest` under `apps/desktop/build`) and manual checklist updates for UI flows.
4. Update reference artifacts (`pnpm -w run e2e:artifacts:reference`) after verification and record new hashes in the epic.

## Documentation Sources of Truth
| Artifact Type | Location |
|---|---|
| Product briefs | `codex/docs/briefs` |
| Epics and task breakdown | `codex/tasks/epics` and `codex/tasks/todo` |
| Execution tracker | `codex/index-tasklist.md` |
| Engineering notes & ADRs | `docs/issues` and `docs/todo` |
| Risk & change logs | `docs/project-management` |
| Release collateral | `docs/releases`, `CHANGELOG.md`, `codex/agent-pack` |

## Continuous Improvement
After every release or epic completion, run a retrospective using the Retrospective template in this folder and feed action items back into the backlog. Update this playbook when roles change, new stages are introduced, or governance expectations evolve.

## Adoption and Communication
- Add the playbook review to the next Stage Gate agenda so Product, Technical, QA, Security, and Delivery leads can ratify the lifecycle and checklists.
- Share the one-page summary at `docs/project-management/playbook-summary.md` in engineering and product channels at least two business days before the review to gather comments.
- Capture notes during the session using `docs/project-management/stage-gate-agenda.md`, then back-fill this playbook, the delivery roadmap (`docs/project-management/delivery-roadmap.md`), and the risk register with agreed changes.
