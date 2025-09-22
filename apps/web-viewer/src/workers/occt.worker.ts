export type TessellateRequest = {
  type: "tessellate";
  requestId: number;
  linearDeflection: number;
  angularDeflection: number;
};

export type TessellateResponse = {
  type: "tessellate-result";
  requestId: number;
  triangleCount: number;
  vertices: ArrayBuffer;
  indices: ArrayBuffer;
  vertexCount: number;
  surfaceArea: number;
  boundingBox: BoundingBox;
};

export type WorkerErrorResponse = {
  type: "error";
  requestId: number;
  message: string;
};

export type StatusMessage = {
  type: "status";
  phase: "initializing" | "ready" | "working";
};

export type ProgressMessage = {
  type: "progress";
  loaded: number;
  total: number;
};

export type BoundingBox = {
  min: [number, number, number];
  max: [number, number, number];
};

declare const self: DedicatedWorkerGlobalScope;

const moduleUrl = new URL("../../wasm/occt/occt-core.js", import.meta.url);

type ModuleFactory = (options?: Record<string, unknown>) => Promise<any>;

type ModuleInstance = {
  tessellateUnitSphere(linearDeflection: number, angularDeflection: number): unknown;
  tessellateCylinder(
    radius: number,
    height: number,
    linearDeflection: number,
    angularDeflection: number,
    capped: boolean,
  ): unknown;
  triangleCount(mesh: unknown): number;
};

let modulePromise: Promise<ModuleInstance> | null = null;

async function loadModuleFactory(): Promise<ModuleFactory> {
  const factoryModule = await import(/* @vite-ignore */ moduleUrl.href);
  if (typeof factoryModule.default !== "function") {
    throw new Error("occt-core.js does not export a default factory function");
  }
  return factoryModule.default;
}

async function loadModule(): Promise<ModuleInstance> {
  if (!modulePromise) {
    self.postMessage({ type: "status", phase: "initializing" } satisfies StatusMessage);
    self.postMessage({ type: "progress", loaded: 0, total: 1 } satisfies ProgressMessage);

    modulePromise = loadModuleFactory()
      .then(async (factory) => {
        let dependencyTotal = 0;
        const instance = await factory({
          locateFile(file: string) {
            return new URL(`../../wasm/occt/${file}`, import.meta.url).href;
          },
          monitorRunDependencies(left: number) {
            if (left > dependencyTotal) {
              dependencyTotal = left;
            }
            const total = dependencyTotal || 1;
            const loaded = Math.max(total - left, 0);
            self.postMessage({
              type: "progress",
              loaded,
              total,
            } satisfies ProgressMessage);
          },
        });

        const finalTotal = Math.max(1, dependencyTotal);
        self.postMessage({
          type: "progress",
          loaded: finalTotal,
          total: finalTotal,
        } satisfies ProgressMessage);
        self.postMessage({ type: "status", phase: "ready" } satisfies StatusMessage);
        return instance as ModuleInstance;
      })
      .catch((error) => {
        modulePromise = null;
        throw error;
      });
  }
  return modulePromise;
}

function packVec3(values: Array<{ x: number; y: number; z: number }>) {
  const data = new Float64Array(values.length * 3);
  for (let i = 0; i < values.length; ++i) {
    const base = i * 3;
    const v = values[i];
    data[base + 0] = v.x;
    data[base + 1] = v.y;
    data[base + 2] = v.z;
  }
  return data;
}

function packIndices(indices: Array<number>) {
  return new Uint32Array(indices);
}

function computeBoundingBoxFromVertices(vertexArray: Float64Array): BoundingBox {
  if (vertexArray.length === 0) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
    };
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < vertexArray.length; i += 3) {
    const x = vertexArray[i + 0];
    const y = vertexArray[i + 1];
    const z = vertexArray[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  };
}

function computeSurfaceAreaFromMesh(vertices: Float64Array, indices: Uint32Array): number {
  let area = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i + 0] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    if (
      ia + 2 >= vertices.length ||
      ib + 2 >= vertices.length ||
      ic + 2 >= vertices.length
    ) {
      continue;
    }

    const ax = vertices[ia + 0];
    const ay = vertices[ia + 1];
    const az = vertices[ia + 2];
    const bx = vertices[ib + 0];
    const by = vertices[ib + 1];
    const bz = vertices[ib + 2];
    const cx = vertices[ic + 0];
    const cy = vertices[ic + 1];
    const cz = vertices[ic + 2];

    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;

    const crossX = aby * acz - abz * acy;
    const crossY = abz * acx - abx * acz;
    const crossZ = abx * acy - aby * acx;
    const crossLength = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
    area += 0.5 * crossLength;
  }
  return area;
}

self.onmessage = async (event: MessageEvent<TessellateRequest>) => {
  const message = event.data;
  if (!message || message.type !== "tessellate") {
    return;
  }

  try {
    const module = await loadModule();
    self.postMessage({ type: "status", phase: "working" } satisfies StatusMessage);
    const mesh = module.tessellateUnitSphere(
      message.linearDeflection,
      message.angularDeflection
    );
    const triangleCount = module.triangleCount(mesh);
    const vertexArray = packVec3(mesh.vertices as Array<{ x: number; y: number; z: number }>);
    const indexArray = packIndices(mesh.indices as Array<number>);
    const boundingBox = computeBoundingBoxFromVertices(vertexArray);
    const vertexCount = vertexArray.length / 3;
    const surfaceArea = computeSurfaceAreaFromMesh(vertexArray, indexArray);

    const response: TessellateResponse = {
      type: "tessellate-result",
      requestId: message.requestId,
      triangleCount,
      vertices: vertexArray.buffer,
      indices: indexArray.buffer,
      vertexCount,
      surfaceArea,
      boundingBox,
    };
    self.postMessage(response, [vertexArray.buffer, indexArray.buffer]);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    const response: WorkerErrorResponse = {
      type: "error",
      requestId: message.requestId,
      message: messageText,
    };
    self.postMessage(response);
  }
};
