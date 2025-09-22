#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import process from "node:process";

import { runCreateProject } from "../../apps/mcp-server/dist/tools/createProject.js";
import { runExtractCutlist } from "../../apps/mcp-server/dist/tools/extractCutlist.js";
import { runExportArtifacts } from "../../apps/mcp-server/dist/tools/exportArtifacts.js";
import { runNestParts } from "../../apps/mcp-server/dist/tools/nestParts.js";
import { runWoodMovementCheck } from "../../apps/mcp-server/dist/tools/woodMovement.js";
import { runGenerateToolpaths } from "../../apps/mcp-server/dist/tools/generateToolpaths.js";
import { runPostprocessGrbl } from "../../apps/mcp-server/dist/tools/postprocessGrbl.js";
import { runMakeDrawing } from "../../apps/mcp-server/dist/tools/makeDrawing.js";
import { runParamUpdate } from "../../apps/mcp-server/dist/tools/paramUpdate.js";
import { runApplyJoinery } from "../../apps/mcp-server/dist/tools/applyJoinery.js";
import { runAnalyzeGeometry } from "../../apps/mcp-server/dist/tools/analyzeGeometry.js";
import {
  ensureDir,
  writeJsonFile,
  resolveRepoPath,
  pathExists,
} from "../../apps/mcp-server/dist/util/fs.js";
import { repoRoot } from "../../apps/mcp-server/dist/util/paths.js";

const STAGING_ROOT = "artifacts/_e2e";

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function resolveRelativeTarget(target) {
  const candidate = path.resolve(repoRoot, target);
  const relative = path.relative(repoRoot, candidate);
  if (relative.startsWith("..")) {
    throw new Error(`Target path must remain inside the repo. Received: ${target}`);
  }
  return toPosixPath(relative);
}

async function resetDirectory(relative) {
  const absolute = resolveRepoPath(relative);
  await fs.rm(absolute, { recursive: true, force: true });
  await ensureDir(absolute);
}

function caseFileName(tool, role, variant) {
  if (!variant) return `${tool}.${role}.json`;
  const safeVariant = variant.replace(/[^a-z0-9_-]+/gi, "-");
  return `${tool}.${role}.${safeVariant}.json`;
}

async function recordContractCase(projectBaseRelative, tool, input, output, variant) {
  const contractsDir = path.posix.join(projectBaseRelative, "contracts");
  const inputFile = path.posix.join(contractsDir, caseFileName(tool, "input", variant));
  const outputFile = path.posix.join(contractsDir, caseFileName(tool, "output", variant));
  await writeJsonFile(resolveRepoPath(inputFile), input);
  await writeJsonFile(resolveRepoPath(outputFile), output);
}

async function copyArtifact(sourceRelative, targetRelative) {
  const normalizedSource = toPosixPath(sourceRelative);
  const normalizedTarget = toPosixPath(targetRelative);
  if (normalizedSource === normalizedTarget) {
    return;
  }
  const sourceAbsolute = resolveRepoPath(normalizedSource);
  const targetAbsolute = resolveRepoPath(normalizedTarget);
  await ensureDir(path.dirname(targetAbsolute));
  await fs.copyFile(sourceAbsolute, targetAbsolute);
}

