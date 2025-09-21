# Errors, Logging & Telemetry

## Errors
- Structured `{ code, message, details }`. Do not leak internals.
- Map engine errors to stable MCP error codes.

## Logging
- Levelled logs: `error`, `warn`, `info`, `debug`.
- Always log: tool name, duration, inputs hash, revision id.
- No PII by default. Enable verbose logs via env flags.

## Telemetry (optional)
- Anonymous metrics only; document opt-in/opt-out.
- Respect `DO_NOT_TRACK` signals.
