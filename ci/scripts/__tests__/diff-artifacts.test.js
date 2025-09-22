const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const { diffArtifacts } = require("../diff-artifacts.js");

function captureLogger() {
  const entries = [];
  return {
    entries,
    logger: {
      info: (msg) => entries.push({ level: "info", msg }),
      warn: (msg) => entries.push({ level: "warn", msg }),
      error: (msg) => entries.push({ level: "error", msg }),
    },
  };
}

test("diffArtifacts highlights added, missing, and changed files", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "diff-artifacts-"));
  const referenceDir = path.join(tmpRoot, "reference");
  const candidateDir = path.join(tmpRoot, "candidate");
  await fs.mkdir(referenceDir, { recursive: true });
  await fs.mkdir(candidateDir, { recursive: true });

  await fs.writeFile(
    path.join(referenceDir, "foo.json"),
    `${JSON.stringify({ value: 1, nested: { count: 1 } }, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(candidateDir, "foo.json"),
    `${JSON.stringify({ value: 2, nested: { count: 1 } }, null, 2)}\n`,
    "utf8",
  );

  await fs.writeFile(path.join(referenceDir, "missing.txt"), "keep\n", "utf8");
  await fs.writeFile(path.join(candidateDir, "new.txt"), "new\n", "utf8");

  const { logger, entries } = captureLogger();
  const result = await diffArtifacts("reference", "candidate", { cwd: tmpRoot, logger });

  assert.equal(result.changed, 1);
  assert.equal(result.missing, 1);
  assert.equal(result.added, 1);
  assert.equal(result.total, 3);
  assert.equal(result.hasDifferences, true);

  assert.ok(entries.some((entry) => entry.level === "warn" && entry.msg.includes("CHANGED foo.json")));
  assert.ok(entries.some((entry) => entry.level === "warn" && entry.msg.includes("MISSING missing.txt")));
  assert.ok(entries.some((entry) => entry.level === "warn" && entry.msg.includes("NEW new.txt")));
});

