import crypto from "node:crypto";

type Primitive = string | number | boolean | null;

function normalizeNumber(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
  return value.toString();
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value === "undefined") {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return normalizeNumber(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));
    return `[${items.join(",")}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, v]) => [key, stableStringify(v)] as const)
      .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : keyA > keyB ? 1 : 0));
    const serialized = entries.map(([key, val]) => `${JSON.stringify(key)}:${val}`).join(",");
    return `{${serialized}}`;
  }

  return JSON.stringify(value as Primitive);
}

export function stableHash(value: unknown): string {
  const canonical = stableStringify(value);
  return crypto.createHash("sha256").update(canonical).digest("hex");
}
