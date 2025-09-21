# Build Recipe — OCCT to WebAssembly (Emscripten)

This recipe builds a **WASM** bundle for the viewer by compiling occt-core with Emscripten.

---

## Prerequisites
- Emscripten SDK (emsdk) installed and activated
- CMake ≥ 3.24
- Node.js for local serving

> Activate emsdk per shell: `source /path/to/emsdk/emsdk_env.sh`

---

## Toolchain & Preset
Create `cmake/toolchains/Emscripten.cmake`:
```cmake
set(CMAKE_SYSTEM_NAME          WASM)
set(CMAKE_SYSTEM_PROCESSOR     wasm)
set(CMAKE_C_COMPILER           emcc)
set(CMAKE_CXX_COMPILER         em++)
set(CMAKE_AR                   emar)
set(CMAKE_RANLIB               emranlib)
```

Add a wasm configure preset in `CMakePresets.json`:
```json
{
  "name": "wasm",
  "generator": "Ninja",
  "binaryDir": "build/wasm",
  "cacheVariables": {
    "CMAKE_TOOLCHAIN_FILE": "cmake/toolchains/Emscripten.cmake",
    "CMAKE_BUILD_TYPE": "Release",
    "BUILD_WASM": "ON"
  }
}
```

---

## Build
```bash
cd engines/occt-core
emcmake cmake --preset wasm
cmake --build --preset wasm -j
```

You should obtain something like:
```
engines/occt-core/build/wasm/
  occt-core.js
  occt-core.wasm
```

---

## Recommended Emscripten flags
- `-sMODULARIZE=1` — export as a factory function
- `-sALLOW_MEMORY_GROWTH=1` — avoid OOM during larger models
- `-sENVIRONMENT=web` — target browser
- `-sEXPORT_ES6=1` — if bundling with modern tooling
- `-sSINGLE_FILE=0` — keep `.wasm` as a separate, cacheable asset

Wire these via `target_link_options` for the wasm target.

---

## Loading in the web app
Use a web worker to avoid blocking the UI:
```ts
// apps/web-viewer/src/workers/occt.worker.ts
import initOcct from '/wasm/occt/occt-core.js';
let occt: any;
self.onmessage = async (evt) => {
  if (!occt) occt = await initOcct();
  // handle messages and call into occt exports
};
```

Serve `occt-core.js/.wasm` from `apps/web-viewer/wasm/occt/` or your public assets dir.

---

## Troubleshooting
- `WebAssembly.Memory`: increase initial memory or enable `ALLOW_MEMORY_GROWTH`.
- CSP errors: add `worker-src` and `script-src` allowances for WASM.
- MIME types: serve `.wasm` with `application/wasm`.
