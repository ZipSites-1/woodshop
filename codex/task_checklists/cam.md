# cam — Task Checklist

## Scope
2.5D CAM ops (pocket/contour/drill), offsetting, lead-ins/ramps/tabs, simulation, GRBL post.

## Definition of Done
- Toolpath gen deterministic (seed)
- No self-intersections in paths
- GRBL conformance smoke test passes
- Dry-run preview renders in viewer

## Tasks
- [ ] Ops: `pocket`, `contour`, `drill` with parameters (tool dia, stepdown, stepover)
- [ ] Linking: lead-in/out, ramps, safe-Z, tabs
- [ ] Offsets: inside/outside with kerf compensation
- [ ] Simulator: AABB sweep + collisions
- [ ] Post: GRBL writer (units, feed, spindle, G/M codes)
- [ ] Tests:
  - [ ] G-code parser round-trip (basic)
  - [ ] Self-intersection rejection
  - [ ] Seed determinism

## Commands
```bash
cargo test -p cam
cargo run -p cam --example demo_post > artifacts/demo.nc
```

## Acceptance
- [ ] Conformance and intersection tests pass
- [ ] Posted G-code renders in external simulator
- [ ] Docs & examples updated
