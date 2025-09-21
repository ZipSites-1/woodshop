# desktop-app — Task Checklist

## Scope
Qt/QML desktop app with chat-driven workflow, action cards for tool calls, OCCT viewer bridge, undo/redo, and offline mode.

## Definition of Done
- App connects to local MCP server and executes sample flows
- Viewer renders OCCT tessellation; artifacts previewable
- Undo/redo works across tool-driven edits
- Installer/package produced for target OS

## Tasks
- [ ] **Bootstrap**
  - [ ] `Main.qml` + theming + state store
  - [ ] JSON-RPC client for MCP (stdio/socket)
- [ ] **Chat**
  - [ ] Chat pane with tool-call chips
  - [ ] ReAct trace view (collapsed)
- [ ] **Action Cards**
  - [ ] Show inputs, outputs, durations, links to artifacts
  - [ ] Rollback (undo to revision)
- [ ] **Viewer**
  - [ ] OCCT bridge to render current revision
  - [ ] Selection highlights, measure tool
- [ ] **Offline-first**
  - [ ] Local artifact cache
  - [ ] Network fallback disabled in offline mode
- [ ] **Packaging**
  - [ ] macOS dmg / Windows installer / Linux AppImage

## Acceptance
- [ ] E2E demo: credenza-1200 flow works offline
- [ ] Artifacts open from action cards
