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
    std::vector<Vec3> normals;         // per-vertex normals, optional
};

struct TessellationParameters {
    double linearDeflection{0.5};
    double angularDeflectionDeg{15.0};
    int minSegments{8};
    int maxSegments{512};
};

struct Aabb {
    Vec3 min{0.0, 0.0, 0.0};
    Vec3 max{0.0, 0.0, 0.0};

    [[nodiscard]] Vec3 size() const {
        return {max.x - min.x, max.y - min.y, max.z - min.z};
    }
};

Mesh tessellate_unit_sphere(const TessellationParameters& params);
Mesh tessellate_cylinder(double radius,
                         double height,
                         const TessellationParameters& params,
                         bool capped = true);
std::size_t triangle_count(const Mesh& mesh);

std::vector<Vec3> compute_normals(const Mesh& mesh);
Aabb compute_aabb(const Mesh& mesh);
double surface_area(const Mesh& mesh);

} // namespace woodshop::geom
