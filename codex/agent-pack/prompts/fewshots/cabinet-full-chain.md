# Few-shot: Cabinet Full Chain (Design → Postprocess)

Use this example when a user requests a production-ready cabinet workflow. Demonstrate the complete Plan → Act → Verify → Summarize loop, including consent gates.

## Context
- 20-part base cabinet in 18 mm birch plywood.
- Stock sheets: 2440 mm × 1220 mm, kerf 3.2 mm.
- Ambient: 50% RH, 21 °C.
- Controller: GRBL, requires consent token `CONSENT[postprocess]` before posting.

## Skeleton Trace
1. **Plan**
   - Outline tool sequence and rationale (create project → param updates → joinery → cutlist → nesting → drawings → safety checks → toolpaths → postprocess).
2. **Act** (pseudo JSON payloads)
   - Provide realistic inputs/outputs for each MCP call, keeping units explicit.
   - Include safety checks (`wood_movement_check`, `clearance_check`) before CAM/post.
3. **Verify**
   - Summarize warnings (if any), utilization, runtime, artifact links (IDs only).
   - Confirm consent token usage and mention deterministic metadata.
4. **Summarize**
   - Report `seed`, `engine_versions`, `revision_id`, `inputs_hash`, utilization %, outstanding risks, remaining TODOs.

## Notes
- Keep JSON concise but schema-complete.
- Show how to request consent token and pause until the user supplies it.
- Demonstrate how to retry a minor schema correction (e.g., wrong enum) without spamming identical payloads.
