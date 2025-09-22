cmake_minimum_required(VERSION 3.24)
project(woodshop_desktop LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

find_package(Qt6 6.5 REQUIRED COMPONENTS
  Core
  Gui
  Qml
  Quick
  QuickControls2
  QuickLayouts
  Test
)

qt_standard_project_setup()

include(CTest)

qt_policy(SET QTP0004 OLD)

set(DESKTOP_MODEL_SOURCES
  src/models/ActionCardModel.cpp
  src/models/ChatModel.cpp
  src/models/RevisionModel.cpp
)

qt_add_library(woodshop_desktop_models STATIC
  ${DESKTOP_MODEL_SOURCES}
)

target_include_directories(woodshop_desktop_models PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/src/models
)

target_link_libraries(woodshop_desktop_models PUBLIC
  Qt6::Core
)

qt_add_executable(woodshop_desktop
  src/main.cpp
  src/app/AppController.cpp
  src/services/McpSession.cpp
  src/services/OfflineCache.cpp
  src/services/OcctViewerBridge.cpp
)

target_include_directories(woodshop_desktop PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/src
  ${CMAKE_CURRENT_SOURCE_DIR}/src/app
  ${CMAKE_CURRENT_SOURCE_DIR}/src/models
  ${CMAKE_CURRENT_SOURCE_DIR}/src/services
)

qt_add_qml_module(woodshop_desktop
  URI Woodshop.Desktop
  VERSION 0.1
  RESOURCE_PREFIX /
  QML_FILES
    qml/Main.qml
    qml/components/ActionCard.qml
    qml/components/OfflineBanner.qml
    qml/components/StatusBadge.qml
    qml/components/ReactTraceView.qml
    qml/components/ToolChip.qml
    qml/views/ChatPane.qml
    qml/views/ViewerPane.qml
  RESOURCES
    assets/icons/app.svg
)

target_link_libraries(woodshop_desktop PRIVATE
  woodshop_desktop_models
  Qt6::Core
  Qt6::Gui
  Qt6::Qml
  Qt6::Quick
  Qt6::QuickControls2
  Qt6::QuickLayouts
)

set_target_properties(woodshop_desktop PROPERTIES
  WIN32_EXECUTABLE TRUE
  MACOSX_BUNDLE TRUE
)

install(TARGETS woodshop_desktop
  BUNDLE DESTINATION .
  RUNTIME DESTINATION bin
)

install(FILES assets/icons/app.svg
  DESTINATION share/icons/hicolor/scalable/apps
  RENAME woodshop.svg
)

install(FILES assets/woodshop.desktop
  DESTINATION share/applications
)

if(BUILD_TESTING)
  add_subdirectory(tests)
endif()

set(CPACK_PACKAGE_NAME "WoodshopDesktop")
set(CPACK_PACKAGE_VENDOR "Woodshop")
set(CPACK_PACKAGE_VERSION "0.1.0")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Offline-first CAD assistant for Woodshop")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/assets/LICENSE.txt")
set(CPACK_PACKAGE_ICON "${CMAKE_CURRENT_SOURCE_DIR}/assets/icons/app.svg")
set(CPACK_GENERATOR "DragNDrop;NSIS;TGZ")
set(CPACK_DMG_VOLUME_NAME "Woodshop Desktop")
set(CPACK_NSIS_DISPLAY_NAME "Woodshop Desktop")
set(CPACK_NSIS_PACKAGE_NAME "Woodshop Desktop")
set(CPACK_NSIS_CONTACT "support@woodshop.dev")
set(CPACK_NSIS_MENU_LINKS "woodshop_desktop" "Woodshop Desktop")
set(CPACK_ARCHIVE_COMPONENT_INSTALL OFF)

include(CPack)
