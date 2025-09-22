#include "woodshop/geom/Tessellate.hpp"

#include <algorithm>
#include <cmath>

namespace woodshop::geom {
namespace {

constexpr double kPi = 3.14159265358979323846;

[[nodiscard]] double to_radians(double deg) {
    return deg * kPi / 180.0;
}

[[nodiscard]] int clamp_segments(int value, int minimum, int maximum) {
    return std::clamp(value, minimum, maximum);
}

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

    return mesh;
}

std::size_t triangle_count(const Mesh& mesh) {
    return mesh.indices.size() / 3;
}

} // namespace woodshop::geom
