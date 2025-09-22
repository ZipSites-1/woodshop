# cam — Task Checklist

## Scope
2.5D CAM ops (pocket/contour/drill), offsetting, lead-ins/ramps/tabs, simulation, GRBL post.

## Definition of Done
- Toolpath gen deterministic (seed)
- No self-intersections in paths
- GRBL conformance smoke test passes
- Dry-run preview renders in viewer

## Tasks
- [x] Ops: `pocket`, `contour`, `drill` with parameters (tool dia, stepdown, stepover)
- [x] Linking: lead-in/out, ramps, safe-Z, tabs
- [x] Offsets: inside/outside with kerf compensation
- [x] Simulator: AABB sweep + collisions
- [x] Post: GRBL writer (units, feed, spindle, G/M codes)
- [x] Tests:
  - [x] G-code parser round-trip (basic)
  - [x] Self-intersection rejection
  - [x] Seed determinism

## Commands
```bash
cargo test -p cam
pnpm run cam:demo
```

## Acceptance
- [x] Conformance and intersection tests pass
- [x] Posted G-code renders in external simulator
- [x] Docs & examples updated
