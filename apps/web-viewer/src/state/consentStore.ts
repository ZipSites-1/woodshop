// Minimal in-memory consent token store used by the web viewer demo flows.

export type ConsentScope = "artifact.write" | "machine.post";

export interface ConsentToken {
  token: string;
  toolName: string;
  scope: ConsentScope;
  issuedAt: number;
}

let currentToken: ConsentToken | null = null;

function generateToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function issueConsentToken(scope: ConsentScope, toolName: string): ConsentToken {
  const entry: ConsentToken = {
    token: generateToken(),
    toolName,
    scope,
    issuedAt: Date.now(),
  };
  currentToken = entry;
  return entry;
}

export function getConsentToken(): ConsentToken | null {
  return currentToken;
}

export function setConsentToken(token: ConsentToken | null): void {
  currentToken = token;
}

export function clearConsentToken(): void {
  currentToken = null;
}
