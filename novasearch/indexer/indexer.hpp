#pragma once

#include "../common/types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <shared_mutex>
#include <memory>

namespace novasearch {

class Indexer {
public:
    Indexer() = default;

    // Index a parsed document into the inverted index
    void add_document(const Document& doc);

    // Get a postings list for a term (const pointer to preserve index)
    const PostingList* get_postings(const std::string& term) const;

    // Get Document Metadata by doc_id
    std::shared_ptr<Document> get_document(uint32_t doc_id) const;

    // Get statistics
    size_t get_vocabulary_size() const;
    size_t get_total_documents() const;
    double get_average_document_length() const;
    uint32_t get_document_length(uint32_t doc_id) const;
    size_t get_document_frequency(const std::string& term) const;

    std::vector<std::string> tokenize(const std::string& text) const;

private:
    // Core Inverted Index Map: term -> PostingList
    std::unordered_map<std::string, PostingList> index_;
    
    // Document Catalog (Store mapped documents by ID)
    std::unordered_map<uint32_t, std::shared_ptr<Document>> documents_;
    
    // Document statistics
    std::unordered_map<uint32_t, uint32_t> doc_lengths_;
    double avg_doc_length_ = 0.0;
    size_t total_tokens_indexed_ = 0;

    // Multi-Threading: Shared mutex for multiple searchers, single index modifier
    mutable std::shared_mutex rw_mutex_;
};

} // namespace novasearch
