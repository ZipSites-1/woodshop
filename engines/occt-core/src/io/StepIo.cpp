#include "woodshop/io/StepIo.hpp"

#include <algorithm>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <string_view>

namespace woodshop::io {
namespace {

std::string trim(std::string_view view) {
    const auto begin = view.find_first_not_of(" \t\r\n");
    if (begin == std::string_view::npos) {
        return {};
    }
    const auto end = view.find_last_not_of(" \t\r\n");
    return std::string(view.substr(begin, end - begin + 1));
}

template <typename StreamT>
void ensure_stream(StreamT& stream, const std::filesystem::path& path, const char* message) {
    if (!stream) {
        std::ostringstream oss;
        oss << "Failed to " << message << " STEP file '" << path.string() << "'";
        throw std::runtime_error(oss.str());
    }
}

using woodshop::geom::compute_normals;

} // namespace

MeshModel read_step(const std::filesystem::path& path) {
    std::ifstream file(path);
    ensure_stream(file, path, "open");

    MeshModel model;
    std::string token;

    if (!(file >> token) || token != "WOODSHOP_STEP") {
        throw std::runtime_error("STEP header missing WOODSHOP_STEP token");
    }

    // optional version string (ignored)
    std::string version;
    std::getline(file, version);

    std::size_t expectedVertices = 0;
    std::size_t expectedFaces = 0;
    std::size_t expectedNormals = 0;

    while (file >> token) {
        if (token == "NAME") {
            std::string line;
            std::getline(file, line);
            model.name = trim(line);
        } else if (token == "VERTICES") {
            file >> expectedVertices;
            model.mesh.vertices.resize(expectedVertices);
            for (std::size_t i = 0; i < expectedVertices; ++i) {
                double x{}, y{}, z{};
                file >> x >> y >> z;
                model.mesh.vertices[i] = {x, y, z};
            }
        } else if (token == "INDICES") {
            file >> expectedFaces;
            model.mesh.indices.resize(expectedFaces * 3);
            for (std::size_t face = 0; face < expectedFaces; ++face) {
                unsigned int a{}, b{}, c{};
                file >> a >> b >> c;
                const std::size_t offset = face * 3;
                model.mesh.indices[offset + 0] = a;
                model.mesh.indices[offset + 1] = b;
                model.mesh.indices[offset + 2] = c;
            }
        } else if (token == "NORMALS") {
            file >> expectedNormals;
            model.mesh.normals.resize(expectedNormals);
            for (std::size_t i = 0; i < expectedNormals; ++i) {
                double nx{}, ny{}, nz{};
                file >> nx >> ny >> nz;
                model.mesh.normals[i] = {nx, ny, nz};
            }
        } else {
            // Skip unknown token line
            std::string line;
            std::getline(file, line);
        }
    }

    if (model.mesh.vertices.size() != expectedVertices) {
        throw std::runtime_error("STEP vertex count mismatch");
    }
    if (expectedFaces * 3 != model.mesh.indices.size()) {
        throw std::runtime_error("STEP index count mismatch");
    }

    if (model.mesh.normals.size() != model.mesh.vertices.size()) {
        model.mesh.normals = compute_normals(model.mesh);
    }

    return model;
}

void write_step(const MeshModel& model, const std::filesystem::path& path) {
    std::ofstream file(path, std::ios::trunc);
    ensure_stream(file, path, "create");

    file << "WOODSHOP_STEP 1.1\n";
    file << "NAME " << model.name << "\n";
    file << "VERTICES " << model.mesh.vertices.size() << "\n";
    file << std::setprecision(17);
    for (const auto& vertex : model.mesh.vertices) {
        file << vertex.x << ' ' << vertex.y << ' ' << vertex.z << '\n';
    }

    const std::size_t faceCount = model.mesh.indices.size() / 3;
    file << "INDICES " << faceCount << "\n";
    for (std::size_t face = 0; face < faceCount; ++face) {
        const std::size_t offset = face * 3;
        file << model.mesh.indices[offset + 0] << ' '
             << model.mesh.indices[offset + 1] << ' '
             << model.mesh.indices[offset + 2] << '\n';
    }

    if (model.mesh.normals.size() == model.mesh.vertices.size()) {
        file << "NORMALS " << model.mesh.normals.size() << "\n";
        for (const auto& normal : model.mesh.normals) {
            file << normal.x << ' ' << normal.y << ' ' << normal.z << '\n';
        }
    }
}

double max_vertex_distance(const MeshModel& a, const MeshModel& b) {
    if (a.mesh.vertices.size() != b.mesh.vertices.size()) {
        return std::numeric_limits<double>::infinity();
    }

    double maxDistance = 0.0;
    for (std::size_t i = 0; i < a.mesh.vertices.size(); ++i) {
        const auto& va = a.mesh.vertices[i];
        const auto& vb = b.mesh.vertices[i];
        const double dx = va.x - vb.x;
        const double dy = va.y - vb.y;
        const double dz = va.z - vb.z;
        const double distance = std::sqrt(dx * dx + dy * dy + dz * dz);
        maxDistance = std::max(maxDistance, distance);
    }
    return maxDistance;
}

} // namespace woodshop::io
