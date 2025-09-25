# OCCT Build Plan — Cloud Batch 01

## Target Environments
- Ubuntu 22.04, GCC 13, CMake 3.28
- macOS 14, Xcode 15, CMake 3.28

## Build Presets
| Preset | Type | Notes |
|---|---|---|
| `occt-relwithdebinfo` | RelWithDebInfo | Used for reproducible builds and artifact packaging |
| `occt-debug` | Debug | Optional preset for troubleshooting |

## Steps
1. Configure OCCT dependencies (TBB, FreeImage, freetype) using cached archives.
2. Invoke `cmake --preset occt-relwithdebinfo` followed by `cmake --build --preset occt-relwithdebinfo`.
3. Package resulting libs into `artifacts/occt/<platform>/` and upload via CI.
4. Run validation harness against STEP/IGES fixtures.

## Outstanding Tasks
- Finalise preset definitions within `codex/tasks/epics/01-occt-core-geometry-and-io.md`.
- Capture build logs and publish checksums for shipped binaries.
