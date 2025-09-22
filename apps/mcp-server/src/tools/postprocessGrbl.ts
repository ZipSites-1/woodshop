import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import path from "node:path";
import { promises as fs } from "node:fs";
import { toolSchemas } from "@woodshop/schemas";
import type { GenerateToolpathsOutput, PostprocessGrblInput, PostprocessGrblOutput } from "@woodshop/types";
import { createValidatedTool, ToolError } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { resolveRepoPath, writeFileDeterministic } from "../util/fs.js";
import { repoRoot } from "../util/paths.js";

const DEFAULT_SAFE_Z = 5;

type ToolSpecification = GenerateToolpathsOutput["toolpaths"][number]["tool"];
type ToolpathSegment = GenerateToolpathsOutput["toolpaths"][number]["segments"][number];
type ToolpathWarning = GenerateToolpathsOutput["toolpaths"][number]["warnings"][number];

interface ProgramToolpath {
  toolpath_id: string;
  operation_type: "contour" | "pocket" | "drill";
  operation_label: string;
  tool: ToolSpecification;
  segments: ToolpathSegment[];
  length_mm: number;
  estimated_runtime_sec: number;
  passes?: number;
  warnings?: ToolpathWarning[];
}

interface ProgramFile {
  project_id: string;
  program_id: string;
  safe_z_mm?: number;
  summary?: {
    total_runtime_sec: number;
    total_length_mm: number;
  };
  toolpaths: ProgramToolpath[];
}

type PostprocessGrblCore = Omit<
  PostprocessGrblOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

function resolveDestination(destination?: string): string {
  if (!destination) {
    return "artifacts/gcode";
  }
  const normalized = path.normalize(destination).replace(/\\/g, "/");
  if (path.isAbsolute(normalized)) {
    const relative = path.relative(repoRoot, normalized);
    if (relative.startsWith("..")) {
      throw new ToolError({
        code: "INVALID_DESTINATION",
        message: "Destination must be inside the repository.",
        details: { destination },
      });
    }
    return relative.replace(/\\/g, "/");
  }
  if (normalized.startsWith("..")) {
    throw new ToolError({
      code: "INVALID_DESTINATION",
      message: "Destination cannot traverse above the repository root.",
      details: { destination },
    });
  }
  return normalized;
}

async function loadProgramFromPath(programPath: string): Promise<ProgramFile> {
  const absolute = resolveRepoPath(programPath);
  const raw = await fs.readFile(absolute, "utf8");
  const parsed = JSON.parse(raw) as ProgramFile;
  if (!parsed || typeof parsed !== "object") {
    throw new ToolError({
      code: "INVALID_PROGRAM",
      message: "Program file is malformed.",
      details: { program_path: programPath },
    });
  }
  if (!parsed.toolpaths || !Array.isArray(parsed.toolpaths) || parsed.toolpaths.length === 0) {
    throw new ToolError({
      code: "INVALID_PROGRAM",
      message: "Program file is missing toolpaths.",
      details: { program_path: programPath },
    });
  }
  return parsed;
}

function normalizeProgram(input: PostprocessGrblInput, program: ProgramFile | null): ProgramFile {
  if (program) {
    return program;
  }
  if (!input.program) {
    throw new ToolError({
      code: "INVALID_PROGRAM",
      message: "Program details were not provided.",
      details: {},
    });
  }
  const toolpaths: ProgramToolpath[] = input.program.toolpaths.map((toolpath) => ({
    toolpath_id: toolpath.toolpath_id,
    operation_type: toolpath.operation_type,
    operation_label: toolpath.operation_label,
    tool: toolpath.tool,
    segments: toolpath.segments,
    length_mm: toolpath.length_mm,
    estimated_runtime_sec: toolpath.estimated_runtime_sec,
    passes: toolpath.passes,
    warnings: toolpath.warnings,
  }));

  return {
    project_id: input.project_id,
    program_id: input.program.program_id ?? `inline_${input.project_id}`,
    safe_z_mm: DEFAULT_SAFE_Z,
    summary: {
      total_runtime_sec: input.program.total_runtime_sec,
      total_length_mm: input.program.total_length_mm,
    },
    toolpaths,
  };
}

