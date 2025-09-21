# Epic: CAM Engine & GRBL Post

**Outcome:** Deterministic toolpaths (2.5D) and a GRBL post that passes a conformance smoke test.

## Success metrics
- No self-intersections in paths (tests).
- GRBL sample programs accepted by parser/simulator.
- Preview renders without collisions.

## Related TODOs
- cam-contour-operation.yaml
- cam-pocket-operation.yaml
- cam-drill-operation.yaml
- cam-linking-leads-ramps-safez.yaml
- cam-tabs-and-holddowns.yaml
- cam-gcode-writer-rs274-blocks.yaml
- cam-grbl-post-writer.yaml
- cam-gcode-conformance-smoke.yaml
- cam-simulator-dryrun-collisions.yaml
