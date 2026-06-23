#pragma once

#include "../common/types.hpp"
#include "../common/thread_pool.hpp"
#include <string>
#include <unordered_set>
#include <queue>
#include <mutex>
#include <shared_mutex>
#include <unordered_map>
#include <chrono>

namespace novasearch {

class Crawler {
public:
    struct ProgressStats {
        size_t urls_in_queue = 0;
        size_t urls_crawled = 0;
        std::unordered_set<std::string> discovered_domains;
        double current_speed = 0.0; // URLs/sec
    };

    Crawler(size_t max_concurrency, std::chrono::milliseconds politeness_delay);
    ~Crawler();

    void add_seed(const std::string& url);
    void start(size_t max_pages);
    void stop();

    // Callback invoked when a page is successfully crawled and ready for indexing
    void on_page_crawled(std::function<void(const Document&)> callback);

    ProgressStats get_stats() const;

private:
    void worker_loop();
    bool can_crawl(const std::string& url);
    bool should_respect_robots(const std::string& url);
    std::string download_page(const std::string& url);
    void delay_for_politeness(const std::string& host);

    size_t max_concurrency_;
    std::chrono::milliseconds politeness_delay_;
    bool running_{false};
    size_t pages_harvested_{0};
    size_t max_pages_to_crawl_{100};

    // Queues and Thread Safety
    std::queue<std::string> url_frontier_;
    std::unordered_set<std::string> visited_urls_;
    mutable std::shared_mutex frontier_mutex_;

    // Politeness state: tracks domain -> last accessed timestamp
    std::unordered_map<std::string, std::chrono::steady_clock::time_point> domain_politeness_;
    std::mutex politeness_mutex_;

    // callbacks
    std::function<void(const Document&)> on_page_crawled_cb_;
    
    std::vector<std::jthread> crawler_threads_;
};

} // namespace novasearch
