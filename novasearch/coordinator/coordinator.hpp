#pragma once

#include "../common/types.hpp"
#include "../common/thread_pool.hpp"
#include "../cache/lru_cache.hpp"
#include "../shards/shard_server.hpp"
#include <string>
#include <vector>
#include <memory>
#include <shared_mutex>
#include <future>

namespace novasearch {

class Coordinator {
public:
    struct ClusterMetrics {
        size_t active_nodes = 0;
        size_t total_shards = 0;
        double qps = 0.0;
        double avg_latency_ms = 0.0;
        double cache_hit_ratio = 0.0;
    };

    explicit Coordinator(size_t cache_capacity = 1000);
    ~Coordinator() = default;

    // Node topology operations
    void register_shard_client(uint16_t shard_id, std::shared_ptr<ShardServer> shard_ptr);
    void unregister_shard_client(uint16_t shard_id);

    // Entrypoint: Executes distributed search fanning out requests to active shard clients
    std::vector<SearchResult> query(const std::string& search_query, const std::string& ranking_algo = "bm25", size_t limit = 10);

    ClusterMetrics get_cluster_status() const;

private:
    std::vector<SearchResult> merge_and_rank_results(
        const std::vector<ShardServer::RPCResponse>& responses, 
        size_t limit
    );

    // Shard catalog and topology locking
    std::unordered_map<uint16_t, std::shared_ptr<ShardServer>> active_shards_;
    mutable std::shared_mutex topology_mutex_;

    // Performance thread-pool and query caching layers
    ThreadPool execution_pool_;
    LRUCache<std::string, std::vector<SearchResult>> query_cache_;

    // Cluster performance tracking metrics
    mutable size_t query_count_ = 0;
    mutable double cumulative_latency_ms_ = 0.0;
};

} // namespace novasearch
