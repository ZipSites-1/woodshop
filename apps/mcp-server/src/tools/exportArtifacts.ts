import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import crypto from "node:crypto";
import { toolSchemas } from "@woodshop/schemas";
import type { ExportArtifactsInput, ExportArtifactsOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { repoRoot } from "../util/paths.js";
import { resolveRepoPath, writeFileDeterministic } from "../util/fs.js";

const ARTIFACT_FILENAMES: Record<ExportArtifactsInput["format"], string> = {
  pdf: "drawing.pdf",
  dxf: "layout.dxf",
  svg: "layout.svg",
};

type ExportArtifactsCore = Omit<
  ExportArtifactsOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, (match) => `\\${match}`);
}

function buildPdfContent(projectId: string): Buffer {
  const text = `Woodshop Demo ${projectId}`;
  const streamContent = `BT /F1 12 Tf 36 760 Td (${escapePdfText(text)}) Tj ET`;
  const streamBuffer = Buffer.from(streamContent, "utf8");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamBuffer.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  const header = "%PDF-1.4\n";
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

function buildDxfContent(projectId: string): Buffer {
  const lines = [
    "0",
    "SECTION",
    "2",
    "HEADER",
    "9",
    "$LASTSAVEDBY",
    "1",
    "woodshop-mcp",
    "0",
    "ENDSEC",
    "0",
    "SECTION",
    "2",
    "ENTITIES",
    "0",
    "TEXT",
    "8",
    "DEMO",
    "10",
    "25.0",
    "20",
    "25.0",
    "40",
    "5.0",
    "1",
    `Woodshop ${projectId}`,
    "0",
    "ENDSEC",
    "0",
    "EOF",
    "",
  ];
  return Buffer.from(lines.join("\n"), "utf8");
}

function buildSvgContent(projectId: string): Buffer {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">\n  <rect x="10" y="10" width="180" height="100" fill="none" stroke="#1f2937" stroke-width="2"/>\n  <text x="20" y="70" font-family="Arial" font-size="16" fill="#111827">${projectId}</text>\n</svg>\n`;
  return Buffer.from(svg, "utf8");
}

function buildArtifact(format: ExportArtifactsInput["format"], projectId: string): Buffer {
  switch (format) {
    case "pdf":
      return buildPdfContent(projectId);
    case "dxf":
      return buildDxfContent(projectId);
    case "svg":
      return buildSvgContent(projectId);
    default:
      throw new Error(`Unsupported format ${format}`);
  }
}

function relativeToRepo(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function resolveDestination(destination?: string): string {
  const base = destination ?? path.join("artifacts", "demo");
  const normalized = path.normalize(base).replace(/\\/g, "/");
  if (path.isAbsolute(normalized)) {
    const relative = path.relative(repoRoot, normalized);
    if (relative.startsWith("..")) {
      throw new Error("Destination must be within the repository");
    }
    return relative;
  }
  if (normalized.startsWith("..")) {
    throw new Error("Destination must remain inside the repository");
  }
  return normalized;
}

export const exportArtifactsTool = createValidatedTool<ExportArtifactsInput, ExportArtifactsCore>({
  name: "export_artifacts",
  title: "Export Artifacts",
  description: "Write deterministic demo artifacts for downstream consumption.",
  schemas: toolSchemas.export_artifacts,
  async handler(
    input: ExportArtifactsInput,
    _context: ToolExecutionContext<ExportArtifactsInput>,
  ) {
    const destination = resolveDestination(input.destination);
    const absoluteDir = resolveRepoPath(destination);
    const filename = ARTIFACT_FILENAMES[input.format];
    const absolutePath = path.join(absoluteDir, filename);

    const buffer = buildArtifact(input.format, input.project_id);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    await writeFileDeterministic(absolutePath, buffer);

    return {
      project_id: input.project_id,
      format: input.format,
      artifact_path: relativeToRepo(absolutePath),
      artifact_sha256: hash,
      bytes_written: buffer.length,
    } satisfies ExportArtifactsCore;
  },
  summarize: (output) => `Exported ${output.format.toUpperCase()} to ${output.artifact_path}`,
});

export function registerExportArtifacts(server: McpServer): void {
  exportArtifactsTool.register(server);
}

export async function runExportArtifacts(
  input: ExportArtifactsInput,
): Promise<ExportArtifactsOutput> {
  return exportArtifactsTool.run(input) as Promise<ExportArtifactsOutput>;
}
