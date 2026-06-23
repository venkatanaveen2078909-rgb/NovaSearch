#pragma once

#include <cstddef>
#include <new>
#include <vector>
#include <memory>
#include <utility>

namespace novasearch {

/**
 * ArenaAllocator: Pre-allocates memory blocks to serve extremely fast allocations 
 * and avoid heap fragmentation. Specially designed for high-throughput structures like Tries or Indexes.
 */
class Arena {
public:
    explicit Arena(size_t block_size = 1024 * 1024) : block_size_(block_size) {
        allocate_block();
    }

    Arena(const Arena&) = delete;
    Arena& operator=(const Arena&) = delete;

    ~Arena() {
        for (char* ptr : blocks_) {
            delete[] ptr;
        }
    }

    void* allocate(size_t size) {
        // Round up size to align with 8-byte boundaries
        size = (size + 7) & ~7;

        if (current_offset_ + size > block_size_) {
            if (size > block_size_) {
                // Large allocation bypassing general blocks
                char* large_ptr = new char[size];
                blocks_.push_back(large_ptr);
                return large_ptr;
            }
            allocate_block();
        }

        void* result = current_block_ + current_offset_;
        current_offset_ += size;
        return result;
    }

private:
    void allocate_block() {
        current_block_ = new char[block_size_];
        blocks_.push_back(current_block_);
        current_offset_ = 0;
    }

    size_t block_size_;
    char* current_block_ = nullptr;
    size_t current_offset_ = 0;
    std::vector<char*> blocks_;
};

template <typename T>
class ArenaAllocator {
public:
    using value_type = T;

    explicit ArenaAllocator(Arena& arena) noexcept : arena_(&arena) {}

    template <typename U>
    ArenaAllocator(const ArenaAllocator<U>& other) noexcept : arena_(other.arena_) {}

    T* allocate(size_t n) {
        return static_cast<T*>(arena_->allocate(n * sizeof(T)));
    }

    void deallocate(T* p, size_t n) noexcept {
        // Arena deallocates everything at once upon destruction, individual deallocation is a no-op
    }

    template <typename U>
    struct rebind {
        using other = ArenaAllocator<U>;
    };

    template <typename U>
    friend class ArenaAllocator;

private:
    Arena* arena_;
};

template <typename T, typename U>
bool operator==(const ArenaAllocator<T>& a, const ArenaAllocator<U>& b) noexcept {
    return a.arena_ == b.arena_;
}

template <typename T, typename U>
bool operator!=(const ArenaAllocator<T>& a, const ArenaAllocator<U>& b) noexcept {
    return !(a == b);
}

} // namespace novasearch
