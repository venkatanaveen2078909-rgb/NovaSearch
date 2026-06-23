#pragma once

#include "../common/types.hpp"
#include "../indexer/indexer.hpp"
#include "../ranking/ranking.hpp"
#include <string>
#include <vector>
#include <memory>
#include <unordered_set>

namespace novasearch {

// Base Query AST Node Node
class ASTNode {
public:
    virtual ~ASTNode() = default;
    
    // Evaluate returns a set of candidate document IDs matching this subtree
    virtual std::unordered_set<uint32_t> evaluate(const Indexer& indexer) const = 0;
};

class TermNode : public ASTNode {
public:
    explicit TermNode(std::string term) : term_(std::move(term)) {}
    std::unordered_set<uint32_t> evaluate(const Indexer& indexer) const override;
    const std::string& get_term() const { return term_; }

private:
    std::string term_;
};

class AndNode : public ASTNode {
public:
    AndNode(std::unique_ptr<ASTNode> left, std::unique_ptr<ASTNode> right)
        : left_(std::move(left)), right_(std::move(right)) {}
    std::unordered_set<uint32_t> evaluate(const Indexer& indexer) const override;

private:
    std::unique_ptr<ASTNode> left_;
    std::unique_ptr<ASTNode> right_;
};

class OrNode : public ASTNode {
public:
    OrNode(std::unique_ptr<ASTNode> left, std::unique_ptr<ASTNode> right)
        : left_(std::move(left)), right_(std::move(right)) {}
    std::unordered_set<uint32_t> evaluate(const Indexer& indexer) const override;

private:
    std::unique_ptr<ASTNode> left_;
    std::unique_ptr<ASTNode> right_;
};

class NotNode : public ASTNode {
public:
    explicit NotNode(std::unique_ptr<ASTNode> child) : child_(std::move(child)) {}
    std::unordered_set<uint32_t> evaluate(const Indexer& indexer) const override;

private:
    std::unique_ptr<ASTNode> child_;
};

// Grammar Parser to build AST from query strings
class QueryParser {
public:
    static std::unique_ptr<ASTNode> parse(const std::string& query);

private:
    static std::vector<Token> tokenize(const std::string& query);
    
    // Recursive Descent methods
    class ParserState {
    public:
        explicit ParserState(std::vector<Token> tokens) : tokens_(std::move(tokens)) {}
        
        std::unique_ptr<ASTNode> parse_expression();
        std::unique_ptr<ASTNode> parse_term_group();
        std::unique_ptr<ASTNode> parse_factor();
        
    private:
        const Token& peek() const;
        Token consume();
        bool match(TokenType type);
        
        std::vector<Token> tokens_;
        size_t current_idx_ = 0;
    };
};

// Core Query Processor that uses the parsed AST and a RankingStrategy to yield ranked SearchResults
class QueryEngine {
public:
    QueryEngine(const Indexer& indexer, std::unique_ptr<RankingStrategy> ranker)
        : indexer_(indexer), ranker_(std::move(ranker)) {}

    std::vector<SearchResult> search(const std::string& query, size_t limit = 10);

private:
    // Helper to extract a relevant highlighting snippet
    std::string generate_best_snippet(const Document& doc, const std::string& query);

    const Indexer& indexer_;
    std::unique_ptr<RankingStrategy> ranker_;
};

} // namespace novasearch
