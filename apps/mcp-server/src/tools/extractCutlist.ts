import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { ExtractCutlistInput, ExtractCutlistOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";

const BASE_ROWS = Object.freeze([
  {
    part_id: "panel_side_a",
    name: "Side A",
    quantity: 2,
    length_mm: 762,
    width_mm: 381,
    thickness_mm: 18,
    material: "Birch Ply 18mm",
    grain: "length",
  },
  {
    part_id: "panel_side_b",
    name: "Side B",
    quantity: 2,
    length_mm: 762,
    width_mm: 381,
    thickness_mm: 18,
    material: "Birch Ply 18mm",
    grain: "length",
  },
  {
    part_id: "panel_top",
    name: "Top",
    quantity: 1,
    length_mm: 1200,
    width_mm: 400,
    thickness_mm: 18,
    material: "Birch Ply 18mm",
    grain: "width",
  },
  {
    part_id: "panel_bottom",
    name: "Bottom",
    quantity: 1,
    length_mm: 1200,
    width_mm: 400,
    thickness_mm: 18,
    material: "Birch Ply 18mm",
    grain: "width",
  },
  {
    part_id: "shelf_mid",
    name: "Middle Shelf",
    quantity: 1,
    length_mm: 1150,
    width_mm: 380,
    thickness_mm: 18,
    material: "Birch Ply 18mm",
    grain: "width",
  },
  {
    part_id: "back_panel",
    name: "Back Panel",
    quantity: 1,
    length_mm: 1200,
    width_mm: 762,
    thickness_mm: 6,
    material: "Backer Ply 6mm",
    grain: "width",
  },
]);

type ExtractCutlistCore = Omit<
  ExtractCutlistOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

function buildRows(projectId: string): ExtractCutlistCore["rows"] {
  return BASE_ROWS.map((row) => ({
    ...row,
    part_id: `${projectId}::${row.part_id}`,
  })).sort((a, b) => (a.part_id < b.part_id ? -1 : a.part_id > b.part_id ? 1 : 0));
}

function computeMaterialTotals(rows: ExtractCutlistCore["rows"]): ExtractCutlistCore["totals"] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.material, (totals.get(row.material) ?? 0) + row.quantity);
  }
  const materialTotals = Array.from(totals.entries())
    .map(([material, count]) => ({ material, count }))
    .sort((a, b) => a.material.localeCompare(b.material));
  const partCount = rows.reduce<number>((accumulator, row) => accumulator + row.quantity, 0);
  return {
    parts: partCount,
    material_totals: materialTotals,
  };
}

export const extractCutlistTool = createValidatedTool<ExtractCutlistInput, ExtractCutlistCore>({
  name: "extract_cutlist",
  title: "Extract Cutlist",
  description: "Produce a deterministic cutlist for the current project revision.",
  schemas: toolSchemas.extract_cutlist,
  async handler(
    input: ExtractCutlistInput,
    _context: ToolExecutionContext<ExtractCutlistInput>,
  ) {
    const rows = buildRows(input.project_id);
    const totals = computeMaterialTotals(rows);
    return {
      project_id: input.project_id,
      rows,
      totals,
    } satisfies ExtractCutlistCore;
  },
  summarize: (output) => `Cutlist ready with ${output.rows.length} unique parts (seed ${output.seed}).`,
});

export function registerExtractCutlist(server: McpServer): void {
  extractCutlistTool.register(server);
}

export async function runExtractCutlist(
  input: ExtractCutlistInput,
): Promise<ExtractCutlistOutput> {
  return extractCutlistTool.run(input) as Promise<ExtractCutlistOutput>;
}
