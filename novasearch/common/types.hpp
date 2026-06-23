#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <memory>
#include <shared_mutex>
#include <chrono>

namespace novasearch {

// Core document representation inside the index
struct Document {
    uint32_t id;
    std::string url;
    std::string title;
    std::string content;
    std::string raw_html;
    std::unordered_map<std::string, double> metadata; // For pagerank, crawl_time etc.
    double pagerank_score = 1.0;
};

// Represents a term occurrence in a document
struct Posting {
    uint32_t doc_id;
    uint32_t term_frequency = 0;
    std::vector<uint32_t> positions; // Byte offsets or word positions for proximity search
};

using PostingList = std::vector<Posting>;

// Represents query parsing token
enum class TokenType {
    TERM,
    AND,
    OR,
    NOT,
    LPAREN,
    RPAREN,
    QUOTE,
    END
};

struct Token {
    TokenType type;
    std::string value;
};

// Represents search result returned to the client
struct SearchResult {
    uint32_t doc_id;
    std::string url;
    std::string title;
    std::string snippet;
    double score = 0.0;
};

struct ShardConfig {
    uint16_t shard_id;
    std::string address; // gRPC target address "host:port"
    std::pair<std::string, std::string> term_range; // e.g. {"a", "g"}
};

} // namespace novasearch
