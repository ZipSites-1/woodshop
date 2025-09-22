import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logEvent } from "./util/logger.js";
import { registerAllTools } from "./tools/index.js";
import { getRegistryManifest } from "./registry.js";
import { toolSchemas } from "@woodshop/schemas";

const server = new McpServer({
  name: "woodshop-mcp",
  version: "0.1.0",
});

registerAllTools(server);

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  logEvent("server.connected", { transport: "stdio" });
});

function respondJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body, "utf8"),
  });
  res.end(body);
}

function startHttpServer(): void {
  const portEnv = process.env.WOODSHOP_MCP_HTTP_PORT ?? process.env.PORT;
  if (!portEnv) {
    return;
  }
  const port = Number.parseInt(portEnv, 10);
  if (!Number.isInteger(port) || port <= 0) {
    logEvent("server.http.skipped", {
      reason: "invalid_port",
      value: portEnv,
    });
    return;
  }

  const httpServer = createServer((req, res) => {
    if (!req.url) {
      respondJson(res, 400, { error: "Bad request" });
      return;
    }

    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
      respondJson(res, 200, {
        status: "ok",
        uptime_sec: Number(process.uptime().toFixed(2)),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/registry") {
      respondJson(res, 200, getRegistryManifest());
      return;
    }

    if (req.method === "GET" && url.pathname === "/schemas") {
      respondJson(res, 200, {
        tools: Object.keys(toolSchemas).sort(),
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/schemas/")) {
      const [, , tool, role] = url.pathname.split("/");
      if (!tool || (role !== "input" && role !== "output")) {
        respondJson(res, 404, { error: "Schema not found" });
        return;
      }
      if (!Object.prototype.hasOwnProperty.call(toolSchemas, tool)) {
        respondJson(res, 404, { error: "Unknown tool" });
        return;
      }
      const entry = toolSchemas[tool as keyof typeof toolSchemas];
      respondJson(res, 200, entry[role]);
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      respondJson(res, 200, {
        name: "woodshop-mcp",
        links: {
          health: "/healthz",
          registry: "/registry",
          schemas: "/schemas",
        },
      });
      return;
    }

    respondJson(res, 404, { error: "Not found" });
  });

  httpServer.listen(port, () => {
    logEvent("server.http.listening", { port });
  });

  httpServer.on("error", (error) => {
    logEvent("server.http.error", { message: error.message }, "error");
  });
}

startHttpServer();
