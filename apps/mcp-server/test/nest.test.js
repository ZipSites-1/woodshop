import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

const { runNestParts } = await import("../dist/tools/nestParts.js");
const { resolveRepoPath } = await import("../dist/util/fs.js");

function baseInput(seed = 0) {
  return {
    project_id: "proj_nest_demo",
    seed,
    strategy: "skyline",
    kerf_mm: 1,
    grain_rule: "strict",
    parts: [
      { part_id: "panel_a", length_mm: 762, width_mm: 381, quantity: 2, allow_rotation: false },
      { part_id: "shelf", length_mm: 1150, width_mm: 380, quantity: 1, allow_rotation: false },
      { part_id: "back", length_mm: 1200, width_mm: 762, quantity: 1, allow_rotation: false }
    ],
    stock: [
      { sheet_id: "sheet-1", length_mm: 2440, width_mm: 1220, quantity: 1 }
    ],
  };
}

test("nest_parts returns deterministic layout", async () => {
  const result = await runNestParts(baseInput());
  assert.equal(result.layouts.length, 1);
  const layout = result.layouts[0];
  assert.equal(layout.placements.length, 4);
  assert.ok(layout.utilization > 0.5);

  const svgPath = resolveRepoPath(layout.svg_path);
  const actualSvg = await fs.readFile(svgPath, "utf8");
  const goldenPath = resolveRepoPath("artifacts", "goldens", "nest", "skyline_seed0_sheet1.svg");
  const expectedSvg = await fs.readFile(goldenPath, "utf8");
  assert.equal(actualSvg, expectedSvg);
});

test("nest_parts invalid strategy", async () => {
  await assert.rejects(
    () =>
      runNestParts({
        ...baseInput(),
        strategy: "genetic",
      }),
    (error) => {
      assert.equal(error.code, "INVALID_INPUT");
      return true;
    },
  );
});

test("utilization does not increase with additional stock", async () => {
  const base = await runNestParts(baseInput(0));
  const moreStockInput = baseInput(1);
  moreStockInput.stock[0].quantity = 2;
  const moreStock = await runNestParts(moreStockInput);

  const baseUtil = base.utilization_summary.overall_utilization;
  const moreUtil = moreStock.utilization_summary.overall_utilization;
  assert.ok(moreUtil <= baseUtil + 1e-6, "utilization should be monotonic (non-increasing) with extra stock");
});