function formatNumber(value: number, digits = 3): string {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function buildGcode(program: ProgramFile, safeZ: number): { gcode: string; lineCount: number } {
  const lines: string[] = [];
  lines.push(`; Woodshop GRBL program ${program.program_id}`);
  lines.push("G90 ; absolute positioning");
  lines.push("G21 ; millimeters");
  lines.push("G17 ; XY plane");

  let cursorX = 0;
  let cursorZ = safeZ;

  for (const toolpath of program.toolpaths) {
    cursorX = 0;
    lines.push("");
    lines.push(`; Toolpath: ${toolpath.operation_label} (${toolpath.operation_type})`);
    lines.push(`G0 Z${formatNumber(safeZ, 2)}`);
    cursorZ = safeZ;

    for (const segment of toolpath.segments) {
      switch (segment.mode) {
        case "rapid": {
          cursorX += segment.length_mm;
          lines.push(`G0 X${formatNumber(cursorX)}`);
          break;
        }
        case "plunge": {
          cursorZ -= segment.length_mm;
          const feed = segment.feed_mm_per_min ?? 300;
          lines.push(`G1 Z${formatNumber(cursorZ)} F${formatNumber(feed, 1)}`);
          break;
        }
        case "feed": {
          cursorX += segment.length_mm;
          const feed = segment.feed_mm_per_min ?? 1200;
          lines.push(`G1 X${formatNumber(cursorX)} F${formatNumber(feed, 1)}`);
          break;
        }
        case "dwell": {
          const dwell = segment.duration_sec ?? 0;
          lines.push(`G4 P${formatNumber(dwell, 2)}`);
          break;
        }
        default:
          lines.push("; Unknown segment mode");
          break;
      }
    }

    if (cursorZ < safeZ) {
      lines.push(`G0 Z${formatNumber(safeZ, 2)}`);
      cursorZ = safeZ;
    }
  }

  lines.push("");
  lines.push("M5 ; spindle stop");
  lines.push(`G0 Z${formatNumber(safeZ, 2)}`);
  lines.push("G0 X0 Y0");
  lines.push("M30 ; program end");

  return { gcode: lines.join("\n") + "\n", lineCount: lines.length };
}

const postprocessGrblTool = createValidatedTool<PostprocessGrblInput, PostprocessGrblCore>({
  name: "postprocess_grbl",
  title: "Postprocess (GRBL)",
  description: "Emit GRBL-compatible G-code from generated toolpaths.",
  schemas: toolSchemas.postprocess_grbl,
  async handler(input: PostprocessGrblInput, _context: ToolExecutionContext<PostprocessGrblInput>) {
    if (input.controller !== "grbl") {
      throw new ToolError({
        code: "UNSUPPORTED_CONTROLLER",
        message: `Controller '${input.controller}' is not supported.`,
        details: {},
      });
    }

    let programFile: ProgramFile | null = null;
    if (input.program_path) {
      programFile = await loadProgramFromPath(input.program_path);
    }
    const program = normalizeProgram(input, programFile);

    if (!program.toolpaths.length) {
      throw new ToolError({
        code: "NO_TOOLPATHS",
        message: "Program does not contain any toolpaths.",
        details: {},
      });
    }

    const safeZ = typeof program.safe_z_mm === "number" ? program.safe_z_mm : DEFAULT_SAFE_Z;
    const { gcode, lineCount } = buildGcode(program, safeZ);
    const destination = resolveDestination(input.destination);
    const directory = resolveRepoPath(destination, input.project_id);
    const filename = `${program.program_id}.nc`;
    const absolutePath = path.join(directory, filename);

    await writeFileDeterministic(absolutePath, gcode);
    const bytesWritten = Buffer.byteLength(gcode, "utf8");
    const gcodePath = path.relative(resolveRepoPath(), absolutePath).split(path.sep).join("/");

    const toolpathStats = {
      total_runtime_sec: program.summary?.total_runtime_sec ?? program.toolpaths.reduce((sum, tp) => sum + tp.estimated_runtime_sec, 0),
      total_length_mm: program.summary?.total_length_mm ?? program.toolpaths.reduce((sum, tp) => sum + tp.length_mm, 0),
    };

    const warnings: PostprocessGrblCore["warnings"] = [];
    if (toolpathStats.total_length_mm === 0) {
      warnings.push({
        part_id: null,
        severity: "warning",
        message: "Total toolpath length is zero; verify upstream toolpath generation.",
      });
    }

    return {
      project_id: input.project_id,
      controller: input.controller,
      gcode_path: gcodePath,
      bytes_written: bytesWritten,
      line_count: lineCount,
      toolpath_stats: {
        total_runtime_sec: Number(toolpathStats.total_runtime_sec.toFixed(3)),
        total_length_mm: Number(toolpathStats.total_length_mm.toFixed(3)),
      },
      warnings,
    } satisfies PostprocessGrblCore;
  },
  summarize: (output) => `G-code written to ${output.gcode_path}`,
});

export function registerPostprocessGrbl(server: McpServer): void {
  postprocessGrblTool.register(server);
}

export async function runPostprocessGrbl(
  input: PostprocessGrblInput,
): Promise<PostprocessGrblOutput> {
  return postprocessGrblTool.run(input) as Promise<PostprocessGrblOutput>;
}

export { postprocessGrblTool };
