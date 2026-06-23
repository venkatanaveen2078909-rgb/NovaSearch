cmake_minimum_required(VERSION 3.20)
project(NovaSearch CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force standard compiler warnings to retain Google-style code cleanliness
if(NOT MSVC)
    add_compile_options(-Wall -Wextra -Wpedantic -O3)
endif()

# Find external dependencies
find_package(threads REQUIRED)
find_package(protobuf CONFIG REQUIRED)
find_package(gRPC CONFIG REQUIRED)

# Google Test dependency
enable_testing()
find_package(GTest REQUIRED)

# Paths and headers configuration
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_BINARY_DIR}
)

# --- Protobuf & gRPC Auto Compilation Tracing ---
set(PROTO_SRC_DIR "${CMAKE_CURRENT_SOURCE_DIR}/networking")
set(PROTO_FILE "${PROTO_SRC_DIR}/search.proto")

# Generated Files Paths
set(GEN_PROTO_SRC "${CMAKE_CURRENT_BINARY_DIR}/networking/search.pb.cc")
set(GEN_PROTO_HDR "${CMAKE_CURRENT_BINARY_DIR}/networking/search.pb.h")
set(GEN_GRPC_SRC "${CMAKE_CURRENT_BINARY_DIR}/networking/search.grpc.pb.cc")
set(GEN_GRPC_HDR "${CMAKE_CURRENT_BINARY_DIR}/networking/search.grpc.pb.h")

# Custom commands triggering protoc compilation
add_custom_command(
    OUTPUT "${GEN_PROTO_SRC}" "${GEN_PROTO_HDR}" "${GEN_GRPC_SRC}" "${GEN_GRPC_HDR}"
    COMMAND protobuf::protoc
    ARGS --cpp_out="${CMAKE_CURRENT_BINARY_DIR}" --grpc_out="${CMAKE_CURRENT_BINARY_DIR}"
         --plugin=protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
         -I "${CMAKE_CURRENT_SOURCE_DIR}" "${PROTO_FILE}"
    DEPENDS "${PROTO_FILE}"
    VERBATIM
)

# --- Core Inverted Indexing & Clustering Library ---
add_library(novasearch_core STATIC
    ${GEN_PROTO_SRC}
    crawler/crawler.cpp
    parser/parser.cpp
    indexer/indexer.cpp
    ranking/ranking.cpp
    query_engine/query_engine.cpp
    spell_corrector/spell_corrector.cpp
    coordinator/coordinator.cpp
    shards/shard_server.cpp
)

target_link_libraries(novasearch_core
    PUBLIC
    threads
    gRPC::grpc++
    protobuf::libprotobuf
)

# --- Distributed Entry Launcher (Main Node service) ---
add_executable(novasearch_node
    main.cpp
)

target_link_libraries(novasearch_node
    PRIVATE
    novasearch_core
)

# --- Unit Tests Suite ---
add_executable(novasearch_test
    tests/test_search.cpp
)

target_link_libraries(novasearch_test
    PRIVATE
    novasearch_core
    GTest::gtest_main
)

add_test(NAME CoreSearchTests COMMAND novasearch_test)

# --- Performance Benchmarks Engine ---
add_executable(novasearch_benchmark
    benchmarks/benchmark.cpp
)

target_link_libraries(novasearch_benchmark
    PRIVATE
    novasearch_core
)