async function removeIfExists(relative) {
  const absolute = resolveRepoPath(relative);
  await fs.rm(absolute, { recursive: true, force: true });
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildNestPartsInput(projectId, seed, cutlist, stockOverrides) {
  const parts = cutlist.rows.slice(0, 8).map((row) => ({
    part_id: row.part_id,
    length_mm: row.length_mm,
    width_mm: row.width_mm,
    quantity: row.quantity,
    allow_rotation: false,
  }));
  const stock = stockOverrides ?? [
    { sheet_id: "2440x1220", length_mm: 2440, width_mm: 1220, quantity: 2 },
    { sheet_id: "1820x910", length_mm: 1820, width_mm: 910, quantity: 1 },
  ];
  return {
    project_id: projectId,
    seed,
    strategy: "skyline",
    kerf_mm: 2,
    grain_rule: "strict",
    parts,
    stock,
  };
}

function buildWoodMovementInput(projectId, seed, cutlist) {
  const parts = cutlist.rows.slice(0, 6).map((row, index) => ({
    part_id: row.part_id,
    species: index % 2 === 0 ? "birch" : "oak",
    grain_axis: index % 3 === 0 ? "length" : "width",
    nominal_mm: {
      length: row.length_mm,
      width: row.width_mm,
      thickness: row.thickness_mm,
    },
  }));
  return {
    project_id: projectId,
    seed,
    ambient: { relative_humidity: 55, temperature_c: 21 },
    parts,
  };
}

function buildToolpathInput(projectId, seed) {
  return {
    project_id: projectId,
    seed,
    stock: {
      length_mm: 1200,
      width_mm: 600,
      thickness_mm: 18,
      origin: { x_mm: 0, y_mm: 0, z_mm: 0 },
    },
    safe_z_mm: 6,
    operations: [
      {
        type: "contour",
        name: "profile",
        tool: { type: "end_mill", diameter_mm: 6, flutes: 3, identifier: "EM6" },
        feed_mm_per_min: 1800,
        plunge_mm_per_min: 600,
        depth_mm: 18,
        stepdown_mm: 6,
        offset_strategy: "outside",
        path: [
          { x_mm: 0, y_mm: 0 },
          { x_mm: 500, y_mm: 0 },
          { x_mm: 500, y_mm: 300 },
          { x_mm: 0, y_mm: 300 },
          { x_mm: 0, y_mm: 0 },
        ],
      },
      {
        type: "drill",
        name: "dowels",
        tool: { type: "drill", diameter_mm: 5, flutes: 2, identifier: "DR5" },
        feed_mm_per_min: 480,
        cycle: "peck",
        holes: [
          { x_mm: 50, y_mm: 50, depth_mm: 12, dwell_ms: 150 },
          { x_mm: 250, y_mm: 50, depth_mm: 12 },
          { x_mm: 450, y_mm: 50, depth_mm: 12 },
        ],
      },
    ],
  };
}

function buildParamUpdateInput(projectId) {
  return {
    project_id: projectId,
    seed: 4,
    current: {
      width_mm: 1200,
      height_mm: 2000,
      depth_mm: 450,
      shelf_count: 4,
      door_style: "slab",
      back_panel: true,
    },
    changes: [
      { parameter: "width_mm", value: 1350, reason: "Fit alcove" },
      { parameter: "shelf_count", value: 6 },
      { parameter: "door_style", value: "shutter" },
    ],
    constraints: {
      width_mm: { min: 900, max: 1500 },
      shelf_count: { min: 2, max: 8 },
    },
  };
}

function buildJoineryInput(projectId) {
  const part = (suffix) => `${projectId}::${suffix}`;
  return {
    project_id: projectId,
    seed: 3,
    operations: [
      {
        type: "dado",
        primary_part_id: part("side_left"),
        secondary_part_id: part("shelf_mid"),
        face: "interior",
        offset_mm: 120,
        length_mm: 500,
        width_mm: 19,
        depth_mm: 6,
        angle_deg: null,
      },
      {
        type: "mortise",
        primary_part_id: part("leg_front"),
        secondary_part_id: part("apron_front"),
        face: "interior",
        offset_mm: 80,
        length_mm: 60,
        width_mm: 12,
        depth_mm: 18,
        angle_deg: null,
        fasteners: [
          { type: "dowel", diameter_mm: 8, spacing_mm: 64 },
        ],
      },
    ],
    notes: "Reference joinery setup",
  };
}

async function generateCabinetProject(baseRelative) {
  const projectDir = path.posix.join(baseRelative, "cabinet-20parts");
  await ensureDir(resolveRepoPath(projectDir));

  const createInput = { units: "mm", seed: 44, template: "cabinet_20" };
  const createOutput = await runCreateProject(createInput);
  await recordContractCase(projectDir, "create_project", deepClone(createInput), deepClone(createOutput));

  const cutlistInput = { project_id: createOutput.project_id, seed: 44 };
  const cutlistOutput = await runExtractCutlist(cutlistInput);
  await recordContractCase(projectDir, "extract_cutlist", deepClone(cutlistInput), deepClone(cutlistOutput));

  const projectSlug = path.posix.relative(baseRelative, projectDir);
  const exportFormats = ["pdf", "dxf", "svg"];
  for (const format of exportFormats) {
    const stagingDestination = path.posix.join(STAGING_ROOT, projectSlug, "export", format);
    const exportInput = {
      project_id: createOutput.project_id,
      seed: 12,
      format,
      destination: stagingDestination,
    };
    const exportOutput = await runExportArtifacts(exportInput);
    const stagedPath = exportOutput.artifact_path;
    const targetArtifact = path.posix.join(
      projectDir,
      "files",
      "export_artifacts",
      format,
      path.basename(stagedPath),
    );
    await copyArtifact(stagedPath, targetArtifact);
    await removeIfExists(stagedPath);

    const sanitizedInput = {
      ...deepClone(exportInput),
      destination: path.posix.join(projectSlug, "files", "export_artifacts", format),
    };
    const sanitizedOutput = {
      ...deepClone(exportOutput),
      artifact_path: path.posix.join(
        projectSlug,
        "files",
        "export_artifacts",
        format,
        path.basename(stagedPath),
      ),
    };
    await recordContractCase(projectDir, "export_artifacts", sanitizedInput, sanitizedOutput, format);
  }

  const nestSeed = 2;
  const nestInput = buildNestPartsInput(createOutput.project_id, nestSeed, cutlistOutput);
  const nestOutput = await runNestParts(nestInput);
  const sanitizedNestOutput = deepClone(nestOutput);
  sanitizedNestOutput.layouts = sanitizedNestOutput.layouts.map((layout) => ({
    ...layout,
    svg_path: path.posix.join(projectSlug, "files", "nest", path.basename(layout.svg_path)),
  }));
  await recordContractCase(projectDir, "nest_parts", deepClone(nestInput), sanitizedNestOutput, `seed${nestSeed}`);
  for (const layout of nestOutput.layouts) {
    const target = path.posix.join(projectDir, "files", "nest", path.basename(layout.svg_path));
    await copyArtifact(layout.svg_path, target);
    await removeIfExists(layout.svg_path);
  }

  const woodSeed = 9;
  const woodInput = buildWoodMovementInput(createOutput.project_id, woodSeed, cutlistOutput);
  const woodOutput = await runWoodMovementCheck(woodInput);
  await recordContractCase(projectDir, "wood_movement_check", deepClone(woodInput), deepClone(woodOutput), `seed${woodSeed}`);

  const toolpathSeed = 7;
  const toolpathInput = buildToolpathInput(createOutput.project_id, toolpathSeed);
  const toolpathOutput = await runGenerateToolpaths(toolpathInput);
  const sanitizedToolpathOutput = {
    ...deepClone(toolpathOutput),
    program_path: path.posix.join(
      projectSlug,
      "files",
      "toolpaths",
      path.basename(toolpathOutput.program_path),
    ),
    preview_path: path.posix.join(
      projectSlug,
      "files",
      "toolpaths",
      path.basename(toolpathOutput.preview_path),
    ),
  };
  await recordContractCase(
    projectDir,
    "generate_toolpaths",
    deepClone(toolpathInput),
    sanitizedToolpathOutput,
    `seed${toolpathSeed}`,
  );

  const programStaging = toolpathOutput.program_path;
  const previewStaging = toolpathOutput.preview_path;
  const programTarget = path.posix.join(projectDir, "files", "toolpaths", path.basename(programStaging));
  await copyArtifact(programStaging, programTarget);
  const previewTarget = path.posix.join(projectDir, "files", "toolpaths", path.basename(previewStaging));
  await copyArtifact(previewStaging, previewTarget);

  const postprocessInput = {
    project_id: createOutput.project_id,
    seed: 5,
    controller: "grbl",
    program_path: programStaging,
    confirm_write: true,
  };
  const postprocessOutput = await runPostprocessGrbl(postprocessInput);
  const sanitizedPostprocessInput = {
    ...deepClone(postprocessInput),
    program_path: path.posix.join(
      projectSlug,
      "files",
      "toolpaths",
      path.basename(programTarget),
    ),
  };
  const sanitizedPostprocessOutput = {
    ...deepClone(postprocessOutput),
    gcode_path: path.posix.join(
      projectSlug,
      "files",
      "gcode",
      path.basename(postprocessOutput.gcode_path),
    ),
  };
  await recordContractCase(
    projectDir,
    "postprocess_grbl",
    sanitizedPostprocessInput,
    sanitizedPostprocessOutput,
  );

  const gcodeTarget = path.posix.join(projectDir, "files", "gcode", path.basename(postprocessOutput.gcode_path));
  await copyArtifact(postprocessOutput.gcode_path, gcodeTarget);
  await removeIfExists(postprocessOutput.gcode_path);
  await removeIfExists(programStaging);
  await removeIfExists(previewStaging);

  const drawingInput = {
    project_id: createOutput.project_id,
    seed: 6,
    views: ["iso", "front", "right"],
    include_dimensions: true,
    explode: false,
    sheet_size: { width_mm: 594, height_mm: 420 },
    title: "Cabinet Reference",
  };
  const drawingOutput = await runMakeDrawing(drawingInput);
  const sanitizedDrawingOutput = {
    ...deepClone(drawingOutput),
    drawing_path: path.posix.join(
      projectSlug,
      "files",
      "drawings",
      path.basename(drawingOutput.drawing_path),
    ),
  };
  await recordContractCase(projectDir, "make_drawing", deepClone(drawingInput), sanitizedDrawingOutput);
  const drawingTarget = path.posix.join(projectDir, "files", "drawings", path.basename(drawingOutput.drawing_path));
  await copyArtifact(drawingOutput.drawing_path, drawingTarget);
  await removeIfExists(drawingOutput.drawing_path);

  const paramInput = buildParamUpdateInput(createOutput.project_id);
  const paramOutput = await runParamUpdate(paramInput);
  await recordContractCase(projectDir, "param_update", deepClone(paramInput), deepClone(paramOutput));

  const joineryInput = buildJoineryInput(createOutput.project_id);
  const joineryOutput = await runApplyJoinery(joineryInput);
  const sanitizedJoineryOutput = deepClone(joineryOutput);
  sanitizedJoineryOutput.operations = sanitizedJoineryOutput.operations.map((operation) => ({
    ...operation,
    preview_svg_path: operation.preview_svg_path
      ? path.posix.join(
          projectSlug,
          "files",
          "joinery",
          path.basename(operation.preview_svg_path),
        )
      : operation.preview_svg_path,
  }));
  await recordContractCase(projectDir, "apply_joinery", deepClone(joineryInput), sanitizedJoineryOutput);
  for (const operation of joineryOutput.operations) {
    if (!operation.preview_svg_path) continue;
    const previewTargetPath = path.posix.join(projectDir, "files", "joinery", path.basename(operation.preview_svg_path));
    await copyArtifact(operation.preview_svg_path, previewTargetPath);
    await removeIfExists(operation.preview_svg_path);
  }

  const geometryStep = [
    "WOODSHOP_STEP 1.1",
    "NAME reference_panel",
    "VERTICES 4",
    "0 0 0",
    "1 0 0",
    "1 1 0",
    "0 1 0",
    "INDICES 2",
    "0 1 2",
    "0 2 3",
    "",
  ].join("\n");
  const analyzeInput = {
    source: { format: "step", data: geometryStep },
    label: "reference_panel",
  };
  const analyzeOutput = await runAnalyzeGeometry(analyzeInput);
  await recordContractCase(projectDir, "analyze_geometry", deepClone(analyzeInput), deepClone(analyzeOutput), "step");

  const geometryDir = path.posix.join(projectDir, "files", "geometry");
  await ensureDir(resolveRepoPath(geometryDir));
  await writeJsonFile(
    resolveRepoPath(path.posix.join(geometryDir, "reference_panel.json")),
    {
      source: "step",
      payload: geometryStep,
      metrics: analyzeOutput,
    },
  );
}

async function generateDrawerProject(baseRelative) {
  const projectDir = path.posix.join(baseRelative, "drawer-imperial");
  await ensureDir(resolveRepoPath(projectDir));
  const projectSlug = path.posix.relative(baseRelative, projectDir);

  const createInput = { units: "inch", seed: 5, template: "shop_drawer" };
  const createOutput = await runCreateProject(createInput);
  await recordContractCase(projectDir, "create_project", deepClone(createInput), deepClone(createOutput));

  const cutlistInput = { project_id: createOutput.project_id, seed: 5 };
  const cutlistOutput = await runExtractCutlist(cutlistInput);
  await recordContractCase(projectDir, "extract_cutlist", deepClone(cutlistInput), deepClone(cutlistOutput));

  const woodInput = buildWoodMovementInput(createOutput.project_id, 4, cutlistOutput);
  const woodOutput = await runWoodMovementCheck(woodInput);
  await recordContractCase(projectDir, "wood_movement_check", deepClone(woodInput), deepClone(woodOutput), "seed4");

  const exportInput = {
    project_id: createOutput.project_id,
    seed: 8,
    format: "svg",
    destination: path.posix.join(STAGING_ROOT, projectSlug, "export", "svg"),
  };
  const exportOutput = await runExportArtifacts(exportInput);
  const stagedPath = exportOutput.artifact_path;
  const exportTarget = path.posix.join(
    projectDir,
    "files",
    "export_artifacts",
    "svg",
    path.basename(stagedPath),
  );
  await copyArtifact(stagedPath, exportTarget);
  await removeIfExists(stagedPath);

  const sanitizedExportInput = {
    ...deepClone(exportInput),
    destination: path.posix.join(projectSlug, "files", "export_artifacts", "svg"),
  };
  const sanitizedExportOutput = {
    ...deepClone(exportOutput),
    artifact_path: path.posix.join(
      projectSlug,
      "files",
      "export_artifacts",
      "svg",
      path.basename(stagedPath),
    ),
  };
  await recordContractCase(projectDir, "export_artifacts", sanitizedExportInput, sanitizedExportOutput, "svg");
}

async function main() {
  const targetArg = process.argv[2] ?? "artifacts/current";
  const targetRelative = resolveRelativeTarget(targetArg);
  await resetDirectory(targetRelative);

  await generateCabinetProject(targetRelative);
  await generateDrawerProject(targetRelative);

  const targetAbsolute = resolveRepoPath(targetRelative);
  const exists = await pathExists(targetAbsolute);
  if (!exists) {
    throw new Error(`Failed to write artifacts to ${targetRelative}`);
  }

  await removeIfExists(STAGING_ROOT);

  process.stdout.write(`Artifacts generated at ${targetRelative}\n`);
}

main().catch((error) => {
  process.stderr.write(`[e2e] Failed to generate artifacts: ${error.message}\n`);
  process.exitCode = 1;
});
