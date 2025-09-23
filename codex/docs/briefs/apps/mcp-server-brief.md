# MCP\_SERVER\_BRIEF.md

Agent-facing tool adapter exposing woodworking design/engineering capabilities over **Model Context Protocol (MCP)** using JSON-RPC 2.0 and JSON Schema. Provides deterministic, idempotent tools that the LLM/agent invokes to create/modify projects, run checks, and produce production-ready artifacts (cutlists, nests, drawings, G-code).

---

## 1) Purpose & Goals

* **Single, stable tool surface** for any MCP-capable agent/client.
* **Deterministic outputs** (optional `seed`) and full **provenance** (engine versions, inputs/outputs hashes, revision ids).
* **Safety by default**: schema validation, allow-list tools, explicit consent for destructive ops.
* **Interoperability-first**: JSON-RPC 2.0, JSON Schema, optional OpenRPC export.

---

## 2) Scope

* Advertise and serve a registry of woodworking tools (design, checks, outputs, interop).
* Translate tool calls to internal engines (geometry, nesting, CAM, wood intelligence).
* Manage artifacts (paths/URIs), revisions, and reproducible job execution.

Out-of-scope: UI, agent reasoning, long-term cloud storage (except artifact handoff), vendor-specific LLM SDKs.

---

## 3) Tool Surface (Initial Set)

### Design & Parameters

* `create_project(units, template?) -> {project_id}`
* `add_parts(parts[]) -> {part_ids[]}`
  *`parts[]`: name, L/W/T, material, grain\_dir, stock\_orientation*
* `apply_joinery(part_ids[], joint_type, params) -> {delta}`
* `set_constraints(sketch_id, dims[], relations[]) -> {solver_status}`
* `param_update(project_id, param, value) -> {delta, impacted_parts[]}`

### Checks & Intelligence

* `wood_movement_check(project_id, ambient_RH, temp) -> {warnings[], per_part_movement}`
* `clearance_check(assembly_id, tool_radius, tolerance) -> {collisions[], min_radii[]}`

### Outputs

* `extract_cutlist(project_id, edge_band_rules?) -> {rows[], totals}`
* `nest_parts(project_id, stock, kerf, trim?, grain_rules?, strategy?, seed?) -> {layouts[], utilization, offcuts[], seed}`
* `make_drawing(project_id, views[], dims, explode?) -> {pdf_id, dxf_id, svg_id}`
* `generate_toolpaths(setup_id, ops[], safe_Z, tabs?, seed?) -> {nc_id, preview, seed}`
* `postprocess(nc_id, controller="grbl") -> {gcode_path}`

### Interop

* `import_geometry(file: dxf|svg|step|stl) -> {entities}`
* `export(project_id, types[]) -> {artifact_ids}`

### Governance

* `explain_change(since_revision) -> {human_diff}`
* `undo(revision_id) -> {revision_id}` / `redo(revision_id) -> {revision_id}`

**All outputs echo**: `{seed?, engine_versions, inputs_hash, outputs_hash, revision_id}`.

---

## 4) Transport & Contracts

* **Protocol**: JSON-RPC 2.0 (requests/responses, error objects).
* **Schemas**: JSON Schema per tool for input/output; strict validation on ingress/egress.
* **Discovery**: MCP registry document (server name/version, tools, schema refs, examples). Optional OpenRPC document generated from the same source.
* **Idempotency**: Tools are idempotent; batch ops require idempotency keys when side-effects are present (e.g., artifact writes).

---

## 5) Determinism & Provenance

* Optional `seed` for algorithms (nesting, CAM). If omitted, server provides a default and returns it.
* Echo `{seed, engine_versions, inputs_hash, outputs_hash, revision_id}` in every response.
* **Job key** = `(project_id, revision_id, tool_name, normalized_inputs, seed)` for caching/replay.

---

## 6) Security & Consent

* **Allow-list**: Only registered tools are callable; registry must be explicit.
* **Consent gating**: Destructive ops (file writes, G-code posting) require a `consent_token` supplied by the client; token is single-use and scoped.
* **No raw file content in prompts**: Tools accept file handles/IDs; raw CAD contents never flow through the LLM context.
* **RBAC (optional)**: Projects and artifacts enforce read/write roles when server runs multi-user.

---

## 7) Error Model

Standard JSON-RPC error with `code`, `message`, and structured `data`:

* `SCHEMA_VALIDATION_ERROR`
* `UNAUTHORIZED` / `CONSENT_REQUIRED`
* `ENGINE_ERROR` (subcodes: boolean\_failure, tessellation\_failure, offset\_failure)
* `INFEASIBLE` (e.g., nesting impossible with given stock/constraints)
* `TIMEOUT` / `CANCELLED`
* `CONFLICT` (stale revision)

Provide **actionable hints** in `data.hints[]` and a `retry_suggestion` (`none|light|heavy`).

---

## 8) Performance Targets

* Schema validation: < 5 ms typical.
* Small project tool calls (cutlist, simple nest): p50 < 200 ms, p95 < 1 s.
* Heavy ops (tight nesting/CAM): stream progress events; complete < 5 s for \~20-part reference.
* Cold start: registry publish < 200 ms.

