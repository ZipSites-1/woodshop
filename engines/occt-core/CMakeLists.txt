cmake_minimum_required(VERSION 3.20)
project(occt_core LANGUAGES CXX)
add_library(occt_core STATIC src/placeholder.cpp)
target_compile_features(occt_core PUBLIC cxx_std_17)
