#!/usr/bin/env node
import { registry } from "../../apps/mcp-server/dist/registry.js";

if (!registry?.tools) {
  console.error("Registry not built. Run pnpm --filter @woodshop/mcp-server build first.");
  process.exit(1);
}

const rows = registry.tools.map((tool) => ({
  name: tool.name,
  input: tool.inputId,
  output: tool.outputId,
}));

console.table(rows);
