import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { ParamUpdateInput, ParamUpdateOutput } from "@woodshop/types";
import { createValidatedTool } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";
import { stableHash } from "../util/stableHash.js";

type ParamUpdateCore = Omit<
  ParamUpdateOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

type ParameterName = keyof ParamUpdateInput["current"];

type ConstraintOverride = NonNullable<ParamUpdateInput["constraints"]>[string];

type NumericConstraint = {
  kind: "number" | "integer";
  min: number;
  max: number;
  step?: number;
};

type EnumConstraint = {
  kind: "enum";
  values: ReadonlyArray<string>;
};

type BooleanConstraint = {
  kind: "boolean";
};

type Constraint = NumericConstraint | EnumConstraint | BooleanConstraint;

const BASE_CONSTRAINTS: Record<ParameterName, Constraint> = {
  width_mm: { kind: "number", min: 300, max: 3600, step: 1 },
  height_mm: { kind: "number", min: 300, max: 2500, step: 1 },
  depth_mm: { kind: "number", min: 200, max: 1000, step: 1 },
  shelf_count: { kind: "integer", min: 0, max: 20, step: 1 },
  door_style: { kind: "enum", values: ["slab", "shaker", "louver"] },
  back_panel: { kind: "boolean" },
};

function mergeConstraints(parameter: ParameterName, override?: ConstraintOverride): Constraint {
  const base = BASE_CONSTRAINTS[parameter];
  if (!override) {
    return base;
  }

  if (base.kind === "enum") {
    if (override.enum && Array.isArray(override.enum) && override.enum.length > 0) {
      return { kind: "enum", values: override.enum.map((value) => String(value)) };
    }
    return base;
  }

  if (base.kind === "boolean") {
    return base;
  }

  const merged: NumericConstraint = {
    kind: base.kind,
    min: typeof override.min === "number" ? override.min : base.min,
    max: typeof override.max === "number" ? override.max : base.max,
    step: typeof override.step === "number" && override.step > 0 ? override.step : base.step,
  };
  if (merged.min > merged.max) {
    [merged.min, merged.max] = [merged.max, merged.min];
  }
  return merged;
}

interface ValidationSuccess<T> {
  ok: true;
  value: T;
  reason: string | null;
}

interface ValidationFailure {
  ok: false;
  code: string;
  message: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function isValidationFailure<T>(result: ValidationResult<T>): result is ValidationFailure {
  return !result.ok;
}

function validateValue(
  parameter: ParameterName,
  value: unknown,
  constraint: Constraint,
): ValidationResult<ParamUpdateInput["current"][ParameterName]> {
  switch (constraint.kind) {
    case "boolean": {
      if (typeof value !== "boolean") {
        return { ok: false, code: "INVALID_TYPE", message: "Expected boolean value" };
      }
      return { ok: true, value, reason: null };
    }
    case "enum": {
      if (typeof value !== "string") {
        return { ok: false, code: "INVALID_TYPE", message: "Expected string value" };
      }
      if (!constraint.values.includes(value)) {
        return {
          ok: false,
          code: "INVALID_ENUM",
          message: `Value must be one of: ${constraint.values.join(", ")}`,
        };
      }
      return { ok: true, value: value as ParamUpdateInput["current"][ParameterName], reason: null };
    }
    case "number":
    case "integer": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return { ok: false, code: "INVALID_TYPE", message: "Expected numeric value" };
      }
      const normalized = constraint.kind === "integer" ? Math.round(value) : value;
      if (!Number.isFinite(normalized)) {
        return { ok: false, code: "INVALID_VALUE", message: "Value must be finite" };
      }
      if (normalized < constraint.min || normalized > constraint.max) {
        return {
          ok: false,
          code: "OUT_OF_RANGE",
          message: `Value must be between ${constraint.min} and ${constraint.max}`,
        };
      }
      if (constraint.step) {
        const remainder = Math.abs((normalized - constraint.min) % constraint.step);
        const aligned = remainder < 1e-6 || Math.abs(remainder - constraint.step) < 1e-6;
        if (!aligned) {
          return {
            ok: false,
            code: "STEP_MISMATCH",
            message: `Value must align to step of ${constraint.step}`,
          };
        }
      }
      return {
        ok: true,
        value: normalized as ParamUpdateInput["current"][ParameterName],
        reason: null,
      };
    }
    default:
      return { ok: false, code: "INVALID_PARAMETER", message: "Unsupported parameter" };
  }
}

