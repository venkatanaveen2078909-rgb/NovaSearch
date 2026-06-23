#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <algorithm>
#include <queue>

namespace novasearch {

class TrieNode {
public:
    std::unordered_map<char, std::shared_ptr<TrieNode>> children;
    bool is_word = false;
    uint32_t frequency = 0;
};

class AutocompleteEngine {
public:
    AutocompleteEngine() : root_(std::make_shared<TrieNode>()) {}

    // Insert word and frequency
    void insert(const std::string& word, uint32_t frequency) {
        auto current = root_;
        for (char ch : word) {
            if (!current->children.contains(ch)) {
                current->children[ch] = std::make_shared<TrieNode>();
            }
            current = current->children[ch];
        }
        current->is_word = true;
        current->frequency = std::max(current->frequency, frequency);
    }

    // Retrieve suggestions matching prefix sorted by rank density
    std::vector<std::pair<std::string, uint32_t>> suggest(const std::string& prefix, size_t limit = 5) const {
        auto current = root_;
        for (char ch : prefix) {
            if (!current->children.contains(ch)) {
                return {};
            }
            current = current->children[ch];
        }

        // We reached the end of prefix node, now traverse the subtree to collect all items
        std::vector<std::pair<std::string, uint32_t>> items;
        traverse_dfs(current, prefix, items);

        // Sort by frequency descending
        std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) {
            return a.second > b.second;
        });

        if (items.size() > limit) {
            items.resize(limit);
        }
        return items;
    }

private:
    void traverse_dfs(std::shared_ptr<TrieNode> node, std::string current_prefix, 
                      std::vector<std::pair<std::string, uint32_t>>& items) const {
        if (node->is_word) {
            items.push_back({current_prefix, node->frequency});
        }
        
        for (const auto& [ch, child] : node->children) {
            traverse_dfs(child, current_prefix + ch, items);
        }
    }

    std::shared_ptr<TrieNode> root_;
};

} // namespace novasearch
