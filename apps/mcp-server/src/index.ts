console.log("MCP server stub (JSON-RPC). Expose tools via registry.ts");

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

const server = new McpServer({
  name: "woodshop-mcp",
  version: "0.1.0",
});

registerAllTools(server);

// Start stdio transport (compatible with MCP clients)
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error("[MCP] woodshop-mcp server connected on stdio");
});
