#pragma once

#include <unordered_map>
#include <list>
#include <shared_mutex>
#include <optional>

namespace novasearch {

template <typename Key, typename Value>
class LRUCache {
public:
    explicit LRUCache(size_t capacity) : capacity_(capacity), hits_(0), misses_(0) {}

    std::optional<Value> get(const Key& key) {
        std::unique_lock lock(rw_mutex_);
        auto it = cache_map_.find(key);
        if (it == cache_map_.end()) {
            misses_++;
            return std::nullopt;
        }

        // Move the accessed item to the front of the list (MRU position)
        cache_list_.splice(cache_list_.begin(), cache_list_, it->second);
        hits_++;
        return it->second->second;
    }

    void put(const Key& key, const Value& value) {
        std::unique_lock lock(rw_mutex_);
        auto it = cache_map_.find(key);
        if (it != cache_map_.end()) {
            // Update existing value and move to front
            it->second->second = value;
            cache_list_.splice(cache_list_.begin(), cache_list_, it->second);
            return;
        }

        // If list is full, eject the LRU element (back of the list)
        if (cache_list_.size() >= capacity_) {
            auto lru_element = cache_list_.back();
            cache_map_.erase(lru_element.first);
            cache_list_.pop_back();
        }

        // Insert new element to MRU position
        cache_list_.push_front({key, value});
        cache_map_[key] = cache_list_.begin();
    }

    double get_hit_ratio() const {
        std::shared_lock lock(rw_mutex_);
        size_t total = hits_ + misses_;
        if (total == 0) return 0.0;
        return static_cast<double>(hits_) / total;
    }

    size_t get_size() const {
        std::shared_lock lock(rw_mutex_);
        return cache_map_.size();
    }

    size_t get_capacity() const {
        return capacity_;
    }

private:
    size_t capacity_;
    size_t hits_;
    size_t misses_;

    std::list<std::pair<Key, Value>> cache_list_;
    std::unordered_map<Key, typename std::list<std::pair<Key, Value>>::iterator> cache_map_;
    
    mutable std::shared_mutex rw_mutex_;
};

} // namespace novasearch
