# Build Recipe — Native OCCT (CMake)

This recipe builds the **occt-core** C++ geometry engine (B-rep, booleans, tessellation, STEP/IGES) using CMake presets.
It assumes either a system OCCT install or a vendored OCCT as a submodule.

---

## Prerequisites
- CMake ≥ 3.24
- A C++17/20 toolchain (Clang, GCC, or MSVC)
- OCCT headers/libs available (system or third-party/ submodule)
- Ninja (recommended) or MSBuild/Make
- Python (for some OCCT utilities/tests)

> On Windows, ensure you open a **Developer Command Prompt** or use CMake's VS generator.
> On macOS, install command line tools (`xcode-select --install`).

---

## Project layout (excerpt)
```
engines/occt-core/
  CMakeLists.txt
  CMakePresets.json
  cmake/toolchains/
    Emscripten.cmake          # for wasm (separate recipe)
  include/woodshop/{geom,io}/*
  src/{geom,io,bindings}/*
  tests/golden/*
```

---

## Configure presets
Add a `CMakePresets.json` like:

```json
{
  "version": 3,
  "configurePresets": [
    {
      "name": "relwithdebinfo",
      "generator": "Ninja",
      "binaryDir": "build/relwithdebinfo",
      "cacheVariables": {
        "CMAKE_BUILD_TYPE": "RelWithDebInfo",
        "CMAKE_CXX_STANDARD": "20",
        "OCCT_ROOT": "/usr/local"   // or your vendored path
      }
    },
    {
      "name": "debug",
      "generator": "Ninja",
      "binaryDir": "build/debug",
      "cacheVariables": { "CMAKE_BUILD_TYPE": "Debug" }
    }
  ],
  "buildPresets": [
    { "name": "relwithdebinfo", "configurePreset": "relwithdebinfo" },
    { "name": "debug", "configurePreset": "debug" }
  ],
  "testPresets": [
    { "name": "relwithdebinfo", "configurePreset": "relwithdebinfo" }
  ]
}
```

---

## Building
```bash
cd engines/occt-core
cmake --preset relwithdebinfo
cmake --build --preset relwithdebinfo -j
```

Run tests:
```bash
ctest --preset relwithdebinfo --output-on-failure
```

---

## Choosing the OCCT location
- **System install**: set `OCCT_ROOT` and ensure headers + libs are discoverable.
- **Vendored**: add a `third_party/occt` submodule and point `OCCT_ROOT` there, or add a `find_package` override.

> Consider using `ccache`/`sccache` to speed up rebuilds; wire via `CMAKE_CXX_COMPILER_LAUNCHER`.

---

## Artifacts
- Static or shared `libocct_core` (depending on your CMake options).
- Test binaries under `build/relwithdebinfo/**/tests/*`.

---

## Troubleshooting
- Missing OCCT libs → check `OCCT_ROOT`, `LD_LIBRARY_PATH`/`DYLD_LIBRARY_PATH`/`PATH` for runtime.
- ABI mismatch → rebuild OCCT with same compiler and standard library.
- Floating tolerances → keep comparison tolerances explicit in tests.
