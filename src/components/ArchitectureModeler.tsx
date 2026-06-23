import React, { useState } from 'react';
import { 
  Network, Code, Play, RefreshCcw, Layout, FileSpreadsheet, Server, HelpCircle 
} from 'lucide-react';

export const ArchitectureModeler: React.FC = () => {
  const [activeDiagram, setActiveDiagram] = useState<'sequence' | 'class' | 'sharding'>('sequence');
  const [sequenceStep, setSequenceStep] = useState<number>(0);

  // Animated Sequence Steps Mapping
  const sequenceSteps = [
    {
      step: 0,
      title: "C1: Initial Client Search Submission",
      desc: "Client submits query string (e.g. 'Raft NOT compiler') via gRPC to Query Coordinator.",
      sender: "client",
      receiver: "coordinator",
      message: "gRPC SearchRequest(query: 'Raft NOT compiler')"
    },
    {
      step: 1,
      title: "C2: Coordinator LRU Cache Check",
      desc: "Coordinator checks its thread-safe LRU Cache hashmap looking for exact query matches. Search misses.",
      sender: "coordinator",
      receiver: "cache",
      message: "CacheLookup(key: 'Raft NOT compiler')"
    },
    {
      step: 2,
      title: "C3: Query Parsing and AST Generation",
      desc: "Coordinator Lexer tokenizes text and Recursive Descent Parser compiles a compiler AST.",
      sender: "coordinator",
      receiver: "coordinator",
      message: "AST Generation (AndNode(Raft, NotNode(compiler)))"
    },
    {
      step: 3,
      title: "C4: Distributed gRPC Fan-out",
      desc: "Coordinator spawns future worker threads from pool which send parallel gRPC calls to active Shard nodes.",
      sender: "coordinator",
      receiver: "shards",
      message: "gRPC Parallel Fanout QueryShard(ast)"
    },
    {
      step: 4,
      title: "C5: Leaf Shard Inverted Index lookup & BM25 Scoring",
      desc: "Each shard accesses its partition portion index, fetches postings, scores docs with BM25 strategy, and returns candidate lists.",
      sender: "shards",
      receiver: "coordinator",
      message: "gRPC SearchResponse(postings, local_latency: 85ns)"
    },
    {
      step: 5,
      title: "C6: Coordinator Global Merge and Dedup Ejection",
      desc: "Coordinator joins responses, removes document overlaps, merges, and ranks results globally.",
      sender: "coordinator",
      receiver: "coordinator",
      message: "Global Merge Sort & PageRank Boost evaluations"
    },
    {
      step: 6,
      title: "C7: Cache Seed and Client Response Dispatch",
      desc: "Coordinator caches consolidated matches in LRU Cache and completes the RPC returning ranked, snippet-highlighted documents to client.",
      sender: "coordinator",
      receiver: "client",
      message: "gRPC SearchResponse(hits: 4, glob_latency: 120us)"
    }
  ];

  const handleNextStep = () => {
    setSequenceStep(prev => (prev + 1) % sequenceSteps.length);
  };

  const handleResetSequence = () => {
    setSequenceStep(0);
  };

  return (
    <div className="space-y-6" id="architecture-modeler-component">
      {/* Tab select bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-slate-200 text-sm font-semibold font-mono flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-400" /> DISTRIBUTED SYSTEM DESIGN & UML SCHEMES
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Interactively inspect how Google Search infrastructures coordinate, compile, and partition in production environments.
          </p>
        </div>

        {/* tab choice */}
        <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800 font-mono text-xs font-bold w-fit">
          <button
            onClick={() => setActiveDiagram('sequence')}
            className={`px-3 py-1.5 rounded transition ${
              activeDiagram === 'sequence' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-350'
            }`}
            id="diagram-tab-sequence"
          >
            📡 query sequence flow
          </button>
          <button
            onClick={() => setActiveDiagram('class')}
            className={`px-3 py-1.5 rounded transition ${
              activeDiagram === 'class' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-350'
            }`}
            id="diagram-tab-class"
          >
            🖥️ UML Class Diagram
          </button>
          <button
            onClick={() => setActiveDiagram('sharding')}
            className={`px-3 py-1.5 rounded transition ${
              activeDiagram === 'sharding' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-350'
            }`}
            id="diagram-tab-sharding"
          >
            🌍 Index Partition Sharding Map
          </button>
        </div>
      </div>

      {/* Pipeline View layouts */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg min-h-[500px]" id="modeler-viewer-box">
        
        {/* TAB 1: Real-time query sequence flowchart and animator */}
        {activeDiagram === 'sequence' && (
          <div className="space-y-6" id="diagram-sequence-flow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-widest">
                  gRPC Query Coordinator Sequence Pipeline
                </h4>
                <p className="text-slate-400 text-xs mt-0.5">
                  Click 'Next Step' to trace a gRPC query thread flowing across cluster components step-by-step.
                </p>
              </div>

              {/* Steps control buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleNextStep}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white font-mono font-bold text-xs py-2 px-4 rounded flex items-center gap-1 transition"
                  id="seq-next-btn"
                >
                  <Play className="w-3.5 h-3.5" /> Next Step (0{sequenceStep + 1}/07)
                </button>
                <button
                  onClick={handleResetSequence}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs py-2 px-3 rounded border border-slate-705 transition flex items-center gap-1"
                  id="seq-reset-btn"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Restart Sequence
                </button>
              </div>
            </div>

            {/* Sequence Graph Layout */}
            <div className="bg-slate-950/40 p-6 rounded-lg border border-slate-950 font-mono text-xs relative overflow-x-auto min-w-[700px] select-none h-[400px]">
              {/* Vertical Lanes Headers */}
              <div className="grid grid-cols-4 gap-4 text-center border-b border-slate-900/60 pb-3 font-semibold text-slate-400">
                <div className="border-r border-slate-900/40 pb-1">Client App</div>
                <div className="border-r border-slate-900/40 pb-1">Query Coordinator</div>
                <div className="border-r border-slate-900/40 pb-1">LRU Cache</div>
                <div className="pb-1">Active Shards</div>
              </div>

              {/* Vertical dotted guides */}
              <div className="absolute top-[55px] bottom-6 left-0 right-0 grid grid-cols-4 gap-4 pointer-events-none">
                <div className="border-r border-dashed border-slate-900 h-full mx-auto" style={{ width: 0 }} />
                <div className="border-r border-dashed border-slate-900 h-full mx-auto" style={{ width: 0 }} />
                <div className="border-r border-dashed border-slate-900 h-full mx-auto" style={{ width: 0 }} />
                <div className="border-r border-dashed border-slate-900 h-full mx-auto" style={{ width: 0, borderRightColor: 'transparent' }} />
              </div>

              {/* Interactive step visual overlay */}
              <div className="mt-8 space-y-4 relative z-10">
                {sequenceSteps.map((stepItem) => {
                  const isCurrent = stepItem.step === sequenceStep;
                  const isPassed = stepItem.step < sequenceStep;

                  // Compute horizontal offsets based on sender and receiver
                  let directionArrow = '➜';
                  let laneConnectorStyle = 'left-[12.5%] w-[25%]'; // default client to coordinator
                  
                  if (stepItem.sender === 'client' && stepItem.receiver === 'coordinator') {
                    laneConnectorStyle = 'left-[12.5%] w-[25%]';
                  } else if (stepItem.sender === 'coordinator' && stepItem.receiver === 'cache') {
                    laneConnectorStyle = 'left-[37.5%] w-[25%]';
                  } else if (stepItem.sender === 'coordinator' && stepItem.receiver === 'coordinator') {
                    laneConnectorStyle = 'left-[37.5%] w-8 h-8 rounded-full border-2 border-slate-800 border-t-transparent animate-spin';
                  } else if (stepItem.sender === 'coordinator' && stepItem.receiver === 'shards') {
                    laneConnectorStyle = 'left-[37.5%] w-[50%]';
                  } else if (stepItem.sender === 'shards' && stepItem.receiver === 'coordinator') {
                    laneConnectorStyle = 'left-[37.5%] w-[50%]';
                    directionArrow = '⇠';
                  } else if (stepItem.sender === 'coordinator' && stepItem.receiver === 'client') {
                    laneConnectorStyle = 'left-[12.5%] w-[25%]';
                    directionArrow = '⇠';
                  }

                  return (
                    <div 
                      key={stepItem.step} 
                      className={`transition-all duration-300 relative py-2.5 px-4 rounded-lg flex items-center justify-between border ${
                        isCurrent 
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/20' 
                        : isPassed 
                        ? 'opacity-40 border-slate-900 bg-slate-950/20' 
                        : 'opacity-10 border-transparent'
                      }`}
                      id={`sequence-step-item-${stepItem.step}`}
                    >
                      {/* Step marker */}
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                        isCurrent ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {stepItem.step + 1}
                      </span>

                      {/* Msg Details */}
                      <div className="flex-1 px-4 text-xs font-mono">
                        <h5 className="font-bold text-slate-200">{stepItem.title}</h5>
                        <p className="text-slate-400 text-[11px] mt-0.5">{stepItem.desc}</p>
                      </div>

                      {/* Transaction Call trace */}
                      <div className="bg-slate-950 px-3 py-1.5 rounded text-[10px] text-amber-400 text-right shrink-0 border border-slate-900 select-all max-w-[280px] truncate">
                        {stepItem.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Class UML Diagram Mapping */}
        {activeDiagram === 'class' && (
          <div className="space-y-6" id="diagram-class-flow">
            <div>
              <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-widest">
                NovaSearch C++20 Core UML Class Schema
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                The diagram isolates internal search engine class layouts, parameters, functions and linkages.
              </p>
            </div>

            {/* Grid Mapping class panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs text-slate-300" id="class-diagram-grid">
              
              {/* Document/Posting Classes */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0" id="class-card-structures">
                <span className="bg-slate-900 text-slate-400 px-3 py-1.5 block border-b border-slate-800 font-bold select-none text-[10px]">STRUCTS: Document & Posting</span>
                <div className="p-4 space-y-3">
                  <div>
                    <h5 className="font-bold text-indigo-400">struct Document</h5>
                    <ul className="list-inside list-disc text-slate-400 pl-1 mt-1 space-y-0.5 text-[11px]">
                      <li>uint32_t id;</li>
                      <li>std::string url;</li>
                      <li>std::string title;</li>
                      <li>std::string content;</li>
                      <li>double pagerank_score = 1.0;</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-bold text-indigo-400">struct Posting</h5>
                    <ul className="list-inside list-disc text-slate-400 pl-1 mt-1 space-y-0.5 text-[11px]">
                      <li>uint32_t doc_id;</li>
                      <li>uint32_t term_frequency;</li>
                      <li>std::vector&lt;uint32_t&gt; positions;</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Inverted Indexer Class */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0" id="class-card-indexer">
                <span className="bg-slate-900 text-slate-400 px-3 py-1.5 block border-b border-slate-800 font-bold select-none text-[10px]">CLASS: InvertedIndexer</span>
                <div className="p-4 space-y-2 text-[11px]">
                  <h5 className="font-bold text-emerald-400">novasearch::Indexer</h5>
                  <div className="border border-slate-905 p-1.5 rounded bg-slate-950">
                    <span className="text-slate-500 block text-[9px]">// PRIVATE MEMBERS</span>
                    <ul className="list-inside text-slate-400 pl-1 space-y-0.5">
                      <li>- map&lt;string, PostingList&gt; index_;</li>
                      <li>- map&lt;uint32, shared_ptr&lt;Document&gt;&gt; documents_;</li>
                      <li>- mutable shared_mutex rw_mutex_;</li>
                    </ul>
                  </div>
                  <div className="border border-slate-905 p-1.5 rounded bg-slate-950 mt-1">
                    <span className="text-slate-500 block text-[9px]">// PUBLIC METHODS (RAII-safe)</span>
                    <ul className="list-inside text-slate-300 pl-1 space-y-0.5">
                      <li>+ void add_document(doc);</li>
                      <li>+ PostingList* get_postings(term) const;</li>
                      <li>+ vocabulary_size() const;</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RankingStrategy Classes */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shrink-0" id="class-card-ranking">
                <span className="bg-slate-900 text-slate-400 px-3 py-1.5 block border-b border-slate-800 font-bold select-none text-[10px]">PATTERN: Strategy Ranking Strategy</span>
                <div className="p-4 space-y-3">
                  <div>
                    <h5 className="font-bold text-amber-500">interface RankingStrategy</h5>
                    <span className="text-slate-500 block text-[10px] pl-1 font-mono italic">pure virtual interface</span>
                    <p className="text-slate-300 text-[11px] font-mono pl-1 mt-1">
                      + virtual double score(tf, df, N, doc_length, avg_length) const = 0;
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-900/40">
                    <h5 className="font-bold text-amber-400">class BM25Strategy : public Strategy</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      Implements Okapi BM25 non-linear frequencies saturation metrics.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-bold text-amber-400">class TFIDFStrategy : public Strategy</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      Implements classical logarithmic vector models.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Index Sharding Map Representation */}
        {activeDiagram === 'sharding' && (
          <div className="space-y-6" id="diagram-sharding-flow">
            <div>
              <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-widest">
                Index Partition Range Sharding mapping
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                Indexes are range-partitioned alphabetically by vocabulary term ranges to guarantee load balances across the cluster.
              </p>
            </div>

            {/* Range visualization blocks */}
            <div className="bg-slate-950/40 p-6 rounded-lg border border-slate-950 font-mono text-xs space-y-6" id="sharding-map-topology">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center" id="sharding-partitions-row">
                
                {/* Shard 1 partition block */}
                <div className="border border-slate-800 bg-slate-950 rounded-lg p-5 flex flex-col items-center">
                  <span className="bg-sky-950 text-sky-400 text-[9px] px-2 py-0.5 rounded font-bold">SHARD PARTITION 1</span>
                  <h5 className="text-slate-200 text-md font-bold mt-2">RANGE: [A - F]</h5>
                  <div className="w-full border-t border-slate-900/60 my-3 pt-3 text-slate-400 space-y-1 text-left pl-3">
                    <div className="text-slate-500">// Indexed vocabulary terms:</div>
                    <li><b>a</b>lgorithm, <b>a</b>utocomplete</li>
                    <li><b>b</b>m25, <b>b</b>k-tree</li>
                    <li><b>c</b>oordinator, <b>c</b>oncurrency</li>
                    <li><b>d</b>istributed, <b>d</b>atabase</li>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">Mapped gRPC Port: 50051</span>
                </div>

                {/* Shard 2 partition block */}
                <div className="border border-slate-800 bg-slate-950 rounded-lg p-5 flex flex-col items-center">
                  <span className="bg-sky-950 text-sky-400 text-[9px] px-2 py-0.5 rounded font-bold">SHARD PARTITION 2</span>
                  <h5 className="text-slate-200 text-md font-bold mt-2">RANGE: [G - M]</h5>
                  <div className="w-full border-t border-slate-900/60 my-3 pt-3 text-slate-400 space-y-1 text-left pl-3">
                    <div className="text-slate-500">// Indexed vocabulary terms:</div>
                    <li><b>g</b>ateway, <b>g</b>rpc</li>
                    <li><b>h</b>eartbeat, <b>h</b>tml</li>
                    <li><b>i</b>nverted-index, <b>i</b>ndexer</li>
                    <li><b>l</b>evenshtein, <b>m</b>achine</li>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">Mapped gRPC Port: 50052</span>
                </div>

                {/* Shard 3 partition block */}
                <div className="border border-slate-800 bg-slate-950 rounded-lg p-5 flex flex-col items-center">
                  <span className="bg-sky-950 text-sky-400 text-[9px] px-2 py-0.5 rounded font-bold">SHARD PARTITION 3</span>
                  <h5 className="text-slate-200 text-md font-bold mt-2">RANGE: [N - Z]</h5>
                  <div className="w-full border-t border-slate-900/60 my-3 pt-3 text-slate-400 space-y-1 text-left pl-3">
                    <div className="text-slate-500">// Indexed vocabulary terms:</div>
                    <li><b>n</b>etworking, <b>p</b>oliteness</li>
                    <li><b>q</b>uery-engine, <b>r</b>aft</li>
                    <li><b>s</b>earch, <b>s</b>peller, <b>s</b>harding</li>
                    <li><b>t</b>hread-pool, <b>v</b>ocabulary</li>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">Mapped gRPC Port: 50053</span>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
