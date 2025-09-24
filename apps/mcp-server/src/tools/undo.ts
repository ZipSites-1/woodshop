import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { UndoInput, UndoOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { stableHash } from "../util/stableHash.js";

type UndoCore = Omit<UndoOutput, "engine_versions" | "inputs_hash" | "seed">;

function deriveCurrentRevision(
  input: UndoInput,
  context: ToolExecutionContext<UndoInput>,
): string {
  if (input.current_revision_id) {
    return input.current_revision_id;
  }
  const hash = stableHash({ project: input.project_id, op: "undo", seed: context.seed }).slice(0, 12);
  return `rev_${hash}`;
}

export const undoTool = createValidatedTool<UndoInput, UndoCore>({
  name: "undo",
  title: "Undo Revision",
  description: "Restore a previous project revision deterministically.",
  schemas: toolSchemas.undo,
  async handler(input: UndoInput, context: ToolExecutionContext<UndoInput>) {
    const previousHead = deriveCurrentRevision(input, context);
    const summary = input.reason
      ? `Restored ${input.revision_id}: ${input.reason}`
      : `Restored revision ${input.revision_id}.`;
    return {
      project_id: input.project_id,
      revision_id: input.revision_id,
      previous_revision_id: previousHead,
      summary,
    } satisfies UndoCore;
  },
  summarize: (output) => `Undo → ${output.revision_id} (from ${output.previous_revision_id})`,
});

export function registerUndo(server: McpServer): void {
  undoTool.register(server);
}

export async function runUndo(input: UndoInput): Promise<UndoOutput> {
  return undoTool.run(input) as Promise<UndoOutput>;
}
