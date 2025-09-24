# Desktop QML Components — Consent Flow Scaffolding

This README documents scaffolding artifacts added while planning the consent prompts & gates task.

## New Components
- `ConsentPrompt.qml` — modal overlay capturing user confirmation before executing destructive MCP tools. Wired to `AppController` via `confirm` / `cancel` signals.

## Integration Notes
- The prompt lives at the root of `Main.qml` so it can overlay chat/actions.
- `AppController.consentPromptVisible` toggles visibility; `AppController.consentPromptTool` supplies the risky tool name for copy.
- Consent tokens are generated client-side and cleared after the destructive call runs or is cancelled.
