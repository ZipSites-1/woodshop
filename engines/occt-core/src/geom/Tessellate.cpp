#include "woodshop/geom/Tessellate.hpp"

#include <algorithm>
#include <cmath>
#include <limits>

namespace woodshop::geom {
namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr double kEpsilon = 1e-9;

[[nodiscard]] double to_radians(double deg) {
    return deg * kPi / 180.0;
}

[[nodiscard]] int clamp_segments(int value, int minimum, int maximum) {
    return std::clamp(value, minimum, maximum);
}

struct Vec3Ops {
    static Vec3 add(const Vec3& a, const Vec3& b) {
        return {a.x + b.x, a.y + b.y, a.z + b.z};
    }

    static Vec3 sub(const Vec3& a, const Vec3& b) {
        return {a.x - b.x, a.y - b.y, a.z - b.z};
    }

    static Vec3 scale(const Vec3& v, double scalar) {
        return {v.x * scalar, v.y * scalar, v.z * scalar};
    }

    static double dot(const Vec3& a, const Vec3& b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static Vec3 cross(const Vec3& a, const Vec3& b) {
        return {
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x,
        };
    }

    static double length(const Vec3& v) {
        return std::sqrt(dot(v, v));
    }

    static Vec3 normalised(const Vec3& v) {
        const double len = length(v);
        if (len < kEpsilon) {
            return {0.0, 0.0, 1.0};
        }
        return scale(v, 1.0 / len);
    }
};

[[nodiscard]] int compute_longitudinal_segments(const TessellationParameters& params) {
    const double safeLinear = std::max(params.linearDeflection, 1e-4);
    // Empirical mapping: smaller deflection -> more slices
    int estimated = static_cast<int>(std::ceil((2.0 * kPi) / std::sqrt(safeLinear)));
    if ((estimated % 2) != 0) {
        ++estimated; // prefer even count for symmetry
    }
    return clamp_segments(estimated, std::max(params.minSegments, 6), params.maxSegments);
}

[[nodiscard]] int compute_latitudinal_segments(const TessellationParameters& params) {
    const double safeAngular = std::max(params.angularDeflectionDeg, 0.1);
    const double angularRad = to_radians(safeAngular);
    int estimated = static_cast<int>(std::ceil(kPi / angularRad));
    estimated = std::max(estimated, 2); // at least two belts between poles
    return clamp_segments(estimated, 2, params.maxSegments / 2);
}

[[nodiscard]] int compute_height_segments(double height, const TessellationParameters& params) {
    const double safeLinear = std::max(params.linearDeflection, 1e-3);
    int estimated = static_cast<int>(std::ceil(height / safeLinear));
    estimated = std::max(estimated, params.minSegments / 2);
    return clamp_segments(estimated, 1, params.maxSegments);
}

[[nodiscard]] Vec3 fallback_normal_from_position(const Vec3& position) {
    const double len = Vec3Ops::length(position);
    if (len < kEpsilon) {
        return {0.0, 0.0, 1.0};
    }
    return Vec3Ops::scale(position, 1.0 / len);
}

} // namespace

Mesh tessellate_unit_sphere(const TessellationParameters& params) {
    const int lonSegments = compute_longitudinal_segments(params);
    const int latSegments = compute_latitudinal_segments(params);

    Mesh mesh;
    mesh.vertices.reserve(static_cast<std::size_t>(2 + (latSegments - 1) * lonSegments));

    mesh.vertices.push_back({0.0, 0.0, 1.0}); // north pole

    for (int lat = 1; lat < latSegments; ++lat) {
        const double v = static_cast<double>(lat) / static_cast<double>(latSegments);
        const double phi = v * kPi; // 0..pi
        const double sinPhi = std::sin(phi);
        const double cosPhi = std::cos(phi);
        for (int lon = 0; lon < lonSegments; ++lon) {
            const double u = static_cast<double>(lon) / static_cast<double>(lonSegments);
            const double theta = u * 2.0 * kPi; // 0..2pi
            const double sinTheta = std::sin(theta);
            const double cosTheta = std::cos(theta);
            mesh.vertices.push_back({sinPhi * cosTheta, sinPhi * sinTheta, cosPhi});
        }
    }

    mesh.vertices.push_back({0.0, 0.0, -1.0}); // south pole

    const auto northIndex = 0u;
    const auto southIndex = static_cast<unsigned int>(mesh.vertices.size() - 1);

    const auto index_for = [&](int lat, int lon) -> unsigned int {
        if (lat <= 0) {
            return northIndex;
        }
        if (lat >= latSegments) {
            return southIndex;
        }
        const int wrappedLon = (lon % lonSegments + lonSegments) % lonSegments;
        const int offset = 1 + (lat - 1) * lonSegments + wrappedLon;
        return static_cast<unsigned int>(offset);
    };

    mesh.indices.reserve(static_cast<std::size_t>(lonSegments * (latSegments - 1) * 6));

    // Top cap
    for (int lon = 0; lon < lonSegments; ++lon) {
        mesh.indices.push_back(northIndex);
        mesh.indices.push_back(index_for(1, lon + 1));
        mesh.indices.push_back(index_for(1, lon));
    }

    // Middle belts
    for (int lat = 1; lat < latSegments - 1; ++lat) {
        for (int lon = 0; lon < lonSegments; ++lon) {
            const unsigned int v00 = index_for(lat, lon);
            const unsigned int v01 = index_for(lat, lon + 1);
            const unsigned int v10 = index_for(lat + 1, lon);
            const unsigned int v11 = index_for(lat + 1, lon + 1);

            mesh.indices.push_back(v00);
            mesh.indices.push_back(v10);
            mesh.indices.push_back(v11);

            mesh.indices.push_back(v00);
            mesh.indices.push_back(v11);
            mesh.indices.push_back(v01);
        }
    }

    // Bottom cap
    for (int lon = 0; lon < lonSegments; ++lon) {
        mesh.indices.push_back(index_for(latSegments - 1, lon));
        mesh.indices.push_back(index_for(latSegments - 1, lon + 1));
        mesh.indices.push_back(southIndex);
    }

    mesh.normals = compute_normals(mesh);
    return mesh;
}

Mesh tessellate_cylinder(double radius,
                         double height,
                         const TessellationParameters& params,
                         bool capped) {
    Mesh mesh;
    const double safeRadius = std::max(radius, 1e-6);
    const double safeHeight = std::max(height, 1e-6);

    const int radialSegments = compute_longitudinal_segments(params);
    const int heightSegments = compute_height_segments(safeHeight, params);

    mesh.vertices.reserve(static_cast<std::size_t>((heightSegments + 1) * radialSegments + (capped ? 2 : 0)));

    const double halfHeight = safeHeight * 0.5;

    const auto vertex_index = [&](int h, int r) -> unsigned int {
        const int wrappedR = (r % radialSegments + radialSegments) % radialSegments;
        return static_cast<unsigned int>(h * radialSegments + wrappedR);
    };

    for (int h = 0; h <= heightSegments; ++h) {
        const double v = static_cast<double>(h) / static_cast<double>(heightSegments);
        const double z = -halfHeight + v * safeHeight;
        for (int r = 0; r < radialSegments; ++r) {
            const double u = static_cast<double>(r) / static_cast<double>(radialSegments);
            const double theta = u * 2.0 * kPi;
            const double cosTheta = std::cos(theta);
            const double sinTheta = std::sin(theta);
            mesh.vertices.push_back({safeRadius * cosTheta, safeRadius * sinTheta, z});
        }
    }

    mesh.indices.reserve(static_cast<std::size_t>(heightSegments * radialSegments * 6 + (capped ? radialSegments * 6 : 0)));

    for (int h = 0; h < heightSegments; ++h) {
        for (int r = 0; r < radialSegments; ++r) {
            const unsigned int v00 = vertex_index(h, r);
            const unsigned int v01 = vertex_index(h, r + 1);
            const unsigned int v10 = vertex_index(h + 1, r);
            const unsigned int v11 = vertex_index(h + 1, r + 1);

            mesh.indices.push_back(v00);
            mesh.indices.push_back(v10);
            mesh.indices.push_back(v11);

            mesh.indices.push_back(v00);
            mesh.indices.push_back(v11);
            mesh.indices.push_back(v01);
        }
    }

    if (capped) {
        const unsigned int bottomCenterIndex = static_cast<unsigned int>(mesh.vertices.size());
        mesh.vertices.push_back({0.0, 0.0, -halfHeight});
        const unsigned int topCenterIndex = static_cast<unsigned int>(mesh.vertices.size());
        mesh.vertices.push_back({0.0, 0.0, halfHeight});

        for (int r = 0; r < radialSegments; ++r) {
            const unsigned int next = vertex_index(0, r + 1);
            const unsigned int current = vertex_index(0, r);
            mesh.indices.push_back(bottomCenterIndex);
            mesh.indices.push_back(next);
            mesh.indices.push_back(current);
        }

        for (int r = 0; r < radialSegments; ++r) {
            const unsigned int current = vertex_index(heightSegments, r);
            const unsigned int next = vertex_index(heightSegments, r + 1);
            mesh.indices.push_back(topCenterIndex);
            mesh.indices.push_back(current);
            mesh.indices.push_back(next);
        }
    }

    mesh.normals = compute_normals(mesh);
    return mesh;
}

std::size_t triangle_count(const Mesh& mesh) {
    return mesh.indices.size() / 3;
}

std::vector<Vec3> compute_normals(const Mesh& mesh) {
    std::vector<Vec3> normals(mesh.vertices.size(), Vec3{0.0, 0.0, 0.0});

    const std::size_t triangleCount = mesh.indices.size() / 3;
    for (std::size_t tri = 0; tri < triangleCount; ++tri) {
        const std::size_t base = tri * 3;
        const unsigned int ia = mesh.indices[base + 0];
        const unsigned int ib = mesh.indices[base + 1];
        const unsigned int ic = mesh.indices[base + 2];
        if (ia >= mesh.vertices.size() || ib >= mesh.vertices.size() || ic >= mesh.vertices.size()) {
            continue;
        }

        const Vec3& a = mesh.vertices[ia];
        const Vec3& b = mesh.vertices[ib];
        const Vec3& c = mesh.vertices[ic];
        const Vec3 edgeAB = Vec3Ops::sub(b, a);
        const Vec3 edgeAC = Vec3Ops::sub(c, a);
        Vec3 face = Vec3Ops::cross(edgeAB, edgeAC);
        const double faceLen = Vec3Ops::length(face);
        if (faceLen < kEpsilon) {
            continue;
        }

        // Weight by triangle area (magnitude of cross product is 2 * area)
        face = Vec3Ops::scale(face, 1.0);
        normals[ia] = Vec3Ops::add(normals[ia], face);
        normals[ib] = Vec3Ops::add(normals[ib], face);
        normals[ic] = Vec3Ops::add(normals[ic], face);
    }

    for (std::size_t i = 0; i < normals.size(); ++i) {
        const double len = Vec3Ops::length(normals[i]);
        if (len < kEpsilon) {
            normals[i] = fallback_normal_from_position(mesh.vertices[i]);
        } else {
            normals[i] = Vec3Ops::scale(normals[i], 1.0 / len);
        }
    }

    return normals;
}

Aabb compute_aabb(const Mesh& mesh) {
    if (mesh.vertices.empty()) {
        return {};
    }

    Vec3 minCorner{
        std::numeric_limits<double>::infinity(),
        std::numeric_limits<double>::infinity(),
        std::numeric_limits<double>::infinity(),
    };
    Vec3 maxCorner{
        -std::numeric_limits<double>::infinity(),
        -std::numeric_limits<double>::infinity(),
        -std::numeric_limits<double>::infinity(),
    };

    for (const Vec3& vertex : mesh.vertices) {
        minCorner.x = std::min(minCorner.x, vertex.x);
        minCorner.y = std::min(minCorner.y, vertex.y);
        minCorner.z = std::min(minCorner.z, vertex.z);
        maxCorner.x = std::max(maxCorner.x, vertex.x);
        maxCorner.y = std::max(maxCorner.y, vertex.y);
        maxCorner.z = std::max(maxCorner.z, vertex.z);
    }

    return {minCorner, maxCorner};
}

double surface_area(const Mesh& mesh) {
    double area = 0.0;
    const std::size_t triangleCount = mesh.indices.size() / 3;
    for (std::size_t tri = 0; tri < triangleCount; ++tri) {
        const std::size_t base = tri * 3;
        const unsigned int ia = mesh.indices[base + 0];
        const unsigned int ib = mesh.indices[base + 1];
        const unsigned int ic = mesh.indices[base + 2];
        if (ia >= mesh.vertices.size() || ib >= mesh.vertices.size() || ic >= mesh.vertices.size()) {
            continue;
        }
        const Vec3& a = mesh.vertices[ia];
        const Vec3& b = mesh.vertices[ib];
        const Vec3& c = mesh.vertices[ic];
        const Vec3 cross = Vec3Ops::cross(Vec3Ops::sub(b, a), Vec3Ops::sub(c, a));
        area += 0.5 * Vec3Ops::length(cross);
    }
    return area;
}

} // namespace woodshop::geom
