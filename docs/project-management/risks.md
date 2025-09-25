# Risk Register

| ID | Description | Probability | Impact | Owner | Mitigation | Status | Last Reviewed |
|---|---|---|---|---|---|---|---|
| R-001 | OCCT binding work (Epic 01/02) slips, blocking viewer and MCP geometry features. | Medium | High | Technical Lead | Front-load OCCT build system tasks; secure OCCT expertise; track progress weekly in epic 01. | Open | 2025-02-14 |
| R-002 | Deterministic nesting not integrated with Rust engine, leading to trust gaps in artifacts. | Medium | High | Nesting Lead | Prioritise integration tasks in epic 03; run nightly comparisons against reference layouts. | Open | 2025-02-14 |
| R-003 | Security governance (Epic 10) incomplete by first release, risking MCP exposure. | Low | High | Security Engineer | Finish allow-list/consent tooling before GA; schedule security review two sprints ahead. | Open | 2025-02-14 |
| R-004 | Desktop app remains tied to stub MCP session, preventing end-to-end demos. | Medium | Medium | Desktop Lead | Track dependency on MCP server V1; add integration milestone to epic 06; demo working flow in next stage review. | Open | 2025-02-14 |
| R-005 | Reference artifacts drift without timely updates after major engine changes. | Medium | Medium | QA Lead | Automate diff alerts in CI; mandate artifact refresh as part of Definition of Done. | Monitoring | 2025-02-14 |

Review and update this register at every stage gate. Archive superseded rows in `docs/project-management/archive/` if needed.
