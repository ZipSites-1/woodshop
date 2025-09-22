#pragma once

#include "woodshop/io/StepIo.hpp"

#include <filesystem>

namespace woodshop::io {

MeshModel read_iges(const std::filesystem::path& path);
void write_iges(const MeshModel& model, const std::filesystem::path& path);

} // namespace woodshop::io
