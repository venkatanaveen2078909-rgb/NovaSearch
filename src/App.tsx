import { useState, useEffect, useRef } from 'react';
import { ShardNodeStat, GRPCTraceEvent } from './types';
import { ClusterOverview } from './components/ClusterOverview';
import { SearchPlayground } from './components/SearchPlayground';
import { CrawlerSandbox } from './components/CrawlerSandbox';
import { ArchitectureModeler } from './components/ArchitectureModeler';
import { CodeBrowser } from './components/CodeBrowser';
import { 
  Server, Search, Network, Cpu, Code, Shield, Circle, Activity, AlertOctagon 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cluster' | 'search' | 'crawler' | 'architecture' | 'code'>('cluster');

  // --- 1. Distributed Shards State (Partitions representation) ---
  const [shards, setShards] = useState<ShardNodeStat[]>([
    {
      id: 1,
      name: 'ns-shard-leaf-001',
      address: '0.0.0.0:50051',
      status: 'ONLINE',
      documentCount: 2,
      vocabularySize: 55,
      latencyMs: 12.4,
      qps: 1.2,
      cpuUsage: 8,
      memUsage: 32
    },
    {
      id: 2,
      name: 'ns-shard-leaf-002',
      address: '0.0.0.0:50052',
      status: 'ONLINE',
      documentCount: 3,
      vocabularySize: 72,
      latencyMs: 15.1,
      qps: 1.4,
      cpuUsage: 11,
      memUsage: 41
    },
    {
      id: 3,
      name: 'ns-shard-leaf-003',
      address: '0.0.0.0:50053',
      status: 'ONLINE',
      documentCount: 2,
      vocabularySize: 42,
      latencyMs: 9.8,
      qps: 0.9,
      cpuUsage: 6,
      memUsage: 25
    }
  ]);

  // --- 2. Live Cluster gRPC trace logs ---
  const [traceLogs, setTraceLogs] = useState<GRPCTraceEvent[]>([]);

  const addTraceLog = (
    source: string, 
    destination: string, 
    messageType: string, 
    details: string, 
    status: GRPCTraceEvent['status']
  ) => {
    const newLog: GRPCTraceEvent = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString().split('T')[1].substring(0, 11),
      source,
      destination,
      messageType,
      details,
      status
    };
    setTraceLogs(prev => [newLog, ...prev].slice(0, 80));
  };

  const clearTraceLogs = () => {
    setTraceLogs([]);
  };

  // --- 3. Live Metrics Timeline State (Grafana simulation) ---
  const [metricsHistory, setMetricsHistory] = useState<{ qps: number[]; latency: number[]; hitRatio: number[] }>({
    qps: [2.5, 3.1, 4.0, 3.5, 4.2, 5.0, 4.8, 5.2, 6.0, 5.5],
    latency: [120, 135, 140, 110, 115, 122, 118, 125, 130, 124],
    hitRatio: [0.65, 0.68, 0.70, 0.75, 0.72, 0.78, 0.81, 0.80, 0.82, 0.84]
  });

  const triggerSearchMetric = (latencyMs: number, cacheHit: boolean) => {
    setMetricsHistory(prev => {
      const nextQps = [...prev.qps.slice(1), 5 + Math.random() * 4];
      const nextLatency = [...prev.latency.slice(1), latencyMs * 1000]; // convert ms to us representation
      const currentHits = prev.hitRatio[prev.hitRatio.length - 1];
      const nextRatio = [...prev.hitRatio.slice(1), cacheHit ? currentHits + 0.02 : currentHits - 0.01];
      
      return {
        qps: nextQps,
        latency: nextLatency,
        hitRatio: nextRatio.map(r => Math.max(0, Math.min(1, r)))
      };
    });
  };

  // Mock background activity timer updates to create a dynamic Grafana fluid feel
  useEffect(() => {
    const timer = setInterval(() => {
      setMetricsHistory(prev => {
        const lastQps = prev.qps[prev.qps.length - 1];
        const lastLat = prev.latency[prev.latency.slice.length - 1] || 120;
        const lastHit = prev.hitRatio[prev.hitRatio.length - 1];

        // Random organic jitter fluctuation
        const deltaQps = (Math.random() - 0.5) * 0.8;
        const deltaLat = (Math.random() - 0.5) * 8;
        const deltaHit = (Math.random() - 0.5) * 0.02;

        return {
          qps: [...prev.qps.slice(1), Math.max(1, Math.min(10, lastQps + deltaQps))],
          latency: [...prev.latency.slice(1), Math.max(70, Math.min(200, lastLat + deltaLat))],
          hitRatio: [...prev.hitRatio.slice(1), Math.max(0.4, Math.min(0.95, lastHit + deltaHit))]
        };
      });

      // Periodically trigger background heartbeat logs
      const randomShard = Math.floor(Math.random() * 3) + 1;
      addTraceLog(`Shard-0${randomShard}`, 'Coordinator', 'grpc::Heartbeat', 'Load: OK, ThreadPool: Active', 'SUCCESS');

    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Initialize initial registries trace logs
  useEffect(() => {
    addTraceLog('Coordinator', 'Main Node', 'SystemBoot', 'NovaSearch distributed core booted successfully.', 'SUCCESS');
    addTraceLog('Shard-01', 'Coordinator', 'grpc::RegisterShardNode', 'Listening, range [A - F]', 'SUCCESS');
    addTraceLog('Shard-02', 'Coordinator', 'grpc::RegisterShardNode', 'Listening, range [G - M]', 'SUCCESS');
    addTraceLog('Shard-03', 'Coordinator', 'grpc::RegisterShardNode', 'Listening, range [N - Z]', 'SUCCESS');
  }, []);

  // --- 4. Interactive Node failure toggler ---
  const toggleShardStatus = (id: number) => {
    setShards(prev => prev.map(shard => {
      if (shard.id === id) {
        const isOnline = shard.status === 'ONLINE';
        const newStatus = isOnline ? 'FAILED' : 'ONLINE';
        
        // Log node state shifts
        if (newStatus === 'FAILED') {
          addTraceLog('Coordinator', `Shard-0${id}`, 'ConnectionDown', 'TCP handshake failure / RPC channel broken', 'ERROR');
        } else {
          addTraceLog(`Shard-0${id}`, 'Coordinator', 'grpc::RegisterShardNode', 'Reconnected Shard, registered range lookup successfully', 'SUCCESS');
        }

        return {
          ...shard,
          status: newStatus
        };
      }
      return shard;
    }));
  };

  // --- 5. Crawled Document indexing integration ---
  const handleAddCrawledDoc = (
    shardId: number, 
    doc: { url: string; title: string; content: string; rawHtml: string; pageSize: string }
  ) => {
    // Increment document counters within target Shard statistics
    setShards(prev => prev.map(shard => {
      if (shard.id === shardId && shard.status === 'ONLINE') {
        return {
          ...shard,
          documentCount: shard.documentCount + 1,
          vocabularySize: shard.vocabularySize + 8 // simulate vocabulary growth
        };
      }
      return shard;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col font-sans select-none" id="novasearch-root">
      
      {/* 🛡️ TOP GRAPHICAL HEAD BRANDING & MONITORING PANEL */}
      <header className="h-[48px] border-b border-slate-800 bg-slate-900 px-4 md:px-6 flex items-center justify-between z-30 shrink-0" id="master-header">
        
        {/* Branding Logo */}
        <div className="flex items-center gap-3" id="branding-panel">
          <div className="flex items-center gap-2 font-mono font-bold text-slate-100 text-sm">
            <div className="w-3 h-3 bg-sky-500 rounded-[2px]" />
            <span>NOVASEARCH</span>
            <span className="opacity-40 text-[10px] font-normal tracking-tight">v1.2.4-stable</span>
          </div>
        </div>

        {/* Status indicator and Build Tag */}
        <div className="flex items-center gap-5 text-xs font-mono" id="header-right-telemetry">
          {/* Uptime status pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/30 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CLUSTER HEALTHY</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-[10px]">
            <span>BUILD:</span>
            <span className="text-slate-300 font-semibold uppercase">2026.06.22.PROD</span>
          </div>
        </div>

      </header>

      {/* 🖥️ SIDEBAR + MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden" id="dashboard-body">
        
        {/* 🗃️ SIDEBAR NAVIGATION RAIL */}
        <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0" id="sidebar-rail">
          
          {/* Main Navigation Links */}
          <nav className="flex flex-col py-3 space-y-0.5" id="sidebar-nav">
            <button
              onClick={() => setActiveTab('cluster')}
              className={`text-left py-2.5 px-5 font-mono text-[11px] flex items-center gap-3 border-l-3 transition-all ${
                activeTab === 'cluster' 
                ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-bold opacity-100' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/20'
              }`}
              id="nav-tab-cluster"
            >
              <Server className="w-3.5 h-3.5" /> <span>Cluster Control Room</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`text-left py-2.5 px-5 font-mono text-[11px] flex items-center gap-3 border-l-3 transition-all ${
                activeTab === 'search' 
                ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-bold opacity-100' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/20'
              }`}
              id="nav-tab-search"
            >
              <Search className="w-3.5 h-3.5" /> <span>Gateway Search Portal</span>
            </button>
            <button
              onClick={() => setActiveTab('crawler')}
              className={`text-left py-2.5 px-5 font-mono text-[11px] flex items-center gap-3 border-l-3 transition-all ${
                activeTab === 'crawler' 
                ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-bold opacity-100' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/20'
              }`}
              id="nav-tab-crawler"
            >
              <Activity className="w-3.5 h-3.5" /> <span>Web Crawler Sandbox</span>
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`text-left py-2.5 px-5 font-mono text-[11px] flex items-center gap-3 border-l-3 transition-all ${
                activeTab === 'architecture' 
                ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-bold opacity-100' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/20'
              }`}
              id="nav-tab-architecture"
            >
              <Network className="w-3.5 h-3.5" /> <span>System Design & Diagrams</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`text-left py-2.5 px-5 font-mono text-[11px] flex items-center gap-3 border-l-3 transition-all ${
                activeTab === 'code' 
                ? 'border-sky-500 bg-sky-500/5 text-sky-400 font-bold opacity-100' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/20'
              }`}
              id="nav-tab-code"
            >
              <Code className="w-3.5 h-3.5" /> <span>C++ Source Repository</span>
            </button>
          </nav>

          {/* Sidebar telemetry footer status */}
          <div className="hidden md:block p-5 border-t border-slate-850 bg-slate-950/20" id="sidebar-telemetry">
            <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase mb-1 font-bold">SYSTEM UPTIME</div>
            <div className="font-mono text-xs text-slate-200">142:12:44:09</div>
            <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>LATENCY AVG</span>
              <span className="text-slate-300">{(shards.reduce((acc, s) => acc + (s.status === 'ONLINE' ? s.latencyMs : 0), 0) / (shards.filter(s => s.status === 'ONLINE').length || 1)).toFixed(1)} ms</span>
            </div>
          </div>

        </aside>

        {/* 🖥️ DYNAMIC CONTENT WORKSPACE STAGE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" id="master-stage">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {activeTab === 'cluster' && (
              <ClusterOverview 
                shards={shards} 
                toggleShard={toggleShardStatus} 
                metricsHistory={metricsHistory}
                traceLogs={traceLogs}
                clearLogs={clearTraceLogs}
              />
            )}
            
            {activeTab === 'search' && (
              <SearchPlayground 
                shards={shards} 
                addTraceLog={addTraceLog} 
                triggerSearchMetric={triggerSearchMetric}
              />
            )}

            {activeTab === 'crawler' && (
              <CrawlerSandbox 
                addCrawlDocumentToIndex={handleAddCrawledDoc} 
              />
            )}

            {activeTab === 'architecture' && (
              <ArchitectureModeler />
            )}

            {activeTab === 'code' && (
              <CodeBrowser />
            )}
          </div>
        </main>

      </div>

      {/* 📊 FOOTER telemetry monitor */}
      <footer className="h-[28px] border-t border-slate-800 bg-slate-900 flex items-center justify-center font-mono text-[9px] text-slate-550 select-none shrink-0" id="master-footer">
        <span>© 2026 NovaSearch Engine Platform (C++23 Stack). Internal loopback binding: <b className="text-slate-300">0.0.0.0:3000</b>.</span>
      </footer>

    </div>
  );
}
