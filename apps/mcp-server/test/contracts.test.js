import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { toolSchemas } from "@woodshop/schemas";

const { buildObjectSchema } = await import("../dist/middleware/validation.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const examplesDir = path.join(repoRoot, "packages", "schemas", "examples");
const EXAMPLE_PATTERN = /^(?<tool>[a-z_]+)\.(?<role>input|output)\.(?<kind>valid|invalid)(?:\.(?<variant>[a-z0-9_]+))?\.json$/i;

function compileSchema(toolName, role) {
  const toolEntry = toolSchemas[toolName];
  assert.ok(toolEntry, `Unknown tool '${toolName}' in schema examples.`);
  const schema = toolEntry[role];
  assert.ok(schema, `Missing schema for ${toolName}.${role}.`);
  return buildObjectSchema(schema);
}

const validators = new Map();
function getValidator(toolName, role) {
  const key = `${toolName}:${role}`;
  if (!validators.has(key)) {
    validators.set(key, compileSchema(toolName, role));
  }
  return validators.get(key);
}

const coverage = {
  valid: new Set(),
  invalid: new Set(),
};

const files = await fs.readdir(examplesDir);

for (const file of files) {
  if (!file.endsWith(".json")) continue;
  const match = EXAMPLE_PATTERN.exec(file);
  assert.ok(match, `Unexpected schema example filename: ${file}`);
  const { tool, role, kind } = match.groups;
  const validator = getValidator(tool, role);
  const payload = JSON.parse(await fs.readFile(path.join(examplesDir, file), "utf8"));
  const caseLabel = `${tool}.${role}.${kind}`;
  coverage[kind].add(`${tool}.${role}`);

  if (kind === "valid") {
    test(`schema example passes: ${caseLabel}`, () => {
      assert.doesNotThrow(() => validator.parse(payload));
    });
  } else {
    test(`schema example fails: ${caseLabel} (${file})`, () => {
      assert.throws(() => validator.parse(payload));
    });
  }
}

test("every tool role has a valid example", () => {
  for (const [toolName, pair] of Object.entries(toolSchemas)) {
    for (const role of ["input", "output"]) {
      assert.ok(
        coverage.valid.has(`${toolName}.${role}`),
        `Missing valid example for ${toolName}.${role}.`,
      );
      assert.ok(
        coverage.invalid.has(`${toolName}.${role}`),
        `Missing invalid example for ${toolName}.${role}.`,
      );
      assert.ok(pair[role], `Missing schema entry for ${toolName}.${role}.`);
    }
  }
});
