import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolInputMap, ToolName, ToolOutputMap } from "@woodshop/types";
import {
  createProjectTool,
  registerCreateProject,
  runCreateProject,
} from "./createProject.js";
import {
  paramUpdateTool,
  registerParamUpdate,
  runParamUpdate,
} from "./paramUpdate.js";
import {
  extractCutlistTool,
  registerExtractCutlist,
  runExtractCutlist,
} from "./extractCutlist.js";
import {
  exportArtifactsTool,
  registerExportArtifacts,
  runExportArtifacts,
} from "./exportArtifacts.js";
import {
  explainChangeTool,
  registerExplainChange,
  runExplainChange,
} from "./explainChange.js";
import {
  applyJoineryTool,
  registerApplyJoinery,
  runApplyJoinery,
} from "./applyJoinery.js";
import {
  analyzeGeometryTool,
  registerAnalyzeGeometry,
  runAnalyzeGeometry,
} from "./analyzeGeometry.js";
import {
  woodMovementTool,
  registerWoodMovement,
  runWoodMovementCheck,
} from "./woodMovement.js";
import {
  nestPartsTool,
  registerNestParts,
  runNestParts,
} from "./nestParts.js";
import {
  makeDrawingTool,
  registerMakeDrawing,
  runMakeDrawing,
} from "./makeDrawing.js";
import {
  generateToolpathsTool,
  registerGenerateToolpaths,
  runGenerateToolpaths,
} from "./generateToolpaths.js";
import {
  postprocessGrblTool,
  registerPostprocessGrbl,
  runPostprocessGrbl,
} from "./postprocessGrbl.js";
import {
  redoTool,
  registerRedo,
  runRedo,
} from "./redo.js";
import {
  undoTool,
  registerUndo,
  runUndo,
} from "./undo.js";
import type { ValidatedTool } from "../middleware/index.js";

type ToolRunnerMap = {
  [Key in ToolName]: (input: ToolInputMap[Key]) => Promise<ToolOutputMap[Key]>;
};

export function registerAllTools(server: McpServer): void {
  registerCreateProject(server);
  registerParamUpdate(server);
  registerExtractCutlist(server);
  registerExportArtifacts(server);
  registerExplainChange(server);
  registerApplyJoinery(server);
  registerAnalyzeGeometry(server);
  registerWoodMovement(server);
  registerNestParts(server);
  registerMakeDrawing(server);
  registerGenerateToolpaths(server);
  registerPostprocessGrbl(server);
  registerUndo(server);
  registerRedo(server);
}

export const toolRunners: ToolRunnerMap = {
  create_project: runCreateProject,
  param_update: runParamUpdate,
  extract_cutlist: runExtractCutlist,
  export_artifacts: runExportArtifacts,
  explain_change: runExplainChange,
  apply_joinery: runApplyJoinery,
  analyze_geometry: runAnalyzeGeometry,
  wood_movement_check: runWoodMovementCheck,
  nest_parts: runNestParts,
  make_drawing: runMakeDrawing,
  generate_toolpaths: runGenerateToolpaths,
  postprocess_grbl: runPostprocessGrbl,
  redo: runRedo,
  undo: runUndo,
} as const;
export const toolDefinitions: ReadonlyArray<ValidatedTool<any, any>> = [
  createProjectTool,
  paramUpdateTool,
  extractCutlistTool,
  exportArtifactsTool,
  explainChangeTool,
  applyJoineryTool,
  analyzeGeometryTool,
  woodMovementTool,
  nestPartsTool,
  makeDrawingTool,
  generateToolpathsTool,
  postprocessGrblTool,
  undoTool,
  redoTool,
];
