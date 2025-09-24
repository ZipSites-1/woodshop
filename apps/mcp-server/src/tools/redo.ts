import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { RedoInput, RedoOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { stableHash } from "../util/stableHash.js";

type RedoCore = Omit<RedoOutput, "engine_versions" | "inputs_hash" | "seed">;

function deriveCurrentRevision(
  input: RedoInput,
  context: ToolExecutionContext<RedoInput>,
): string {
  if (input.current_revision_id) {
    return input.current_revision_id;
  }
  const hash = stableHash({ project: input.project_id, op: "redo", seed: context.seed }).slice(0, 12);
  return `rev_${hash}`;
}

export const redoTool = createValidatedTool<RedoInput, RedoCore>({
  name: "redo",
  title: "Redo Revision",
  description: "Reapply a previously undone change.",
  schemas: toolSchemas.redo,
  async handler(input: RedoInput, context: ToolExecutionContext<RedoInput>) {
    const previousHead = deriveCurrentRevision(input, context);
    const summary = input.reason
      ? `Reapplied ${input.revision_id}: ${input.reason}`
      : `Reapplied revision ${input.revision_id}.`;
    return {
      project_id: input.project_id,
      revision_id: input.revision_id,
      previous_revision_id: previousHead,
      summary,
    } satisfies RedoCore;
  },
  summarize: (output) => `Redo → ${output.revision_id} (from ${output.previous_revision_id})`,
});

export function registerRedo(server: McpServer): void {
  redoTool.register(server);
}

export async function runRedo(input: RedoInput): Promise<RedoOutput> {
  return redoTool.run(input) as Promise<RedoOutput>;
}
