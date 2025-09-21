#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCreateProject } from "../../apps/mcp-server/dist/tools/createProject.js";
import { runExtractCutlist } from "../../apps/mcp-server/dist/tools/extractCutlist.js";
import { promises as fs } from "node:fs";
import { runExportArtifacts } from "../../apps/mcp-server/dist/tools/exportArtifacts.js";
import { runNestParts } from "../../apps/mcp-server/dist/tools/nestParts.js";
import { runWoodMovementCheck } from "../../apps/mcp-server/dist/tools/woodMovement.js";
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

  const nestPartsInput = {
    project_id: project.project_id,
    seed: 0,
    strategy: "skyline",
    kerf_mm: 3,
    grain_rule: "strict",
    parts: cutlist.rows.map((row) => ({
      part_id: row.part_id,
      length_mm: row.length_mm,
      width_mm: row.width_mm,
      quantity: row.quantity,
      allow_rotation: false,
    })),
    stock: [
      { sheet_id: "2440x1220", length_mm: 2440, width_mm: 1220, quantity: 2 },
    ],
  };

  const nesting = await runNestParts(nestPartsInput);
  const nestSummaryPath = path.join(outputDir, "nest_summary.json");
  await writeJsonFile(nestSummaryPath, nesting);
  console.log(`nest_parts => ${path.relative(repoRoot, nestSummaryPath)} (util ${nesting.utilization_summary.overall_utilization})`);

  if (nesting.layouts.length > 0) {
    const firstLayout = nesting.layouts[0];
    const absoluteSvgPath = resolveRepoPath(firstLayout.svg_path);
    const targetSvgPath = path.join(outputDir, "layout.svg");
    await fs.copyFile(absoluteSvgPath, targetSvgPath);
  }

  const speciesMap = new Map([
    ["Birch Ply 18mm", "birch"],
    ["Solid Oak 20mm", "oak"],
    ["Backer Ply 6mm", "birch"],
  ]);

  const woodMovement = await runWoodMovementCheck({
    project_id: project.project_id,
    seed: 0,
    ambient: { relative_humidity: 55, temperature_c: 21 },
    parts: cutlist.rows.map((row) => ({
      part_id: row.part_id,
      species: speciesMap.get(row.material) ?? "birch",
      grain_axis: "length",
      nominal_mm: {
        length: row.length_mm,
        width: row.width_mm,
        thickness: row.thickness_mm,
      },
    })),
  });

  const woodReportPath = path.join(outputDir, "wood_movement_report.json");
  await writeJsonFile(woodReportPath, woodMovement);
  console.log(`wood_movement_check => ${path.relative(repoRoot, woodReportPath)}`);
}

main().catch((error) => {
  console.error("[e2e] demo run failed", error);
  process.exitCode = 1;
});