function numericDelta(previous: unknown, next: unknown): number | null {
  if (typeof previous === "number" && typeof next === "number") {
    return Number((next - previous).toFixed(3));
  }
  return null;
}

function pushWarning(
  warnings: ParamUpdateCore["warnings"],
  severity: "info" | "warning" | "critical",
  message: string,
): void {
  warnings.push({ part_id: null, severity, message });
}

const paramUpdateTool = createValidatedTool<ParamUpdateInput, ParamUpdateCore>({
  name: "param_update",
  title: "Update Parameters",
  description: "Validate and apply project-level parameter changes.",
  schemas: toolSchemas.param_update,
  async handler(input: ParamUpdateInput, _context: ToolExecutionContext<ParamUpdateInput>) {
    const applied: ParamUpdateCore["applied"] = [];
    const rejected: ParamUpdateCore["rejected"] = [];
    const warnings: ParamUpdateCore["warnings"] = [];

    const nextParameters: ParamUpdateInput["current"] = { ...input.current };
    const state = nextParameters as Record<ParameterName, ParamUpdateInput["current"][ParameterName]>;

    for (const change of input.changes) {
      const parameter = change.parameter as ParameterName;
      if (!(parameter in BASE_CONSTRAINTS)) {
        rejected.push({
          parameter,
          requested_value: change.value as never,
          code: "UNKNOWN_PARAMETER",
          message: `Parameter '${parameter}' is not recognized`,
        });
        continue;
      }

      const constraint = mergeConstraints(parameter, input.constraints?.[parameter]);
      const validation = validateValue(parameter, change.value, constraint);
      if (isValidationFailure(validation)) {
        rejected.push({
          parameter,
          requested_value: change.value as never,
          code: validation.code,
          message: validation.message,
        });
        continue;
      }

      const previousValue = state[parameter];
      const nextValue = validation.value;
      state[parameter] = nextValue;
      applied.push({
        parameter,
        previous_value: previousValue,
        next_value: nextValue,
        delta: numericDelta(previousValue, nextValue),
        reason: change.reason ?? null,
      });

      if (parameter === "shelf_count" && typeof nextValue === "number" && nextValue > 8) {
        pushWarning(
          warnings,
          "warning",
          "Shelf count above 8 may require back bracing for rigidity.",
        );
      }

      if (parameter === "width_mm" && typeof nextValue === "number" && nextValue > 2400) {
        pushWarning(
          warnings,
          "warning",
          "Width exceeds typical sheet stock; expect edge-joining or seams.",
        );
      }

      if (parameter === "door_style" && nextValue === "louver") {
        pushWarning(
          warnings,
          "info",
          "Louver doors increase machining time; ensure tooling is available.",
        );
      }
    }

    if (applied.length === 0) {
      pushWarning(warnings, "info", "No parameter changes were applied.");
    }

    const revisionTag = `rev_${stableHash({
      project_id: input.project_id,
      parameters: nextParameters,
    }).slice(0, 8)}`;

    const notes = input.notes ?? null;

    const hasBackPanel = nextParameters.back_panel;
    if (!hasBackPanel) {
      pushWarning(
        warnings,
        "warning",
        "Back panel disabled; verify torsional rigidity and racking resistance.",
      );
    }

    return {
      project_id: input.project_id,
      revision_tag: revisionTag,
      next_parameters: nextParameters,
      applied,
      rejected,
      warnings,
      notes,
    } satisfies ParamUpdateCore;
  },
  summarize: (output) =>
    `Applied ${output.applied.length} change(s); ${output.rejected.length} rejected.`,
});

export function registerParamUpdate(server: McpServer): void {
  paramUpdateTool.register(server);
}

export async function runParamUpdate(input: ParamUpdateInput): Promise<ParamUpdateOutput> {
  return paramUpdateTool.run(input) as Promise<ParamUpdateOutput>;
}

export { paramUpdateTool };
