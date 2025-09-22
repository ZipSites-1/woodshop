import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type {
  AnalyzeGeometryInput,
  AnalyzeGeometryOutput,
} from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import {
  analyzeGeometry,
  type GeometryMetrics,
  type GeometrySourceFormat,
} from "../geom/mesh.js";

interface AnalyzeGeometryCore extends Record<string, unknown> {
  label: string | null;
  source_format: GeometrySourceFormat;
  vertex_count: number;
  triangle_count: number;
  surface_area: number;
  bounding_box: {
    min: [number, number, number];
    max: [number, number, number];
  };
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
}

function toTuple(vec: { x: number; y: number; z: number }): [number, number, number] {
  return [vec.x, vec.y, vec.z];
}

function mapMetrics(metrics: GeometryMetrics, format: GeometrySourceFormat, label: string | null): AnalyzeGeometryCore {
  return {
    label,
    source_format: format,
    vertex_count: metrics.vertexCount,
    triangle_count: metrics.triangleCount,
    surface_area: Number(metrics.surfaceArea.toFixed(9)),
    bounding_box: {
      min: toTuple(metrics.boundingBox.min),
      max: toTuple(metrics.boundingBox.max),
    },
    dimensions: {
      width: Number(metrics.dimensions.width.toFixed(9)),
      depth: Number(metrics.dimensions.depth.toFixed(9)),
      height: Number(metrics.dimensions.height.toFixed(9)),
    },
  };
}

export const analyzeGeometryTool = createValidatedTool<AnalyzeGeometryInput, AnalyzeGeometryCore>({
  name: "analyze_geometry",
  title: "Analyze Geometry",
  description: "Parse STEP/IGES payloads and derive bounding box, area, and triangle counts.",
  schemas: toolSchemas.analyze_geometry,
  async handler(input: AnalyzeGeometryInput, _context: ToolExecutionContext<AnalyzeGeometryInput>) {
    const sourceFormat = input.source.format;
    const metrics = analyzeGeometry(sourceFormat, input.source.data);
    return mapMetrics(metrics, sourceFormat, input.label ?? null);
  },
  summarize: (output) =>
    `Mesh analyzed: ${output.vertex_count} vertices, ${output.triangle_count} triangles, area ${output.surface_area.toFixed(3)}.`,
});

export function registerAnalyzeGeometry(server: McpServer): void {
  analyzeGeometryTool.register(server);
}

export async function runAnalyzeGeometry(
  input: AnalyzeGeometryInput,
): Promise<AnalyzeGeometryOutput> {
  return analyzeGeometryTool.run(input) as Promise<AnalyzeGeometryOutput>;
}
