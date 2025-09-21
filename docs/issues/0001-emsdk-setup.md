# Issue: Install Emscripten SDK for OCCT WASM builds

We skipped WASM builds for this PR because the local environment does not have `emcc`.

## Proposed Steps
1. Install emsdk pinned to `3.1.60`:
   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install 3.1.60
   ./emsdk activate 3.1.60
   ```
2. Add `emsdk_env.sh` sourcing to the build scripts (see `/codex/build_recipes/wasm-occt-emscripten.md`).
3. Update CI to provision `emsdk` in the WASM job and cache the toolchain.
4. Re-run `pnpm -w --filter @woodshop/mcp-server build` after sourcing `emsdk` to verify availability of `emcc`.

Tracking: follow up after merging the MCP skeleton PR.
