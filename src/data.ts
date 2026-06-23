import { MockDocument } from './types';

// Richly detailed technical corpora to rank with BM25 vs TF-IDF
export const mockDocuments: MockDocument[] = [
  {
    id: 1,
    url: 'https://google.internal/search/infra/distributed-consensus',
    title: 'Paxos and Raft consensus algorithms in modern sharded systems',
    content: 'Distributed consensus algorithms like Paxos and Raft are critical for maintaining state machine replication. In highly sharded indexing systems, coordinators make parallel RPC connections to active database nodes. A single master node handles write coordination while replication prevents shard partitioning failure. Distributed database systems use heartbeats to check node health and prevent split-brain states.',
    rawHtml: '<html><head><title>Paxos and Raft</title></head><body><h1>Consensus Systems</h1><p>Distributed consensus algorithms like Paxos...</p></body></html>',
    pageSize: '45.2',
    pagerank: 9.8
  },
  {
    id: 2,
    url: 'https://google.internal/indexing/engine/inverted-index-performance',
    title: 'High-speed Inverted Index structures and posting list layouts',
    content: 'An inverted index maps query search terms to matching postings. Standard positional indices record document references along with word offset frequency metrics to facilitate proximity and phrase searches. Performance is optimized by packing posting lists using Elias-Fano or variable byte compression. Search engine latency is minimized by caching results in LRU lookups.',
    rawHtml: '<html><head><title>Inverted Index Info</title></head><body><h2>Inverted Indexes</h2><p>An inverted index maps query search terms...</p></body></html>',
    pageSize: '28.1',
    pagerank: 8.4
  },
  {
    id: 3,
    url: 'https://google.internal/search/ranking/bm25-strategy-parameters',
    title: 'Practical optimization of Okapi BM25 and term saturation parameters',
    content: 'The Okapi BM25 ranking algorithm scores document relevance using dynamic term frequency saturation and document lengths. Unlike linear TF-IDF weighting, BM25 normalizes long documents with k1 and b parameters to preserve score consistency. Term frequency saturation ensures excessive duplicates of a search term do not artificially bias final aggregations.',
    rawHtml: '<html><head><title>Okapi BM25 Tuning</title></head><body><h1>BM25 Scoring</h1><p>The Okapi BM25 ranking algorithm...</p></body></html>',
    pageSize: '35.4',
    pagerank: 7.9
  },
  {
    id: 4,
    url: 'https://google.internal/systems/concurrency/lock-free-queues',
    title: 'Lock-free Producer-Consumer queues in Multi-threaded C++',
    content: 'High-throughput networking in search crawlers relies on thread pools and lock-free thread queues. Using std::atomic, CAS (Compare-And-Swap) operations, and std::jthread avoid mutex contention bottlenecks. Work-stealing schedulers dynamically balances parsing tasks between downloader workers, achieving thousands of concurrent webpage downloads.',
    rawHtml: '<html><head><title>Lock Free Queues</title></head><body><h1>Cpp Concurrency</h1><p>Lock-free Producer-Consumer...</p></body></html>',
    pageSize: '52.7',
    pagerank: 9.1
  },
  {
    id: 5,
    url: 'https://google.internal/crawler/politess-domain-rate-limits',
    title: 'Asynchronous crawling topology and domain rate limit rules',
    content: 'Web crawlers schedule URL frontiers using leaky bucket queues to throttle network traffic. politeness delays are applied per host domain to ensure target servers are not overwhelmed by concurrent downloader requests. The scheduler registers robots.txt disallow routes to guarantee ethical traversal and content extraction.',
    rawHtml: '<html><head><title>Crawler Politeness</title></head><body><h1>ethical crawling</h1><p>Web crawlers schedule URL frontiers...</p></body></html>',
    pageSize: '19.6',
    pagerank: 6.5
  },
  {
    id: 6,
    url: 'https://google.internal/search/analytics/autocomplete-trie-structures',
    title: 'Trie structures for real-time query autocompletion suggestions',
    content: 'Instant prefix search recommendations depend on Trie data structures. As users type letters, lookups walk key pathways in O(k) complexity. Each leaf node aggregates query frequency scores to return top ordered recommendations. LRU query cache bypasses heavy keyword evaluations upon matching high frequency inputs.',
    rawHtml: '<html><head><title>Tries & Autocomplete</title></head><body><h1>Trie structures</h1><p>Instant prefix search...</p></body></html>',
    pageSize: '31.2',
    pagerank: 7.2
  },
  {
    id: 7,
    url: 'https://google.internal/spelling/bk-tree-levenshtein-metric',
    title: 'BK-Trees and Levenshtein metric space for spelling suggestion searches',
    content: 'Burkhard-Keller (BK) Trees prune dictionary keyword distances mathematically using Triangle Inequalities on Levenshtein edits. Spell checkers find closest replacements (within distance d <= 2) in logarithm durations. When users submit machine learning query variants, spell checkers align typos with corrected lexicons instantly.',
    rawHtml: '<html><head><title>BK Trees and Levenshtein</title></head><body><h1>BK-Trees</h1><p>BK-Trees prune dictionary...</p></body></html>',
    pageSize: '44.8',
    pagerank: 8.6
  }
];

