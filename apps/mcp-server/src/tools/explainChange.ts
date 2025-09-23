import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { ExplainChangeInput, ExplainChangeOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { stableHash } from "../util/stableHash.js";

type ExplainChangeCore = Omit<
  ExplainChangeOutput,
  "engine_versions" | "inputs_hash" | "seed"
>;

function deriveSyntheticRevision(
  projectId: string,
  seed: number,
  label: "since" | "until",
): string {
  const hash = stableHash({ projectId, label, seed }).slice(0, 12);
  return `rev_${hash}`;
}

export const explainChangeTool = createValidatedTool<ExplainChangeInput, ExplainChangeCore>({
  name: "explain_change",
  title: "Explain Change",
  description: "Summarize deterministic differences between two revisions.",
  schemas: toolSchemas.explain_change,
  async handler(input: ExplainChangeInput, context: ToolExecutionContext<ExplainChangeInput>) {
    const since = input.since_revision_id;
    const until = input.until_revision_id ?? deriveSyntheticRevision(input.project_id, context.seed, "until");
    const baseTimestamp = new Date(0);
    const entries = [
      {
        revision_id: since,
        summary: `Snapshot captured at ${since}.`,
        timestamp: baseTimestamp.toISOString(),
        author: "system"
      },
      {
        revision_id: until,
        summary: `Aggregated delta from ${since} to ${until}.`,
        timestamp: new Date(baseTimestamp.getTime() + Math.max(context.seed, 1) * 1000).toISOString(),
        author: "system",
        warnings: input.include_metadata ? ["Summaries are synthesized; review detailed diff if available."] : undefined
      }
    ];

    const trimmedEntries = input.max_entries ? entries.slice(0, input.max_entries) : entries;
    return {
      project_id: input.project_id,
      since_revision_id: since,
      until_revision_id: until,
      summary: `Changes from ${since} to ${until}.`,
      entries: trimmedEntries,
    } satisfies ExplainChangeCore;
  },
  summarize: (output) => `Explained change ${output.since_revision_id} → ${output.until_revision_id ?? output.since_revision_id}.`,
});

export function registerExplainChange(server: McpServer): void {
  explainChangeTool.register(server);
}

export async function runExplainChange(input: ExplainChangeInput): Promise<ExplainChangeOutput> {
  return explainChangeTool.run(input) as Promise<ExplainChangeOutput>;
}
