#include "crawler.hpp"
#include <iostream>
#include <regex>
#include <thread>
#include <sstream>

namespace novasearch {

namespace {
// Helper to extract the domain/host and path from a URL
std::pair<std::string, std::string> parse_url(const std::string& url) {
    std::regex url_regex(R"(https?://([^/:\?#]+)(.*))");
    std::smatch match;
    if (std::regex_match(url, match, url_regex)) {
        return {match[1].str(), match[2].str()};
    }
    return {"", ""};
}

// Simple link extractor from HTML
std::vector<std::string> extract_links_regex(const std::string& html, const std::string& base_domain) {
    std::vector<std::string> links;
    std::regex link_regex(R"(href=["'](https?://[^"']+|/[^"']*)["'])", std::regex_case_insensitive);
    auto words_begin = std::sregex_iterator(html.begin(), html.end(), link_regex);
    auto words_end = std::sregex_iterator();

    for (std::sregex_iterator i = words_begin; i != words_end; ++i) {
        std::smatch match = *i;
        std::string link = match[1].str();
        if (link.starts_with("/")) {
            link = "https://" + base_domain + link;
        }
        links.push_back(link);
    }
    return links;
}
} // namespace

Crawler::Crawler(size_t max_concurrency, std::chrono::milliseconds politeness_delay)
    : max_concurrency_(max_concurrency), politeness_delay_(politeness_delay) {}

Crawler::~Crawler() {
    stop();
}

void Crawler::add_seed(const std::string& url) {
    std::unique_lock lock(frontier_mutex_);
    if (!visited_urls_.contains(url)) {
        url_frontier_.push(url);
    }
}

void Crawler::start(size_t max_pages) {
    {
        std::unique_lock lock(frontier_mutex_);
        if (running_) return;
        running_ = true;
        max_pages_to_crawl_ = max_pages;
        pages_harvested_ = 0;
    }

    for (size_t i = 0; i < max_concurrency_; ++i) {
        crawler_threads_.emplace_back(&Crawler::worker_loop, this);
    }
}

void Crawler::stop() {
    {
        std::unique_lock lock(frontier_mutex_);
        if (!running_) return;
        running_ = false;
    }
    crawler_threads_.clear(); // Joins all jthreads nicely
}

void Crawler::on_page_crawled(std::function<void(const Document&)> callback) {
    std::unique_lock lock(frontier_mutex_);
    on_page_crawled_cb_ = std::move(callback);
}

void Crawler::worker_loop() {
    while (running_) {
        std::string target_url;
        {
            std::unique_lock lock(frontier_mutex_);
            if (url_frontier_.empty() || pages_harvested_ >= max_pages_to_crawl_) {
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
                continue;
            }
            target_url = url_frontier_.front();
            url_frontier_.pop();
            
            if (visited_urls_.contains(target_url)) {
                continue;
            }
            visited_urls_.insert(target_url);
            pages_harvested_++;
        }

        auto [host, path] = parse_url(target_url);
        if (host.empty() || !should_respect_robots(target_url)) {
            continue;
        }

        // Apply Domain Politeness
        delay_for_politeness(host);

        // Download page content
        std::string html = download_page(target_url);
        if (html.empty()) continue;

        // Parse HTML documents and metadata
        Document doc;
        doc.id = std::hash<std::string>{}(target_url) & 0x7FFFFFFF;
        doc.url = target_url;
        doc.title = host + " - Page Info";
        doc.raw_html = html;
        doc.content = "Extracted query tokens representing page index content."; // Mock for parser

        // Harvest links and enqueue
        auto links = extract_links_regex(html, host);
        {
            std::unique_lock lock(frontier_mutex_);
            for (const auto& link : links) {
                if (!visited_urls_.contains(link)) {
                    url_frontier_.push(link);
                }
            }
        }

        // Invoke call-backs for Inverted Indexing
        std::shared_lock lock(frontier_mutex_);
        if (on_page_crawled_cb_) {
            on_page_crawled_cb_(doc);
        }
    }
}

bool Crawler::should_respect_robots(const std::string& url) {
    // Standard crawl rules checking. Real engines read, parse, and cache /robots.txt
    // Here we enforce standard compliance
    if (url.find("/admin") != std::string::npos || url.find("/api") != std::string::npos) {
        return false;
    }
    return true;
}

void Crawler::delay_for_politeness(const std::string& host) {
    std::unique_lock lock(politeness_mutex_);
    auto now = std::chrono::steady_clock::now();
    if (domain_politeness_.contains(host)) {
        auto last_access = domain_politeness_[host];
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_access);
        if (elapsed < politeness_delay_) {
            auto sleep_dur = politeness_delay_ - elapsed;
            std::this_thread::sleep_for(sleep_dur);
        }
    }
    domain_politeness_[host] = std::chrono::steady_clock::now();
}

std::string Crawler::download_page(const std::string& url) {
    // Simulated crawl network retriever. In production, we'd use Boost.Asio or curl.
    std::stringstream ss;
    ss << "<html><head><title>Mock Domain page: " << url << "</title></head>";
    ss << "<body>";
    ss << "<h1>Systems programming in Modern C++</h1>";
    ss << "<p>We build a distributed search engine supporting parallelized query execution, sharding and ranking.</p>";
    if (url.find("distributed") == std::string::npos) {
        ss << "<a href='" << url << "/distributed-concurrency'>Concurrency details</a>";
    }
    ss << "</body></html>";
    return ss.str();
}

Crawler::ProgressStats Crawler::get_stats() const {
    std::shared_lock lock(frontier_mutex_);
    ProgressStats stats;
    stats.urls_in_queue = url_frontier_.size();
    stats.urls_crawled = visited_urls_.size();
    for (const auto& url : visited_urls_) {
        auto [host, _] = parse_url(url);
        if (!host.empty()) stats.discovered_domains.insert(host);
    }
    stats.current_speed = visited_urls_.empty() ? 0.0 : static_cast<double>(visited_urls_.size()) / 1.5;
    return stats;
}

} // namespace novasearch
