#pragma once

#include "../common/types.hpp"
#include <string>
#include <vector>

namespace novasearch {

class Parser {
public:
    static Document parse(const std::string& html, const std::string& url);

private:
    static std::string extract_tag_content(const std::string& html, const std::string& tag);
    static std::string strip_html_tags(const std::string& html);
};

} // namespace novasearch
