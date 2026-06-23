#pragma once

#include "../common/types.hpp"
#include <string>
#include <cmath>

namespace novasearch {

// Base interface for Strategy Pattern
class RankingStrategy {
public:
    virtual ~RankingStrategy() = default;

    virtual double score(
        uint32_t tf,            // Term frequency in doc
        size_t df,              // Document frequency of term
        size_t N,               // Total documents in corpus
        uint32_t doc_len,       // Document length
        double avg_doc_len      // Average document length in index
    ) const = 0;
};

// TF-IDF Implementation
class TFIDFStrategy : public RankingStrategy {
public:
    double score(
        uint32_t tf,
        size_t df,
        size_t N,
        uint32_t doc_len,
        double avg_doc_len
    ) const override {
        if (tf == 0 || df == 0) return 0.0;
        double tf_weight = 1.0 + std::log10(static_cast<double>(tf));
        double idf = std::log10(static_cast<double>(N) / static_cast<double>(df));
        return tf_weight * idf;
    }
};

// BM25 Implementation
class BM25Strategy : public RankingStrategy {
public:
    explicit BM25Strategy(double k1 = 1.2, double b = 0.75) : k1_(k1), b_(b) {}

    double score(
        uint32_t tf,
        size_t df,
        size_t N,
        uint32_t doc_len,
        double avg_doc_len
    ) const override {
        if (tf == 0 || df == 0) return 0.0;
        
        // IDF formula standard for BM25 (handles smoothing)
        double idf = std::log((static_cast<double>(N) - static_cast<double>(df) + 0.5) / 
                              (static_cast<double>(df) + 0.5) + 1.0);
        
        double numerator = static_cast<double>(tf) * (k1_ + 1);
        double denominator = static_cast<double>(tf) + k1_ * (1.0 - b_ + b_ * (static_doc_len(doc_len) / std::max(0.1, avg_doc_len)));
        
        return idf * (numerator / denominator);
    }

private:
    double static_doc_len(uint32_t len) const {
        return static_cast<double>(len == 0 ? 1 : len);
    }

    double k1_;
    double b_;
};

} // namespace novasearch
