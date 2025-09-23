# Few-shot: Retrofit STEP Import

Illustrates ingesting an external STEP assembly, extracting metrics, mapping to Woodshop parameters, and regenerating artifacts with deterministic metadata.

## Context
- User drags in `assembly.step` (handle `file_step_001`).
- Goal: retrofit dowel joinery and refresh drawings.
- Units: millimeters (confirmed from STEP header).
- Deterministic seed: `4455`.

---

## Transcript Skeleton

### Plan
```
1. Inspect STEP via `analyze_geometry` to confirm bbox + metadata.
2. Ask user to confirm material + units if missing.
3. Convert geometry → parametric project with `import_geometry` (or dedicated tool) capturing part IDs.
4. Apply dowel joinery for face frames.
5. Regenerate cutlist + drawings; leave nesting/CAM optional.
6. Summarize geometry metrics, warnings, required follow-ups.
```

### Act

#### Tool: `analyze_geometry`
```json
{
  "tool": "analyze_geometry",
  "params": {
    "seed": 4455,
    "source": {
      "format": "step",
      "data": "file_step_001"
    },
    "include_primitives": true,
    "label": "imported_retrofit"
  }
}
```
```json
{
  "seed": 4455,
  "source_format": "step",
  "bounding_box": {
    "min": [0, 0, 0],
    "max": [1200, 600, 820]
  },
  "dimensions": {
    "width": 1200,
    "depth": 600,
    "height": 820
  },
  "triangle_count": 18432,
  "surface_area": 5.92,
  "revision_id": "rev_import_a1",
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "6139ccaf"
}
```

Assistant note: “STEP reports millimeter units; please confirm birch ply for carcass and maple for face frame.” Wait for user confirmation before continuing.

#### Tool: `import_geometry`
*(If using a dedicated import tool; adjust to actual tool name once implemented.)*
```json
{
  "tool": "import_geometry",
  "params": {
    "project_id": "proj_retrofit_4455",
    "seed": 4455,
    "file_id": "file_step_001",
    "infer_materials": false,
    "default_material": "Birch Ply 18mm",
    "map_layers": [
      { "layer": "FACE_FRAME", "material": "Maple Solid 22mm" }
    ]
  }
}
```
```json
{
  "project_id": "proj_retrofit_4455",
  "revision_id": "rev_import_a2",
  "seed": 4455,
  "parts": [
    { "source_id": "STEP:Body_1", "part_id": "carcass_left", "material": "Birch Ply 18mm" },
    { "source_id": "STEP:Body_7", "part_id": "face_frame_top", "material": "Maple Solid 22mm" }
  ],
  "warnings": [
    { "severity": "warning", "message": "Missing metadata for hardware features", "part_id": null }
  ],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "c7a11e8d"
}
```

Assistant: “Hardware metadata missing — please confirm we can ignore for now.”

#### Tool: `apply_joinery` (adding dowels)
```json
{
  "tool": "apply_joinery",
  "params": {
    "project_id": "proj_retrofit_4455",
    "seed": 4455,
    "operations": [
      {
        "id": "ff_dowel_left",
        "type": "dowel",
        "primary_part_id": "face_frame_left",
        "secondary_part_id": "carcass_left",
        "face": "interior",
        "length_mm": 50,
        "width_mm": 10,
        "depth_mm": 12,
        "offset_mm": 100,
        "fasteners": [
          { "type": "dowel", "diameter_mm": 8, "spacing_mm": 96 }
        ]
      }
    ]
  }
}
```
```json
{
  "project_id": "proj_retrofit_4455",
  "revision_id": "rev_import_a3",
  "seed": 4455,
  "operations": [
    {
      "operation_id": "joinery_ff_dowel_left",
      "type": "dowel",
      "primary_part_id": "face_frame_left",
      "secondary_part_id": "carcass_left",
      "removed_volume_mm3": 18850,
      "preview_svg_path": "artifacts/drawings/dowel_face_frame_left.svg",
      "warnings": []
    }
  ],
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "aa4ef1d0",
  "impacted_parts": ["face_frame_left", "carcass_left"],
  "summary": "Added 8mm dowels every 96 mm along face frame"
}
```

#### Tool: `extract_cutlist`
```json
{
  "tool": "extract_cutlist",
  "params": {
    "project_id": "proj_retrofit_4455",
    "revision_id": "rev_import_a3",
    "seed": 4455
  }
}
```
```json
{
  "project_id": "proj_retrofit_4455",
  "revision_id": "rev_import_a3",
  "seed": 4455,
  "rows": [
    { "part_id": "carcass_left", "name": "Carcass Left", "material": "Birch Ply 18mm", "length_mm": 820, "width_mm": 600, "thickness_mm": 18, "quantity": 1, "grain": "length" },
    { "part_id": "face_frame_top", "name": "Face Frame Top", "material": "Maple Solid 22mm", "length_mm": 1200, "width_mm": 70, "thickness_mm": 22, "quantity": 1, "grain": "length" }
  ],
  "totals": {
    "parts": 42,
    "material_totals": [
      { "material": "Birch Ply 18mm", "count": 34 },
      { "material": "Maple Solid 22mm", "count": 8 }
    ]
  },
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "f3a7c2be"
}
```

#### Tool: `make_drawing`
```json
{
  "tool": "make_drawing",
  "params": {
    "project_id": "proj_retrofit_4455",
    "revision_id": "rev_import_a3",
    "seed": 4455,
    "views": ["front", "explode", "section"],
    "include_dimensions": true,
    "explode": true
  }
}
```
```json
{
  "project_id": "proj_retrofit_4455",
  "revision_id": "rev_import_a3",
  "seed": 4455,
  "pdf_id": "artifacts/drawings/proj_retrofit_4455/retrofit.pdf",
  "svg_id": "artifacts/drawings/proj_retrofit_4455/exploded.svg",
  "dxf_id": "artifacts/drawings/proj_retrofit_4455/section.dxf",
  "engine_versions": { "occt": "0.26.0", "nest": "0.18.3", "cam": "0.21.2", "wood": "0.9.0", "schemas": "0.2.0" },
  "inputs_hash": "32e902f4"
}
```

### Verify
- Bounding box 1200 × 600 × 820 mm matches target; no unexpected scale issues.
- Joinery warnings empty; confirm face-frame dowels align with reference features.
- Cutlist totals: 34 ply parts, 8 maple parts. Highlight any parts missing material assignments (none in this trace).
- Drawings regenerated with exploded view; recommend running nesting + CAM if the user asks for manufacturing outputs.

### Summarize
```
Seed 4455 · revision rev_import_a3 · engines occt 0.26.0 / nest 0.18.3 / cam 0.21.2 / wood 0.9.0 · inputs_hash 32e902f4

Imported assembly.step (bbox 1200 × 600 × 820 mm). Assigned Birch Ply 18mm + Maple Solid 22mm materials, added 8 mm dowels between face frame and carcass. Generated updated cutlist (42 parts) and drawings (front/explode/section). No movement/clearance checks run yet — request if you want nests or CAM.
```

### Guidance
- Always pause when metadata is missing; obtain user confirmation before assuming materials/units.
- Ensure file references stay opaque (`file_step_001`), never inline STEP contents.
- Use the same seed when re-running artifacts so diffs remain stable.
