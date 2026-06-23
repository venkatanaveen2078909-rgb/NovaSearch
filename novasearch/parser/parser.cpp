#include "parser.hpp"
#include <regex>
#include <algorithm>
#include <sstream>

namespace novasearch {

Document Parser::parse(const std::string& html, const std::string& url) {
    Document doc;
    doc.id = std::hash<std::string>{}(url) & 0x7FFFFFFF;
    doc.url = url;
    doc.raw_html = html;

    // 1. Extract Title
    doc.title = extract_tag_content(html, "title");
    if (doc.title.empty()) {
        doc.title = "Untitled Resource (" + url + ")";
    }

    // 2. Remove script and style elements
    std::string clean_html = html;
    std::regex script_regex(R"(<script[^>]*>[\s\S]*?<\/script>)", std::regex_case_insensitive);
    std::regex style_regex(R"(<style[^>]*>[\s\S]*?<\/style>)", std::regex_case_insensitive);
    clean_html = std::regex_replace(clean_html, script_regex, "");
    clean_html = std::regex_replace(clean_html, style_regex, "");

    // 3. Strip general HTML tags and extract content
    doc.content = strip_html_tags(clean_html);
    
    // 4. Generate some mock PageRank score index values
    doc.pagerank_score = 1.0;

    return doc;
}

std::string Parser::extract_tag_content(const std::string& html, const std::string& tag) {
    std::regex tag_regex("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", std::regex_case_insensitive);
    std::smatch match;
    if (std::regex_search(html, match, tag_regex)) {
        std::string content = match[1].str();
        // Strip trailing spaces & newlines
        content.erase(std::remove(content.begin(), content.end(), '\n'), content.end());
        return content;
    }
    return "";
}

std::string Parser::strip_html_tags(const std::string& html) {
    std::regex xml_tags(R"(<[^>]*>)");
    std::string result = std::regex_replace(html, xml_tags, " ");
    
    // Normalize white spaces
    std::stringstream ss(result);
    std::string word, normalized;
    while (ss >> word) {
        normalized += word + " ";
    }
    if (!normalized.empty()) {
        normalized.pop_back(); // Remove last space
    }
    return normalized;
}

} // namespace novasearch
