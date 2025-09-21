import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolSchemaPair } from "@woodshop/schemas";
import { buildObjectSchema } from "./validation.js";
import {
  attachProvenance,
  buildProvenanceContext,
  ToolExecutionContext,
  WithProvenance,
} from "./provenance.js";

export interface ToolDefinition<I extends { seed?: number }, Core extends Record<string, unknown>> {
  name: string;
  title: string;
  description: string;
  schemas: ToolSchemaPair;
  handler: (input: I, context: ToolExecutionContext<I>) => Promise<Core>;
  summarize?: (output: WithProvenance<Core>, context: ToolExecutionContext<I>) => string;
}

export interface ValidatedTool<I extends { seed?: number }, Core extends Record<string, unknown>> {
  readonly name: string;
  run(input: I): Promise<WithProvenance<Core>>;
  register(server: McpServer): void;
}

function defaultSummary(toolName: string): string {
  return `${toolName} completed successfully.`;
}

export function createValidatedTool<I extends { seed?: number }, Core extends Record<string, unknown>>(
  definition: ToolDefinition<I, Core>,
): ValidatedTool<I, Core> {
  const inputZod = buildObjectSchema(definition.schemas.input);
  const outputZod = buildObjectSchema(definition.schemas.output);

  async function evaluate(rawInput: unknown): Promise<{
    parsed: I;
    context: ToolExecutionContext<I>;
    output: WithProvenance<Core>;
  }> {
    const parsedInput = inputZod.parse(rawInput ?? {}) as I;
    const context = buildProvenanceContext(parsedInput);
    const coreResult = await definition.handler(parsedInput, context);
    const withProvenance = attachProvenance(coreResult, context);
    const validated = outputZod.parse(withProvenance) as WithProvenance<Core>;
    return { parsed: parsedInput, context, output: validated };
  }

  return {
    name: definition.name,
    async run(input: I): Promise<WithProvenance<Core>> {
      const { output } = await evaluate(input);
      return output;
    },
    register(server: McpServer): void {
      server.registerTool(
        definition.name,
        {
          title: definition.title,
          description: definition.description,
          inputSchema: inputZod.shape,
          outputSchema: outputZod.shape,
        },
        async (args) => {
          const { context, output } = await evaluate(args ?? {});
          const summary = definition.summarize?.(output, context) ?? defaultSummary(definition.name);
          return {
            content: [
              {
                type: "text" as const,
                text: summary,
              },
            ],
            structuredContent: output,
          };
        },
      );
    },
  };
}