// Trie Autocomplete Mock Dataset
export const trieWords = [
  { word: 'distributed', freq: 940 },
  { word: 'distribution', freq: 610 },
  { word: 'distance', freq: 480 },
  { word: 'dispatch', freq: 350 },
  { word: 'display', freq: 220 },
  { word: 'search', freq: 990 },
  { word: 'searcher', freq: 520 },
  { word: 'security', freq: 410 },
  { word: 'systems', freq: 880 },
  { word: 'scheduler', freq: 440 },
  { word: 'sharding', freq: 790 },
  { word: 'shard_server', freq: 310 },
  { word: 'compiler', freq: 670 },
  { word: 'compilation', freq: 330 },
  { word: 'concurrency', freq: 850 },
  { word: 'consensus', freq: 720 },
  { word: 'cache', freq: 810 },
  { word: 'caching', freq: 590 },
  { word: 'crawler', freq: 900 },
  { word: 'crawl', freq: 420 },
  { word: 'machine', freq: 730 },
  { word: 'maching', freq: 100 },
  { word: 'mechanic', freq: 150 },
  { word: 'machinery', freq: 220 },
  { word: 'learning', freq: 890 }
];

// C++ Source Code mapping for the Repo tab
export const cppCoreFiles = [
  {
    name: 'types.hpp',
    path: 'common/types.hpp',
    code: `#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <shared_mutex>

namespace novasearch {

struct Document {
    uint32_t id;
    std::string url;
    std::string title;
    std::string content;
    std::string raw_html;
    std::unordered_map<std::string, double> metadata;
    double pagerank_score = 1.0;
};

struct Posting {
    uint32_t doc_id;
    uint32_t term_frequency = 0;
    std::vector<uint32_t> positions;
};

using PostingList = std::vector<Posting>;

enum class TokenType {
    TERM, AND, OR, NOT, LPAREN, RPAREN, QUOTE, END
};

struct Token {
    TokenType type;
    std::string value;
};

struct SearchResult {
    uint32_t doc_id;
    std::string url;
    std::string title;
    std::string snippet;
    double score = 0.0;
};

struct ShardConfig {
    uint16_t shard_id;
    std::string address;
    std::pair<std::string, std::string> term_range;
};

} // namespace novasearch`
  },
  {
    name: 'thread_pool.hpp',
    path: 'common/thread_pool.hpp',
    code: `#pragma once

#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <future>
#include <functional>
#include <concepts>

namespace novasearch {

class ThreadPool {
public:
    explicit ThreadPool(size_t threads = std::thread::hardware_concurrency()) {
        for (size_t i = 0; i < threads; ++i) {
            workers_.emplace_back([this](std::stop_token stop_token) {
                while (!stop_token.stop_requested()) {
                    std::function<void()> task;
                    {
                        std::unique_lock<std::mutex> lock(this->queue_mutex_);
                        this->cv_.wait(lock, [this, &stop_token] {
                            return stop_token.stop_requested() || !this->tasks_.empty();
                        });
                        
                        if (stop_token.stop_requested() && this->tasks_.empty()) return;
                        
                        task = std::move(this->tasks_.front());
                        this->tasks_.pop();
                    }
                    task();
                }
            });
        }
    }

    template <typename F, typename... Args>
    requires std::invocable<F, Args...>
    auto enqueue(F&& f, Args&&... args) 
        -> std::future<typename std::invoke_result<F, Args...>::type> {
        using return_type = typename std::invoke_result<F, Args...>::type;

        auto task = std::make_shared<std::packaged_task<return_type()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...)
        );
        
        std::future<return_type> res = task->get_future();
        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            tasks_.emplace([task]() { (*task)(); });
        }
        cv_.notify_one();
        return res;
    }

    ~ThreadPool() { cv_.notify_all(); }

private:
    std::vector<std::jthread> workers_;
    std::queue<std::function<void()>> tasks_;
    std::mutex queue_mutex_;
    std::condition_variable cv_;
};

} // namespace novasearch`
  },
  {
    name: 'ranking.hpp',
    path: 'ranking/ranking.hpp',
    code: `#pragma once

#include "../common/types.hpp"
#include <cmath>

namespace novasearch {

class RankingStrategy {
public:
    virtual ~RankingStrategy() = default;
    virtual double score(uint32_t tf, size_t df, size_t N, uint32_t doc_len, double avg_doc_len) const = 0;
};

class TFIDFStrategy : public RankingStrategy {
public:
    double score(uint32_t tf, size_t df, size_t N, uint32_t doc_len, double avg_doc_len) const override {
        if (tf == 0 || df == 0) return 0.0;
        double tf_weight = 1.0 + std::log10(static_cast<double>(tf));
        double idf = std::log10(static_cast<double>(N) / static_cast<double>(df));
        return tf_weight * idf;
    }
};

class BM25Strategy : public RankingStrategy {
public:
    explicit BM25Strategy(double k1 = 1.2, double b = 0.75) : k1_(k1), b_(b) {}

    double score(uint32_t tf, size_t df, size_t N, uint32_t doc_len, double avg_doc_len) const override {
        if (tf == 0 || df == 0) return 0.0;
        double idf = std::log((static_cast<double>(N) - static_cast<double>(df) + 0.5) / 
                              (static_cast<double>(df) + 0.5) + 1.0);
        
        double numerator = static_cast<double>(tf) * (k1_ + 1);
        double denominator = static_cast<double>(tf) + k1_ * (1.0 - b_ + b_ * (static_doc_len(doc_len) / std::max(0.1, avg_doc_len)));
        return idf * (numerator / denominator);
    }

private:
    double static_doc_len(uint32_t len) const { return static_cast<double>(len == 0 ? 1 : len); }
    double k1_;
    double b_;
};

} // namespace novasearch`
  },
  {
    name: 'search.proto',
    path: 'networking/search.proto',
    code: `syntax = "proto3";

package novasearch.proto;

service SearchService {
    rpc QueryShard (SearchRequest) returns (SearchResponse);
    rpc Heartbeat (PingRequest) returns (PingResponse);
}

service CoordinatorService {
    rpc RegisterShardNode (RegisterRequest) returns (RegisterResponse);
}

message SearchRequest {
    string query = 1;
    int32 result_limit = 2;
    string algorithm = 3;
}

message ShardItem {
    uint32 doc_id = 1;
    string url = 2;
    string title = 3;
    string snippet = 4;
    double score = 5;
}

message SearchResponse {
    uint32 shard_id = 1;
    repeated ShardItem results = 2;
    double latency_ms = 3;
    bool success = 4;
}

message PingRequest {
    uint16 sender_node_id = 1;
}

message PingResponse {
    bool ok = 1;
    double load_average = 2;
}

message RegisterRequest {
    uint16 shard_id = 1;
    string grpc_address = 2;
    repeated string term_ranges = 3;
}

message RegisterResponse {
    bool success = 1;
    string assigned_token = 2;
}`
  },
  {
    name: 'coordinator.cpp',
    path: 'coordinator/coordinator.cpp',
    code: `#include "coordinator.hpp"
#include <algorithm>
#include <chrono>

namespace novasearch {

Coordinator::Coordinator(size_t cache_capacity)
    : execution_pool_(4), query_cache_(cache_capacity) {}

void Coordinator::register_shard_client(uint16_t shard_id, std::shared_ptr<ShardServer> shard_ptr) {
    std::unique_lock lock(topology_mutex_);
    active_shards_[shard_id] = std::move(shard_ptr);
}

std::vector<SearchResult> Coordinator::query(const std::string& search_query, const std::string& ranking_algo, size_t limit) {
    auto start_time = std::chrono::steady_clock::now();
    query_count_++;

    std::string cache_key = search_query + "||" + ranking_algo + "||" + std::to_string(limit);
    auto cached_res = query_cache_.get(cache_key);
    if (cached_res.has_value()) {
        return cached_res.value();
    }

    std::vector<std::shared_ptr<ShardServer>> shards_snapshot;
    {
        std::shared_lock lock(topology_mutex_);
        for (const auto& [id, ptr] : active_shards_) shards_snapshot.push_back(ptr);
    }

    std::vector<std::future<ShardServer::RPCResponse>> futures;
    ShardServer::RPCContext ctx{search_query, ranking_algo, static_cast<int>(limit)};

    for (const auto& shard : shards_snapshot) {
        futures.push_back(execution_pool_.enqueue([shard, ctx]() {
            try { return shard->execute_local_query_grpc(ctx); }
            catch (...) {
                ShardServer::RPCResponse fail;
                fail.shard_id = shard->get_shard_id();
                fail.success = false;
                return fail;
            }
        }));
    }

    std::vector<ShardServer::RPCResponse> responses;
    for (auto& f : futures) {
        if (f.valid()) responses.push_back(f.get());
    }

    auto merged_results = merge_and_rank_results(responses, limit);
    query_cache_.put(cache_key, merged_results);

    return merged_results;
}

std::vector<SearchResult> Coordinator::merge_and_rank_results(
    const std::vector<ShardServer::RPCResponse>& responses, size_t limit) {
    
    std::vector<SearchResult> consolidated;
    for (const auto& resp : responses) {
        if (!resp.success) continue;
        for (const auto& item : resp.items) consolidated.push_back(item);
    }

    std::unordered_map<uint32_t, SearchResult> dedup;
    for (auto&& item : consolidated) {
        auto it = dedup.find(item.doc_id);
        if (it == dedup.end() || item.score > it->second.score) dedup[item.doc_id] = std::move(item);
    }

    std::vector<SearchResult> sorted;
    for (auto&& [_, item] : dedup) sorted.push_back(std::move(item));

    std::sort(sorted.begin(), sorted.end(), [](const SearchResult& a, const SearchResult& b) {
        return a.score > b.score;
    });

    if (sorted.size() > limit) sorted.resize(limit);
    return sorted;
}

}`
  },
  {
    name: 'CMakeLists.txt',
    path: 'CMakeLists.txt',
    code: `cmake_minimum_required(VERSION 3.20)
project(NovaSearch CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_compile_options(-Wall -Wextra -Wpedantic -O3)

find_package(threads REQUIRED)
find_package(protobuf CONFIG REQUIRED)
find_package(gRPC CONFIG REQUIRED)

enable_testing()
find_package(GTest REQUIRED)

include_directories(\${CMAKE_CURRENT_SOURCE_DIR} \${CMAKE_CURRENT_BINARY_DIR})

set(PROTO_SRC_DIR "\${CMAKE_CURRENT_SOURCE_DIR}/networking")
set(PROTO_FILE "\${PROTO_SRC_DIR}/search.proto")

set(GEN_PROTO_SRC "\${CMAKE_CURRENT_BINARY_DIR}/networking/search.pb.cc")
set(GEN_PROTO_HDR "\${CMAKE_CURRENT_BINARY_DIR}/networking/search.pb.h")
set(GEN_GRPC_SRC "\${CMAKE_CURRENT_BINARY_DIR}/networking/search.grpc.pb.cc")
set(GEN_GRPC_HDR "\${CMAKE_CURRENT_BINARY_DIR}/networking/search.grpc.pb.h")

add_custom_command(
    OUTPUT "\${GEN_PROTO_SRC}" "\${GEN_PROTO_HDR}" "\${GEN_GRPC_SRC}" "\${GEN_GRPC_HDR}"
    COMMAND protobuf::protoc
    ARGS --cpp_out="\${CMAKE_CURRENT_BINARY_DIR}" --grpc_out="\${CMAKE_CURRENT_BINARY_DIR}"
         --plugin=protoc-gen-grpc=$<TARGET_FILE:gRPC::grpc_cpp_plugin>
         -I "\${CMAKE_CURRENT_SOURCE_DIR}" "\${PROTO_FILE}"
    DEPENDS "\${PROTO_FILE}"
)

add_library(novasearch_core STATIC
    \${GEN_PROTO_SRC}
    crawler/crawler.cpp
    parser/parser.cpp
    indexer/indexer.cpp
    ranking/ranking.cpp
    query_engine/query_engine.cpp
    spell_corrector/spell_corrector.cpp
    coordinator/coordinator.cpp
    shards/shard_server.cpp
)

target_link_libraries(novasearch_core PUBLIC threads gRPC::grpc++ protobuf::libprotobuf)

add_executable(novasearch_node main.cpp)
target_link_libraries(novasearch_node PRIVATE novasearch_core)

add_executable(novasearch_test tests/test_search.cpp)
target_link_libraries(novasearch_test PRIVATE novasearch_core GTest::gtest_main)
add_test(NAME CoreSearchTests COMMAND novasearch_test)`
  }
];
