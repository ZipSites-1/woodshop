import { promises as fs } from "node:fs";
import path from "node:path";
import { repoRoot } from "./paths.js";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFileDeterministic(
  absolutePath: string,
  data: string | Uint8Array,
): Promise<void> {
  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, data);
}

export async function writeJsonFile(absolutePath: string, value: unknown): Promise<void> {
  const jsonText = `${JSON.stringify(value, null, 2)}\n`;
  await writeFileDeterministic(absolutePath, jsonText);
}

export function resolveRepoPath(...segments: string[]): string {
  return path.resolve(repoRoot, ...segments);
}

export async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
