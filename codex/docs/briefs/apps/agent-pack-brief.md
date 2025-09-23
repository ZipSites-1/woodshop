# Agent-Pack Brief

A self-contained product that gives the LLM an **operational brain** for woodworking CAD via MCP. It packages prompts, policies, a tool catalog, deterministic evals, and trace templates so an agent can plan → call MCP tools → verify → ship shop-ready artifacts.

---

## 1) Purpose

* Enforce **tool-grounded** edits only (no silent state changes by the model).
* Provide a **discoverable tool catalog** that mirrors the MCP registry (names, schemas, examples).
* Ship **scenario evals** that deterministically validate end-to-end behavior (cutlists, nests, PDFs, G-code).
* Offer **trace templates** for transparent ReAct-style planning, execution, and verification.

---

## 2) Primary Objectives

1. **Reliability**: All mutations happen through MCP tool calls; every change is auditable and reproducible.
2. **Determinism**: Fixed `seed` + inputs ⇒ byte-stable artifacts and call traces.
3. **Safety**: Policy gates and explicit consent for destructive ops (e.g., posting G-code).
4. **Interoperability**: JSON-RPC 2.0 transport; optional OpenRPC export for discovery/codegen.

---

## 3) Core Capabilities

### 3.1 Prompt Stack (authoritative policies)

**System prompt** must enforce:

* **Tool-only** state changes; the agent must never mutate project state without an MCP call.
* **Explicit units** (mm/inch) in all inputs/outputs.
* **Reproducibility metadata**: echo `seed`, engine versions, and revision id in every step.
* **Two-phase destructive ops**: generate → preview → require confirmation before committing (e.g., `postprocess` that writes G-code).
* **Mandatory checks before CAM**: run `wood_movement_check` and `clearance_check` before toolpath generation/posting.

**Developer prompt**:

* Style for concise JSON inputs, schema adherence, and robust error recovery (retries with minimal deltas).

**Few-shots** (ReAct sequencing on realistic jobs):

* **Cabinet 20-part**: design → cutlist → nest → drawing → CAM → post (with consent gate).
* **Tight nesting**: switch to slower heuristic/high-utilization mode; explain trade-offs.
* **Import & retrofit STEP**: interop-first flow mapping imported geometry to features, then outputs.

### 3.2 Tool Catalog (MCP-aligned)

* `woodshop-tools.json` mirrors the MCP registry: tool names, descriptions, **JSON Schemas** (input/output), examples, determinism flags, and side-effect notes.
* Optional **OpenRPC** export for rich clients and codegen.
* Versioned **capability matrix** per tool: required fields, defaults, constraints, and safety notes.

### 3.3 Planning & Execution Policies (ReAct)

* **Plan → Act → Verify → Summarize** loop templates:

  * *Plan*: list the exact tool sequence and rationale.
  * *Act*: strictly JSON-RPC calls to MCP tools (no free-text mutations).
  * *Verify*: re-run safety checks; if failure, propose and execute a fix plan.
  * *Summarize*: surface `seed`, engine versions, revision id, utilization, and artifact links.
* **Error playbooks**: malformed schema, timeouts, kernel edge cases, infeasible nesting; each with fallback strategies and user-facing explanations.

### 3.4 Evals (deterministic, headless)

* **Scenario YAMLs**: prompt → expected MCP call sequence → expected artifact hashes (cutlist, nests, PDFs/SVGs, G-code).
* **Assertions**:

  * *Behavioral*: required tool ordering (e.g., checks must precede CAM/post).
  * *Artifact*: hash/byte equality under a fixed `seed`.
  * *Trace*: ReAct steps must reference every tool call and response.
* **CLI runner**: targets a local or remote MCP endpoint; emits JUnit-style report and attaches traces.

### 3.5 Tracing & Debugging

* **Trace JSON** per step: thought, tool name, request, response, duration, artifact IDs.
* Renderers for desktop/web to **replay** steps and inspect diffs.
* Minimal PII/PHI by design; prefer numeric/enums over free text.

### 3.6 Security Controls (agent-side)

* Tool **allow-list** & scope hints embedded in prompts/catalog.
* **Consent rules**: destructive ops require explicit "OK to write files/post G-code" token in conversation state.
* **No raw file injection** into prompts; pass opaque handles (IDs) to tools, never the file contents.

### 3.7 Interop & Transport

