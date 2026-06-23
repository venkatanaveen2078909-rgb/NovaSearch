#include "shard_server.hpp"
#include <iostream>
#include <chrono>

namespace novasearch {

ShardServer::ShardServer(uint16_t shard_id, const std::string& bind_address)
    : shard_id_(shard_id), bind_address_(bind_address), shard_indexer_(std::make_unique<Indexer>()) {}

ShardServer::~ShardServer() {
    shutdown();
}

void ShardServer::start() {
    std::cout << "[SHARD " << shard_id_ << "] gRPC Service initialized on " << bind_address_ << "\n";
    active_ = true;
}

void ShardServer::shutdown() {
    active_ = false;
}

void ShardServer::index_document_on_shard(const Document& doc) {
    shard_indexer_->add_document(doc);
}

ShardServer::RPCResponse ShardServer::execute_local_query_grpc(const RPCContext& context) {
    auto start_time = std::chrono::steady_clock::now();
    RPCResponse response;
    response.shard_id = shard_id_;
    response.success = false;

    if (!active_) {
        return response;
    }

    // Dynamic Ranker strategy resolution
    std::unique_ptr<RankingStrategy> strategy;
    if (context.ranker_type == "tfidf") {
        strategy = std::make_unique<TFIDFStrategy>();
    } else {
        strategy = std::make_unique<BM25Strategy>();
    }

    // Local evaluation on index slice
    QueryEngine local_engine(*shard_indexer_, std::move(strategy));
    response.items = local_engine.search(context.query, context.max_results);
    response.success = true;

    auto end_time = std::chrono::steady_clock::now();
    response.latency_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();
    
    return response;
}

} // namespace novasearch