---

## 9) Observability

* **Structured logs**: request id, tool, duration, status, engine versions, sizes, hashes.
* **Traces**: per tool call span; sub-spans for engine adapters.
* **Metrics**: success rate, p50/p95 latency per tool, schema-failure rate, consent-denied count, cache hit ratio.

---

## 10) Configuration

* `MCP_BIND` (stdio|tcp\://host\:port)
* `ARTIFACT_ROOT` (filesystem path or bucket URL)
* `CONSENT_MODE` (strict|lenient|off; default strict)
* `TIMEOUT_MS` per tool (overridable)
* `PARALLELISM` (thread pool sizes)
* `ENGINE_PATHS` (occt, cam, nest, wood)

---

## 11) Deployment Models

### Local (default)

* Single process; in-proc engines; artifacts on local disk; no auth.

### Hybrid

* Server in app process, heavy ops fan out to local workers via child processes; artifacts on disk or local network share.

### Cloud

* Stateless HTTP/TCP front-end; workers (geometry/nesting/CAM) behind a queue; artifacts to object storage; OAuth + RBAC.

All modes reuse the same MCP registry and tool schemas.

---

## 12) Internal Interfaces (Adapters)

* **Geometry (OCCT)**: `createProject, sketch, solve, extrude, boolean, tessellate, stepImport/export, dxf/svg export`
* **Nesting**: `extractProfiles, plan(strategy, kerf, grain, seed) -> layouts`
* **CAM**: `planOps(ops, safeZ, tabs), simulate, post(controller)`
* **Wood**: `deltaDim(species, orientation, deltaMC), riskReport(project, RH)`

Each adapter returns typed results with engine version and a digest of inputs.

---

## 13) Artifact Handling

* Server assigns stable IDs and materializes artifacts under `ARTIFACT_ROOT`.
* Metadata includes: `type, producer_tool, seed, source_revision, engine_versions, hash, size, created_at`.
* Signed local URIs (file paths) or presigned URLs (cloud) returned to clients.

---

## 14) Testing Strategy

* **Schema tests**: Every tool has positive/negative fixtures.
* **Determinism tests**: Fixed `seed` → byte-identical artifacts for nester/CAM.
* **Golden suite**: Reference projects with expected cutlist/nest/drawing/G-code hashes.
* **Error injection**: Engine adapter faults (boolean fail, infeasible nest, timeout) verify error surfaces and hints.
* **Conformance**: JSON-RPC 2.0 compliance; registry completeness checks.

---

## 15) Acceptance Criteria

* Registry publishes complete, valid schemas; discovery succeeds in compliant clients.
* Tools enforce schema validation and consent gating; malformed inputs rejected with precise errors.
* Deterministic replay: identical inputs + `seed` ⇒ identical outputs and hashes.
* Performance targets met on reference hardware/data.
* Logs/traces/metrics emitted with request correlation.

---

## 16) Versioning & Compatibility

* Semantic versioning per tool and for the registry as a whole.
* Backward-compatible changes: additive fields with defaults; never change semantics silently.
* **Breaking changes** gated by major version bump and dual-publish period (old+new).

---

## 17) Roadmap

**MVP**

* Core tools: `create_project`, `param_update`, `extract_cutlist`, `export`.
* Determinism & provenance plumbing; consent gating; golden fixtures.

**V1**

* Full surface (joinery, movement, nesting, drawings, CAM, postprocess); caching; OpenRPC export; progress events.

**V1.1**

* Multi-user RBAC; cloud artifact presigning; controller pack management; plugin tool namespace.

---

## 18) Operational Runbook

* Health checks: registry endpoint, engine adapter pings, artifact root writability.
* Common incidents: schema regressions, adapter timeouts, disk full, consent misconfiguration.
* Rollback: deploy previous registry+engine version bundle; artifacts remain compatible via provenance.

---

## 19) Directory Skeleton (app)

```
apps/mcp-server/
├─ src/
│  ├─ index.ts               # server bootstrap
│  ├─ registry.ts            # tool registry & discovery
│  ├─ middleware/
│  │  ├─ auth.ts             # consent/RBAC
│  │  ├─ schema-validate.ts  # AJV/Zod
│  │  ├─ provenance.ts       # seeds, hashes, versions
│  │  └─ rate-limit.ts
│  ├─ tools/                 # one file per tool
│  ├─ adapters/              # occt, cam, nest, wood bridges
│  └─ util/                  # units, ids, hashing
├─ schemas/                  # JSON Schemas (source of truth)
├─ openrpc/                  # generated OpenRPC doc (optional)
├─ tests/                    # schema, golden, determinism
├─ package.json
├─ tsconfig.json
└─ mcp.config.json           # server metadata
```

---

## 20) Non-Functional Requirements

* **Reliability**: idempotent tools; retries safe; no partial writes.
* **Security**: least-privilege FS access; sandbox temp dirs; no raw CAD blobs through prompts.
* **Portability**: no dependency on a particular model vendor; MCP only.
* **Maintainability**: codegen types from schemas; single source of truth for registry.
