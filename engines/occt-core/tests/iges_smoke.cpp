#include "woodshop/io/IgesIo.hpp"

#include <chrono>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <limits>
#include <sstream>
#include <cmath>

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

woodshop::io::MeshModel make_test_mesh() {
    woodshop::io::MeshModel model;
    model.name = "triangle";
    model.mesh.vertices = {
        {0.0, 0.0, 0.0},
        {1.0, 0.0, 0.0},
        {0.0, 1.0, 0.0},
    };
    model.mesh.indices = {0, 1, 2};
    return model;
}

void test_iges_roundtrip() {
    const auto original = make_test_mesh();
    const std::filesystem::path tempPath = make_temp_path("woodshop_iges", ".igs");

    woodshop::io::write_iges(original, tempPath);
    const woodshop::io::MeshModel loaded = woodshop::io::read_iges(tempPath);
    std::filesystem::remove(tempPath);

    ensure(original.name == loaded.name, "IGES name mismatch");
    ensure(original.mesh.vertices == loaded.mesh.vertices, "IGES vertices mismatch");
    ensure(original.mesh.indices == loaded.mesh.indices, "IGES indices mismatch");
    ensure(loaded.mesh.normals.size() == loaded.mesh.vertices.size(), "IGES normals missing");

    double maxDeviation = 0.0;
    for (std::size_t i = 0; i < loaded.mesh.normals.size(); ++i) {
        const auto& normal = loaded.mesh.normals[i];
        const double len = std::sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        maxDeviation = std::max(maxDeviation, std::abs(len - 1.0));
    }
    ensure(maxDeviation < 1e-9, "IGES normals not normalised");
}

} // namespace

int main() {
    test_iges_roundtrip();
    return 0;
}
