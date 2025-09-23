# Few-shot: Tight Nesting Trade-offs

Compare a fast default nesting run versus a higher-utilization strategy while keeping the **seed** fixed for deterministic diffs.

## Context
- 30 mixed cabinet parts, some with strict grain.
- Stock: 2440 × 1220 mm plywood, kerf 3 mm, trim 15 mm per edge.
- Goal: show utilization gains from skyline heuristic at the cost of runtime.
- Deterministic seed: `9923`.

---

## Transcript Skeleton

### Plan
```
1. Confirm existing cutlist (reuse seed 9923).
2. Run baseline nest (no strategy override) — treat as fast/first-fit.
3. Run high-utilization nest with `strategy: "skyline"` and same seed.
4. Compare utilization, runtime, offcuts; present trade-offs to user.
5. Offer to adopt preferred layout, update downstream artifacts if needed.
```

### Act

#### Baseline Nest (`strategy` omitted → default)
```json
{
  "tool": "nest_parts",
  "params": {
    "project_id": "proj_cabinet_9923",
    "seed": 9923,
    "kerf_mm": 3,
    "stock": [
      { "sheet_id": "ply_sheet_A", "length_mm": 2440, "width_mm": 1220, "quantity": 2 }
    ],
    "parts": [
      { "part_id": "rail_top", "length_mm": 700, "width_mm": 90, "quantity": 6, "allow_rotation": false },
      { "part_id": "stile_left", "length_mm": 820, "width_mm": 70, "quantity": 6, "allow_rotation": false },
      { "part_id": "panel_small", "length_mm": 320, "width_mm": 240, "quantity": 12, "allow_rotation": true }
    ],
    "grain_rule": "strict"
  }
}
```
```json
{
  "project_id": "proj_cabinet_9923",
  "revision_id": "rev_a04",
  "seed": 9923,
  "strategy": "first_fit",
  "layouts": [
    {
      "sheet_id": "ply_sheet_A",
      "sheet_index": 0,
      "utilization": 0.68,
      "used_area_mm2": 2010000,
      "svg_path": "artifacts/nest/proj_cabinet_9923/baseline-sheet-0.svg",
      "placements": [
        { "part_id": "rail_top", "instance": 1, "x_mm": 15, "y_mm": 15, "length_mm": 700, "width_mm": 90, "rotation_deg": 0 }
      ]
    }
  ],
  "offcuts": [
    { "sheet_id": "ply_sheet_A", "area_mm2": 320000, "bounding_box_mm": { "length": 800, "width": 120 } }
  ],
  "utilization_summary": {
    "overall_utilization": 0.68,
    "total_parts_area_mm2": 2720000,
    "total_stock_area_mm2": 4000160
  },
  "runtime_ms": 420,
  "warnings": [],
  "engine_versions": { "nest": "0.18.3", "cam": "0.21.2", "occt": "0.26.0", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "2d9cbd40"
}
```

#### High-utilization Nest (`strategy: "skyline"`)
```json
{
  "tool": "nest_parts",
  "params": {
    "project_id": "proj_cabinet_9923",
    "seed": 9923,
    "kerf_mm": 3,
    "stock": [
      { "sheet_id": "ply_sheet_A", "length_mm": 2440, "width_mm": 1220, "quantity": 2 }
    ],
    "parts": [
      { "part_id": "rail_top", "length_mm": 700, "width_mm": 90, "quantity": 6, "allow_rotation": false },
      { "part_id": "stile_left", "length_mm": 820, "width_mm": 70, "quantity": 6, "allow_rotation": false },
      { "part_id": "panel_small", "length_mm": 320, "width_mm": 240, "quantity": 12, "allow_rotation": true }
    ],
    "grain_rule": "strict",
    "strategy": "skyline"
  }
}
```
```json
{
  "project_id": "proj_cabinet_9923",
  "revision_id": "rev_a04",
  "seed": 9923,
  "strategy": "skyline",
  "layouts": [
    {
      "sheet_id": "ply_sheet_A",
      "sheet_index": 0,
      "utilization": 0.82,
      "used_area_mm2": 2420000,
      "svg_path": "artifacts/nest/proj_cabinet_9923/skyline-sheet-0.svg",
      "placements": [
        { "part_id": "rail_top", "instance": 1, "x_mm": 15, "y_mm": 15, "length_mm": 700, "width_mm": 90, "rotation_deg": 0 },
        { "part_id": "panel_small", "instance": 4, "x_mm": 750, "y_mm": 120, "length_mm": 320, "width_mm": 240, "rotation_deg": 90 }
      ]
    }
  ],
  "offcuts": [
    { "sheet_id": "ply_sheet_A", "area_mm2": 180000, "bounding_box_mm": { "length": 500, "width": 120 } }
  ],
  "utilization_summary": {
    "overall_utilization": 0.81,
    "total_parts_area_mm2": 2720000,
    "total_stock_area_mm2": 4000160
  },
  "runtime_ms": 1480,
  "warnings": [
    { "part_id": "panel_small", "severity": "info", "message": "Rotated 90° to honor grain rule" }
  ],
  "engine_versions": { "nest": "0.18.3", "cam": "0.21.2", "occt": "0.26.0", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "5d4f2e61"
}
```

### Verify
Create a comparison table in the verification step, for example:

| Strategy        | Utilization | Runtime (ms) | Not Placed | Notes |
|-----------------|-------------|--------------|------------|-------|
| first_fit       | 68 %        | 420          | 0          | Fastest; larger offcut 0.32 m² |
| skyline         | 81 %        | 1480         | 0          | Rotated 4 panels; offcut reduced to 0.18 m² |

Call out any warnings (rotation in this case) and confirm the user is comfortable with the longer runtime.

### Summarize
Suggested summary wording:
```
Seed 9923 · revision rev_a04 · engines occt 0.26.0 / nest 0.18.3 / cam 0.21.2 / wood 0.9.0 · inputs_hash skyline 5d4f2e61

Baseline first-fit nest hit 68% utilization with 0.32 m² offcut in 0.42 s. Skyline strategy reused the same seed and bumped utilization to 81% (offcut 0.18 m²) at the cost of 1.48 s runtime and a 90° rotation on four small panels. Let me know which layout to promote before regenerating drawings/toolpaths.
```

### Guidance
- Keep both tool calls in the few-shot so the model learns to **reuse the same seed** across strategy comparisons.
- Make it explicit that higher utilization may imply more compute time and rotated parts; ask for confirmation before committing downstream artifacts.
