#include "woodshop/geom/Tessellate.hpp"
#include "woodshop/io/StepIo.hpp"

#include <cassert>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <sstream>

using woodshop::geom::Mesh;
using woodshop::geom::TessellationParameters;
using woodshop::geom::triangle_count;
using woodshop::geom::tessellate_unit_sphere;

namespace {

void ensure(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "Test failed: " << message << '\n';
        std::abort();
    }
}

std::filesystem::path make_temp_path(const char* stem, const char* extension) {
    const auto timestamp = std::chrono::high_resolution_clock::now().time_since_epoch().count();
    const auto discriminator = reinterpret_cast<std::uintptr_t>(&stem);
    std::ostringstream oss;
    oss << stem << '_' << std::hex << timestamp << '_' << discriminator << extension;
    return std::filesystem::temp_directory_path() / oss.str();
}

void test_tessellation_deflection_response() {
    TessellationParameters coarseParams;
    coarseParams.linearDeflection = 2.0;
    coarseParams.angularDeflectionDeg = 30.0;

    TessellationParameters fineParams;
    fineParams.linearDeflection = 0.1;
    fineParams.angularDeflectionDeg = 5.0;

    const Mesh coarse = tessellate_unit_sphere(coarseParams);
    const Mesh fine = tessellate_unit_sphere(fineParams);

    ensure(triangle_count(coarse) < triangle_count(fine),
           "expected higher triangle count for tighter deflection");
}

void test_step_roundtrip() {
    TessellationParameters params;
    params.linearDeflection = 0.3;
    params.angularDeflectionDeg = 10.0;

    woodshop::io::MeshModel original;
    original.name = "unit_sphere";
    original.mesh = tessellate_unit_sphere(params);

    const std::filesystem::path tempPath = make_temp_path("woodshop_step", ".stp");

    woodshop::io::write_step(original, tempPath);
    const woodshop::io::MeshModel loaded = woodshop::io::read_step(tempPath);
    std::filesystem::remove(tempPath);

    ensure(woodshop::io::max_vertex_distance(original, loaded) < 1e-9,
           "round-tripped STEP vertices exceeded tolerance");
    ensure(original.mesh.indices == loaded.mesh.indices,
           "round-tripped STEP indices mismatch");
    ensure(original.name == loaded.name, "round-tripped STEP name mismatch");
}

} // namespace

int main() {
    test_tessellation_deflection_response();
    test_step_roundtrip();
    return 0;
}
