# Web Viewer Components — Consent Flow Scaffolding

During the AI Assisted Development planning cycle we introduced placeholders to support upcoming consent gating work.

## Components
- `ConsentDialog.tsx` — modal shell prompting users before destructive MCP actions. Emits `onConfirm` / `onCancel` callbacks.

## Integration Notes
- `ArtifactPanel.tsx` demonstrates how to gate operations: check `getConsentToken()` first, open `ConsentDialog` when missing, and call `issueConsentToken` to mint a scoped token.
- Always call `clearConsentToken()` after completing the destructive action so follow-up requests require a fresh prompt.
