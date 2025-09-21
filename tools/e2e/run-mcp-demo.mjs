#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCreateProject } from "../../apps/mcp-server/dist/tools/createProject.js";
import { runExtractCutlist } from "../../apps/mcp-server/dist/tools/extractCutlist.js";
import { runExportArtifacts } from "../../apps/mcp-server/dist/tools/exportArtifacts.js";
import { resolveRepoPath, writeJsonFile, ensureDir } from "../../apps/mcp-server/dist/util/fs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

async function main() {
  const outputDir = resolveRepoPath("artifacts/demo");
  await ensureDir(outputDir);

  const project = await runCreateProject({ units: "mm", seed: 42 });
  const cutlist = await runExtractCutlist({
    project_id: project.project_id,
    seed: 42,
  });

  const cutlistPath = path.join(outputDir, "cutlist.json");
  await writeJsonFile(cutlistPath, {
    project_id: cutlist.project_id,
    rows: cutlist.rows,
    totals: cutlist.totals,
    provenance: {
      seed: cutlist.seed,
      engine_versions: cutlist.engine_versions,
      revision_id: cutlist.revision_id,
      inputs_hash: cutlist.inputs_hash,
    },
  });

  const exportFormats = ["pdf", "dxf", "svg"];
  const exportResults = [];
  for (const format of exportFormats) {
    const result = await runExportArtifacts({
      project_id: project.project_id,
      format,
      destination: path.join("artifacts", "demo"),
      revision_id: cutlist.revision_id,
      seed: project.seed,
    });
    exportResults.push(result);
  }

  for (const result of exportResults) {
    console.log(`export_artifacts => ${result.artifact_path} (${result.bytes_written} bytes)`);
  }
  console.log(`cutlist => ${path.relative(repoRoot, cutlistPath)}`);
}

main().catch((error) => {
  console.error("[e2e] demo run failed", error);
  process.exitCode = 1;
});
