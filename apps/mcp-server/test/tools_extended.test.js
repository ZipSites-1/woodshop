import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fs } from "node:fs";

const {
  runParamUpdate,
} = await import("../dist/tools/paramUpdate.js");
const {
  runApplyJoinery,
} = await import("../dist/tools/applyJoinery.js");
const {
  runAnalyzeGeometry,
} = await import("../dist/tools/analyzeGeometry.js");
const {
  runMakeDrawing,
} = await import("../dist/tools/makeDrawing.js");
const {
  runGenerateToolpaths,
} = await import("../dist/tools/generateToolpaths.js");
const {
  runPostprocessGrbl,
} = await import("../dist/tools/postprocessGrbl.js");
const { resolveRepoPath, pathExists } = await import("../dist/util/fs.js");
const { getRegistryManifest } = await import("../dist/registry.js");

async function removeIfExists(relativePath) {
  const absolute = resolveRepoPath(relativePath);
  await fs.rm(absolute, { recursive: true, force: true });
}

test("param_update applies changes within constraints", async () => {
  const result = await runParamUpdate({
    project_id: "proj_param_demo",
    current: {
      width_mm: 1200,
      height_mm: 2000,
      depth_mm: 450,
      shelf_count: 4,
      door_style: "slab",
      back_panel: true,
    },
    changes: [
      { parameter: "width_mm", value: 1400, reason: "Fit niche" },
      { parameter: "door_style", value: "shaker" },
      { parameter: "door_style", value: "barn" },
    ],
    constraints: {
      width_mm: { min: 900, max: 1500 },
    },
  });

  assert.equal(result.project_id, "proj_param_demo");
  assert.equal(result.applied.length, 2);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].code, "INVALID_ENUM");
  assert.ok(result.revision_tag.startsWith("rev_"));
  assert.ok(result.next_parameters.width_mm === 1400);
  assert.ok(Array.isArray(result.warnings));
});

test("apply_joinery produces previews and impacted parts", async () => {
  const relativeDir = path.join("artifacts", "joinery", "proj_joinery_demo");
  await removeIfExists(relativeDir);

  const result = await runApplyJoinery({
    project_id: "proj_joinery_demo",
    operations: [
      {
        type: "dado",
        primary_part_id: "proj_joinery_demo::side_left",
        secondary_part_id: "proj_joinery_demo::shelf",
        face: "interior",
        offset_mm: 120,
        length_mm: 500,
        width_mm: 19,
        depth_mm: 6,
      },
    ],
  });

  assert.equal(result.operations.length, 1);
  const operation = result.operations[0];
  assert.ok(operation.preview_svg_path.endsWith(".svg"));
  const previewAbsolute = resolveRepoPath(operation.preview_svg_path);
  assert.equal(await pathExists(previewAbsolute), true);
  assert.ok(result.impacted_parts.length >= 1);
});

test("analyze_geometry derives mesh metrics", async () => {
  const stepPayload = [
    "WOODSHOP_STEP 1.1",
    "NAME unit_triangle",
    "VERTICES 3",
    "0 0 0",
    "1 0 0",
    "0 1 0",
    "INDICES 1",
    "0 1 2",
    "",
  ].join("\n");

  const result = await runAnalyzeGeometry({
    source: { format: "step", data: stepPayload },
    label: "unit",
  });

  assert.equal(result.source_format, "step");
  assert.equal(result.label, "unit");
  assert.equal(result.vertex_count, 3);
  assert.equal(result.triangle_count, 1);
  assert.ok(result.surface_area > 0.49 && result.surface_area < 0.51);
  assert.deepEqual(result.bounding_box.min, [0, 0, 0]);
  assert.deepEqual(result.bounding_box.max, [1, 1, 0]);
  assert.equal(result.dimensions.width, 1);
  assert.equal(result.dimensions.depth, 1);
  assert.equal(result.dimensions.height, 0);
});

