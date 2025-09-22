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

} // namespace

EMSCRIPTEN_BINDINGS(woodshop_occt_core) {
    using namespace emscripten;
    using woodshop::geom::Mesh;
    using woodshop::geom::TessellationParameters;
    using woodshop::geom::Vec3;

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
        .field("indices", &Mesh::indices);

    register_vector<Vec3>("Vec3List");
    register_vector<unsigned int>("IndexList");

    function("tessellateUnitSphere", &tessellate_unit_sphere_js);
    function("triangleCount", &woodshop::geom::triangle_count);
}

int main() {
    return 0;
}

#endif // __EMSCRIPTEN__
