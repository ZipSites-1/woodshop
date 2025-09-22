# include(${CMAKE_SOURCE_DIR}/../emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake)
# Minimal CMake toolchain shim for Emscripten builds.
# Option A: Use emcmake (recommended) and skip this file entirely.
# Option B: Point CMAKE_TOOLCHAIN_FILE here, which forwards to Emscripten's own toolchain.

# Attempt to resolve EMSCRIPTEN root from env (emsdk activates these).
if(DEFINED ENV{EMSCRIPTEN})
  set(EMSCRIPTEN_ROOT "$ENV{EMSCRIPTEN}")
elseif(DEFINED ENV{EMSDK})
  # Fallback to emsdk path; typical location: emsdk/upstream/emscripten
  set(EMSCRIPTEN_ROOT "$ENV{EMSDK}/upstream/emscripten")
endif()

if(NOT EXISTS "${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake")
  message(FATAL_ERROR "Could not find Emscripten toolchain at ${EMSCRIPTEN_ROOT}. Activate emsdk_env.sh or use emcmake.")
endif()

include("${EMSCRIPTEN_ROOT}/cmake/Modules/Platform/Emscripten.cmake")

# Common options for OCCT/Web builds
set(CMAKE_BUILD_TYPE Release CACHE STRING "" FORCE)
add_compile_definitions(OCCT_WASM=1)
set(CMAKE_EXECUTABLE_SUFFIX ".js")
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
