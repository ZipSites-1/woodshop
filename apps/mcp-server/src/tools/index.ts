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

export function registerAllTools(server: McpServer): void {
  registerCreateProject(server);
  registerExtractCutlist(server);
  registerExportArtifacts(server);
}

export const toolRunners = {
  create_project: runCreateProject,
  extract_cutlist: runExtractCutlist,
  export_artifacts: runExportArtifacts,
} as const;

export const toolDefinitions = [
  createProjectTool,
  extractCutlistTool,
  exportArtifactsTool,
] as const;
