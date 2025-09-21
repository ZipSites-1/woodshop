# Coding Conventions — C++ (OCCT)

These rules apply to `engines/occt-core` and any C++ code that binds into WASM.

## Language & Build
- C++20 minimum. Use standard library over custom utilities when possible.
- Use CMake presets. Do not hardcode paths; honor `OCCT_ROOT` or `find_package(OCCT)`.
- Prefer static analysis (clang-tidy) and treat warnings as errors in CI.

## Ownership & Error Handling
- RAII for all resources. Avoid raw `new/delete`; use `std::unique_ptr` or OCCT `Handle_` classes.
- Return `StatusOr<T>`-style results (or equivalent) for recoverable failures; include human-readable context.
- Throw exceptions only at module boundaries; never across a C-to-WASM FFI boundary.

## Units, Tolerances, Numerics
- **Units are millimeters** unless a schema specifies otherwise.
- Keep a single `Tolerance` header with `constexpr` defaults (e.g., `kLinearTol = 1e-4` mm).
- Be explicit about float formatting and locale.

## Determinism
- Stable iteration orders for all emitted collections.
- Avoid data-dependent unordered traversal when it affects output geometry ordering.
- Never consume wall clock in geometry routines.

## OCCT Usage
- Use topological types (`TopoDS_*`) and geometric kernels (`Geom_*`) correctly; do not mix.
- For booleans, bound complexity (faces/edges) in fuzz tests and break complex ops into stages.
- Tessellation via `BRepMesh_IncrementalMesh`; expose configurable deflection.

## WASM Bindings
- Keep the embind surface small. Use POD/flat structs for marshaling.
- Do not throw across the WASM boundary; return error objects.

## Layout & Style
- Follow LLVM style (brace placement, naming); namespaces `woodshop::geom`, `woodshop::io`.
- Public headers in `include/`; internal headers in `src/` only.
