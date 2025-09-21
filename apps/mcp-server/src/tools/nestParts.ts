import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import { toolSchemas } from "@woodshop/schemas";
import type { NestPartsInput, NestPartsOutput } from "@woodshop/types";
import { createValidatedTool, ToolError } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { resolveRepoPath, writeFileDeterministic } from "../util/fs.js";

interface ExpandedPart {
  part_id: string;
  length_mm: number;
  width_mm: number;
  area: number;
  allow_rotation: boolean;
  instance: number;
}

interface Sheet {
  sheet_id: string;
  length_mm: number;
  width_mm: number;
}

interface Placement {
  part_id: string;
  instance: number;
  x_mm: number;
  y_mm: number;
  width_mm: number;
  length_mm: number;
  rotation_deg: number;
}

const SVG_HEADER = `<?xml version="1.0" encoding="UTF-8"?>\n`;

function lcg(seed: number): () => number {
  let state = (seed + 1) % 2147483647;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

function expandParts(parts: NestPartsInput["parts"]): ExpandedPart[] {
  const expanded: ExpandedPart[] = [];
  parts.forEach((part) => {
    const area = part.length_mm * part.width_mm;
    for (let i = 0; i < part.quantity; i += 1) {
      expanded.push({
        part_id: part.part_id,
        length_mm: part.length_mm,
        width_mm: part.width_mm,
        allow_rotation: part.allow_rotation ?? false,
        instance: i,
        area,
      });
    }
  });
  expanded.sort((a, b) => {
    if (b.area !== a.area) {
      return b.area - a.area;
    }
    if (a.part_id !== b.part_id) {
      return a.part_id.localeCompare(b.part_id);
    }
    return a.instance - b.instance;
  });
  return expanded;
}

async function generateSvg(
  sheet: Sheet,
  placements: Placement[],
  outputPath: string,
): Promise<string> {
  const width = sheet.width_mm;
  const height = sheet.length_mm;
  const rects = placements
    .map((placement) => {
      return `  <rect x="${placement.x_mm.toFixed(2)}" y="${placement.y_mm.toFixed(2)}" width="${placement.width_mm.toFixed(
        2,
      )}" height="${placement.length_mm.toFixed(2)}" fill="none" stroke="#1f2937" stroke-width="1" />\n`;
    })
    .join("");
  const labels = placements
    .map((placement) => {
      const cx = placement.x_mm + placement.width_mm / 2;
      const cy = placement.y_mm + placement.length_mm / 2;
      return `  <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" font-size="18" text-anchor="middle" fill="#374151">${placement.part_id}</text>\n`;
    })
    .join("");
  const svg = `${SVG_HEADER}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">\n  <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#4b5563" stroke-width="2"/>\n${rects}${labels}</svg>\n`;
  await writeFileDeterministic(outputPath, svg);
  return svg;
}

function placePartsOnSheet(
  sheet: Sheet,
  parts: ExpandedPart[],
  rng: () => number,
  kerf: number,
): { placements: Placement[]; usedParts: number; usedArea: number } {
  const placements: Placement[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let usedArea = 0;
  let usedParts = 0;

  const widthLimit = sheet.width_mm;
  const lengthLimit = sheet.length_mm;

  for (const part of parts) {
    const rotate = part.allow_rotation && rng() > 0.5;
    const partWidth = rotate ? part.length_mm : part.width_mm;
    const partLength = rotate ? part.width_mm : part.length_mm;

    if (partWidth <= 0 || partLength <= 0) {
      continue;
    }

    if (cursorX + partWidth > widthLimit + 1e-6) {
      cursorX = 0;
      cursorY += rowHeight + kerf;
      rowHeight = 0;
    }

    if (cursorY + partLength > lengthLimit + 1e-6) {
      continue; // cannot place on this sheet
    }

    placements.push({
      part_id: part.part_id,
      instance: part.instance,
      x_mm: cursorX,
      y_mm: cursorY,
      width_mm: partWidth,
      length_mm: partLength,
      rotation_deg: rotate ? 90 : 0,
    });

    usedParts += 1;
    usedArea += partWidth * partLength;

    cursorX += partWidth + kerf;
    rowHeight = Math.max(rowHeight, partLength);
  }

  return { placements, usedParts, usedArea };
}

type NestPartsCore = Omit<NestPartsOutput, "seed" | "engine_versions" | "revision_id" | "inputs_hash">;

export const nestPartsTool = createValidatedTool<NestPartsInput, NestPartsCore>({
  name: "nest_parts",
  title: "Nest Parts",
  description: "Deterministic skyline nesting with seedable RNG.",
  schemas: toolSchemas.nest_parts,
  async handler(input: NestPartsInput, context: ToolExecutionContext<NestPartsInput>) {
    const rng = lcg(context.seed);
    const parts = expandParts(input.parts);
    const sheets: Sheet[] = [];
    for (const stock of input.stock) {
      for (let i = 0; i < stock.quantity; i += 1) {
        sheets.push({ sheet_id: stock.sheet_id, length_mm: stock.length_mm, width_mm: stock.width_mm });
      }
    }

    if (sheets.length === 0) {
      throw new ToolError({
        code: "NO_STOCK",
        message: "No stock sheets were provided.",
        details: {},
      });
    }

    const remaining = [...parts];
    const layouts = [] as NestPartsCore["layouts"];
    let totalUsedArea = 0;

    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index];
      const placementsResult = placePartsOnSheet(sheet, remaining, rng, input.kerf_mm ?? 0);
      const placements = placementsResult.placements;
      const usedPartIds = new Set(placements.map((placement) => `${placement.part_id}::${placement.instance}`));

      for (let i = remaining.length - 1; i >= 0; i -= 1) {
        const part = remaining[i];
        const key = `${part.part_id}::${part.instance}`;
        if (usedPartIds.has(key)) {
          remaining.splice(i, 1);
        }
      }

      totalUsedArea += placementsResult.usedArea;

      const svgDir = resolveRepoPath("artifacts", "nest", input.project_id);
      const svgPath = path.join(svgDir, `seed-${context.seed}-sheet-${index + 1}.svg`);
      await generateSvg(sheet, placements, svgPath);

      const sheetArea = sheet.length_mm * sheet.width_mm;
      layouts.push({
        sheet_id: sheet.sheet_id,
        sheet_index: index,
        utilization: sheetArea > 0 ? Number((placementsResult.usedArea / sheetArea).toFixed(4)) : 0,
        used_area_mm2: Number(placementsResult.usedArea.toFixed(2)),
        svg_path: path.relative(resolveRepoPath(), svgPath).split(path.sep).join("/"),
        placements,
      });
    }

    const totalPartsArea = parts.reduce((sum, part) => sum + part.area, 0);
    const totalStockArea = sheets.reduce((sum, sheet) => sum + sheet.length_mm * sheet.width_mm, 0);

    const offcuts = layouts.map((layout, idx) => {
      const sheet = sheets[idx];
      const offcutArea = Math.max(sheet.length_mm * sheet.width_mm - layout.used_area_mm2, 0);
      const longestPlacement = layout.placements.reduce<number>((max, placement) => Math.max(max, placement.length_mm), 0);
      const remainingLength = Math.max(sheet.length_mm - longestPlacement, 0);
      return {
        sheet_id: layout.sheet_id,
        area_mm2: Number(offcutArea.toFixed(2)),
        bounding_box_mm: {
          length: Number(remainingLength.toFixed(2)),
          width: Number(sheet.width_mm.toFixed(2)),
        },
      };
    });

    const notPlaced = remaining.map((part) => part.part_id);

    if (notPlaced.length > 0) {
      throw new ToolError({
        code: "INSUFFICIENT_STOCK",
        message: "Not all parts could be placed on the provided stock.",
        details: { parts: notPlaced },
      });
    }

    const utilizationSummary = {
      total_parts_area_mm2: Number(totalPartsArea.toFixed(2)),
      total_stock_area_mm2: Number(totalStockArea.toFixed(2)),
      overall_utilization: totalStockArea > 0 ? Number((totalUsedArea / totalStockArea).toFixed(4)) : 0,
    };

    return {
      project_id: input.project_id,
      strategy: input.strategy ?? "skyline",
      layouts,
      utilization_summary: utilizationSummary,
      offcuts,
      not_placed: [],
    } satisfies NestPartsCore;
  },
  summarize: (output) => `Nested ${output.layouts.reduce((sum, layout) => sum + layout.placements.length, 0)} parts across ${output.layouts.length} sheets.`,
});

export function registerNestParts(server: McpServer): void {
  nestPartsTool.register(server);
}

export async function runNestParts(input: NestPartsInput): Promise<NestPartsOutput> {
  return nestPartsTool.run(input) as Promise<NestPartsOutput>;
}
