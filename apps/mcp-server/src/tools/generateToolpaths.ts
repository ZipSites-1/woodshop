import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import { toolSchemas } from "@woodshop/schemas";
import type { GenerateToolpathsInput, GenerateToolpathsOutput } from "@woodshop/types";
import { createValidatedTool, ToolError } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { resolveRepoPath, writeJsonFile } from "../util/fs.js";
import { stableHash } from "../util/stableHash.js";

const SECONDS_PER_MINUTE = 60;

type ToolSpecification = GenerateToolpathsOutput["toolpaths"][number]["tool"];

interface Vector2 {
  x_mm: number;
  y_mm: number;
}

interface ContourOperationInput {
  type: "contour";
  name: string;
  tool: ToolSpecification;
  feed_mm_per_min: number;
  plunge_mm_per_min: number;
  depth_mm: number;
  stepdown_mm: number;
  offset_strategy: "outside" | "inside" | "on";
  path: Vector2[];
  tabs?: Array<{
    position_mm: Vector2;
    width_mm: number;
    height_mm: number;
  }>;
}

interface PocketOperationInput {
  type: "pocket";
  name: string;
  tool: ToolSpecification;
  feed_mm_per_min: number;
  plunge_mm_per_min: number;
  depth_mm: number;
  stepover_mm: number;
  strategy: "zigzag" | "spiral";
  boundary: Vector2[];
}

interface DrillOperationInput {
  type: "drill";
  name: string;
  tool: ToolSpecification;
  feed_mm_per_min: number;
  cycle: "drill" | "peck";
  holes: Array<{
    x_mm: number;
    y_mm: number;
    depth_mm: number;
    dwell_ms?: number;
  }>;
}

type OperationInput = ContourOperationInput | PocketOperationInput | DrillOperationInput;

interface OperationMetrics {
  length: number;
  runtimeSec: number;
  passes: number;
  segments: GenerateToolpathsOutput["toolpaths"][number]["segments"];
  warnings: GenerateToolpathsOutput["toolpaths"][number]["warnings"];
}

function distance(pointA: { x_mm: number; y_mm: number }, pointB: { x_mm: number; y_mm: number }): number {
  const dx = pointA.x_mm - pointB.x_mm;
  const dy = pointA.y_mm - pointB.y_mm;
  return Math.sqrt(dx * dx + dy * dy);
}

function polylineLength(points: Array<{ x_mm: number; y_mm: number }>): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

function feedTimeSeconds(length: number, feedRate: number): number {
  if (feedRate <= 0) {
    return 0;
  }
  return (length / feedRate) * SECONDS_PER_MINUTE;
}

function computeContourMetrics(operation: ContourOperationInput): OperationMetrics {
  const pathLength = polylineLength(operation.path);
  const passes = Math.max(1, Math.ceil(operation.depth_mm / operation.stepdown_mm));
  const feedLength = pathLength * passes;
  const feedSeconds = feedTimeSeconds(feedLength, Math.max(operation.feed_mm_per_min, 1));
  const plungeSeconds = feedTimeSeconds(operation.depth_mm * passes, Math.max(operation.plunge_mm_per_min, 1));

  const segments: OperationMetrics["segments"] = [
    { mode: "rapid", length_mm: 0, feed_mm_per_min: null, duration_sec: 0 },
    { mode: "plunge", length_mm: Number((operation.depth_mm * passes).toFixed(3)), feed_mm_per_min: operation.plunge_mm_per_min, duration_sec: Number(plungeSeconds.toFixed(3)) },
    { mode: "feed", length_mm: Number(feedLength.toFixed(3)), feed_mm_per_min: operation.feed_mm_per_min, duration_sec: Number(feedSeconds.toFixed(3)) },
  ];

  const warnings: OperationMetrics["warnings"] = [];
  if (operation.offset_strategy === "inside" && operation.stepdown_mm > operation.tool.diameter_mm) {
    warnings.push({
      part_id: null,
      severity: "warning",
      message: "Stepdown exceeds tool diameter; consider reducing pass depth for inside contours.",
    });
  }

  return {
    length: Number(feedLength.toFixed(3)),
    runtimeSec: Number((feedSeconds + plungeSeconds).toFixed(3)),
    passes,
    segments,
    warnings,
  };
}

