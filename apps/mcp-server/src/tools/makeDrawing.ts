import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import { toolSchemas } from "@woodshop/schemas";
import type { MakeDrawingInput, MakeDrawingOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { resolveRepoPath, writeFileDeterministic } from "../util/fs.js";
import { stableHash } from "../util/stableHash.js";

const DEFAULT_SHEET = Object.freeze({ width_mm: 594, height_mm: 420 });

function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, (match) => `\\${match}`);
}

interface PdfOptions {
  sheetWidth: number;
  sheetHeight: number;
  lines: string[];
}

function buildDrawingPdf({ sheetWidth, sheetHeight, lines }: PdfOptions): Buffer {
  const header = "%PDF-1.4\n";
  const objects: string[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${sheetWidth} ${sheetHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
  );

  const contentLines = lines
    .map((line, index) => {
      const y = sheetHeight - 42 - index * 18;
      return `BT /F1 12 Tf 36 ${y} Td (${escapePdfText(line)}) Tj ET`;
    })
    .join("\n");

  const stream = `${contentLines}`;
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const offsets: number[] = [];
  let cursor = header.length;
  for (const object of objects) {
    offsets.push(cursor);
    cursor += object.length;
  }

  const xrefHeader = `xref\n0 ${objects.length + 1}\n`;
  const xrefEntries = ["0000000000 65535 f \n", ...offsets.map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)].join("");
  const startxref = cursor + xrefHeader.length + xrefEntries.length;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  const pdfString = header + objects.join("") + xrefHeader + xrefEntries + trailer;
  return Buffer.from(pdfString, "utf8");
}

type MakeDrawingCore = Omit<
  MakeDrawingOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

function normalizeViews(views: MakeDrawingInput["views"], includeDimensions: boolean): MakeDrawingCore["views"] {
  return views.map((view) => ({
    name: view,
    status: "generated" as const,
    dimensions: includeDimensions && view !== "exploded",
  }));
}

function deriveWarnings(input: MakeDrawingInput): MakeDrawingCore["warnings"] {
  const warnings: MakeDrawingCore["warnings"] = [];
  if (input.explode && !input.views.includes("exploded")) {
    warnings.push({
      part_id: null,
      severity: "warning",
      message: "Exploded flag set but no 'exploded' view requested; exploded view rendered from ISO.",
    });
  }
  if (!input.include_dimensions) {
    warnings.push({
      part_id: null,
      severity: "info",
      message: "Dimensions omitted by request; drawing provided for visualization only.",
    });
  }
  if (input.views.length > 4) {
    warnings.push({
      part_id: null,
      severity: "info",
      message: "Consider limiting to 4 views per sheet for readability.",
    });
  }
  return warnings;
}

const makeDrawingTool = createValidatedTool<MakeDrawingInput, MakeDrawingCore>({
  name: "make_drawing",
  title: "Generate Drawing",
  description: "Render seeded PDF drawing sheets for requested views.",
  schemas: toolSchemas.make_drawing,
  async handler(input: MakeDrawingInput, context: ToolExecutionContext<MakeDrawingInput>) {
    const includeDimensions = input.include_dimensions ?? true;
    const explode = input.explode ?? false;
    const sheetSize = input.sheet_size ?? DEFAULT_SHEET;
    const scale = input.scale ?? 1;

    const views = normalizeViews(input.views, includeDimensions);
    const warnings = deriveWarnings(input);

    const lines = [
      `Project: ${input.project_id}`,
      `Views: ${views.map((view) => view.name).join(", ")}`,
      `Dimensions: ${includeDimensions ? "enabled" : "disabled"}`,
      `Exploded: ${explode ? "yes" : "no"}`,
      `Scale: ${scale}`,
      input.title ? `Title: ${input.title}` : undefined,
      `Seed: ${context.seed}`,
    ].filter((line): line is string => Boolean(line));

    const buffer = buildDrawingPdf({
      sheetWidth: sheetSize.width_mm,
      sheetHeight: sheetSize.height_mm,
      lines,
    });

    const directory = resolveRepoPath("artifacts", "drawings", input.project_id);
    const revisionLabel = stableHash({ project_id: input.project_id, seed: context.seed, views: input.views }).slice(0, 6);
    const drawingFilename = `seed-${context.seed}-${revisionLabel}.pdf`;
    const absolutePath = resolveRepoPath("artifacts", "drawings", input.project_id, drawingFilename);

    await writeFileDeterministic(absolutePath, buffer);
    const drawingPath = path.relative(resolveRepoPath(), absolutePath).split(path.sep).join("/");

    return {
      project_id: input.project_id,
      drawing_path: drawingPath,
      bytes_written: buffer.length,
      views,
      include_dimensions: includeDimensions,
      explode,
      sheet_size: sheetSize,
      scale,
      warnings,
    } satisfies MakeDrawingCore;
  },
  summarize: (output) => `Drawing generated at ${output.drawing_path}`,
});

export function registerMakeDrawing(server: McpServer): void {
  makeDrawingTool.register(server);
}

export async function runMakeDrawing(input: MakeDrawingInput): Promise<MakeDrawingOutput> {
  return makeDrawingTool.run(input) as Promise<MakeDrawingOutput>;
}

export { makeDrawingTool };
