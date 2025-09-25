# Playbook One-Pager

## Why
Ensure every team member understands the delivery lifecycle, stage gates, and responsibilities without reading the full playbook.

## Key Points
- **Lifecycle:** Discovery → Architecture → Implementation → Verification → Release.
- **Checklists:** Definition of Ready & Done guard work entry/exit.
- **Ownership:** Product (vision), Tech (architecture), Delivery (cadence), QA (verification), Security (governance), Docs (knowledge base).
- **Risk Controls:** Risk register (`docs/project-management/risks.md`) reviewed at every stage gate; hotfix log tracks emergency changes.
- **Verification:** MCP contract tests, Rust benches, Qt tests, and artifact refreshes are mandatory before shipping.
- **Sequencing:** Foundational epics complete before surfaces; MCP V1 before desktop/web releases.

## What To Do Before The Next Stage Gate
1. Read the full playbook (`docs/project-management/playbook.md`).
2. Add comments or questions directly in the repo (PR/issue) two business days ahead.
3. Review the risk register and bring proposed mitigations for any High impact item.

## Stage Gate Agenda Snapshot
- Review open risks and mitigations.
- Confirm each workstream meets its stage exit criteria.
- Capture decisions, action items, and required playbook updates on the shared notes template (`docs/project-management/stage-gate-agenda.md`).

## Contacts
- Product Lead: Ben
- Technical Lead: Engineering Lead
- Delivery Manager: (assign)
- QA Lead: (assign)
- Security Engineer: (assign)

Keep this one-pager handy when inviting stakeholders to the review.
