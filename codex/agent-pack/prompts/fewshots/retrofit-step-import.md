# Few-shot: Retrofit STEP Import

Demonstrate how to ingest external geometry, map it to Woodshop features, and regenerate artifacts with explicit checks.

## Context
- Import `assembly.step` supplied via MCP handle.
- Target: convert STEP geometry to parametric features, add dowel joinery, generate updated drawings.
- Units assumed millimeters unless the STEP metadata indicates otherwise.

## Skeleton Trace
1. **Plan**
   - Discover geometry via `analyze_geometry`/`import_geometry` as applicable.
   - Outline follow-up tool calls (param updates, joinery, cutlist, drawings).
2. **Act**
   - Show how to reference file handles rather than embedding file contents.
   - Include schema-compliant payloads with units, tolerances, and material assignments.
3. **Verify**
   - Report geometry metrics (bbox, surface area), highlight any conversion warnings.
   - Confirm drawings produced and note any manual follow-up required.
4. **Summarize**
   - Provide deterministic metadata and next steps (e.g., run nesting, run safety checks) if requested.

## Notes
- Emphasize safety: if imported geometry lacks material data, pause for user confirmation.
- Capture how to handle missing metadata by asking clarifying questions.