* **JSON-RPC 2.0** call structure for every tool invocation with request/response examples that validate against schema.
* **OpenRPC** document generation (optional) for downstream clients/SDKs.
* **MCP registry compatibility**: naming, discovery, and schema references match the live MCP registry exposed by the server.

---

## 4) Deliverables (repo contents)

1. `prompts/system.md` — hard rules (tool-only edits; unit/seed/version echoes; consent gates; pre-CAM checks).
2. `prompts/fewshots/*.md` — worked examples:

   * Maker cabinet 1200 mm (full chain to GRBL)
   * Tight nesting (slower heuristic; higher utilization)
   * Import & retrofit STEP (interop-first)
3. `catalogs/woodshop-tools.json` — authoritative tool list with JSON Schemas, examples, and determinism notes (exportable to OpenRPC).
4. `evals/scenarios/*.yaml` — scenario definitions + expected MCP sequences + artifact hashes.
5. `evals/runner.ts` — runs scenarios against an MCP endpoint, generates a JUnit-style report, and attaches traces.
6. `traces/templates/*.json` — render configs for desktop/web to visualize the ReAct loop.
7. `docs/playbooks.md` — error-recovery patterns (schema fail, kernel edge, nesting infeasible, consent missing).
8. `CHANGELOG.md` — MCP spec version, OpenRPC schema version, and prompt pack semver.

---

## 5) Acceptance Criteria

* **Policy compliance**: No state change without an MCP tool call; destructive ops require a consent token; checks always precede CAM/post.
* **Determinism**: Same inputs + `seed` ⇒ identical artifacts, identical call ordering, identical summary fields.
* **Standards compliance**:

  * JSON-RPC messages validate against 2.0.
  * Catalog converts to valid OpenRPC (if enabled).
  * MCP registry discovery works in compliant clients.
* **ReAct behavior**: Trace shows interleaved thought/tool steps with explicit verification gates.

---

## 6) Non-Functional Requirements

* **Version pinning**: MCP spec version; OpenRPC schema version; prompt pack version (semver).
* **Portability**: No vendor-specific tool-calling SDKs—MCP + JSON-RPC only.
* **Auditability**: Every eval stores inputs hash, outputs hash, full MCP call log, timings.
* **Security posture**: Default-deny tool list; consent gating for writes; opaque handles rather than raw file content.

---

## 7) Roadmap (agent-pack only)

* **MVP (Weeks 1–2)**

  * System prompt, two few-shots, minimal tool catalog, 3 eval scenarios, JSON-RPC conformance checks.
* **V1 (Weeks 3–5)**

  * Full catalog parity with MCP server; OpenRPC export; richer error playbooks; deterministic seeds across nester/CAM evals.
* **V1.1 (OS readiness)**

  * Consent/registry wording and policy tests to ensure gating for destructive ops; harden evals for permission pathways.

---

## 8) KPIs (for the agent-pack)

* **Eval pass rate**: % of scenarios passing end-to-end, artifact-hash stable.
* **Tool-call efficiency**: median # of tool calls to reach "ready-to-cut" for a 20-part cabinet (target ≤ 12 steps).
* **Planning latency**: time from user prompt to first valid tool call.
* **Policy violations**: count of attempts to mutate without tools or to post without consent (should be zero).

---

## 9) Risks & Mitigations

* **Protocol drift**: pin a spec version; generate types from the live MCP schema; ship compatibility shims when the server upgrades.
* **Agent hallucination**: ReAct traces + schema gating; evals catch regressions before release.
* **Security/consent gaps**: enforce consent tokens in prompts and evals; negative tests for destructive ops.
* **Viewer/tool mismatch**: assert engine versions and seeds in summaries; fail closed when versions drift.

---

## 10) Interfaces at a glance

* **Inputs**: user NL prompt; MCP tool registry; JSON Schemas.
* **Outputs**: tool plans, JSON-RPC requests, artifact IDs/URLs, traces, JUnit test reports.
* **Dependencies**: MCP-compliant server; engines that honor seeds and emit version metadata.

---

## 11) Deliverable Definition of Done (DoD)

* All MVP deliverables present and documented.
* `evals/runner.ts` returns success across canonical scenarios; artifacts match goldens.
* `woodshop-tools.json` validated and (optionally) exported to OpenRPC.
* Prompts reviewed for safety wording, determinism rules, and consent gating.
