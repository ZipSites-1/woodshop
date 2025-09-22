interface LogPayload extends Record<string, unknown> {
  level: "info" | "error";
  event: string;
  timestamp: string;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function logEvent(event: string, payload: Record<string, unknown>, level: "info" | "error" = "info"): void {
  const entry: LogPayload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitizePayload(payload),
  };
  try {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(entry));
  } catch {
    // Swallow logging errors to avoid impacting tool execution.
  }
}
