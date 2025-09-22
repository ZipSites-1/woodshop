qt_add_executable(tst_desktop_models
  tst_chatmodel.cpp
)

target_link_libraries(tst_desktop_models PRIVATE
  woodshop_desktop_models
  Qt6::Core
  Qt6::Test
)

target_include_directories(tst_desktop_models PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/../src
  ${CMAKE_CURRENT_SOURCE_DIR}/../src/models
)

add_test(NAME desktop_models COMMAND tst_desktop_models)
