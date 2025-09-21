import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { toolSchemas } from "@woodshop/schemas";
import type { WoodMovementCheckInput, WoodMovementCheckOutput } from "@woodshop/types";
import { createValidatedTool, ToolError } from "../middleware/index.js";
import type { ToolExecutionContext } from "../middleware/provenance.js";

interface SpeciesCoefficients {
  radial: number;
  tangential: number;
  longitudinal: number;
}

const SPECIES_TABLE: Record<string, SpeciesCoefficients> = {
  birch: { radial: 0.00027, tangential: 0.00041, longitudinal: 0.00002 },
  oak: { radial: 0.00030, tangential: 0.00038, longitudinal: 0.00002 },
  maple: { radial: 0.00029, tangential: 0.00043, longitudinal: 0.00002 },
  walnut: { radial: 0.00028, tangential: 0.00037, longitudinal: 0.00002 },
  cherry: { radial: 0.00027, tangential: 0.00036, longitudinal: 0.00002 },
};

const REFERENCE_RH = 50; // percent
const WARNING_THRESHOLD_MM = 1.0;

function resolveCoefficients(species: string): SpeciesCoefficients {
  const key = species.toLowerCase();
  const coefficients = SPECIES_TABLE[key];
  if (!coefficients) {
    throw new ToolError({
      code: "UNKNOWN_SPECIES",
      message: `No movement coefficients registered for species '${species}'.`,
      details: { species },
    });
  }
  return coefficients;
}

function deltaForAxis(
  axis: "length" | "width" | "thickness",
  coeffs: SpeciesCoefficients,
  nominal: { length: number; width: number; thickness: number },
  deltaRh: number,
): { length: number; width: number; thickness: number } {
  const axisCoefficient = {
    length: coeffs.longitudinal,
    width: coeffs.tangential,
    thickness: coeffs.radial,
  } as const;

  const deltaFactor = axisCoefficient[axis] * deltaRh;

  return {
    length: nominal.length * (axis === "length" ? deltaFactor : coeffs.longitudinal * deltaRh),
    width: nominal.width * (axis === "width" ? deltaFactor : coeffs.tangential * deltaRh),
    thickness: nominal.thickness * (axis === "thickness" ? deltaFactor : coeffs.radial * deltaRh),
  };
}

function deriveDelta(
  part: WoodMovementCheckInput["parts"][number],
  ambientRh: number,
): { length: number; width: number; thickness: number } {
  const coeffs = resolveCoefficients(part.species);
  const deltaRh = ambientRh - REFERENCE_RH;
  return deltaForAxis(part.grain_axis, coeffs, part.nominal_mm, deltaRh);
}

type WoodMovementCore = Omit<
  WoodMovementCheckOutput,
  "seed" | "engine_versions" | "revision_id" | "inputs_hash"
>;

export const woodMovementTool = createValidatedTool<WoodMovementCheckInput, WoodMovementCore>({
  name: "wood_movement_check",
  title: "Wood Movement Check",
  description: "Estimate dimensional change under varying ambient humidity.",
  schemas: toolSchemas.wood_movement_check,
  async handler(input: WoodMovementCheckInput, _context: ToolExecutionContext<WoodMovementCheckInput>) {
    const perPart = input.parts.map((part) => {
      const deltas = deriveDelta(part, input.ambient.relative_humidity);
      const warning =
        Math.max(Math.abs(deltas.width), Math.abs(deltas.length), Math.abs(deltas.thickness)) > WARNING_THRESHOLD_MM
          ? `Movement exceeds ${WARNING_THRESHOLD_MM}mm on at least one axis.`
          : null;
      return {
        part_id: part.part_id,
        species: part.species,
        delta_length_mm: Number(deltas.length.toFixed(3)),
        delta_width_mm: Number(deltas.width.toFixed(3)),
        delta_thickness_mm: Number(deltas.thickness.toFixed(3)),
        warning,
      };
    });

    const warnings = perPart
      .filter((part) => part.warning !== null)
      .map((part) => ({ part_id: part.part_id, severity: "warning" as const, message: part.warning ?? "" }));

    return {
      project_id: input.project_id,
      ambient: input.ambient,
      per_part: perPart,
      warnings,
    } satisfies WoodMovementCore;
  },
  summarize: (output) => `Wood movement computed for ${output.per_part.length} parts.`,
});

export function registerWoodMovement(server: McpServer): void {
  woodMovementTool.register(server);
}

export async function runWoodMovementCheck(
  input: WoodMovementCheckInput,
): Promise<WoodMovementCheckOutput> {
  return woodMovementTool.run(input) as Promise<WoodMovementCheckOutput>;
}
