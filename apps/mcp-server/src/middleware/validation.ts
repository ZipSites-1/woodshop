import { z } from "zod";
import type { JsonSchema } from "@woodshop/schemas";

const { ZodFirstPartyTypeKind } = z as unknown as {
  ZodFirstPartyTypeKind: Record<string, unknown>;
};

type AnyZodObject = z.ZodObject<
  Record<string, z.ZodTypeAny>,
  z.UnknownKeysParam,
  z.ZodTypeAny,
  Record<string, unknown>,
  Record<string, unknown>
>;

type SchemaWithType = JsonSchema & { type?: string | string[] };

type ObjectSchema = SchemaWithType & {
  properties?: Record<string, SchemaWithType>;
  required?: string[];
  additionalProperties?: boolean | SchemaWithType;
};

function literalUnion(values: unknown[]): z.ZodTypeAny {
  const literals = values.map((value) => value as string | number | boolean | null);
  if (literals.length === 1) {
    return z.literal(literals[0]);
  }
  const zodLiterals = literals.map((value) => z.literal(value));
  return z.union(zodLiterals as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
}

function applyStringConstraints(schema: SchemaWithType, base: z.ZodString): z.ZodString {
  let result = base;
  if (typeof (schema as Record<string, unknown>).minLength === "number") {
    result = result.min((schema as Record<string, number>).minLength);
  }
  if (typeof (schema as Record<string, unknown>).maxLength === "number") {
    result = result.max((schema as Record<string, number>).maxLength);
  }
  return result;
}

function applyNumberConstraints(schema: SchemaWithType, base: z.ZodNumber): z.ZodNumber {
  let result = base;
  if (typeof (schema as Record<string, unknown>).minimum === "number") {
    result = result.min((schema as Record<string, number>).minimum);
  }
  if (typeof (schema as Record<string, unknown>).maximum === "number") {
    result = result.max((schema as Record<string, number>).maximum);
  }
  return result;
}

function withDefault<T extends z.ZodTypeAny>(schema: SchemaWithType, current: T): T {
  if (Object.prototype.hasOwnProperty.call(schema, "default")) {
    return current.default((schema as Record<string, unknown>).default) as unknown as T;
  }
  return current;
}

export function schemaToZod(schema: SchemaWithType): z.ZodTypeAny {
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return literalUnion(schema.enum);
  }

  const type = schema.type;

  if (Array.isArray(type) && type.length > 0) {
    const variants = type.map((single) => schemaToZod({ ...schema, type: single }));
    if (variants.length === 1) {
      return withDefault(schema, variants[0]);
    }
    const [first, second, ...rest] = variants;
    const union = z.union([first, second, ...rest] as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
    return withDefault(schema, union);
  }

  switch (type) {
    case "string": {
      const base = applyStringConstraints(schema, z.string());
      return withDefault(schema, base);
    }
    case "integer": {
      const base = applyNumberConstraints(schema, z.number().int());
      return withDefault(schema, base);
    }
    case "number": {
      const base = applyNumberConstraints(schema, z.number());
      return withDefault(schema, base);
    }
    case "boolean": {
      return withDefault(schema, z.boolean());
    }
    case "null": {
      return withDefault(schema, z.null());
    }
    case "array": {
      const items = schema.items ? schemaToZod(schema.items as SchemaWithType) : z.unknown();
      let arr = z.array(items);
      if (typeof (schema as Record<string, unknown>).minItems === "number") {
        arr = arr.min((schema as Record<string, number>).minItems);
      }
      if (typeof (schema as Record<string, unknown>).maxItems === "number") {
        arr = arr.max((schema as Record<string, number>).maxItems);
      }
      return withDefault(schema, arr);
    }
    case "object":
    case undefined: {
      return objectSchemaToZod(schema as ObjectSchema);
    }
    default: {
      return z.unknown();
    }
  }
}

function objectSchemaToZod(schema: ObjectSchema): z.ZodTypeAny {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const key of Object.keys(properties).sort()) {
    const propertySchema = properties[key];
    const hasDefault = Object.prototype.hasOwnProperty.call(propertySchema, "default");
    let propType = schemaToZod(propertySchema);
    if (!required.has(key) && !hasDefault) {
      propType = propType.optional();
    }
    shape[key] = propType;
  }

  let object: AnyZodObject = z.object(shape);

  if (schema.additionalProperties === false) {
    object = object.strict();
  } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    object = object.catchall(schemaToZod(schema.additionalProperties as SchemaWithType));
  }

  return withDefault(schema, object);
}

export function buildObjectSchema(schema: SchemaWithType): AnyZodObject {
  const zodSchema = schemaToZod(schema);
  if (!((zodSchema as { _def?: { typeName?: unknown } })._def?.typeName === (ZodFirstPartyTypeKind as any).ZodObject)) {
    throw new Error(`Expected object schema, received ${schema.title ?? "<unnamed>"}`);
  }
  return zodSchema as AnyZodObject;
}