function computePocketMetrics(operation: PocketOperationInput): OperationMetrics {
  const perimeter = polylineLength([...operation.boundary, operation.boundary[0]]);
  const stepover = Math.max(operation.stepover_mm, operation.tool.diameter_mm * 0.4);
  const passes = Math.max(1, Math.ceil(operation.depth_mm / Math.max(stepover, 0.1)));
  const feedLength = perimeter * passes;
  const feedSeconds = feedTimeSeconds(feedLength, Math.max(operation.feed_mm_per_min, 1));
  const plungeSeconds = feedTimeSeconds(operation.depth_mm * passes, Math.max(operation.plunge_mm_per_min, 1));

  const segments: OperationMetrics["segments"] = [
    { mode: "rapid", length_mm: 0, feed_mm_per_min: null, duration_sec: 0 },
    { mode: "plunge", length_mm: Number((operation.depth_mm * passes).toFixed(3)), feed_mm_per_min: operation.plunge_mm_per_min, duration_sec: Number(plungeSeconds.toFixed(3)) },
    { mode: "feed", length_mm: Number(feedLength.toFixed(3)), feed_mm_per_min: operation.feed_mm_per_min, duration_sec: Number(feedSeconds.toFixed(3)) },
  ];

  const warnings: OperationMetrics["warnings"] = [];
  if (operation.strategy === "spiral" && operation.boundary.length < 3) {
    warnings.push({
      part_id: null,
      severity: "warning",
      message: "Spiral strategy requires at least a triangular boundary; defaulting to zigzag passes.",
    });
  }

  return {
    length: Number(feedLength.toFixed(3)),
    runtimeSec: Number((feedSeconds + plungeSeconds).toFixed(3)),
    passes,
    segments,
    warnings,
  };
}

function computeDrillMetrics(operation: DrillOperationInput): OperationMetrics {
  const passes = operation.holes.length;
  const plungeLength = operation.holes.reduce((total, hole) => total + hole.depth_mm, 0);
  const plungeSeconds = feedTimeSeconds(plungeLength, Math.max(operation.feed_mm_per_min, 1));
  const dwellSeconds = operation.holes.reduce((total, hole) => total + (hole.dwell_ms ?? 0) / 1000, 0);

  const segments: OperationMetrics["segments"] = [
    { mode: "rapid", length_mm: 0, feed_mm_per_min: null, duration_sec: 0 },
    { mode: "feed", length_mm: Number(plungeLength.toFixed(3)), feed_mm_per_min: operation.feed_mm_per_min, duration_sec: Number(plungeSeconds.toFixed(3)) },
  ];
  if (dwellSeconds > 0) {
    segments.push({ mode: "dwell", length_mm: 0, feed_mm_per_min: null, duration_sec: Number(dwellSeconds.toFixed(3)) });
  }

  const warnings: OperationMetrics["warnings"] = [];
  if (operation.cycle === "peck" && operation.feed_mm_per_min > 800) {
    warnings.push({
      part_id: null,
      severity: "warning",
      message: "Peck drilling feed above 800 mm/min may cause chip packing.",
    });
  }

  return {
    length: Number(plungeLength.toFixed(3)),
    runtimeSec: Number((plungeSeconds + dwellSeconds).toFixed(3)),
    passes,
    segments,
    warnings,
  };
}

type GenerateToolpathsCore = Omit<
  GenerateToolpathsOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

