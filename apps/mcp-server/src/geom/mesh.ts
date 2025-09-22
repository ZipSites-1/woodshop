import { createHash } from "node:crypto";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Mesh {
  name: string;
  vertices: Vec3[];
  indices: number[];
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export interface GeometryMetrics {
  vertexCount: number;
  triangleCount: number;
  surfaceArea: number;
  boundingBox: BoundingBox;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
}

export type GeometrySourceFormat = "step" | "iges";

function parseVector(parts: string[], line: string): Vec3 {
  if (parts.length < 3) {
    throw new Error(`Malformed vertex line: ${line}`);
  }
  const [x, y, z] = parts.map(Number);
  if (![x, y, z].every((value) => Number.isFinite(value))) {
    throw new Error(`Vertex components must be finite numbers: ${line}`);
  }
  return { x, y, z };
}

function parseIndices(parts: string[], line: string): [number, number, number] {
  if (parts.length < 3) {
    throw new Error(`Malformed index line: ${line}`);
  }
  const [a, b, c] = parts.map((value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`Indices must be non-negative integers: ${line}`);
    }
    return parsed;
  });
  return [a, b, c];
}

function parseStep(content: string): Mesh {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) {
    throw new Error("STEP content is empty");
  }

  const header = lines[0].trim();
  if (!header.startsWith("WOODSHOP_STEP")) {
    throw new Error("Unrecognized STEP header");
  }

  const mesh: Mesh = {
    name: "",
    vertices: [],
    indices: [],
  };

  let index = 1;
  while (index < lines.length) {
    const line = lines[index]?.trim();
    index += 1;
    if (!line) {
      continue;
    }

    if (line.startsWith("NAME ")) {
      mesh.name = line.substring(5).trim();
      continue;
    }

    if (line.startsWith("VERTICES ")) {
      const parts = line.split(/\s+/);
      const count = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isInteger(count) || count < 0) {
        throw new Error("Invalid STEP vertex count");
      }
      for (let i = 0; i < count; ++i) {
        const vertexLine = lines[index + i]?.trim();
        if (!vertexLine) {
          throw new Error("Unexpected end of STEP vertex list");
        }
        const vertexParts = vertexLine.split(/\s+/);
        mesh.vertices.push(parseVector(vertexParts, vertexLine));
      }
      index += count;
      continue;
    }

    if (line.startsWith("INDICES ")) {
      const parts = line.split(/\s+/);
      const count = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isInteger(count) || count < 0) {
        throw new Error("Invalid STEP index count");
      }
      for (let i = 0; i < count; ++i) {
        const indexLine = lines[index + i]?.trim();
        if (!indexLine) {
          throw new Error("Unexpected end of STEP index list");
        }
        const indexParts = indexLine.split(/\s+/);
        const [a, b, c] = parseIndices(indexParts, indexLine);
        mesh.indices.push(a, b, c);
      }
      index += count;
      continue;
    }

    if (line.startsWith("NORMALS ")) {
      const parts = line.split(/\s+/);
      const count = Number.parseInt(parts[1] ?? "", 10);
      if (!Number.isInteger(count) || count < 0) {
        throw new Error("Invalid STEP normal count");
      }
      index += count; // Skip normals; recomputed dynamically
      continue;
    }
  }

  if (mesh.vertices.length === 0) {
    throw new Error("STEP file contained no vertices");
  }
  if (mesh.indices.length % 3 !== 0) {
    throw new Error("STEP index list not divisible by three");
  }

  if (!mesh.name) {
    const hash = createHash("sha256").update(content).digest("hex");
    mesh.name = `step_${hash.substring(0, 8)}`;
  }

  return mesh;
}

function parseIges(content: string): Mesh {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) {
    throw new Error("IGES content is empty");
  }

  const header = lines[0].trim();
  if (header !== "WOODSHOP_IGES 1.0") {
    throw new Error("Unrecognized IGES header");
  }

  const mesh: Mesh = {
    name: "",
    vertices: [],
    indices: [],
  };

  for (let i = 1; i < lines.length; ++i) {
    const line = lines[i]?.trim();
    if (!line) {
      continue;
    }
    if (line === "END-IGES") {
      break;
    }
    if (line.startsWith("MODEL ")) {
      mesh.name = line.substring(6).trim();
      continue;
    }
    if (line.startsWith("VERTEX ")) {
      const parts = line.substring(7).trim().split(/\s+/);
      mesh.vertices.push(parseVector(parts, line));
      continue;
    }
    if (line.startsWith("FACE ")) {
      const parts = line.substring(5).trim().split(/\s+/);
      const [a, b, c] = parseIndices(parts, line);
      mesh.indices.push(a, b, c);
      continue;
    }
  }

  if (mesh.vertices.length === 0) {
    throw new Error("IGES file contained no vertices");
  }
  if (mesh.indices.length % 3 !== 0) {
    throw new Error("IGES index list not divisible by three");
  }
  if (!mesh.name) {
    const hash = createHash("sha256").update(content).digest("hex");
    mesh.name = `iges_${hash.substring(0, 8)}`;
  }
  return mesh;
}

export function loadMeshFromSource(format: GeometrySourceFormat, data: string): Mesh {
  return format === "step" ? parseStep(data) : parseIges(data);
}

export function computeBoundingBox(vertices: Vec3[]): BoundingBox {
  if (vertices.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const vertex of vertices) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.z < minZ) minZ = vertex.z;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y > maxY) maxY = vertex.y;
    if (vertex.z > maxZ) maxZ = vertex.z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

export function triangleCount(mesh: Mesh): number {
  return mesh.indices.length / 3;
}

export function surfaceArea(mesh: Mesh): number {
  let area = 0;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const ia = mesh.indices[i + 0];
    const ib = mesh.indices[i + 1];
    const ic = mesh.indices[i + 2];
    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    if (!a || !b || !c) {
      continue;
    }
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const abz = b.z - a.z;
    const acx = c.x - a.x;
    const acy = c.y - a.y;
    const acz = c.z - a.z;
    const crossX = aby * acz - abz * acy;
    const crossY = abz * acx - abx * acz;
    const crossZ = abx * acy - aby * acx;
    const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    area += 0.5 * crossLength;
  }
  return area;
}

export function deriveMetrics(mesh: Mesh): GeometryMetrics {
  const bbox = computeBoundingBox(mesh.vertices);
  const dimensions = {
    width: Math.max(0, bbox.max.x - bbox.min.x),
    depth: Math.max(0, bbox.max.y - bbox.min.y),
    height: Math.max(0, bbox.max.z - bbox.min.z),
  };
  return {
    vertexCount: mesh.vertices.length,
    triangleCount: triangleCount(mesh),
    surfaceArea: surfaceArea(mesh),
    boundingBox: bbox,
    dimensions,
  };
}

export function analyzeGeometry(format: GeometrySourceFormat, data: string): GeometryMetrics {
  const mesh = loadMeshFromSource(format, data);
  return deriveMetrics(mesh);
}
