#pragma once

#include "../networking/search.proto.h" // Simulated compiled protobuf header trace
#include "../indexer/indexer.hpp"
#include "../query_engine/query_engine.hpp"
#include <string>
#include <memory>

namespace novasearch {

/**
 * ShardServer: Runs on a worker node. Hosts a particular sub-slice of the index.
 * Under production compile, inherits from novasearch::proto::SearchService::Service for gRPC.
 */
class ShardServer {
public:
    ShardServer(uint16_t shard_id, const std::string& bind_address);
    ~ShardServer();

    void start();
    void shutdown();

    // Populate local slice content
    void index_document_on_shard(const Document& doc);

    // Mock representation of gRPC interface handler
    struct RPCContext {
        std::string query;
        std::string ranker_type;
        int max_results;
    };
    
    struct RPCResponse {
        uint16_t shard_id;
        std::vector<SearchResult> items;
        double latency_ms;
        bool success;
    };

    RPCResponse execute_local_query_grpc(const RPCContext& context);

    uint16_t get_shard_id() const { return shard_id_; }

private:
    uint16_t shard_id_;
    std::string bind_address_;
    bool active_ = false;

    std::unique_ptr<Indexer> shard_indexer_;
    std::unique_ptr<QueryEngine> query_engine_;
};

} // namespace novasearch
