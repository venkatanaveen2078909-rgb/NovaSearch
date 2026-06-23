#include "indexer.hpp"
#include <sstream>
#include <algorithm>
#include <cctype>

namespace novasearch {

std::vector<std::string> Indexer::tokenize(const std::string& text) const {
    std::vector<std::string> tokens;
    std::string current;
    for (char ch : text) {
        if (std::isalnum(static_cast<unsigned char>(ch))) {
            current += std::tolower(static_cast<unsigned char>(ch));
        } else {
            if (!current.empty()) {
                tokens.push_back(current);
                current.clear();
            }
        }
    }
    if (!current.empty()) {
        tokens.push_back(current);
    }
    return tokens;
}

void Indexer::add_document(const Document& doc) {
    std::unique_lock lock(rw_mutex_);

    // 1. Store the document in global catalog
    auto shared_doc = std::make_shared<Document>(doc);
    documents_[doc.id] = shared_doc;

    // 2. Tokenize and index terms
    std::vector<std::string> tokens = tokenize(doc.content);
    doc_lengths_[doc.id] = tokens.size();
    total_tokens_indexed_ += tokens.size();

    // Term positional map for this document specifically
    // term -> list of zero-based offsets
    std::unordered_map<std::string, std::vector<uint32_t>> term_positions;
    for (uint32_t pos = 0; pos < tokens.size(); ++pos) {
        term_positions[tokens[pos]].push_back(pos);
    }

    // Update global Inverted Index
    for (const auto& [term, positions] : term_positions) {
        auto& posting_list = index_[term];
        
        Posting posting;
        posting.doc_id = doc.id;
        posting.term_frequency = positions.size();
        posting.positions = positions;
        
        posting_list.push_back(std::move(posting));
    }

    // Recompute average document length
    if (!documents_.empty()) {
        avg_doc_length_ = static_cast<double>(total_tokens_indexed_) / documents_.size();
    }
}

const PostingList* Indexer::get_postings(const std::string& term) const {
    std::shared_lock lock(rw_mutex_);
    auto it = index_.find(term);
    if (it != index_.end()) {
        return &(it->second);
    }
    return nullptr;
}

std::shared_ptr<Document> Indexer::get_document(uint32_t doc_id) const {
    std::shared_lock lock(rw_mutex_);
    auto it = documents_.find(doc_id);
    if (it != documents_.end()) {
        return it->second;
    }
    return nullptr;
}

size_t Indexer::get_vocabulary_size() const {
    std::shared_lock lock(rw_mutex_);
    return index_.size();
}

size_t Indexer::get_total_documents() const {
    std::shared_lock lock(rw_mutex_);
    return documents_.size();
}

double Indexer::get_average_document_length() const {
    std::shared_lock lock(rw_mutex_);
    return avg_doc_length_;
}

uint32_t Indexer::get_document_length(uint32_t doc_id) const {
    std::shared_lock lock(rw_mutex_);
    auto it = doc_lengths_.find(doc_id);
    if (it != doc_lengths_.end()) {
        return it->second;
    }
    return 0;
}

size_t Indexer::get_document_frequency(const std::string& term) const {
    std::shared_lock lock(rw_mutex_);
    auto it = index_.find(term);
    if (it != index_.end()) {
        return it->second.size();
    }
    return 0;
}

} // namespace novasearch
