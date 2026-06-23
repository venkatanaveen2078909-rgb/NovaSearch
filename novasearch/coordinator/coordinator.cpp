#include "coordinator.hpp"
#include <algorithm>
#include <iostream>
#include <chrono>

namespace novasearch {

Coordinator::Coordinator(size_t cache_capacity)
    : execution_pool_(4), query_cache_(cache_capacity) {}

void Coordinator::register_shard_client(uint16_t shard_id, std::shared_ptr<ShardServer> shard_ptr) {
    std::unique_lock lock(topology_mutex_);
    active_shards_[shard_id] = std::move(shard_ptr);
    std::cout << "[COORDINATOR] Registered shard leaf node " << shard_id << "\n";
}

void Coordinator::unregister_shard_client(uint16_t shard_id) {
    std::unique_lock lock(topology_mutex_);
    active_shards_.erase(shard_id);
    std::cout << "[COORDINATOR] Unregistered/dropped shard node " << shard_id << "\n";
}

std::vector<SearchResult> Coordinator::query(const std::string& search_query, const std::string& ranking_algo, size_t limit) {
    auto start_time = std::chrono::steady_clock::now();
    query_count_++;

    // 1. Check Query Caching Layer
    std::string cache_key = search_query + "||" + ranking_algo + "||" + std::to_string(limit);
    auto cached_res = query_cache_.get(cache_key);
    if (cached_res.has_value()) {
        auto end_time = std::chrono::steady_clock::now();
        cumulative_latency_ms_ += std::chrono::duration<double, std::milli>(end_time - start_time).count();
        return cached_res.value();
    }

    // Capture snapshot of active shards to fanned-out queries safely
    std::vector<std::shared_ptr<ShardServer>> shards_snapshot;
    {
        std::shared_lock lock(topology_mutex_);
        for (const auto& [id, ptr] : active_shards_) {
            shards_snapshot.push_back(ptr);
        }
    }

    // 2. Query Fan-out: Execute searches across all shards parallelly using thread pool futures
    std::vector<std::future<ShardServer::RPCResponse>> futures;
    ShardServer::RPCContext ctx{search_query, ranking_algo, static_cast<int>(limit)};

    for (const auto& shard : shards_snapshot) {
        futures.push_back(
            execution_pool_.enqueue([shard, ctx]() {
                // gRPC RPC call over loopback or node channel wrapper
                try {
                    return shard->execute_local_query_grpc(ctx);
                } catch (...) {
                    // Graceful degradation: returns a blank, failed packet
                    ShardServer::RPCResponse fail_response;
                    fail_response.shard_id = shard->get_shard_id();
                    fail_response.success = false;
                    return fail_response;
                }
            })
        );
    }

    // 3. Shard Aggregation: Collect and join futures with timeout tolerance or fail-safes
    std::vector<ShardServer::RPCResponse> responses;
    for (auto& f : futures) {
        // Wait for worker completion
        if (f.valid()) {
            responses.push_back(f.get());
        }
    }

    // 4. Merge rankings globally & resolve overlaps (duplicate removal)
    auto merged_results = merge_and_rank_results(responses, limit);

    // Save outputs in LRU Query Cache
    query_cache_.put(cache_key, merged_results);

    auto end_time = std::chrono::steady_clock::now();
    cumulative_latency_ms_ += std::chrono::duration<double, std::milli>(end_time - start_time).count();

    return merged_results;
}

std::vector<SearchResult> Coordinator::merge_and_rank_results(
    const std::vector<ShardServer::RPCResponse>& responses, 
    size_t limit) {
    
    std::vector<SearchResult> consolidated;
    for (const auto& resp : responses) {
        if (!resp.success) {
            std::cerr << "[COORDINATOR] Warning: Shard " << resp.shard_id << " returned an RPC fail status!\n";
            continue; // Node Partition Tolerance: skip failed shard
        }
        for (const auto& item : resp.items) {
            consolidated.push_back(item);
        }
    }

    // Deduplicate documents across shards (e.g. if different shards indexed overlap paths, though rarely with partitioned indexing)
    std::unordered_map<uint32_t, SearchResult> dedup_map;
    for (auto&& item : consolidated) {
        auto it = dedup_map.find(item.doc_id);
        if (it == dedup_map.end() || item.score > it->second.score) {
            dedup_map[item.doc_id] = std::move(item);
        }
    }

    std::vector<SearchResult> sorted_results;
    for (auto&& [_, item] : dedup_map) {
        sorted_results.push_back(std::move(item));
    }

    // Global sort on merge documents
    std::sort(sorted_results.begin(), sorted_results.end(), [](const SearchResult& a, const SearchResult& b) {
        return a.score > b.score;
    });

    if (sorted_results.size() > limit) {
        sorted_results.resize(limit);
    }

    return sorted_results;
}

Coordinator::ClusterMetrics Coordinator::get_cluster_status() const {
    std::shared_lock lock(topology_mutex_);
    ClusterMetrics metrics;
    metrics.active_nodes = active_shards_.size();
    metrics.total_shards = active_shards_.size(); // One active client per partition
    metrics.qps = query_count_ == 0 ? 0.0 : static_cast<double>(query_count_) / 10.0;
    metrics.avg_latency_ms = query_count_ == 0 ? 0.0 : cumulative_latency_ms_ / query_count_;
    metrics.cache_hit_ratio = query_cache_.get_hit_ratio();
    return metrics;
}

} // namespace novasearch
