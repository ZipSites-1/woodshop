# Few-shot: Cabinet Full Chain (Design → Postprocess)

Use this trace when a maker wants a **turn‑key cabinet**: parametric sizing, joinery, artifacts, and GRBL post with consent. It demonstrates the complete **Plan → Act → Verify → Summarize** cycle and embeds the safety policies from the system prompt.

## Context
- Project: 20-part base cabinet, 18 mm birch ply.
- Stock sheets: 2440 mm × 1220 mm, kerf 3.2 mm, trim 12 mm.
- Environment: 50 % RH, 21 °C.
- Controller: GRBL. Destructive write requires consent token `CONSENT[postprocess]`.
- Determinism: seed `7741` reused end-to-end.

---

## Transcript Skeleton

### Plan
```
1. Discover/create project with `create_project(seed=7741, units="mm")`.
2. Resize cabinet: `param_update` to set width/height/depth and shelf count.
3. Add joinery: `apply_joinery` dados for shelves, confirm outputs.
4. Derive manufacturing artifacts:
   a. `extract_cutlist`
   b. `nest_parts` using cabinet stock
   c. `make_drawing` (exploded + dimensions)
5. Safety gate before CAM:
   a. `wood_movement_check`
   b. `clearance_check`
6. Generate toolpaths: `generate_toolpaths` with safe Z = 5 mm.
7. Request consent → upon receipt, `postprocess_grbl(confirm_write=true, consent_token=…)`.
8. Verify metrics + warnings, summarize metadata + next steps.
```

### Act

> Only the most relevant snippets are shown; trim as needed to fit the final prompt budget.

#### Tool: `create_project`
```json
{
  "tool": "create_project",
  "params": {
    "seed": 7741,
    "units": "mm",
    "template": "base_cabinet"
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0001",
  "seed": 7741,
  "materials": [
    { "name": "Birch Ply 18mm", "grain": "length", "thickness_mm": 18 }
  ],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "b8a1c5e1",
  "units": "mm",
  "template": "base_cabinet"
}
```

#### Tool: `param_update`
```json
{
  "tool": "param_update",
  "params": {
    "project_id": "proj_cabinet_7741",
    "revision_id": "rev_0001",
    "seed": 7741,
    "current": {
      "width_mm": 900,
      "height_mm": 760,
      "depth_mm": 450,
      "shelf_count": 2,
      "door_style": "shaker",
      "back_panel": true
    },
    "changes": [
      { "parameter": "width_mm", "value": 1200, "reason": "fit 4 drawers" },
      { "parameter": "height_mm", "value": 820 },
      { "parameter": "shelf_count", "value": 3 }
    ]
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0002",
  "seed": 7741,
  "applied": [
    { "parameter": "width_mm", "previous_value": 900, "next_value": 1200, "delta": 300, "reason": "fit 4 drawers" },
    { "parameter": "height_mm", "previous_value": 760, "next_value": 820, "delta": 60, "reason": null },
    { "parameter": "shelf_count", "previous_value": 2, "next_value": 3, "delta": 1, "reason": null }
  ],
  "next_parameters": {
    "width_mm": 1200,
    "height_mm": 820,
    "depth_mm": 450,
    "shelf_count": 3,
    "door_style": "shaker",
    "back_panel": true
  },
  "warnings": [],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "0fb912de"
}
```

#### Tool: `apply_joinery`
```json
{
  "tool": "apply_joinery",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "operations": [
      {
        "id": "shelf_dado_1",
        "type": "dado",
        "primary_part_id": "side_left",
        "secondary_part_id": "shelf_1",
        "face": "interior",
        "length_mm": 450,
        "width_mm": 18,
        "depth_mm": 9,
        "offset_mm": 200
      },
      {
        "id": "shelf_dado_2",
        "type": "dado",
        "primary_part_id": "side_left",
        "secondary_part_id": "shelf_2",
        "face": "interior",
        "length_mm": 450,
        "width_mm": 18,
        "depth_mm": 9,
        "offset_mm": 420
      }
    ]
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "impacted_parts": ["side_left", "shelf_1", "shelf_2"],
  "operations": [
    {
      "operation_id": "joinery_shelf_dado_1",
      "type": "dado",
      "primary_part_id": "side_left",
      "secondary_part_id": "shelf_1",
      "removed_volume_mm3": 72900,
      "preview_svg_path": "artifacts/drawings/dado_shelf_1.svg",
      "features": [
        {
          "part_id": "side_left",
          "feature_type": "dado",
          "width_mm": 18,
          "depth_mm": 9,
          "length_mm": 450,
          "offset_mm": 200,
          "angle_deg": 90
        }
      ],
      "warnings": []
    }
  ],
  "summary": "Added 2 dados for shelves at 200 mm and 420 mm",
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "5d449a7b"
}
```

