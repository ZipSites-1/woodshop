import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

export function registerAllTools(server: McpServer): void {
  registerCreateProject(server);
  registerExtractCutlist(server);
  registerExportArtifacts(server);
  registerWoodMovement(server);
  registerNestParts(server);
}

export const toolRunners = {
  create_project: runCreateProject,
  extract_cutlist: runExtractCutlist,
  export_artifacts: runExportArtifacts,
  wood_movement_check: runWoodMovementCheck,
  nest_parts: runNestParts,
} as const;

export const toolDefinitions = [
  createProjectTool,
  extractCutlistTool,
  exportArtifactsTool,
  woodMovementTool,
  nestPartsTool,
] as const;
