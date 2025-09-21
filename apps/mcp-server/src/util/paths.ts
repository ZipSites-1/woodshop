import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const appRoot = path.resolve(__dirname, "..", "..");
export const repoRoot = path.resolve(appRoot, "..", "..");
