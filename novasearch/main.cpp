#include "common/types.hpp"
#include "crawler/crawler.hpp"
#include "parser/parser.hpp"
#include "indexer/indexer.hpp"
#include "query_engine/query_engine.hpp"
#include "coordinator/coordinator.hpp"
#include <iostream>
#include <string>
#include <vector>

void print_usage() {
    std::cout << "NovaSearch Central CLI v1.0.0 (Google candidate standard)\n"
              << "Usage:\n"
              << "  novasearch crawl <seed_url>              Crawler execution\n"
              << "  novasearch index <corpus_directory>      Local folder parser and indexer\n"
              << "  novasearch search <query> [--rank strategy]  Standard query execution strategy\n"
              << "  novasearch cluster <port>                Initialize distributed node\n\n";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage();
        return 1;
    }

    std::string command = argv[1];

    if (command == "crawl") {
        if (argc < 3) {
            std::cerr << "Error: Seed URL is required for crawling.\n";
            return 1;
        }
        std::string seed = argv[2];
        std::cout << "[NovaSearch C++ Crawler] Initializing with seed: " << seed << "\n";
        
        novasearch::Crawler crawler(4, std::chrono::milliseconds(200));
        crawler.add_seed(seed);
        crawler.on_page_crawled([](const novasearch::Document& doc) {
            std::cout << "[HARVESTED] " << doc.url << " (title: " << doc.title << ")\n";
        });
        
        crawler.start(10); // Crawl up to 10 pages for demonstration
        std::this_thread::sleep_for(std::chrono::seconds(5));
        crawler.stop();
        std::cout << "[Crawler completed] Outputting nodes telemetry status!\n";
    }
    else if (command == "search") {
        if (argc < 3) {
            std::cerr << "Error: Query term is required.\n";
            return 1;
        }
        std::string raw_query = argv[2];
        std::string strategy = "bm25";
        if (argc >= 5 && std::string(argv[3]) == "--rank") {
            strategy = argv[4];
        }

        std::cout << "[Search Engine Core] Querying index: \"" << raw_query << "\" (Ranker: " << strategy << ")\n";
        
        // Setup mock catalog index
        novasearch::Indexer idx;
        
        novasearch::Document doc1;
        doc1.id = 1;
        doc1.url = "https://example.com/sys-design";
        doc1.title = "High-Scale Distributed Search Systems";
        doc1.content = "distributed systems require smart sharding techniques where coordinates fan-out calls to shards.";
        idx.add_document(doc1);

        novasearch::Document doc2;
        doc2.id = 2;
        doc2.url = "https://example.com/ranking";
        doc2.title = "Search Ranking BM25 Formula Standards";
        doc2.content = "inverted index and bm25 ranking provide modern search engine retrieval results with term frequency.";
        idx.add_document(doc2);

        std::unique_ptr<novasearch::RankingStrategy> ranker;
        if (strategy == "tfidf") {
            ranker = std::make_unique<novasearch::TFIDFStrategy>();
        } else {
            ranker = std::make_unique<novasearch::BM25Strategy>();
        }

        novasearch::QueryEngine qe(idx, std::move(ranker));
        auto results = qe.search(raw_query);

        std::cout << "\nFound " << results.size() << " match(es):\n";
        for (const auto& res : results) {
            std::cout << "-> ID: " << res.doc_id << " | URL: " << res.url << " | Title: " << res.title << "\n"
                      << "   Score: " << res.score << "\n"
                      << "   Snippet: " << res.snippet << "\n\n";
        }
    }
    else if (command == "cluster") {
        if (argc < 3) {
            std::cerr << "Error: Port is required to initialize a cluster node.\n";
            return 1;
        }
        std::string port = argv[2];
        std::cout << "[NovaSearch Cluster Node] Starting single-shard gRPC server on 0.0.0.0:" << port << "\n";
        
        novasearch::ShardServer server(1, "0.0.0.0:" + port);
        server.start();
        std::this_thread::sleep_for(std::chrono::seconds(3));
        server.shutdown();
        std::cout << "[NovaSearch Cluster Node] Safely shutdown shard.\n";
    }
    else {
        std::cerr << "Error: Unknown command: " << command << "\n";
        print_usage();
        return 1;
    }

    return 0;
}
