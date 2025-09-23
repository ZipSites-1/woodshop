#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "..", "..");
const catalogPath = resolve(repoRoot, "codex/agent-pack/catalogs/woodshop-tools.json");
const openrpcPath = resolve(repoRoot, "codex/agent-pack/catalogs/woodshop-openrpc.json");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const methods = catalog.tools.map((tool) => ({
  name: tool.name,
  summary: tool.title,
  description: tool.description,
  params: [
    {
      name: "input",
      schema: tool.input_schema ? { $ref: tool.input_schema } : { type: "object" },
      required: true,
      description: "Input payload matching the MCP JSON Schema."
    }
  ],
  result: {
    name: "result",
    description: "Tool response as defined by the MCP JSON Schema.",
    schema: tool.output_schema ? { $ref: tool.output_schema } : { type: "object" }
  },
  errors: [],
  tags: [
    { name: tool.deterministic ? "deterministic" : "non-deterministic" },
    ...(tool.consent_required ? [{ name: "consent-required" }] : [])
  ],
  externalDocs: tool.example ? {
    description: "Example input/output",
    url: `https://github.com/ZipSites-1/woodshop/tree/main/codex/agent-pack/catalogs/woodshop-tools.json`
  } : undefined
}));

const openrpcDocument = {
  openrpc: "1.2.6",
  info: {
    title: "Woodshop MCP Tooling",
    version: catalog.version ?? "0.1.0",
    description: "Generated from codex/agent-pack/catalogs/woodshop-tools.json"
  },
  servers: [
    {
      name: "local-stdio",
      url: "stdio://",
      summary: "Local MCP server over stdio"
    }
  ],
  methods,
  components: {}
};

writeFileSync(openrpcPath, `${JSON.stringify(openrpcDocument, null, 2)}\n`);
console.log(`OpenRPC document written to ${openrpcPath}`);
