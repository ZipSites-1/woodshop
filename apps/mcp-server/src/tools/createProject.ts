import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { CreateProjectInput, CreateProjectOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { stableHash } from "../util/stableHash.js";

const DEFAULT_MATERIALS = Object.freeze([
  { name: "Birch Ply 18mm", thickness_mm: 18, grain: "length" },
  { name: "Solid Oak 20mm", thickness_mm: 20, grain: "length" },
  { name: "Backer Ply 6mm", thickness_mm: 6, grain: "width" },
]);

type CreateProjectCore = Omit<
  CreateProjectOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

function deriveProjectId(input: CreateProjectInput, context: ToolExecutionContext<CreateProjectInput>): string {
  const signature = {
    units: input.units,
    template: input.template ?? null,
    seed: context.seed,
  };
  return `proj_${stableHash(signature).slice(0, 12)}`;
}

export const createProjectTool = createValidatedTool<CreateProjectInput, CreateProjectCore>({
  name: "create_project",
  title: "Create Project",
  description: "Initialize a woodworking project with deterministic defaults.",
  schemas: toolSchemas.create_project,
  async handler(input: CreateProjectInput, context: ToolExecutionContext<CreateProjectInput>) {
    const projectId = deriveProjectId(input, context);
    const template = input.template ?? null;
    return {
      project_id: projectId,
      units: input.units,
      template,
      materials: DEFAULT_MATERIALS.map((material) => ({ ...material })),
    } satisfies CreateProjectCore;
  },
  summarize: (output) => `Project ${output.project_id} created with units ${output.units}.`,
});

export function registerCreateProject(server: McpServer): void {
  createProjectTool.register(server);
}

export async function runCreateProject(input: CreateProjectInput): Promise<CreateProjectOutput> {
  return createProjectTool.run(input) as Promise<CreateProjectOutput>;
}
