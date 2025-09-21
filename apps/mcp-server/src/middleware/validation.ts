import { z } from "zod";
import { sharedDefinitions } from "@woodshop/schemas";
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

type SchemaWithType = JsonSchema & {
  type?: string | string[];
  $ref?: string;
  allOf?: SchemaWithType[];
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, SchemaWithType> | Record<string, unknown>;
  required?: string[] | unknown;
  additionalProperties?: boolean | SchemaWithType | Record<string, unknown>;
};

type ObjectSchema = SchemaWithType & {
  properties?: Record<string, SchemaWithType>;
  required?: string[];
  additionalProperties?: boolean | SchemaWithType;
};

function decodePointerToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function resolvePointer<T>(target: T, pointer: string): unknown {
  if (!pointer) {
    return target;
  }
  const segments = pointer.split("/").map(decodePointerToken);
  let current: unknown = target;
  for (const segment of segments) {
    if (!segment) continue;
    if (current && typeof current === "object" && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const sharedDocuments: Record<string, unknown> = {
  "./common.schema.json": sharedDefinitions,
};

function resolveRef(ref: string, currentDoc?: string): { schema: SchemaWithType; docPath: string } | undefined {
  const [docPathPart, fragment = ""] = ref.split("#");
  const targetDoc = docPathPart && docPathPart.length > 0 ? docPathPart : currentDoc;
  if (!targetDoc) {
    return undefined;
  }
  const document = sharedDocuments[targetDoc];
  if (!document) {
    return undefined;
  }
  const resolved = resolvePointer(document, fragment);
  if (!resolved || typeof resolved !== "object") {
    return undefined;
  }
  return { schema: resolved as SchemaWithType, docPath: targetDoc };
}

function mergeSchemas(base: SchemaWithType, addition: SchemaWithType): SchemaWithType {
  const result: SchemaWithType = { ...base };

  if (addition.type !== undefined) {
    result.type = addition.type;
  }

  if (addition.enum !== undefined) {
    result.enum = addition.enum;
  }

  if (addition.default !== undefined) {
    result.default = addition.default;
  }

  if (isRecord((addition as Record<string, unknown>).properties)) {
    const additionProperties = addition.properties as Record<string, SchemaWithType>;
    const currentProperties = isRecord((result as Record<string, unknown>).properties)
      ? (result.properties as Record<string, SchemaWithType>)
      : {};
    result.properties = {
      ...currentProperties,
      ...additionProperties,
    };
  }

  const additionRequired = Array.isArray((addition as Record<string, unknown>).required)
    ? ((addition as Record<string, unknown>).required as string[])
    : undefined;
  if (additionRequired) {
    const baseRequired = Array.isArray((result as Record<string, unknown>).required)
      ? ((result as Record<string, unknown>).required as string[])
      : [];
    const mergedRequired = new Set(baseRequired);
    for (const item of additionRequired) {
      mergedRequired.add(item);
    }
    result.required = Array.from(mergedRequired);
  }

  if (Object.prototype.hasOwnProperty.call(addition, "additionalProperties")) {
    result.additionalProperties = addition.additionalProperties;
  }

  for (const [key, value] of Object.entries(addition)) {
    if (key === "type" || key === "enum" || key === "default" || key === "properties" || key === "required" || key === "additionalProperties" || key === "allOf" || key === "$ref") {
      continue;
    }
    (result as Record<string, unknown>)[key] = value;
  }

  return result;
}

function expandSchema(schema: SchemaWithType, currentDoc?: string): { schema: SchemaWithType; docPath?: string } {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, currentDoc);
    if (!resolved) {
      throw new Error(`Unable to resolve schema reference: ${schema.$ref}`);
    }
    return expandSchema(resolved.schema, resolved.docPath);
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    let merged: SchemaWithType | undefined;
    for (const part of schema.allOf) {
      const expandedPart = expandSchema(part as SchemaWithType, currentDoc);
      merged = merged
        ? mergeSchemas(merged, expandedPart.schema)
        : expandedPart.schema;
    }
    const { allOf, ...rest } = schema;
    if (merged) {
      return { schema: mergeSchemas(merged, rest as SchemaWithType), docPath: currentDoc };
    }
    return { schema: rest as SchemaWithType, docPath: currentDoc };
  }

  return { schema, docPath: currentDoc };
}

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

interface SchemaToZodOptions {
  skipExpand?: boolean;
  docPath?: string;
}

export function schemaToZod(
  rawSchema: SchemaWithType,
  currentDoc?: string,
  options?: SchemaToZodOptions,
): z.ZodTypeAny {
  let schema: SchemaWithType;
  let nextDoc = currentDoc;
  if (options?.skipExpand) {
    schema = rawSchema;
    nextDoc = options.docPath ?? currentDoc;
  } else {
    const expanded = expandSchema(rawSchema, currentDoc);
    schema = expanded.schema;
    nextDoc = expanded.docPath ?? currentDoc;
  }

  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return literalUnion(schema.enum);
  }

  const type = schema.type;

  if (Array.isArray(type) && type.length > 0) {
    const variants = type.map((single) => schemaToZod({ ...schema, type: single }, nextDoc));
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
      const items = schema.items ? schemaToZod(schema.items as SchemaWithType, nextDoc) : z.unknown();
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
      return objectSchemaToZod(schema as ObjectSchema, nextDoc);
    }
    default: {
      return z.unknown();
    }
  }
}

function objectSchemaToZod(schema: ObjectSchema, currentDoc?: string): z.ZodTypeAny {
  const propertiesRecord = isRecord(schema.properties) ? (schema.properties as Record<string, SchemaWithType>) : {};
  const requiredList = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const required = new Set(requiredList);
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const key of Object.keys(propertiesRecord).sort()) {
    const propertySchema = propertiesRecord[key];
    const expanded = expandSchema(propertySchema, currentDoc);
    const hasDefault = Object.prototype.hasOwnProperty.call(expanded.schema, "default");
    let propType = schemaToZod(expanded.schema, expanded.docPath ?? currentDoc, {
      skipExpand: true,
      docPath: expanded.docPath ?? currentDoc,
    });
    if (!required.has(key) && !hasDefault) {
      propType = propType.optional();
    }
    shape[key] = propType;
  }

  let object: AnyZodObject = z.object(shape);

  if (schema.additionalProperties === false) {
    object = object.strict();
  } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    const expandedAdditional = expandSchema(schema.additionalProperties as SchemaWithType, currentDoc);
    object = object.catchall(
      schemaToZod(expandedAdditional.schema, expandedAdditional.docPath ?? currentDoc, {
        skipExpand: true,
        docPath: expandedAdditional.docPath ?? currentDoc,
      }),
    );
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
