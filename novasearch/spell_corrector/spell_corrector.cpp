#include "spell_corrector.hpp"
#include <algorithm>
#include <numeric>

namespace novasearch {

int SpellCorrector::levenshtein_distance(const std::string& s1, const std::string& s2) {
    if (s1.empty()) return s2.size();
    if (s2.empty()) return s1.size();

    const size_t len1 = s1.size();
    const size_t len2 = s2.size();
    
    // DP row optimization (we only need the previous row to calculate the current one)
    std::vector<int> col(len2 + 1);
    std::iota(col.begin(), col.end(), 0);

    for (size_t i = 0; i < len1; ++i) {
        col[0] = i + 1;
        int prev = i;
        for (size_t j = 0; j < len2; ++j) {
            int temp = col[j + 1];
            if (s1[i] == s2[j]) {
                col[j + 1] = prev;
            } else {
                col[j + 1] = std::min({col[j] + 1, col[j + 1] + 1, prev + 1});
            }
            prev = temp;
        }
    }
    return col[len2];
}

void SpellCorrector::insert(const std::string& word) {
    if (word.empty()) return;
    
    if (root_ == nullptr) {
        root_ = std::make_shared<BKNode>(word);
        return;
    }

    auto current = root_;
    while (true) {
        int dist = levenshtein_distance(current->word, word);
        if (dist == 0) {
            return; // Duplicate
        }

        if (current->children.contains(dist)) {
            current = current->children[dist];
        } else {
            current->children[dist] = std::make_shared<BKNode>(word);
            break;
        }
    }
}

void SpellCorrector::load_dictionary(const std::vector<std::string>& words) {
    for (const auto& w : words) {
        insert(w);
    }
}

std::vector<std::string> SpellCorrector::search(const std::string& query, int max_distance) const {
    if (root_ == nullptr || query.empty()) return {};
    
    std::vector<std::string> results;
    search_recursive(root_, query, max_distance, results);
    return results;
}

void SpellCorrector::search_recursive(const std::shared_ptr<BKNode>& node, const std::string& query, 
                                     int max_distance, std::vector<std::string>& results) const {
    if (!node) return;

    int dist = levenshtein_distance(node->word, query);
    if (dist <= max_distance) {
        results.push_back(node->word);
    }

    // Iterate through children whose distance from the node is in [dist - max_distance, dist + max_distance]
    int low = dist - max_distance;
    int high = dist + max_distance;

    for (const auto& [child_dist, child_node] : node->children) {
        if (child_dist >= low && child_dist <= high) {
            search_recursive(child_node, query, max_distance, results);
        }
    }
}

} // namespace novasearch
