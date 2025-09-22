#include "woodshop/io/IgesIo.hpp"

#include <filesystem>
#include <fstream>
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

bool starts_with(std::string_view text, std::string_view prefix) {
    return text.size() >= prefix.size() && text.substr(0, prefix.size()) == prefix;
}

void ensure_stream(std::istream& stream, const std::filesystem::path& path, const char* message) {
    if (!stream) {
        std::ostringstream oss;
        oss << "Failed to " << message << " IGES file '" << path.string() << "'";
        throw std::runtime_error(oss.str());
    }
}

} // namespace

MeshModel read_iges(const std::filesystem::path& path) {
    std::ifstream file(path);
    ensure_stream(file, path, "open");

    std::string header;
    std::getline(file, header);
    if (trim(header) != "WOODSHOP_IGES 1.0") {
        throw std::runtime_error("IGES header missing WOODSHOP_IGES 1.0 token");
    }

    MeshModel model;
    std::size_t vertexCount = 0;
    std::size_t faceCount = 0;

    std::string line;
    while (std::getline(file, line)) {
        const std::string stripped = trim(line);
        if (stripped.empty()) {
            continue;
        }
        if (stripped == "END-IGES") {
            break;
        }
        if (starts_with(stripped, "MODEL ")) {
            model.name = stripped.substr(6);
            continue;
        }
        if (starts_with(stripped, "VERTEX ")) {
            std::istringstream iss(stripped.substr(7));
            double x{}, y{}, z{};
            iss >> x >> y >> z;
            model.mesh.vertices.push_back({x, y, z});
            ++vertexCount;
            continue;
        }
        if (starts_with(stripped, "FACE ")) {
            std::istringstream iss(stripped.substr(5));
            unsigned int a{}, b{}, c{};
            iss >> a >> b >> c;
            model.mesh.indices.push_back(a);
            model.mesh.indices.push_back(b);
            model.mesh.indices.push_back(c);
            ++faceCount;
            continue;
        }
    }

    if (vertexCount == 0 || faceCount == 0) {
        throw std::runtime_error("IGES file missing geometry data");
    }

    return model;
}

void write_iges(const MeshModel& model, const std::filesystem::path& path) {
    std::ofstream file(path, std::ios::trunc);
    if (!file) {
        std::ostringstream oss;
        oss << "Failed to create IGES file '" << path.string() << "'";
        throw std::runtime_error(oss.str());
    }

    file << "WOODSHOP_IGES 1.0\n";
    file << "MODEL " << model.name << "\n";
    for (const auto& vertex : model.mesh.vertices) {
        file << "VERTEX " << vertex.x << ' ' << vertex.y << ' ' << vertex.z << "\n";
    }

    const std::size_t faceCount = model.mesh.indices.size() / 3;
    for (std::size_t face = 0; face < faceCount; ++face) {
        const std::size_t offset = face * 3;
        file << "FACE " << model.mesh.indices[offset + 0] << ' '
             << model.mesh.indices[offset + 1] << ' '
             << model.mesh.indices[offset + 2] << "\n";
    }
    file << "END-IGES\n";
}

} // namespace woodshop::io
