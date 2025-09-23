#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "..", "..");
const catalogPath = resolve(repoRoot, "codex/agent-pack/catalogs/woodshop-tools.json");
const openrpcPath = resolve(repoRoot, "codex/agent-pack/catalogs/woodshop-openrpc.json");
const schemaDir = resolve(repoRoot, "packages/schemas/dist");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const componentsSchemas = {};

function loadSchemaFromId(id) {
  if (!id) return undefined;
  const fileName = id.split("/").pop();
  if (!fileName) return undefined;
  const schemaFile = fileName.replace(".json", ".schema.json");
  const diskPath = resolve(schemaDir, schemaFile);
  try {
    const schema = JSON.parse(readFileSync(diskPath, "utf8"));
    const componentName = fileName.replace(/\.json$/, "");
    componentsSchemas[componentName] = schema;
  } catch (error) {
    console.warn(`Unable to load schema for ${id}: ${(error).message}`);
  }
}

const methods = catalog.tools.map((tool) => {
  loadSchemaFromId(tool.input_schema);
  loadSchemaFromId(tool.output_schema);

  return {
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
};
});

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
  components: {
    schemas: componentsSchemas
  }
};

writeFileSync(openrpcPath, `${JSON.stringify(openrpcDocument, null, 2)}\n`);
console.log(`OpenRPC document written to ${openrpcPath}`);
