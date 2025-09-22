import { registrySchemas } from "@woodshop/schemas";
import { toolDefinitions } from "./tools/index.js";

interface RegistryToolEntry {
  name: string;
  title: string;
  description: string;
  input_schema?: string | null;
  output_schema?: string | null;
}

interface RegistryManifest {
  name: string;
  version: string;
  generated_at: string;
  tools: RegistryToolEntry[];
  schemas: typeof registrySchemas;
}

export function getRegistryManifest(): RegistryManifest {
  const schemaLookup = new Map(registrySchemas.map((entry) => [entry.name, entry]));
  const tools: RegistryToolEntry[] = toolDefinitions.map((tool) => {
    const schemas = schemaLookup.get(tool.name);
    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      input_schema: schemas?.inputId ?? null,
      output_schema: schemas?.outputId ?? null,
    };
  });

  return {
    name: "woodshop-mcp",
    version: "0.1.0",
    generated_at: new Date().toISOString(),
    tools,
    schemas: registrySchemas,
  };
}

export const registry = getRegistryManifest();
