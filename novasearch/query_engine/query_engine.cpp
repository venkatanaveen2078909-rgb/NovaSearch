#include "query_engine.hpp"
#include <sstream>
#include <algorithm>
#include <iostream>

namespace novasearch {

// --- AST Node Implementations ---

std::unordered_set<uint32_t> TermNode::evaluate(const Indexer& indexer) const {
    std::unordered_set<uint32_t> doc_ids;
    const auto* postings = indexer.get_postings(term_);
    if (postings != nullptr) {
        for (const auto& p : *postings) {
            doc_ids.insert(p.doc_id);
        }
    }
    return doc_ids;
}

std::unordered_set<uint32_t> AndNode::evaluate(const Indexer& indexer) const {
    auto left_ids = left_->evaluate(indexer);
    auto right_ids = right_->evaluate(indexer);
    
    std::unordered_set<uint32_t> intersection;
    for (uint32_t id : left_ids) {
        if (right_ids.contains(id)) {
            intersection.insert(id);
        }
    }
    return intersection;
}

std::unordered_set<uint32_t> OrNode::evaluate(const Indexer& indexer) const {
    auto left_ids = left_->evaluate(indexer);
    auto right_ids = right_->evaluate(indexer);
    
    std::unordered_set<uint32_t> union_set = std::move(left_ids);
    for (uint32_t id : right_ids) {
        union_set.insert(id);
    }
    return union_set;
}

std::unordered_set<uint32_t> NotNode::evaluate(const Indexer& indexer) const {
    auto child_ids = child_->evaluate(indexer);
    std::unordered_set<uint32_t> inverse_set;
    
    // In search, NOT is typically done by removing matching documents from the whole corpus
    for (uint32_t doc_id = 1; doc_id <= indexer.get_total_documents(); ++doc_id) {
        if (indexer.get_document(doc_id) != nullptr && !child_ids.contains(doc_id)) {
            inverse_set.insert(doc_id);
        }
    }
    return inverse_set;
}

// --- Query Lexer and Recursive Descent Parser ---

std::vector<Token> QueryParser::tokenize(const std::string& query) {
    std::vector<Token> tokens;
    std::string current;
    
    auto flush_term = [&current, &tokens]() {
        if (!current.empty()) {
            std::string upper_op = current;
            std::transform(upper_op.begin(), upper_op.end(), upper_op.begin(), ::toupper);
            
            if (upper_op == "AND") {
                tokens.push_back({TokenType::AND, "AND"});
            } else if (upper_op == "OR") {
                tokens.push_back({TokenType::OR, "OR"});
            } else if (upper_op == "NOT") {
                tokens.push_back({TokenType::NOT, "NOT"});
            } else {
                std::string lower_term = current;
                std::transform(lower_term.begin(), lower_term.end(), lower_term.begin(), ::tolower);
                tokens.push_back({TokenType::TERM, lower_term});
            }
            current.clear();
        }
    };

    for (size_t i = 0; i < query.size(); ++i) {
        char ch = query[i];
        if (std::isspace(ch)) {
            flush_term();
        } else if (ch == '(') {
            flush_term();
            tokens.push_back({TokenType::LPAREN, "("});
        } else if (ch == ')') {
            flush_term();
            tokens.push_back({TokenType::RPAREN, ")"});
        } else if (ch == '"') {
            flush_term();
            tokens.push_back({TokenType::QUOTE, "\""});
        } else {
            current += ch;
        }
    }
    flush_term();
    tokens.push_back({TokenType::END, ""});
    return tokens;
}

std::unique_ptr<ASTNode> QueryParser::parse(const std::string& query) {
    auto tokens = tokenize(query);
    ParserState state(std::move(tokens));
    return state.parse_expression();
}

std::unique_ptr<ASTNode> QueryParser::ParserState::parse_expression() {
    auto node = parse_term_group();
    while (match(TokenType::OR)) {
        auto right = parse_term_group();
        node = std::make_unique<OrNode>(std::move(node), std::move(right));
    }
    return node;
}

std::unique_ptr<ASTNode> QueryParser::ParserState::parse_term_group() {
    auto node = parse_factor();
    while (match(TokenType::AND)) {
        auto right = parse_factor();
        node = std::make_unique<AndNode>(std::move(node), std::move(right));
    }
    return node;
}

std::unique_ptr<ASTNode> QueryParser::ParserState::parse_factor() {
    if (match(TokenType::NOT)) {
        return std::make_unique<NotNode>(parse_factor());
    }
    if (match(TokenType::LPAREN)) {
        auto node = parse_expression();
        consume(); // Match and consume RPAREN
        return node;
    }
    Token t = consume();
    return std::make_unique<TermNode>(t.value);
}

const Token& QueryParser::ParserState::peek() const {
    return tokens_[current_idx_];
}

Token QueryParser::ParserState::consume() {
    if (current_idx_ < tokens_.size()) {
        return tokens_[current_idx_++];
    }
    return {TokenType::END, ""};
}

bool QueryParser::ParserState::match(TokenType type) {
    if (peek().type == type) {
        current_idx_++;
        return true;
    }
    return false;
}

// --- QueryEngine Scoring Implementation ---

std::vector<SearchResult> QueryEngine::search(const std::string& query, size_t limit) {
    auto ast = QueryParser::parse(query);
    if (!ast) return {};

    // 1. Evaluate AST to fetch document matches
    auto matching_docs = ast->evaluate(indexer_);
    
    // Extract search query terms to score matches
    // In full engines, we collect terms inside the AST nodes
    std::vector<std::string> query_terms = indexer_.tokenize(query);
    
    std::vector<SearchResult> results;
    size_t N = indexer_.get_total_documents();
    double avg_doc_len = indexer_.get_average_document_length();

    for (uint32_t doc_id : matching_docs) {
        auto doc = indexer_.get_document(doc_id);
        if (!doc) continue;

        double doc_score = 0.0;
        uint32_t doc_len = indexer_.get_document_length(doc_id);

        for (const auto& term : query_terms) {
            // Check if term matches are not connectors
            if (term == "and" || term == "or" || term == "not") continue;

            const auto* postings = indexer_.get_postings(term);
            if (postings) {
                for (const auto& p : *postings) {
                    if (p.doc_id == doc_id) {
                        doc_score += ranker_->score(
                            p.term_frequency,
                            postings->size(),
                            N,
                            doc_len,
                            avg_doc_len
                        );
                        break;
                    }
                }
            }
        }

        SearchResult res;
        res.doc_id = doc_id;
        res.url = doc->url;
        res.title = doc->title;
        res.score = doc_score;
        res.snippet = generate_best_snippet(*doc, query);
        results.push_back(std::move(res));
    }

    // Sort results based on score descending
    std::sort(results.begin(), results.end(), [](const SearchResult& a, const SearchResult& b) {
        return a.score > b.score;
    });

    if (results.size() > limit) {
        results.resize(limit);
    }
    
    return results;
}

std::string QueryEngine::generate_best_snippet(const Document& doc, const std::string& query) {
    std::vector<std::string> terms = indexer_.tokenize(query);
    std::string text = doc.content;
    
    // Simple window extraction to find matching keyword surroundings
    std::string best_snippet;
    size_t lowest_idx = std::string::npos;
    
    for (const auto& term : terms) {
        if (term == "and" || term == "or" || term == "not") continue;
        
        // Find positions (case insensitive)
        auto it = std::search(
            text.begin(), text.end(),
            term.begin(), term.end(),
            [](char c1, char c2) { return std::tolower(c1) == std::tolower(c2); }
        );
        
        if (it != text.end()) {
            size_t idx = std::distance(text.begin(), it);
            if (idx < lowest_idx) {
                lowest_idx = idx;
            }
        }
    }

    if (lowest_idx == std::string::npos) {
        return text.substr(0, std::min(text.size(), size_t(120))) + "...";
    }

    size_t start = (lowest_idx > 40) ? lowest_idx - 40 : 0;
    size_t length = std::min(text.size() - start, size_t(150));
    
    std::string snippet = (start > 0 ? "..." : "") + text.substr(start, length) + (start + length < text.size() ? "..." : "");
    
    // Markup highlighter simulated
    for (const auto& term : terms) {
        if (term == "and" || term == "or" || term == "not") continue;
        std::regex word_re("\\b(" + term + ")\\b", std::regex_case_insensitive);
        snippet = std::regex_replace(snippet, word_re, "<b>$1</b>");
    }
    
    return snippet;
}

} // namespace novasearch
