#pragma once

#include <cstddef>
#include <vector>

namespace woodshop::geom {

struct Vec3 {
    double x{0.0};
    double y{0.0};
    double z{0.0};

    bool operator==(const Vec3& other) const = default;
};

struct Triangle {
    Vec3 a;
    Vec3 b;
    Vec3 c;
};

struct Mesh {
    std::vector<Vec3> vertices;
    std::vector<unsigned int> indices; // triplets of indices form triangles
};

struct TessellationParameters {
    double linearDeflection{0.5};
    double angularDeflectionDeg{15.0};
    int minSegments{8};
    int maxSegments{512};
};

Mesh tessellate_unit_sphere(const TessellationParameters& params);
std::size_t triangle_count(const Mesh& mesh);

} // namespace woodshop::geom
