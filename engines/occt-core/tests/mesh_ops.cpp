#include "woodshop/geom/Tessellate.hpp"

#include <cmath>
#include <iostream>

namespace {

void ensure(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "Mesh ops test failed: " << message << '\n';
        std::abort();
    }
}

constexpr double kPi = 3.14159265358979323846;

void test_normals_and_area() {
    woodshop::geom::TessellationParameters params;
    params.linearDeflection = 0.4;
    params.angularDeflectionDeg = 12.0;

    const woodshop::geom::Mesh mesh = woodshop::geom::tessellate_unit_sphere(params);
    ensure(!mesh.vertices.empty(), "sphere vertices empty");
    ensure(mesh.normals.size() == mesh.vertices.size(), "sphere normals missing");

    double maxDot = -1.0;
    for (std::size_t i = 0; i < mesh.vertices.size(); ++i) {
        const auto& v = mesh.vertices[i];
        const auto& n = mesh.normals[i];
        const double lenV = std::sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        const double lenN = std::sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        ensure(std::abs(lenN - 1.0) < 1e-9, "normal not unit length");
        if (lenV > 1e-9) {
            const double dot = (v.x * n.x + v.y * n.y + v.z * n.z) / lenV;
            maxDot = std::max(maxDot, dot);
        }
    }
    ensure(maxDot > 0.99, "normals deviate from radial direction");

    const double area = woodshop::geom::surface_area(mesh);
    ensure(area > 12.0 && area < 13.5, "sphere surface area outside tolerance");
}

void test_cylinder_metrics() {
    woodshop::geom::TessellationParameters params;
    params.linearDeflection = 0.25;
    params.angularDeflectionDeg = 10.0;
    params.minSegments = 12;

    const double radius = 0.75;
    const double height = 2.0;
    const woodshop::geom::Mesh cylinder = woodshop::geom::tessellate_cylinder(radius, height, params, true);
    ensure(woodshop::geom::triangle_count(cylinder) > 0, "cylinder triangle count zero");
    ensure(cylinder.normals.size() == cylinder.vertices.size(), "cylinder normals missing");

    const woodshop::geom::Aabb aabb = woodshop::geom::compute_aabb(cylinder);
    const woodshop::geom::Vec3 size = aabb.size();
    ensure(size.x > radius * 1.9 && size.x < radius * 2.1, "cylinder AABB X outside tolerance");
    ensure(size.y > radius * 1.9 && size.y < radius * 2.1, "cylinder AABB Y outside tolerance");
    ensure(size.z > height * 0.99 && size.z < height * 1.01, "cylinder AABB Z outside tolerance");

    const double area = woodshop::geom::surface_area(cylinder);
    const double expectedArea = 2 * kPi * radius * (radius + height);
    ensure(std::abs(area - expectedArea) / expectedArea < 0.2, "cylinder area deviates excessively");
}

} // namespace

int main() {
    test_normals_and_area();
    test_cylinder_metrics();
    return 0;
}
