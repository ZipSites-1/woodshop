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

declare const self: DedicatedWorkerGlobalScope;

const moduleUrl = new URL("../../wasm/occt/occt-core.js", import.meta.url);

type ModuleFactory = (options?: Record<string, unknown>) => Promise<any>;

type ModuleInstance = {
  tessellateUnitSphere(linearDeflection: number, angularDeflection: number): unknown;
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
    modulePromise = loadModuleFactory().then(async (factory) => {
      const instance = await factory({
        locateFile(file: string) {
          return new URL(`../../wasm/occt/${file}`, import.meta.url).href;
        },
      });
      self.postMessage({ type: "status", phase: "ready" } satisfies StatusMessage);
      return instance as ModuleInstance;
    });
  }
  return modulePromise;
}

function packVertices(vertices: Array<{ x: number; y: number; z: number }>) {
  const data = new Float64Array(vertices.length * 3);
  for (let i = 0; i < vertices.length; ++i) {
    const base = i * 3;
    const v = vertices[i];
    data[base + 0] = v.x;
    data[base + 1] = v.y;
    data[base + 2] = v.z;
  }
  return data;
}

function packIndices(indices: Array<number>) {
  return new Uint32Array(indices);
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
    const vertexArray = packVertices(mesh.vertices as Array<{ x: number; y: number; z: number }>);
    const indexArray = packIndices(mesh.indices as Array<number>);

    const response: TessellateResponse = {
      type: "tessellate-result",
      requestId: message.requestId,
      triangleCount,
      vertices: vertexArray.buffer,
      indices: indexArray.buffer,
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
