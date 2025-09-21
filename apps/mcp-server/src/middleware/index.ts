import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolSchemaPair } from "@woodshop/schemas";
import { ZodError } from "zod";
import { buildObjectSchema } from "./validation.js";
import {
  attachProvenance,
  buildProvenanceContext,
  ToolExecutionContext,
  WithProvenance,
} from "./provenance.js";

export interface ToolErrorPayload {
  code: string;
  message: string;
  details: unknown;
}

export class ToolError extends Error {
  readonly code: string;
  readonly details: unknown;

  constructor(payload: ToolErrorPayload) {
    super(payload.message);
    this.name = "ToolError";
    this.code = payload.code;
    this.details = payload.details;
  }
}

function formatZodIssues(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function validationError(details: unknown): ToolError {
  return new ToolError({
    code: "INVALID_INPUT",
    message: "Request failed schema validation.",
    details,
  });
}

function internalValidationError(details: unknown): ToolError {
  return new ToolError({
    code: "INVALID_OUTPUT",
    message: "Tool produced data that failed schema validation.",
    details,
  });
}

function coerceError(error: unknown): ToolError {
  if (error instanceof ToolError) {
    return error;
  }

  if (error instanceof ZodError) {
    return validationError({ issues: formatZodIssues(error) });
  }

  return new ToolError({
    code: "UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : "Unknown error",
    details: {},
  });
}

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
    let parsedInput: I;
    try {
      parsedInput = inputZod.parse(rawInput ?? {}) as I;
    } catch (error) {
      if (error instanceof ZodError) {
        throw validationError({ issues: formatZodIssues(error) });
      }
      throw coerceError(error);
    }

    const context = buildProvenanceContext(parsedInput);

    let coreResult: Core;
    try {
      coreResult = await definition.handler(parsedInput, context);
    } catch (error) {
      throw coerceError(error);
    }

    const withProvenance = attachProvenance(coreResult, context);
    try {
      const validated = outputZod.parse(withProvenance) as WithProvenance<Core>;
      return { parsed: parsedInput, context, output: validated };
    } catch (error) {
      if (error instanceof ZodError) {
        throw internalValidationError({ issues: formatZodIssues(error) });
      }
      throw coerceError(error);
    }
  }

  return {
    name: definition.name,
    async run(input: I): Promise<WithProvenance<Core>> {
      try {
        const { output } = await evaluate(input);
        return output;
      } catch (error) {
        throw coerceError(error);
      }
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
          try {
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
          } catch (error) {
            const toolError = coerceError(error);
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `${definition.name} failed: ${toolError.message}`,
                },
              ],
              structuredContent: {
                code: toolError.code,
                message: toolError.message,
                details: toolError.details,
              },
            };
          }
        },
      );
    },
  };
}
