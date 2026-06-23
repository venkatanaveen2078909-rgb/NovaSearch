#include "indexer/indexer.hpp"
#include "query_engine/query_engine.hpp"
#include "autocomplete/trie.hpp"
#include "spell_corrector/spell_corrector.hpp"
#include "cache/lru_cache.hpp"
#include <iostream>
#include <chrono>
#include <vector>
#include <random>

void benchmark_indexing_speed() {
    std::cout << "--- Benchmark: CPU Indexing Throughput ---\n";
    novasearch::Indexer indexer;
    
    // Create large dummy batch docs
    std::vector<novasearch::Document> docs;
    for (size_t i = 0; i < 5000; ++i) {
        novasearch::Document doc;
        doc.id = i;
        doc.url = "https://benchmark.domain/resource/" + std::to_string(i);
        doc.title = "Benchmark Document title " + std::to_string(i);
        doc.content = "distributed indexer systems engine query bm25 ranking performance cache hit memory block threads concurrency metrics database latency scalable speed crawler parse search autocomplete lookup";
        docs.push_back(std::move(doc));
    }

    auto start = std::chrono::high_resolution_clock::now();
    for (const auto& doc : docs) {
        indexer.add_document(doc);
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "Indexed " << docs.size() << " structured documents in : " << duration_ms << " ms\n"
              << "Average insertion speed                     : " << static_cast<double>(duration_ms) / docs.size() << " ms/doc\n"
              << "Estimated indexing throughput               : " << (docs.size() * 1000.0) / duration_ms << " docs/sec\n\n";
}

void benchmark_search_latency() {
    std::cout << "--- Benchmark: Query Engine BM25 Retrieval ---\n";
    novasearch::Indexer indexer;
    // Load sub catalog
    for (size_t i = 0; i < 1000; ++i) {
        novasearch::Document d{static_cast<uint32_t>(i), "url", "t", "distributed cluster structures with index query optimization performance concurrency and bm25 scoring", ""};
        indexer.add_document(d);
    }

    novasearch::QueryEngine qe(indexer, std::make_unique<novasearch::BM25Strategy>());
    
    auto start = std::chrono::high_resolution_clock::now();
    size_t query_runs = 1000;
    for (size_t q = 0; q < query_runs; ++q) {
        auto res = qe.search("distributed AND query AND optimization");
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration_us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

    std::cout << "Executed " << query_runs << " queries in: " << duration_us / 1000.0 << " ms\n"
              << "Average query latency   : " << static_cast<double>(duration_us) / query_runs << " microseconds/query\n"
              << "Throughput QPS          : " << (query_runs * 1000000.0) / duration_us << " queries/sec\n\n";
}

void benchmark_corrections() {
    std::cout << "--- Benchmark: BK-Tree Speller Corrections ---\n";
    novasearch::SpellCorrector spelling;
    // Seed vocabulary
    std::vector<std::string> vocab = {
        "machine", "learning", "distributed", "systems", "concurrency",
        "sharding", "algorithm", "compiler", "indexing", "database",
        "performance", "latency", "crawler", "autocomplete", "cache"
    };
    spelling.load_dictionary(vocab);

    auto start = std::chrono::high_resolution_clock::now();
    size_t runs = 5000;
    for (size_t i = 0; i < runs; ++i) {
        auto res = spelling.search("maching", 2);
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration_us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

    std::cout << "Executed " << runs << " Spell checks in: " << duration_us / 1000.0 << " ms\n"
              << "Average spelling latency: " << static_cast<double>(duration_us) / runs << " microseconds/check\n"
              << "Throughput checking     : " << (runs * 1000000.0) / duration_us << " checks/sec\n\n";
}

int main() {
    std::cout << "================= NovaSearch C++ Performance Metrics =================" << std::endl;
    benchmark_indexing_speed();
    benchmark_search_latency();
    benchmark_corrections();
    std::cout << "=====================================================================" << std::endl;
    return 0;
}
