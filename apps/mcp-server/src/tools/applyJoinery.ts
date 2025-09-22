import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import { toolSchemas } from "@woodshop/schemas";
import type { ApplyJoineryInput, ApplyJoineryOutput } from "@woodshop/types";
import { createValidatedTool, ToolError } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { resolveRepoPath, writeFileDeterministic } from "../util/fs.js";
import { repoRoot } from "../util/paths.js";
import { stableHash } from "../util/stableHash.js";

type ApplyJoineryCore = Omit<
  ApplyJoineryOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

type OperationResult = ApplyJoineryCore["operations"][number];

type JoineryType = ApplyJoineryInput["operations"][number]["type"];

type JoineryFeature = OperationResult["features"][number];

const SECONDARY_FEATURE: Record<JoineryType, JoineryFeature["feature_type"]> = {
  dado: "dado",
  rabbet: "rabbet",
  mortise: "tenon",
  tenon: "mortise",
  lap: "lap",
  dowel: "dowel",
};

function computeRemovedVolume(operation: ApplyJoineryInput["operations"][number]): number {
  if (operation.type === "dowel") {
    const radius = operation.width_mm / 2;
    return Math.PI * radius * radius * operation.depth_mm;
  }
  return operation.length_mm * operation.width_mm * operation.depth_mm;
}

function asRelativeRepoPath(absolutePath: string): string {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function createPreviewSvg(
  operation: ApplyJoineryInput["operations"][number],
  operationId: string,
  projectId: string,
): Promise<string> {
  const targetDir = resolveRepoPath("artifacts", "joinery", projectId);
  const absolutePath = path.join(targetDir, `${operationId}.svg`);

  const width = 320;
  const height = 120;
  const inset = 20;
  const scaledLength = clamp((operation.length_mm / 800) * (width - inset * 2), 40, width - inset * 2);
  const scaledWidth = clamp((operation.width_mm / 100) * (height - inset * 2), 12, height - inset * 2);

  const grooveX = inset + (width - inset * 2 - scaledLength) / 2;
  const grooveY = inset + (height - inset * 2 - scaledWidth) / 2;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `  <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="#f9fafb" stroke="#4b5563" stroke-width="2"/>\n` +
    `  <rect x="${grooveX}" y="${grooveY}" width="${scaledLength}" height="${scaledWidth}" fill="#1f2937" fill-opacity="0.18" stroke="#1f2937" stroke-width="2"/>\n` +
    `  <text x="${width / 2}" y="${height - 16}" font-size="14" text-anchor="middle" fill="#111827">${operation.type.toUpperCase()} @ ${operation.offset_mm}mm</text>\n` +
    `</svg>\n`;

  await writeFileDeterministic(absolutePath, svg);
  return asRelativeRepoPath(absolutePath);
}

function buildFeatures(
  operation: ApplyJoineryInput["operations"][number],
): JoineryFeature[] {
  const angle = operation.angle_deg ?? null;
  const primary: JoineryFeature = {
    feature_type: operation.type,
    part_id: operation.primary_part_id,
    length_mm: Number(operation.length_mm.toFixed(3)),
    width_mm: Number(operation.width_mm.toFixed(3)),
    depth_mm: Number(operation.depth_mm.toFixed(3)),
    offset_mm: Number(operation.offset_mm.toFixed(3)),
    angle_deg: angle,
  };

  const features: JoineryFeature[] = [primary];

  if (operation.secondary_part_id) {
    const secondaryFeatureType = SECONDARY_FEATURE[operation.type];
    features.push({
      feature_type: secondaryFeatureType,
      part_id: operation.secondary_part_id,
      length_mm: Number(operation.length_mm.toFixed(3)),
      width_mm: Number(operation.width_mm.toFixed(3)),
      depth_mm: Number(operation.depth_mm.toFixed(3)),
      offset_mm: Number(operation.offset_mm.toFixed(3)),
      angle_deg: angle,
    });
  }

  return features;
}

function deriveWarnings(
  operation: ApplyJoineryInput["operations"][number],
): ApplyJoineryCore["operations"][number]["warnings"] {
  const warnings: ApplyJoineryCore["operations"][number]["warnings"] = [];

  if (operation.depth_mm > operation.width_mm * 0.9) {
    warnings.push({
      part_id: operation.primary_part_id,
      severity: "warning",
      message: "Depth exceeds 90% of groove width; consider reinforcing the joint.",
    });
  }

  if (operation.type === "dowel" && operation.fasteners && operation.fasteners.length > 0) {
    const primary = operation.fasteners[0];
    if (primary.diameter_mm > operation.width_mm) {
      warnings.push({
        part_id: operation.primary_part_id,
        severity: "warning",
        message: "Fastener diameter larger than specified width.",
      });
    }
  }

  if (operation.length_mm > 1200) {
    warnings.push({
      part_id: operation.primary_part_id,
      severity: "info",
      message: "Long joints may require clamping cauls to maintain pressure.",
    });
  }

  return warnings;
}

const applyJoineryTool = createValidatedTool<ApplyJoineryInput, ApplyJoineryCore>({
  name: "apply_joinery",
  title: "Apply Joinery",
  description: "Apply joinery operations and report impacted parts and features.",
  schemas: toolSchemas.apply_joinery,
  async handler(input: ApplyJoineryInput, _context: ToolExecutionContext<ApplyJoineryInput>) {
    if (!input.operations.length) {
      throw new ToolError({
        code: "NO_OPERATIONS",
        message: "At least one joinery operation is required.",
        details: {},
      });
    }

    const impactedParts = new Set<string>();
    const operations: OperationResult[] = [];

    for (const operation of input.operations) {
      impactedParts.add(operation.primary_part_id);
      if (operation.secondary_part_id) {
        impactedParts.add(operation.secondary_part_id);
      }

      const operationId = `join_${stableHash({
        project_id: input.project_id,
        operation,
      }).slice(0, 10)}`;

      const previewPath = await createPreviewSvg(operation, operationId, input.project_id);
      const features = buildFeatures(operation);
      const warnings = deriveWarnings(operation);
      const removedVolume = Number(computeRemovedVolume(operation).toFixed(2));

      operations.push({
        operation_id: operationId,
        type: operation.type,
        primary_part_id: operation.primary_part_id,
        secondary_part_id: operation.secondary_part_id ?? null,
        features,
        removed_volume_mm3: removedVolume,
        preview_svg_path: previewPath,
        warnings,
      });
    }

    const summary = `Applied ${operations.length} joinery operation(s) across ${impactedParts.size} part(s).`;

    return {
      project_id: input.project_id,
      operations,
      impacted_parts: Array.from(impactedParts).sort(),
      summary,
    } satisfies ApplyJoineryCore;
  },
  summarize: (output) => output.summary,
});

export function registerApplyJoinery(server: McpServer): void {
  applyJoineryTool.register(server);
}

export async function runApplyJoinery(input: ApplyJoineryInput): Promise<ApplyJoineryOutput> {
  return applyJoineryTool.run(input) as Promise<ApplyJoineryOutput>;
}

export { applyJoineryTool };
