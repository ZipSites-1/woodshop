#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>

#include "woodshop/geom/Tessellate.hpp"

namespace {

woodshop::geom::Mesh tessellate_unit_sphere_js(double linearDeflection,
                                               double angularDeflectionDeg) {
    woodshop::geom::TessellationParameters params;
    params.linearDeflection = linearDeflection;
    params.angularDeflectionDeg = angularDeflectionDeg;
    return woodshop::geom::tessellate_unit_sphere(params);
}

woodshop::geom::Mesh tessellate_cylinder_js(double radius,
                                            double height,
                                            double linearDeflection,
                                            double angularDeflectionDeg,
                                            bool capped) {
    woodshop::geom::TessellationParameters params;
    params.linearDeflection = linearDeflection;
    params.angularDeflectionDeg = angularDeflectionDeg;
    return woodshop::geom::tessellate_cylinder(radius, height, params, capped);
}

} // namespace

EMSCRIPTEN_BINDINGS(woodshop_occt_core) {
    using namespace emscripten;
    using woodshop::geom::Mesh;
    using woodshop::geom::TessellationParameters;
    using woodshop::geom::Vec3;
    using woodshop::geom::Aabb;

    value_object<Vec3>("Vec3")
        .field("x", &Vec3::x)
        .field("y", &Vec3::y)
        .field("z", &Vec3::z);

    value_object<TessellationParameters>("TessellationParameters")
        .field("linearDeflection", &TessellationParameters::linearDeflection)
        .field("angularDeflectionDeg", &TessellationParameters::angularDeflectionDeg)
        .field("minSegments", &TessellationParameters::minSegments)
        .field("maxSegments", &TessellationParameters::maxSegments);

    value_object<Mesh>("Mesh")
        .field("vertices", &Mesh::vertices)
        .field("indices", &Mesh::indices)
        .field("normals", &Mesh::normals);

    value_object<Aabb>("Aabb")
        .field("min", &Aabb::min)
        .field("max", &Aabb::max);

    register_vector<Vec3>("Vec3List");
    register_vector<unsigned int>("IndexList");

    function("tessellateUnitSphere", &tessellate_unit_sphere_js);
    function("tessellateCylinder", &tessellate_cylinder_js);
    function("triangleCount", &woodshop::geom::triangle_count);
    function("computeAabb", &woodshop::geom::compute_aabb);
    function("surfaceArea", &woodshop::geom::surface_area);
}

int main() {
    return 0;
}

#endif // __EMSCRIPTEN__
