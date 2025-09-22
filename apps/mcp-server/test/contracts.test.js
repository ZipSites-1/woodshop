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
const REFERENCE_PATTERN = /^(?<tool>[a-z_]+)\.(?<role>input|output)(?:\.(?<variant>[a-z0-9_-]+))?\.json$/i;

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

const referenceDir = path.join(repoRoot, "artifacts", "reference");

async function collectReferenceFiles(currentDir, relativePrefix = "") {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const collected = [];
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    const relative = relativePrefix ? path.join(relativePrefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const nested = await collectReferenceFiles(absolute, relative);
      collected.push(...nested);
    } else if (entry.isFile()) {
      collected.push({ absolute, relative });
    }
  }
  return collected;
}

let referenceFiles = [];
try {
  referenceFiles = await collectReferenceFiles(referenceDir);
} catch (error) {
  if ((error && /** @type {{ code?: string }} */ (error).code) === "ENOENT") {
    throw new Error(
      `Reference artifacts not found at ${referenceDir}. Run the reference E2E generator before tests.`,
    );
  }
  throw error;
}

let referenceCaseCount = 0;
for (const file of referenceFiles) {
  if (!file.relative.endsWith(".json")) continue;
  const match = REFERENCE_PATTERN.exec(path.basename(file.relative));
  if (!match) continue;
  const { tool, role } = match.groups;
  const validator = getValidator(tool, role);
  const payload = JSON.parse(await fs.readFile(file.absolute, "utf8"));
  const caseLabel = `${file.relative}`;
  coverage.valid.add(`${tool}.${role}`);
  referenceCaseCount += 1;

  test(`reference artifact validates: ${caseLabel}`, () => {
    assert.doesNotThrow(() => validator.parse(payload));
  });
}

test("reference artifacts present", () => {
  assert.ok(referenceCaseCount > 0, "No reference artifact contracts were executed.");
});

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
