import { readFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { repoRoot } from "../util/paths.js";
import { stableHash } from "../util/stableHash.js";

export interface EngineVersions {
  occt: string;
  nest: string;
  cam: string;
  wood: string;
  schemas: string;
}

export interface ProvenanceFields {
  seed: number;
  engine_versions: EngineVersions;
  revision_id: string;
  inputs_hash: string;
}

export type WithProvenance<T extends Record<string, unknown>> = T & ProvenanceFields;

export interface ToolExecutionContext<I> {
  seed: number;
  inputsHash: string;
  engineVersions: EngineVersions;
  revisionId: string;
  input: I;
}

function readJsonFile(relativePath: string): Record<string, unknown> | null {
  try {
    const absolute = path.resolve(repoRoot, relativePath);
    const raw = readFileSync(absolute, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readVersion(relativePath: string): string {
  const json = readJsonFile(relativePath);
  const version = json?.version;
  return typeof version === "string" ? version : "0.0.0";
}

function resolveRevisionId(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const schemaVersion = readVersion("packages/schemas/package.json");
const revisionId = resolveRevisionId();

export const engineVersions: EngineVersions = Object.freeze({
  occt: "0.0.0",
  nest: "0.0.0",
  cam: "0.0.0",
  wood: "0.0.0",
  schemas: schemaVersion,
});

export function buildProvenanceContext<I extends { seed?: number }>(input: I): ToolExecutionContext<I> {
  const seed = typeof input.seed === "number" && Number.isFinite(input.seed) ? input.seed : 0;
  const inputsHash = stableHash(input);
  return {
    seed,
    inputsHash,
    engineVersions,
    revisionId,
    input,
  };
}

export function attachProvenance<T extends Record<string, unknown>, I>(
  result: T,
  context: ToolExecutionContext<I>,
): WithProvenance<T> {
  return {
    ...result,
    seed: context.seed,
    engine_versions: context.engineVersions,
    revision_id: context.revisionId,
    inputs_hash: context.inputsHash,
  };
}