#### Tool: `extract_cutlist`
```json
{
  "tool": "extract_cutlist",
  "params": {
    "project_id": "proj_cabinet_7741",
    "revision_id": "rev_0003",
    "seed": 7741
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "rows": [
    {
      "part_id": "side_left",
      "name": "Side Left",
      "material": "Birch Ply 18mm",
      "thickness_mm": 18,
      "length_mm": 820,
      "width_mm": 450,
      "grain": "length",
      "quantity": 1
    },
    {
      "part_id": "deck",
      "name": "Deck",
      "material": "Birch Ply 18mm",
      "thickness_mm": 18,
      "length_mm": 1200,
      "width_mm": 450,
      "grain": "length",
      "quantity": 1
    }
  ],
  "totals": {
    "parts": 20,
    "material_totals": [
      { "material": "Birch Ply 18mm", "count": 20 }
    ]
  },
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "18dbb70e"
}
```

#### Tool: `nest_parts`
```json
{
  "tool": "nest_parts",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "kerf_mm": 3.2,
    "stock": [
      { "sheet_id": "sheet_2440x1220", "length_mm": 2440, "width_mm": 1220, "quantity": 3 }
    ],
    "parts": [
      { "part_id": "side_left", "length_mm": 820, "width_mm": 450, "quantity": 1 },
      { "part_id": "side_right", "length_mm": 820, "width_mm": 450, "quantity": 1 },
      { "part_id": "deck", "length_mm": 1200, "width_mm": 450, "quantity": 1 }
    ],
    "strategy": "skyline",
    "grain_rule": "strict"
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "strategy": "skyline",
  "layouts": [
    {
      "sheet_id": "sheet_2440x1220",
      "sheet_index": 0,
      "utilization": 0.78,
      "used_area_mm2": 2320000,
      "svg_path": "artifacts/nest/proj_cabinet_7741/sheet-0.svg",
      "placements": [
        { "part_id": "deck", "instance": 1, "x_mm": 12, "y_mm": 12, "length_mm": 1200, "width_mm": 450, "rotation_deg": 0 }
      ]
    }
  ],
  "offcuts": [
    {
      "sheet_id": "sheet_2440x1220",
      "area_mm2": 310000,
      "bounding_box_mm": { "length": 600, "width": 250 }
    }
  ],
  "utilization_summary": {
    "overall_utilization": 0.74,
    "total_parts_area_mm2": 1795200,
    "total_stock_area_mm2": 2430000
  },
  "not_placed": [],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "3b100b76"
}
```

#### Tool: `make_drawing`
```json
{
  "tool": "make_drawing",
  "params": {
    "project_id": "proj_cabinet_7741",
    "revision_id": "rev_0003",
    "seed": 7741,
    "views": ["front", "section", "exploded"],
    "include_dimensions": true,
    "explode": true
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "pdf_id": "artifacts/drawings/proj_cabinet_7741/full.pdf",
  "svg_id": "artifacts/drawings/proj_cabinet_7741/exploded.svg",
  "dxf_id": "artifacts/drawings/proj_cabinet_7741/section.dxf",
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "5a2a64d0"
}
```

##### Schema correction example
The first attempt used `"explode": "true"` (string) which returned `INVALID_INPUT`. The assistant corrected the payload to use the boolean literal.

#### Tool: `wood_movement_check`
```json
{
  "tool": "wood_movement_check",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "ambient": { "relative_humidity": 50, "temperature_c": 21 },
    "parts": [
      {
        "part_id": "door_left",
        "species": "Betula alleghaniensis",
        "grain_axis": "length",
        "nominal_mm": { "length": 720, "width": 380, "thickness": 18 }
      }
    ]
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "per_part": [
    {
      "part_id": "door_left",
      "species": "Betula alleghaniensis",
      "delta_length_mm": 0.4,
      "delta_width_mm": 0.2,
      "delta_thickness_mm": 0.05,
      "warning": null
    }
  ],
  "warnings": [],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "1a6218d3"
}
```

