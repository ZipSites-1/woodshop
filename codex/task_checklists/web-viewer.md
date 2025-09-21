# web-viewer — Task Checklist

## Scope
Browser viewer (WASM) that renders OCCT tessellation, previews artifacts (PDF/SVG/DXF), and can call MCP (optional).

## Definition of Done
- Loads OCCT WASM bundle without console errors
- Renders reference model under 2s on mid-tier hardware
- Displays artifact lists and previews (SVG/PDF)
- Optional: calls MCP endpoints from browser with auth

## Tasks
- [ ] Build pipeline for occt-wasm artifacts
- [ ] ViewerCanvas: load model buffers and render
- [ ] ArtifactPanel: list + open artifacts via signed URLs
- [ ] MCP client: minimal JSON-RPC calls (if enabled)
- [ ] Performance budget & lazy loading

## Acceptance
- [ ] Demo loads, renders, and previews reference artifacts
- [ ] Lighthouse perf budget met
