import React, { useState, useEffect, useRef } from 'react';
import { ShardNodeStat, SearchResultItem, GRPCTraceEvent } from '../types';
import { trieWords } from '../data';
import { 
  Search, ShieldAlert, CheckCircle, Database, Network, Clock, Sparkles, HelpCircle, Circle 
} from 'lucide-react';

interface SearchPlaygroundProps {
  shards: ShardNodeStat[];
  addTraceLog: (source: string, dest: string, type: string, details: string, status: 'SEND' | 'RECEIVE' | 'SUCCESS' | 'ERROR') => void;
  triggerSearchMetric: (latency: number, isCacheHit: boolean) => void;
}

// Simple TypeScript representation of our AST for visualization
interface VisualAST {
  type: 'AND' | 'OR' | 'NOT' | 'TERM';
  value?: string;
  left?: VisualAST;
  right?: VisualAST;
  child?: VisualAST;
}

export const SearchPlayground: React.FC<SearchPlaygroundProps> = ({
  shards,
  addTraceLog,
  triggerSearchMetric
}) => {
  const [query, setQuery] = useState('');
  const [rankingAlgo, setRankingAlgo] = useState<'bm25' | 'tfidf'>('bm25');
  const [activeTab, setActiveTab] = useState<'results' | 'ast' | 'grpc'>('results');
  
  // Suggestions & Speller States
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [spellingSuggestion, setSpellingSuggestion] = useState<string | null>(null);

  // Search Results States
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [astTree, setAstTree] = useState<VisualAST | null>(null);
  const [searchLatency, setSearchLatency] = useState<number>(0);
  const [isCacheHit, setIsCacheHit] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Custom Query Cache: cacheKey -> SearchResultItem[]
  const queryCacheRef = useRef<Record<string, { results: SearchResultItem[], latency: number }>>({});
  
  // Active gRPC events specifically for this query animation step
  const [activeTraceEvents, setActiveTraceEvents] = useState<{ step: number; text: string; status: 'info' | 'success' | 'warning' }[]>([]);

  // Levenshtein helper
  const getLevenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // Deletion
            dp[i][j - 1] + 1, // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }
    return dp[len1][len2];
  };

  // 1. Dynamic Autocomplete Lookups — queries Postgres via coordinator API
  useEffect(() => {
    const words = query.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';

    if (lastWord.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    fetch('/api/autocomplete?q=' + encodeURIComponent(lastWord), { signal: controller.signal })
      .then(r => r.json())
      .then((data: string[]) => setSuggestions(data))
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  const selectSuggestion = (word: string) => {
    const words = query.trim().split(/\s+/);
    words[words.length - 1] = word;
    setQuery(words.join(' ') + ' ');
    setSuggestions([]);
  };

  // 2. Simple Recursive Descent AST Builder
  const compileAST = (rawQuery: string): VisualAST | null => {
    if (!rawQuery.trim()) return null;

    // Custom lexer to split raw terms and operators: AND, OR, NOT, (), ""
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < rawQuery.length; i++) {
      const char = rawQuery[i];
      if (char === ' ') {
        if (current) { tokens.push(current); current = ''; }
      } else if (char === '(' || char === ')' || char === '"') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push(char);
      } else {
        current += char;
      }
    }
    if (current) tokens.push(current);

    // Filter tokens & normalize casing of operators
    const normalizedTokens = tokens.map(t => {
      const upper = t.toUpperCase();
      if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
        return upper;
      }
      return t.toLowerCase();
    });

    let index = 0;
    const peek = () => normalizedTokens[index];
    const consume = () => normalizedTokens[index++];

    const parseExpression = (): VisualAST => {
      let node = parseTermGroup();
      while (peek() === 'OR') {
        consume(); // skip OR
        const right = parseTermGroup();
        node = { type: 'OR', left: node, right };
      }
      return node;
    };

    const parseTermGroup = (): VisualAST => {
      let node = parseFactor();
      while (peek() === 'AND') {
        consume(); // skip AND
        const right = parseFactor();
        node = { type: 'AND', left: node, right };
      }
      return node;
    };

    const parseFactor = (): VisualAST => {
      if (peek() === 'NOT') {
        consume(); // skip NOT
        return { type: 'NOT', child: parseFactor() };
      }
      if (peek() === '(') {
        consume(); // skip (
        const node = parseExpression();
        if (peek() === ')') consume(); // skip )
        return node;
      }
      const val = consume() || 'term';
      return { type: 'TERM', value: val };
    };

    try {
      return parseExpression();
    } catch {
      return { type: 'TERM', value: rawQuery };
    }
  };

  // 3. Mathematical BM25 Scoring Model implemented in JS matching C++ formulas
  const calculateRelevanceBM25 = (
    docContent: string,
    queryTerms: string[],
    docId: number
  ): { score: number, matches: string[] } => {
    const k1 = 1.2;
    const b = 0.75;
    
    // Average document length in the corpus
    const docTokensMap = mockDocuments.map(d => d.content.toLowerCase().split(/\W+/).filter(Boolean));
    const totalTokensCount = docTokensMap.reduce((acc, t) => acc + t.length, 0);
    const avgDocLength = totalTokensCount / mockDocuments.length;

    const docTokens = docContent.toLowerCase().split(/\W+/).filter(Boolean);
    const docLength = docTokens.length;

    let totalScore = 0;
    const matchedWords: string[] = [];

    queryTerms.forEach(term => {
      if (['and', 'or', 'not'].includes(term)) return;
      
      // Calculate tf inside document
      const tf = docTokens.filter(t => t === term).length;
      if (tf === 0) return;

      matchedWords.push(term);

      // Document Frequency of the term across full indices representation
      const df = docTokensMap.filter(tokens => tokens.includes(term)).length || 1;
      
      // Okapi BM25 Standard smoothed IDF
      const idf = Math.log((mockDocuments.length - df + 0.5) / (df + 0.5) + 1.0);

      // Term Saturation formula
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1.0 - b + b * (docLength / (avgDocLength || 1)));

      totalScore += idf * (numerator / denominator);
    });

    // Merge with subtle PageRank boost
    const originalDoc = mockDocuments.find(d => d.id === docId);
    const pagerankBoost = (originalDoc?.pagerank || 1.0) * 0.1;
    
    return { 
      score: totalScore > 0 ? totalScore + pagerankBoost : 0, 
      matches: matchedWords 
    };
  };

  // TF-IDF scoring alternative
  const calculateRelevanceTFIDF = (
    docContent: string,
    queryTerms: string[],
    docId: number
  ): { score: number, matches: string[] } => {
    const docTokensMap = mockDocuments.map(d => d.content.toLowerCase().split(/\W+/).filter(Boolean));
    const docTokens = docContent.toLowerCase().split(/\W+/).filter(Boolean);

    let totalScore = 0;
    const matchedWords: string[] = [];

    queryTerms.forEach(term => {
      if (['and', 'or', 'not'].includes(term)) return;

      const tf = docTokens.filter(t => t === term).length;
      if (tf === 0) return;

      matchedWords.push(term);

      const df = docTokensMap.filter(tokens => tokens.includes(term)).length || 1;
      
      const tf_weight = 1.0 + Math.log10(tf);
      const idf = Math.log10(mockDocuments.length / df);

      totalScore += tf_weight * idf;
    });

    const originalDoc = mockDocuments.find(d => d.id === docId);
    const pagerankBoost = (originalDoc?.pagerank || 1.0) * 0.05;

    return { 
      score: totalScore > 0 ? totalScore + pagerankBoost : 0, 
      matches: matchedWords 
    };
  };

  // Spell-checking BK-Tree lookup (Levenshtein within max_distance = 2)
  const verifySpellchecks = (rawQuery: string): string | null => {
    const tokens = rawQuery.toLowerCase().split(/\s+/).filter(t => !['and', 'or', 'not'].includes(t));
    let hasMistake = false;
    const correctedTokens = rawQuery.toLowerCase().split(/\s+/).map(t => {
      if (['and', 'or', 'not'].includes(t)) return t.toUpperCase();
      
      // Look up inside dictionary, if exact match found, keep it
      const exists = trieWords.some(item => item.word === t);
      if (exists) return t;

      // Find closest BK corrections (Levenshtein distance <= 2)
      const closest = trieWords
        .map(item => ({ word: item.word, dist: getLevenshteinDistance(t, item.word), freq: item.freq }))
        .filter(item => item.dist <= 2)
        .sort((a, b) => a.dist - b.dist || b.freq - a.freq)[0];

      if (closest) {
        hasMistake = true;
        return closest.word;
      }
      return t;
    });

    return hasMistake ? correctedTokens.join(' ') : null;
  };

  // 4. Integrated distributed execution trigger — calls REAL backend coordinator API
  const handleSearchSubmit = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSpellingSuggestion(null);
    setSuggestions([]);

    const ast = compileAST(searchQuery);
    setAstTree(ast);

    // Animation Event log steps initializer
    setActiveTraceEvents([]);
    const steps: { step: number; text: string; status: 'info' | 'success' | 'warning' }[] = [];
    const addStep = (text: string, status: 'info' | 'success' | 'warning' = 'info') => {
      steps.push({ step: steps.length + 1, text, status });
      setActiveTraceEvents([...steps]);
    };

    // Step 1: Coordinator Received Client Search
    addStep(`Query Coordinator received request query [${searchQuery.toUpperCase()}]`, 'success');
    addTraceLog('Client', 'Coordinator', 'http::SearchRequest', `query: "${searchQuery}"`, 'SEND');
    await new Promise(r => setTimeout(r, 300));

    addStep('Coordinator fan-out: dispatching search to all shard servers in parallel...', 'info');
    shards.filter(s => s.status === 'ONLINE').forEach(s => {
      addTraceLog('Coordinator', `Shard-0${s.id}`, 'http::POST /api/search', `query: "${searchQuery}"`, 'SEND');
    });
    await new Promise(r => setTimeout(r, 200));

    // Step 2: Call real backend coordinator API
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, algo: rankingAlgo })
      });
      const data = await response.json();

      const isCached = data.cacheHit;
      setIsCacheHit(isCached);
      setSearchLatency(data.latency);

      if (isCached) {
        addStep(`Cache Hit! Retrieved from coordinator LRU cache (latency: ${data.latency.toFixed(2)} ms)`, 'success');
        addTraceLog('Coordinator', 'Client', 'http::SearchResponse', 'cache_hit: true', 'SUCCESS');
      } else {
        // Log shard responses
        if (data.shardResponses) {
          data.shardResponses.forEach((sr: any) => {
            if (sr.success) {
              addStep(`Shard-0${sr.shardId} returned ${sr.resultCount} results from Postgres`, 'success');
              addTraceLog(`Shard-0${sr.shardId}`, 'Coordinator', 'http::SearchResponse', `${sr.resultCount} results`, 'SUCCESS');
            } else {
              addStep(`Shard-0${sr.shardId} FAILED — connection refused`, 'warning');
              addTraceLog(`Shard-0${sr.shardId}`, 'Coordinator', 'http::SearchResponse', 'Connection refused', 'ERROR');
            }
          });
        }
        addStep('Coordinator merged shard segments, globally sorted by score...', 'info');
      }

      const resultsWithDefaults: SearchResultItem[] = (data.results || []).map((r: any) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        score: r.score,
        shardId: r.shardId,
        matchTerms: r.matchTerms || searchQuery.toLowerCase().split(/\W+/).filter(Boolean)
      }));

      setResults(resultsWithDefaults);
      triggerSearchMetric(data.latency, isCached);

      addStep(`Distributed Search OK. ${resultsWithDefaults.length} hits in ${data.latency.toFixed(1)} ms (real Postgres query).`, 'success');

      // Post-checking Spelling Suggestion corrections
      if (resultsWithDefaults.length === 0) {
        const suggest = verifySpellchecks(searchQuery);
        if (suggest) {
          setSpellingSuggestion(suggest);
        }
      }
    } catch (err) {
      addStep('ERROR: Failed to reach coordinator backend. Is the server running?', 'warning');
      addTraceLog('Client', 'Coordinator', 'http::Error', 'Connection refused', 'ERROR');
    }

    setIsSearching(false);
  };

  // Helper Snippet Markups
  const highlightSnippet = (text: string, terms: string[]): React.ReactNode => {
    if (!terms || terms.length === 0) return text;
    
    // Simple window extraction surrounding first match
    const lowerText = text.toLowerCase();
    let index = -1;
    
    for (const term of terms) {
      if (['and','or','not'].includes(term)) continue;
      index = lowerText.indexOf(term);
      if (index !== -1) break;
    }

    let clipStart = 0;
    let clipEnd = text.length;
    
    if (index !== -1) {
      clipStart = Math.max(0, index - 40);
      clipEnd = Math.min(text.length, index + 120);
    } else {
      clipEnd = Math.min(text.length, 140);
    }

    let clipped = (clipStart > 0 ? "..." : "") + text.substring(clipStart, clipEnd) + (clipEnd < text.length ? '...' : '');

    // String replacer using regex
    let highlighted: React.ReactNode[] = [clipped];
    terms.forEach(term => {
      if (['and','or','not'].includes(term)) return;
      
      const newHighlighted: React.ReactNode[] = [];
      highlighted.forEach(node => {
        if (typeof node !== 'string') {
          newHighlighted.push(node);
          return;
        }

        const regex = new RegExp(`(${term})`, 'gi');
        const parts = node.split(regex);
        
        parts.forEach((part, i) => {
          if (part.toLowerCase() === term.toLowerCase()) {
            newHighlighted.push(<b key={i} className="text-amber-400 font-bold bg-amber-400/10 px-0.5 rounded">{part}</b>);
          } else {
            newHighlighted.push(part);
          }
        });
      });
      highlighted = newHighlighted;
    });

    return <>{highlighted}</>;
  };

  // Recursive AST Visualizer Tree Builder
  const renderASTNodeVisual = (node: VisualAST): React.ReactNode => {
    if (node.type === 'TERM') {
      return (
        <div className="flex flex-col items-center bg-slate-950/75 border border-slate-800 py-2 px-4 rounded font-mono text-xs w-fit" id={`ast-node-term-${node.value}`}>
          <span className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">LITERAL TERM</span>
          <span className="text-sky-400 font-bold">"{node.value}"</span>
        </div>
      );
    }

    if (node.type === 'NOT') {
      return (
        <div className="flex flex-col items-center gap-2 border border-dashed border-red-900/40 p-3 rounded bg-red-950/5 w-fit">
          <span className="bg-red-950 border border-red-900 text-red-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold">NOT (INVERSION)</span>
          {node.child && renderASTNodeVisual(node.child)}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 bg-slate-950/20 border border-slate-900/50 p-4 rounded-lg w-full">
        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
          node.type === 'AND' ? 'bg-indigo-950 border-indigo-900 text-indigo-400' : 'bg-purple-950 border-purple-900 text-purple-400'
        }`}>
          GATE: {node.type}
        </span>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full">
          {node.left && (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-px h-4 bg-slate-800 mb-1" />
              {renderASTNodeVisual(node.left)}
            </div>
          )}
          {node.right && (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-px h-4 bg-slate-800 mb-1" />
              {renderASTNodeVisual(node.right)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="search-playground-component">
      {/* 1. Controller Bar Choices */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-slate-200 text-sm font-semibold font-mono flex items-center gap-2">
              <Network className="w-4 h-4 text-amber-500" /> COORDINATOR DISTRIBUTED SEARCH GATEWAY
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Submit search terms. Coordinator will parse logic AST and execute shard operations.
            </p>
          </div>

          {/* Scoring Selector */}
          <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-md border border-slate-800 w-fit">
            <button
              onClick={() => setRankingAlgo('bm25')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition ${
                rankingAlgo === 'bm25' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-300'
              }`}
              id="ranking-bm25-select"
            >
              Okapi BM25 (Non-linear Saturation)
            </button>
            <button
              onClick={() => setRankingAlgo('tfidf')}
              className={`px-3 py-1 text-xs font-mono font-bold rounded transition ${
                rankingAlgo === 'tfidf' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-300'
              }`}
              id="ranking-tfidf-select"
            >
              Vector TF-IDF (Linear space)
            </button>
          </div>
        </div>

        {/* Search Searchbar Input */}
        <div className="relative" id="search-panel-input-box">
          <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(query); }}>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Submit Boolean Queries (e.g. distributed AND consensus OR sharding NOT compiler)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 pl-12 pr-28 py-3.5 rounded-lg border border-slate-800 focus:border-amber-500 focus:outline-none font-mono text-sm leading-6"
                id="search-input-field"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-mono font-bold text-xs py-2 px-4 rounded transition"
                id="search-submit-btn"
              >
                {isSearching ? 'SEEKING...' : 'RUN QUERY'}
              </button>
            </div>
          </form>

          {/* O(k) Trie Auto-complete Floating Panel */}
          {suggestions.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-slate-950 border border-slate-800 rounded-lg shadow-xl z-10 overflow-hidden" id="trie-autocomplete-box">
              <div className="px-3 py-1.5 border-b border-indigo-950/20 bg-slate-950/40 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>PREFIX TRIE MATCHES O(k)</span>
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Dynamic prediction</span>
              </div>
              <div className="py-1">
                {suggestions.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(word)}
                    className="w-full text-left font-mono text-xs text-indigo-300 hover:text-white hover:bg-slate-900 px-4 py-2 transition"
                  >
                    🚀 {word}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Speller Did You Mean correcting banner */}
        {spellingSuggestion && (
          <div className="mt-3 bg-indigo-950/20 border border-indigo-900/30 p-2.5 rounded text-xs text-slate-300 font-mono flex items-center gap-2 animate-fade-in" id="speller-spellcheck-suggestion">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Spelling Correction (BK-Tree edit-distance alignment):</span>
            <button
              onClick={() => { setQuery(spellingSuggestion); handleSearchSubmit(spellingSuggestion); }}
              className="text-amber-400 hover:text-amber-350 font-bold underline cursor-pointer"
            >
              Did you mean: {spellingSuggestion}?
            </button>
          </div>
        )}
      </div>

      {/* 2. Middle Output layout: Tab panels and Side Tracers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="playground-results-wrapper">
        
        {/* Tab display panel contents (Left side 8/12) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-[600px]" id="search-main-results-panel">
          <div className="flex border-b border-slate-800 mb-4 pb-2 justify-between items-center">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('results')}
                className={`px-3 py-1 font-mono text-xs font-bold rounded transition ${
                  activeTab === 'results' ? 'bg-slate-800 text-amber-500' : 'text-slate-400 hover:text-slate-350'
                }`}
                id="tab-select-results"
              >
                🔍 Search Results ({results.length})
              </button>
              <button
                onClick={() => setActiveTab('ast')}
                className={`px-3 py-1 font-mono text-xs font-bold rounded transition ${
                  activeTab === 'ast' ? 'bg-slate-800 text-amber-500' : 'text-slate-400 hover:text-slate-350'
                }`}
                id="tab-select-ast"
              >
                🌳 Boolean AST parser
              </button>
              <button
                onClick={() => setActiveTab('grpc')}
                className={`px-3 py-1 font-mono text-xs font-bold rounded transition ${
                  activeTab === 'grpc' ? 'bg-slate-800 text-amber-500' : 'text-slate-400 hover:text-slate-350'
                }`}
                id="tab-select-querytrace"
              >
                📡 RPC Call Tracker
              </button>
            </div>

            {/* Microstats */}
            {results.length > 0 && activeTab === 'results' && (
              <div className="text-[10px] text-slate-500 font-mono flex gap-4">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" /> {searchLatency.toFixed(1)} µs</span>
                <span className="flex items-center gap-1"><Database className="w-3 h-3 text-emerald-400" /> {isCacheHit ? 'CACHE HIT' : 'LIVE FETCH'}</span>
              </div>
            )}
          </div>

          {/* Tab Contents: Query Results */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'results' && (
              <div className="space-y-4" id="results-tab-panel">
                {results.length === 0 ? (
                  <div className="text-slate-500 flex flex-col items-center justify-center h-full gap-2 py-20">
                    <Search className="w-8 h-8 text-slate-700 animate-pulse" />
                    <span className="font-mono text-xs text-center">
                      Submit queries above to explore ranked documents.<br />
                      Try search terms like: <span className="text-indigo-400">distributed</span> or <span className="text-indigo-400">bm25</span>.
                    </span>
                  </div>
                ) : (
                  results.map((item, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition" id={`result-item-card-${item.id}`}>
                      {/* URL, Score & Shard Identity */}
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-1 pb-2 border-b border-indigo-950/10">
                        <span className="text-[10px] text-indigo-400 font-mono select-all break-all">{item.url}</span>
                        <div className="flex gap-2">
                          <span className="bg-sky-950 text-sky-400 text-[9px] font-mono px-1.5 py-0.5 rounded">SHARD 0{item.shardId}</span>
                          <span className="bg-amber-950 text-amber-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">SCORE: {item.score.toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Content details */}
                      <h4 className="text-slate-200 text-sm font-bold font-mono mt-3 mb-1.5">{item.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed font-sans mt-1">
                        {highlightSnippet(item.snippet, item.matchTerms)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab Contents: Grammar AST Diagram renderer */}
            {activeTab === 'ast' && (
              <div className="flex flex-col items-center justify-center h-full py-6 pr-2 overflow-y-auto" id="ast-tab-tree-view">
                {astTree ? (
                  <div className="w-full h-full max-w-lg select-none space-y-4">
                    <span className="text-[10px] text-slate-500 font-mono mb-2 block uppercase tracking-wider text-center">Logical query compiler tree layout</span>
                    <div className="border border-slate-800 p-4 rounded-lg bg-slate-950/40 font-mono text-xs text-slate-400 space-y-1">
                      <span className="text-slate-500">// PARSED INDENT NOTATION AST FORMAT</span>
                      <pre className="text-emerald-400 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(astTree, null, 2)}</pre>
                    </div>
                    <div className="flex justify-center border-t border-slate-800/30 pt-4">
                      {renderASTNodeVisual(astTree)}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600 flex flex-col items-center gap-2 h-full justify-center">
                    <HelpCircle className="w-8 h-8 text-slate-700" />
                    <span className="font-mono text-xs">Run a search query to render the abstract syntax trees.</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab Contents: gRPC Trace flow monitor */}
            {activeTab === 'grpc' && (
              <div className="bg-slate-950/40 rounded p-4 border border-indigo-950/10 h-full font-mono text-xs space-y-2.5 overflow-y-auto" id="grpc-trace-step-panel">
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider select-none mb-1">Coordinator RPC Thread Loop execution Steps</span>
                
                {activeTraceEvents.length === 0 ? (
                  <div className="text-slate-700 flex flex-col items-center gap-2 justify-center h-full py-20">
                    <Network className="w-8 h-8 text-slate-800" />
                    <span>Run a search to map event traces.</span>
                  </div>
                ) : (
                  activeTraceEvents.map((ev, idx) => {
                    const isWarn = ev.status === 'warning';
                    const isSucc = ev.status === 'success';
                    return (
                      <div 
                        key={idx} 
                        className={`flex gap-3 pb-2 border-b border-slate-900/40 last:border-0 ${
                          isWarn ? 'text-red-300' : isSucc ? 'text-emerald-300' : 'text-slate-300'
                        }`}
                        id={`grpc-trace-step-item-${ev.step}`}
                      >
                        <span className="text-slate-600 font-bold select-none">[STEP 0{ev.step}]</span>
                        <span className="flex-1">{ev.text}</span>
                        <span>{isSucc ? '✔ OK' : isWarn ? '⚠ DROP' : '➜'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Distributed cluster routing monitor sidepanel (Right side 4/12) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-[600px]" id="search-side-tracing-panel">
          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider select-none block mb-1">GRAPHICAL NETWORK HANDSHAKE STREAM</span>
          <h3 className="text-slate-200 text-sm font-semibold font-mono mb-4 flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" /> CLUSTER TOPOLOGY ARCH
          </h3>

          <div className="flex-1 flex flex-col justify-around items-center bg-slate-950 border border-slate-950 p-6 rounded relative overflow-hidden h-[420px]" id="graphs-diagram-box">
            {/* Ambient line patterns representing gRPC conduits */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-indigo-600/20 stroke-2 border-slate-950" strokeDasharray="5,5">
              {/* Coordinator (x:50%, y:20%) down to Shards (x: 15%, 50%, 85%, y: 80%) */}
              <line x1="50%" y1="22%" x2="20%" y2="78%" className={isSearching ? "animate-[dash_6s_linear_infinite]" : ""} />
              <line x1="50%" y1="22%" x2="50%" y2="78%" className={isSearching ? "animate-[dash_6s_linear_infinite]" : ""} />
              <line x1="50%" y1="22%" x2="80%" y2="78%" className={isSearching ? "animate-[dash_6s_linear_infinite]" : ""} />
            </svg>

            {/* Coordinator Node */}
            <div className="flex flex-col items-center bg-indigo-950 border border-indigo-900 py-3 px-6 rounded-lg shadow-lg z-10 font-mono text-center w-48" id="node-coordinating-visual">
              <span className="text-[9px] text-indigo-400 uppercase font-bold tracking-wider">COORDINATOR</span>
              <h4 className="text-slate-100 text-xs font-bold leading-relaxed mt-0.5">ns-coordinator-001</h4>
              <span className="bg-indigo-900/60 text-indigo-300 text-[9px] px-1.5 py-0.2 rounded mt-1.5 font-bold">QPS Gateway</span>
            </div>

            {/* Node flow transition state indicator */}
            {isSearching && (
              <span className="text-[10px] text-amber-400 bg-amber-950/40 px-3 py-1 border border-amber-900/50 rounded font-mono font-bold animate-pulse">
                ⏳ gRPC RPC Payload routing...
              </span>
            )}

            {/* Shard Leaves Nodes */}
            <div className="flex justify-between w-full gap-4 z-10" id="nodes-leafs-visual-row">
              {shards.map((node) => {
                const isOnline = node.status === 'ONLINE';
                return (
                  <div 
                    key={node.id} 
                    className={`flex flex-col items-center py-2 px-3 rounded text-center font-mono flex-1 border ${
                      isOnline 
                      ? 'bg-slate-900 border-slate-800' 
                      : 'bg-red-950/20 border-red-900/30 text-red-400'
                    }`}
                    id={`leaf-node-visual-${node.id}`}
                  >
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest">SHARD 0{node.id}</span>
                    <h5 className={`text-[10px] font-bold mt-0.5 ${isOnline ? 'text-slate-200' : 'text-red-400 line-through'}`}>
                      {node.name.split('-').slice(-1)[0]}
                    </h5>
                    
                    <span className={`text-[8px] px-1 rounded font-bold mt-1 inline-flex items-center gap-0.5 ${
                      isOnline ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950/50 text-red-500'
                    }`}>
                      <Circle className={`w-1.5 h-1.5 ${isOnline ? 'fill-emerald-400 text-emerald-400' : 'fill-red-500 text-red-500'}`} />
                      {isOnline ? 'ONLINE' : 'DROP'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