#### Tool: `clearance_check`
```json
{
  "tool": "clearance_check",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "assembly_id": "assy_main",
    "tool_radius": 3,
    "tolerance": 0.5
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "collisions": [],
  "min_radii": [
    { "part_id": "drawer_face_left", "radius_mm": 3.4 }
  ],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "af6b8c13"
}
```

#### Tool: `generate_toolpaths`
```json
{
  "tool": "generate_toolpaths",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "safe_z_mm": 5,
    "stock": {
      "length_mm": 1200,
      "width_mm": 600,
      "thickness_mm": 18,
      "origin": { "x_mm": 0, "y_mm": 0, "z_mm": 0 }
    },
    "operations": [
      {
        "type": "contour",
        "part_id": "door_left",
        "tool": { "diameter_mm": 6.35, "flutes": 2, "material": "carbide" },
        "tabs": { "count": 3, "width_mm": 8, "height_mm": 3 }
      }
    ]
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "revision_id": "rev_0003",
  "seed": 7741,
  "toolpaths": [
    {
      "toolpath_id": "tp_door_left",
      "operation_type": "contour",
      "operation_label": "Door Left",
      "estimated_runtime_sec": 182,
      "length_mm": 2460,
      "warnings": [],
      "segments": [
        { "mode": "rapid", "length_mm": 50, "duration_sec": 2.1 },
        { "mode": "plunge", "length_mm": 5, "feed_mm_per_min": 600 }
      ],
      "tool": { "diameter_mm": 6.35, "flutes": 2, "material": "carbide" }
    }
  ],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "d3016f47"
}
```

#### Consent Gate
Assistant pauses and requests: “Ready to post GRBL G-code. Reply with `CONSENT[postprocess]` to authorize writing to disk.”

User provides `CONSENT[postprocess]`.

#### Tool: `postprocess_grbl`
```json
{
  "tool": "postprocess_grbl",
  "params": {
    "project_id": "proj_cabinet_7741",
    "seed": 7741,
    "controller": "grbl",
    "confirm_write": true,
    "consent_token": "CONSENT[postprocess]",
    "destination": "artifacts/gcode",
    "program": {
      "program_id": "cabinet_rev0003",
      "total_length_mm": 2460,
      "total_runtime_sec": 182,
      "toolpaths": [
        {
          "toolpath_id": "tp_door_left",
          "operation_type": "contour",
          "operation_label": "Door Left",
          "length_mm": 2460,
          "estimated_runtime_sec": 182,
          "segments": [
            { "mode": "rapid", "length_mm": 50, "duration_sec": 2.1 },
            { "mode": "feed", "length_mm": 2400, "feed_mm_per_min": 1600 }
          ]
        }
      ]
    }
  }
}
```
```json
{
  "project_id": "proj_cabinet_7741",
  "controller": "grbl",
  "gcode_path": "artifacts/gcode/proj_cabinet_7741/cabinet_rev0003.nc",
  "line_count": 612,
  "bytes_written": 38214,
  "toolpath_stats": {
    "total_length_mm": 2460,
    "total_runtime_sec": 182
  },
  "warnings": [],
  "seed": 7741,
  "revision_id": "rev_0003",
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "87c38aaf"
}
```

### Verify
- Both safety checks returned without critical warnings.
- Nest utilization: 74 % overall, offcuts catalogued (`sheet_2440x1220` → 0.31 m²).
- Toolpath runtime 182 s, tabs confirmed; no collisions flagged in clearance check.
- Consent token consumed and acknowledged in postprocess response.

### Summarize
Example summary structure:
```
Seed 7741 · revision rev_0003 · engines occt 0.26.0 / nest 0.18.3 / cam 0.21.2 / wood 0.9.0 · inputs_hash 87c38aaf

Cabinet resized to 1200 × 820 × 450 mm with 3 shelves; dados cut for shelves. Generated cutlist (20 parts), skyline nests (74% utilization, sheet SVGs), and drawings (front/section/exploded). Wood movement + clearance checks clear. Toolpaths generated (tp_door_left, 182 s) and GRBL program written to artifacts/gcode/.../cabinet_rev0003.nc after explicit consent.

Outstanding: label printing optional; confirm dust collection setup before machining.
```

---

## Implementation Notes
- Use this as a content template when synthesizing ReAct few-shots. Keep inputs aligned with current JSON Schemas.
- Update artifact paths/hashes to match golden data once eval scenarios are locked.