test("make_drawing writes pdf with requested views", async () => {
  const relativeDir = path.join("artifacts", "drawings", "proj_drawing_demo");
  await removeIfExists(relativeDir);

  const result = await runMakeDrawing({
    project_id: "proj_drawing_demo",
    views: ["iso", "front", "right"],
    include_dimensions: true,
    explode: false,
    sheet_size: { width_mm: 594, height_mm: 420 },
    title: "Demo Cabinet",
  });

  assert.ok(result.drawing_path.endsWith(".pdf"));
  assert.ok(result.bytes_written > 0);
  assert.equal(typeof result.seed, "number");
  assert.ok(result.engine_versions.schemas);
  const absolute = resolveRepoPath(result.drawing_path);
  assert.equal(await pathExists(absolute), true);
});

test("generate_toolpaths produces program and preview files", async () => {
  const baseDir = path.join("artifacts", "toolpaths", "proj_toolpaths_demo");
  await removeIfExists(baseDir);

  const result = await runGenerateToolpaths({
    project_id: "proj_toolpaths_demo",
    seed: 2,
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
        tool: { type: "end_mill", diameter_mm: 6, flutes: 2 },
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
          { x_mm: 0, y_mm: 0 }
        ],
      },
    ],
  });

  assert.equal(result.project_id, "proj_toolpaths_demo");
  assert.ok(result.program_path.endsWith(".json"));
  const programAbsolute = resolveRepoPath(result.program_path);
  const previewAbsolute = resolveRepoPath(result.preview_path);
  assert.equal(await pathExists(programAbsolute), true);
  assert.equal(await pathExists(previewAbsolute), true);
  assert.ok(result.toolpaths.length === 1);
  assert.ok(result.engine_versions.schemas);
});

test("postprocess_grbl requires confirmation", async () => {
  await assert.rejects(
    () =>
      runPostprocessGrbl({
        project_id: "proj_postprocess_demo",
        controller: "grbl",
        program_path: "artifacts/toolpaths/nonexistent.json",
        confirm_write: false,
      }),
    (error) => {
      assert.equal(error.code, "INVALID_INPUT");
      return true;
    },
  );
});

test("postprocess_grbl writes gcode file", async () => {
  const baseDir = path.join("artifacts", "toolpaths", "proj_postprocess_demo");
  await removeIfExists(baseDir);
  await removeIfExists(path.join("artifacts", "gcode", "proj_postprocess_demo"));

  const toolpaths = await runGenerateToolpaths({
    project_id: "proj_postprocess_demo",
    stock: {
      length_mm: 600,
      width_mm: 300,
      thickness_mm: 18,
      origin: { x_mm: 0, y_mm: 0, z_mm: 0 },
    },
    operations: [
      {
        type: "drill",
        name: "pins",
        tool: { type: "drill", diameter_mm: 5, flutes: 2 },
        feed_mm_per_min: 300,
        cycle: "drill",
        holes: [
          { x_mm: 50, y_mm: 50, depth_mm: 12 },
          { x_mm: 50, y_mm: 250, depth_mm: 12 }
        ],
      },
    ],
  });

  const result = await runPostprocessGrbl({
    project_id: "proj_postprocess_demo",
    controller: "grbl",
    confirm_write: true,
    program_path: toolpaths.program_path,
  });

  const absolute = resolveRepoPath(result.gcode_path);
  assert.equal(await pathExists(absolute), true);
  const contents = await fs.readFile(absolute, "utf8");
  assert.match(contents, /G21/);
  assert.match(contents, /M30/);
  assert.equal(typeof result.seed, "number");
  assert.ok(result.engine_versions.schemas);
});

test("registry manifest includes new tools", () => {
  const manifest = getRegistryManifest();
  const toolNames = manifest.tools.map((tool) => tool.name);
  for (const expected of [
    "param_update",
    "apply_joinery",
    "make_drawing",
    "generate_toolpaths",
    "postprocess_grbl",
  ]) {
    assert.ok(toolNames.includes(expected));
  }
});

test.after(async () => {
  await Promise.all([
    removeIfExists(path.join("artifacts", "joinery", "proj_joinery_demo")),
    removeIfExists(path.join("artifacts", "drawings", "proj_drawing_demo")),
    removeIfExists(path.join("artifacts", "toolpaths", "proj_toolpaths_demo")),
    removeIfExists(path.join("artifacts", "toolpaths", "proj_postprocess_demo")),
    removeIfExists(path.join("artifacts", "gcode", "proj_postprocess_demo")),
  ]);
});
