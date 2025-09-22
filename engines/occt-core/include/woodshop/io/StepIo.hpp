#pragma once

#include "woodshop/geom/Tessellate.hpp"

#include <filesystem>
#include <string>

namespace woodshop::io {

struct MeshModel {
    std::string name;
    woodshop::geom::Mesh mesh;
};

MeshModel read_step(const std::filesystem::path& path);
void write_step(const MeshModel& model, const std::filesystem::path& path);

// Utility used by tests to compare round-tripped data.
double max_vertex_distance(const MeshModel& a, const MeshModel& b);

} // namespace woodshop::io
