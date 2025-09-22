cmake_minimum_required(VERSION 3.25)

project(occt_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(occt_core STATIC
    src/geom/Tessellate.cpp
    src/io/StepIo.cpp
    src/io/IgesIo.cpp
)

target_include_directories(occt_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_features(occt_core PUBLIC cxx_std_20)

if(MSVC)
    target_compile_options(occt_core PRIVATE /W4 /permissive-)
else()
    target_compile_options(occt_core PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(EMSCRIPTEN)
    set(OCCT_WASM_OUTPUT_DIR "${CMAKE_SOURCE_DIR}/../../apps/web-viewer/wasm/occt")
    file(MAKE_DIRECTORY "${OCCT_WASM_OUTPUT_DIR}")

    add_executable(occt_core_wasm src/bindings/embind.cpp)
    target_link_libraries(occt_core_wasm PRIVATE occt_core)
    target_include_directories(occt_core_wasm PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
    target_compile_options(occt_core_wasm PRIVATE "--bind")
    target_link_options(occt_core_wasm PRIVATE
        "--bind"
        "-sMODULARIZE=1"
        "-sEXPORT_NAME=WoodshopOcctCore"
        "-sEXPORT_ES6=1"
        "-sENVIRONMENT=web,worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sNO_EXIT_RUNTIME=1"
        "-sFILESYSTEM=0"
    )
    set_target_properties(occt_core_wasm PROPERTIES
        OUTPUT_NAME "occt-core"
        RUNTIME_OUTPUT_DIRECTORY "${OCCT_WASM_OUTPUT_DIR}"
        LIBRARY_OUTPUT_DIRECTORY "${OCCT_WASM_OUTPUT_DIR}"
        ARCHIVE_OUTPUT_DIRECTORY "${OCCT_WASM_OUTPUT_DIR}"
    )
endif()

include(CTest)

if(BUILD_TESTING)
    enable_testing()

    add_executable(step_roundtrip_test tests/step_roundtrip.cpp)
    target_link_libraries(step_roundtrip_test PRIVATE occt_core)
    add_test(NAME occt_step_roundtrip COMMAND step_roundtrip_test)

    add_executable(iges_smoke_test tests/iges_smoke.cpp)
    target_link_libraries(iges_smoke_test PRIVATE occt_core)
    add_test(NAME occt_iges_smoke COMMAND iges_smoke_test)

    add_executable(boolean_fuzz_test tests/fuzz_boolean.cpp)
    target_link_libraries(boolean_fuzz_test PRIVATE occt_core)
    add_test(NAME occt_boolean_fuzz COMMAND boolean_fuzz_test)
endif()
