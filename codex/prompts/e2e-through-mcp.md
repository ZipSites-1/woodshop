# Prompt — E2E via MCP

Use the local MCP server to generate production artifacts.

**Run**
1) `create_project(units:"mm")`
2) Apply parameters/joinery as requested
3) `extract_cutlist` → attach table
4) `nest_parts(seed:0)` → utilization + SVG
5) `make_drawing(views:["iso","front"], dims:true)` → PDF
6) Optional: `generate_toolpaths` → `postprocess("grbl")` → attach `.nc`

**Return**
- Artifacts
- Provenance: seed, engine versions, revision id
- Warnings: wood-movement/clearances
