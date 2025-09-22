import commonDefinitions from "./common.schema.json" with { type: "json" };
import applyJoineryInput from "./apply_joinery.input.schema.json" with { type: "json" };
import applyJoineryOutput from "./apply_joinery.output.schema.json" with { type: "json" };
import createProjectInput from "./create_project.input.schema.json" with { type: "json" };
import createProjectOutput from "./create_project.output.schema.json" with { type: "json" };
import exportArtifactsInput from "./export_artifacts.input.schema.json" with { type: "json" };
import exportArtifactsOutput from "./export_artifacts.output.schema.json" with { type: "json" };
import extractCutlistInput from "./extract_cutlist.input.schema.json" with { type: "json" };
import extractCutlistOutput from "./extract_cutlist.output.schema.json" with { type: "json" };
import generateToolpathsInput from "./generate_toolpaths.input.schema.json" with { type: "json" };
import generateToolpathsOutput from "./generate_toolpaths.output.schema.json" with { type: "json" };
import analyzeGeometryInput from "./analyze_geometry.input.schema.json" with { type: "json" };
import analyzeGeometryOutput from "./analyze_geometry.output.schema.json" with { type: "json" };
import makeDrawingInput from "./make_drawing.input.schema.json" with { type: "json" };
import makeDrawingOutput from "./make_drawing.output.schema.json" with { type: "json" };
import nestPartsInput from "./nest_parts.input.schema.json" with { type: "json" };
import nestPartsOutput from "./nest_parts.output.schema.json" with { type: "json" };
import paramUpdateInput from "./param_update.input.schema.json" with { type: "json" };
import paramUpdateOutput from "./param_update.output.schema.json" with { type: "json" };
import postprocessGrblInput from "./postprocess_grbl.input.schema.json" with { type: "json" };
import postprocessGrblOutput from "./postprocess_grbl.output.schema.json" with { type: "json" };
import woodMovementCheckInput from "./wood_movement_check.input.schema.json" with { type: "json" };
import woodMovementCheckOutput from "./wood_movement_check.output.schema.json" with { type: "json" };

export type JsonSchema = Record<string, unknown> & {
  $id: string;
  title?: string;
};

export interface ToolSchemaPair {
  input: JsonSchema;
  output: JsonSchema;
}

export const toolSchemas = {
  apply_joinery: {
    input: applyJoineryInput,
    output: applyJoineryOutput,
  },
  analyze_geometry: {
    input: analyzeGeometryInput,
    output: analyzeGeometryOutput,
  },
  create_project: {
    input: createProjectInput,
    output: createProjectOutput,
  },
  export_artifacts: {
    input: exportArtifactsInput,
    output: exportArtifactsOutput,
  },
  extract_cutlist: {
    input: extractCutlistInput,
    output: extractCutlistOutput,
  },
  generate_toolpaths: {
    input: generateToolpathsInput,
    output: generateToolpathsOutput,
  },
  make_drawing: {
    input: makeDrawingInput,
    output: makeDrawingOutput,
  },
  wood_movement_check: {
    input: woodMovementCheckInput,
    output: woodMovementCheckOutput,
  },
  nest_parts: {
    input: nestPartsInput,
    output: nestPartsOutput,
  },
  param_update: {
    input: paramUpdateInput,
    output: paramUpdateOutput,
  },
  postprocess_grbl: {
    input: postprocessGrblInput,
    output: postprocessGrblOutput,
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

export const sharedDefinitions = commonDefinitions;
