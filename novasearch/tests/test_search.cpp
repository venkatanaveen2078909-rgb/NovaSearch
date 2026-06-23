#include <gtest/gtest.h>
#include "../parser/parser.hpp"
#include "../indexer/indexer.hpp"
#include "../query_engine/query_engine.hpp"
#include "../autocomplete/trie.hpp"
#include "../spell_corrector/spell_corrector.hpp"
#include "../cache/lru_cache.hpp"

// 1. Text Parsing & HTML Stripping Validation
TEST(SearchEngineTest, HTMLStripper) {
    std::string html = "<html><head><title>Test Title</title><style>body {background: red;}</style></head><body><h1>Hello World</h1><p>Learn systems programming in C++.</p></body></html>";
    auto doc = novasearch::Parser::parse(html, "https://google.com");

    EXPECT_EQ(doc.title, "Test Title");
    EXPECT_TRUE(doc.content.find("Hello World") != std::string::npos);
    EXPECT_TRUE(doc.content.find("systems programming") != std::string::npos);
    EXPECT_TRUE(doc.content.find("background: red") == std::string::npos); // Style tag contents stripped
}

// 2. Inverted Indexing & Token Positional Offsets
TEST(SearchEngineTest, InvertedIndexAddAndQuery) {
    novasearch::Indexer idx;
    
    novasearch::Document doc;
    doc.id = 123;
    doc.url = "https://example.com";
    doc.title = "Index Test";
    doc.content = "distributed search engine indexing";
    
    idx.add_document(doc);

    EXPECT_EQ(idx.get_total_documents(), 1);
    EXPECT_EQ(idx.get_vocabulary_size(), 4);

    const auto* postings = idx.get_postings("index");
    ASSERT_NE(postings, nullptr);
    EXPECT_EQ(postings->size(), 1);
    EXPECT_EQ((*postings)[0].doc_id, 123);
    EXPECT_EQ((*postings)[0].term_frequency, 1);
}

// 3. Recursive Query AST Parsing & Evaluator Integration
TEST(SearchEngineTest, QueryParserAndASTEvaluator) {
    novasearch::Indexer idx;
    novasearch::Document d1{1, "url1", "t1", "distributed systems engineering", ""};
    novasearch::Document d2{2, "url2", "t2", "compiler design compiler optimization", ""};
    novasearch::Document d3{3, "url3", "t3", "distributed systems with compiler optimization", ""};

    idx.add_document(d1);
    idx.add_document(d2);
    idx.add_document(d3);

    // Operator: AND evaluation
    auto ast_and = novasearch::QueryParser::parse("distributed AND systems");
    auto res_and = ast_and->evaluate(idx);
    EXPECT_EQ(res_and.size(), 2);
    EXPECT_TRUE(res_and.contains(1));
    EXPECT_TRUE(res_and.contains(3));

    // Operator: OR evaluation
    auto ast_or = novasearch::QueryParser::parse("engineering OR compiler");
    auto res_or = ast_or->evaluate(idx);
    EXPECT_EQ(res_or.size(), 3);
    EXPECT_TRUE(res_or.contains(1));
    EXPECT_TRUE(res_or.contains(2));
    EXPECT_TRUE(res_or.contains(3));
}

// 4. Trie Prefix Search and Frequency Matchers
TEST(SearchEngineTest, TrieAutocomplete) {
    novasearch::AutocompleteEngine autocomplete;
    autocomplete.insert("distributed", 100);
    autocomplete.insert("distribution", 50);
    autocomplete.insert("distance", 80);
    autocomplete.insert("compiler", 200);

    auto list = autocomplete.suggest("dis");
    ASSERT_EQ(list.size(), 3);
    
    // Check frequency sorting
    EXPECT_EQ(list[0].first, "distributed"); // freq 100
    EXPECT_EQ(list[1].first, "distance");    // freq 80
    EXPECT_EQ(list[2].first, "distribution"); // freq 50
}

// 5. BK-Tree Levenshtein Word Alignments
TEST(SearchEngineTest, BKTreeSpellingCorrection) {
    novasearch::SpellCorrector spelling;
    spelling.insert("machine");
    spelling.insert("maching");
    spelling.insert("mechanic");
    spelling.insert("learning");

    int dist = novasearch::SpellCorrector::levenshtein_distance("machne", "machine");
    EXPECT_EQ(dist, 1);

    auto corrections = spelling.search("machne", 1);
    ASSERT_GE(corrections.size(), 1);
    EXPECT_EQ(corrections[0], "machine");
}

// 6. Thread-Safe LRU Cache hit counter
TEST(SearchEngineTest, LRUCacheHitAndMissEjection) {
    novasearch::LRUCache<std::string, std::string> cache(2);
    cache.put("q1", "result1");
    cache.put("q2", "result2");

    auto r1 = cache.get("q1");
    EXPECT_TRUE(r1.has_value());
    EXPECT_EQ(*r1, "result1");

    // This should eject q2 as capacity is 2 and q1 was accessed (making q2 LRU)
    cache.put("q3", "result3");

    auto r2 = cache.get("q2");
    EXPECT_FALSE(r2.has_value()); // Ejected!

    auto r3 = cache.get("q3");
    EXPECT_TRUE(r3.has_value());
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