const generateToolpathsTool = createValidatedTool<GenerateToolpathsInput, GenerateToolpathsCore>({
  name: "generate_toolpaths",
  title: "Generate Toolpaths",
  description: "Produce seeded toolpath summaries for contour, pocket, and drill operations.",
  schemas: toolSchemas.generate_toolpaths,
  async handler(input: GenerateToolpathsInput, context: ToolExecutionContext<GenerateToolpathsInput>) {
    if (!input.operations.length) {
      throw new ToolError({
        code: "NO_OPERATIONS",
        message: "At least one machining operation is required.",
        details: {},
      });
    }

    const operations = input.operations as unknown as OperationInput[];
    const toolpaths: GenerateToolpathsCore["toolpaths"] = [];
    const warnings: GenerateToolpathsCore["warnings"] = [];
    let totalLength = 0;
    let totalRuntime = 0;

    for (const operation of operations) {
      let metrics: OperationMetrics;
      if (operation.type === "contour") {
        metrics = computeContourMetrics(operation);
      } else if (operation.type === "pocket") {
        metrics = computePocketMetrics(operation);
      } else if (operation.type === "drill") {
        metrics = computeDrillMetrics(operation);
      } else {
        const operationType = (operation as { type?: unknown }).type;
        throw new ToolError({
          code: "UNSUPPORTED_OPERATION",
          message: `Unsupported operation type ${String(operationType ?? "unknown")}`,
          details: {},
        });
      }

      totalLength += metrics.length;
      totalRuntime += metrics.runtimeSec;

      toolpaths.push({
        toolpath_id: `tp_${stableHash({ project_id: input.project_id, operation }).slice(0, 10)}`,
        operation_type: operation.type,
        operation_label: operation.name,
        tool: operation.tool,
        length_mm: metrics.length,
        estimated_runtime_sec: metrics.runtimeSec,
        passes: metrics.passes,
        segments: metrics.segments,
        warnings: metrics.warnings,
      });
    }

    const programId = `prog_${stableHash({ project_id: input.project_id, seed: context.seed }).slice(0, 10)}`;
    const programPath = resolveRepoPath("artifacts", "toolpaths", input.project_id, `seed-${context.seed}.json`);
    const previewPath = resolveRepoPath("artifacts", "toolpaths", input.project_id, `seed-${context.seed}.preview.json`);

    const programPayload = {
      project_id: input.project_id,
      program_id: programId,
      safe_z_mm: input.safe_z_mm ?? 5,
      summary: {
        total_runtime_sec: Number(totalRuntime.toFixed(3)),
        total_length_mm: Number(totalLength.toFixed(3)),
      },
      operations,
      toolpaths,
    };

    const preview = {
      project_id: input.project_id,
      stock: input.stock,
      toolpaths: toolpaths.map((toolpath) => ({
        toolpath_id: toolpath.toolpath_id,
        operation_label: toolpath.operation_label,
        length_mm: toolpath.length_mm,
        estimated_runtime_sec: toolpath.estimated_runtime_sec,
      })),
    };

    await writeJsonFile(programPath, programPayload);
    await writeJsonFile(previewPath, preview);

    const relProgramPath = path.relative(resolveRepoPath(), programPath).split(path.sep).join("/");
    const relPreviewPath = path.relative(resolveRepoPath(), previewPath).split(path.sep).join("/");

    if (totalRuntime > 1800) {
      warnings.push({
        part_id: null,
        severity: "warning",
        message: "Estimated runtime exceeds 30 minutes; consider splitting operations or adjusting feeds.",
      });
    }

    return {
      project_id: input.project_id,
      program_id: programId,
      program_path: relProgramPath,
      total_runtime_sec: Number(totalRuntime.toFixed(3)),
      total_length_mm: Number(totalLength.toFixed(3)),
      toolpaths,
      preview_path: relPreviewPath,
      warnings,
    } satisfies GenerateToolpathsCore;
  },
  summarize: (output) =>
    `Toolpaths generated (${output.toolpaths.length} total) with runtime ${output.total_runtime_sec.toFixed(1)}s.`,
});

export function registerGenerateToolpaths(server: McpServer): void {
  generateToolpathsTool.register(server);
}

export async function runGenerateToolpaths(
  input: GenerateToolpathsInput,
): Promise<GenerateToolpathsOutput> {
  return generateToolpathsTool.run(input) as Promise<GenerateToolpathsOutput>;
}

export { generateToolpathsTool };
