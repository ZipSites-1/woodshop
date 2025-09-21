import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fs } from "node:fs";

const { runCreateProject } = await import("../dist/tools/createProject.js");
const { runExtractCutlist } = await import("../dist/tools/extractCutlist.js");
const { runExportArtifacts } = await import("../dist/tools/exportArtifacts.js");
const { stableHash } = await import("../dist/util/stableHash.js");
const { resolveRepoPath, pathExists } = await import("../dist/util/fs.js");

await fs.rm(resolveRepoPath("artifacts/test"), { recursive: true, force: true });

test("create_project attaches deterministic provenance", async () => {
  const result = await runCreateProject({ units: "mm" });

  assert.equal(result.units, "mm");
  assert.equal(result.seed, 0);
  assert.match(result.project_id, /^proj_[a-f0-9]{12}$/);
  assert.ok(result.engine_versions.schemas);

  const expectedHash = stableHash({ units: "mm", seed: 0 });
  assert.equal(result.inputs_hash, expectedHash);
});

test("extract_cutlist aggregates material totals", async () => {
  const project = await runCreateProject({ units: "mm", seed: 7 });
  const result = await runExtractCutlist({ project_id: project.project_id, seed: 7 });

  assert.equal(result.project_id, project.project_id);
  const totalQuantity = result.rows.reduce((acc, row) => acc + row.quantity, 0);
  assert.equal(result.totals.parts, totalQuantity);
  const plywoodTotal = result.totals.material_totals.find((entry) => entry.material === "Birch Ply 18mm");
  assert.ok(plywoodTotal);
  assert.ok(plywoodTotal.count >= 4);
});

test("export_artifacts writes files relative to repo", async () => {
  const project = await runCreateProject({ units: "inch", seed: 5 });
  const destination = path.join("artifacts", "test");
  const result = await runExportArtifacts({
    project_id: project.project_id,
    format: "svg",
    destination,
  });

  assert.equal(result.format, "svg");
  assert.ok(result.bytes_written > 0);
  assert.match(result.artifact_path, /^artifacts\//);

  const absolutePath = resolveRepoPath(result.artifact_path);
  assert.equal(await pathExists(absolutePath), true);

  const data = await fs.readFile(absolutePath, "utf8");
  assert.match(data, /<svg/);
});

test("create_project rejects invalid payloads", async () => {
  await assert.rejects(
    () => runCreateProject({} ),
    (error) => {
      assert.equal(error.code, "INVALID_INPUT");
      assert.equal(error.message, "Request failed schema validation.");
      assert.ok(Array.isArray(error.details.issues));
      return true;
    },
  );
});

test("extract_cutlist requires project_id", async () => {
  await assert.rejects(
    () => runExtractCutlist({ seed: 1 }),
    (error) => {
      assert.equal(error.code, "INVALID_INPUT");
      assert.ok(Array.isArray(error.details.issues));
      return true;
    },
  );
});

test("export_artifacts validates format enum", async () => {
  const project = await runCreateProject({ units: "mm" });
  await assert.rejects(
    () =>
      runExportArtifacts({
        project_id: project.project_id,
        format: "jpg",
      }),
    (error) => {
      assert.equal(error.code, "INVALID_INPUT");
      assert.ok(Array.isArray(error.details.issues));
      return true;
    },
  );
});

test.after(async () => {
  await fs.rm(resolveRepoPath("artifacts/test"), { recursive: true, force: true });
});
