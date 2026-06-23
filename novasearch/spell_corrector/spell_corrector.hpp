#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>

namespace novasearch {

class BKNode {
public:
    std::string word;
    // Map from edit distance -> child node pointers
    std::unordered_map<int, std::shared_ptr<BKNode>> children;

    explicit BKNode(std::string w) : word(std::move(w)) {}
};

class SpellCorrector {
public:
    SpellCorrector() = default;

    // Helper calculate Levenshtein distance between two strings
    static int levenshtein_distance(const std::string& s1, const std::string& s2);

    // Insert word into BK-Tree
    void insert(const std::string& word);

    // Add list of common vocabulary
    void load_dictionary(const std::vector<std::string>& words);

    // Query spellchecker for closest candidates within max distance
    std::vector<std::string> search(const std::string& query, int max_distance = 2) const;

private:
    void search_recursive(const std::shared_ptr<BKNode>& node, const std::string& query, 
                          int max_distance, std::vector<std::string>& results) const;

    std::shared_ptr<BKNode> root_ = nullptr;
};

} // namespace novasearch
