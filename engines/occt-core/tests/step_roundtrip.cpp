#include "woodshop/geom/Tessellate.hpp"
#include "woodshop/io/StepIo.hpp"

#include <cassert>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <limits>
#include <sstream>
#include <cmath>

using woodshop::geom::Mesh;
using woodshop::geom::TessellationParameters;
using woodshop::geom::triangle_count;
using woodshop::geom::tessellate_unit_sphere;
using woodshop::geom::compute_aabb;
using woodshop::geom::surface_area;

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

double max_normal_deviation(const Mesh& a, const Mesh& b) {
    if (a.normals.size() != b.normals.size()) {
        return std::numeric_limits<double>::infinity();
    }
    double maxDeviation = 0.0;
    for (std::size_t i = 0; i < a.normals.size(); ++i) {
        const auto& na = a.normals[i];
        const auto& nb = b.normals[i];
        const double dx = na.x - nb.x;
        const double dy = na.y - nb.y;
        const double dz = na.z - nb.z;
        const double deviation = std::sqrt(dx * dx + dy * dy + dz * dz);
        maxDeviation = std::max(maxDeviation, deviation);
    }
    return maxDeviation;
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
    ensure(loaded.mesh.normals.size() == loaded.mesh.vertices.size(),
           "round-tripped STEP normals missing");
    ensure(max_normal_deviation(original.mesh, loaded.mesh) < 1e-9,
           "round-tripped STEP normals deviated");

    const auto aabb = compute_aabb(loaded.mesh);
    const auto size = aabb.size();
    ensure(size.x > 1.9 && size.x < 2.1, "AABB X dimension outside tolerance");
    ensure(size.y > 1.9 && size.y < 2.1, "AABB Y dimension outside tolerance");
    ensure(size.z > 1.9 && size.z < 2.1, "AABB Z dimension outside tolerance");

    const double area = surface_area(loaded.mesh);
    ensure(area > 12.0 && area < 13.5, "Surface area out of expected range for unit sphere tessellation");
}

} // namespace

int main() {
    test_tessellation_deflection_response();
    test_step_roundtrip();
    return 0;
}
