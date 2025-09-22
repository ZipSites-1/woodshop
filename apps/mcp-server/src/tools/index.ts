import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolInputMap, ToolName, ToolOutputMap } from "@woodshop/types";
import {
  createProjectTool,
  registerCreateProject,
  runCreateProject,
} from "./createProject.js";
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
  woodMovementTool,
  registerWoodMovement,
  runWoodMovementCheck,
} from "./woodMovement.js";
import {
  nestPartsTool,
  registerNestParts,
  runNestParts,
} from "./nestParts.js";
import type { ValidatedTool } from "../middleware/index.js";

type ToolRunnerMap = {
  [Key in ToolName]: (input: ToolInputMap[Key]) => Promise<ToolOutputMap[Key]>;
};

export function registerAllTools(server: McpServer): void {
  registerCreateProject(server);
  registerExtractCutlist(server);
  registerExportArtifacts(server);
  registerWoodMovement(server);
  registerNestParts(server);
}

export const toolRunners: ToolRunnerMap = {
  create_project: runCreateProject,
  extract_cutlist: runExtractCutlist,
  export_artifacts: runExportArtifacts,
  wood_movement_check: runWoodMovementCheck,
  nest_parts: runNestParts,
} as const;
export const toolDefinitions: ReadonlyArray<ValidatedTool<any, any>> = [
  createProjectTool,
  extractCutlistTool,
  exportArtifactsTool,
  woodMovementTool,
  nestPartsTool,
];
