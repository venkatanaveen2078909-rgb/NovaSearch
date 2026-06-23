#include "ranking.hpp"
#include <memory>
#include <stdexcept>

namespace novasearch {

class RankingFactory {
public:
    enum class Type {
        TFIDF,
        BM25
    };

    static std::unique_ptr<RankingStrategy> create(Type type) {
        switch (type) {
            case Type::TFIDF:
                return std::make_unique<TFIDFStrategy>();
            case Type::BM25:
                return std::make_unique<BM25Strategy>();
            default:
                throw std::invalid_argument("Unknown ranking algorithm strategy requested.");
        }
    }
};

} // namespace novasearch
