import createProjectInput from "./create_project.input.schema.json" with { type: "json" };
import createProjectOutput from "./create_project.output.schema.json" with { type: "json" };
import extractCutlistInput from "./extract_cutlist.input.schema.json" with { type: "json" };
import extractCutlistOutput from "./extract_cutlist.output.schema.json" with { type: "json" };
import exportArtifactsInput from "./export_artifacts.input.schema.json" with { type: "json" };
import exportArtifactsOutput from "./export_artifacts.output.schema.json" with { type: "json" };

export type JsonSchema = Record<string, unknown> & {
  $id: string;
  title?: string;
};

export interface ToolSchemaPair {
  input: JsonSchema;
  output: JsonSchema;
}

export const toolSchemas = {
  create_project: {
    input: createProjectInput,
    output: createProjectOutput,
  },
  extract_cutlist: {
    input: extractCutlistInput,
    output: extractCutlistOutput,
  },
  export_artifacts: {
    input: exportArtifactsInput,
    output: exportArtifactsOutput,
  },
} as const satisfies Record<string, ToolSchemaPair>;

export type ToolName = keyof typeof toolSchemas;

export const registrySchemas = Object.entries(toolSchemas)
  .map(([name, pair]) => ({
    name,
    inputId: pair.input.$id,
    outputId: pair.output.$id,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
