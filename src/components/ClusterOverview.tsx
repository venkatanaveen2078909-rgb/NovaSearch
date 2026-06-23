import React, { useState, useEffect } from 'react';
import { ShardNodeStat, GRPCTraceEvent } from '../types';
import { 
  Server, Cpu, Activity, Database, CheckCircle, AlertTriangle, 
  RefreshCcw, Play, Circle, Terminal, Zap, ShieldAlert
} from 'lucide-react';

interface ClusterOverviewProps {
  shards: ShardNodeStat[];
  toggleShard: (id: number) => void;
  metricsHistory: { qps: number[]; latency: number[]; hitRatio: number[] };
  traceLogs: GRPCTraceEvent[];
  clearLogs: () => void;
}

export const ClusterOverview: React.FC<ClusterOverviewProps> = ({
  shards,
  toggleShard,
  metricsHistory,
  traceLogs,
  clearLogs
}) => {
  const activeNodes = shards.filter(s => s.status === 'ONLINE').length;
  const avgLatency = shards.reduce((acc, s) => acc + (s.status === 'ONLINE' ? s.latencyMs : 0), 0) / (activeNodes || 1);
  const totalDocs = shards.reduce((acc, s) => acc + (s.status === 'ONLINE' ? s.documentCount : 0), 0);
  const totalVocab = shards.reduce((acc, s) => acc + (s.status === 'ONLINE' ? s.vocabularySize : 0), 0);

  // SVG Chart Helper
  const renderSVGLine = (data: number[], color: string, gradientId: string, min = 0, max = 100) => {
    if (data.length === 0) return null;
    const width = 500;
    const height = 100;
    const padding = 5;
    
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
      const normalized = (val - min) / ((max - min) || 1);
      const y = height - (normalized * (height - padding * 2) + padding);
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const areaPathData = `${pathData} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <svg className="w-full h-24 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="0" y1="20" x2={width} y2="20" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="0" y1="50" x2={width} y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="0" y1="80" x2={width} y2="80" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
        
        {/* Area fill */}
        <path d={areaPathData} fill={`url(#${gradientId})`} />
        {/* Line */}
        <path d={pathData} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Glowing Tip */}
        {points.length > 0 && (
          <circle 
            cx={parseFloat(points[points.length - 1].split(',')[0])} 
            cy={parseFloat(points[points.length - 1].split(',')[1])} 
            r="4" 
            fill={color} 
            className="animate-pulse" 
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6" id="cluster-overview-component">
      {/* 1. Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-active-nodes">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">ACTIVE SHARDS</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{activeNodes}</span>
            <span className="text-xs text-slate-400">/ {shards.length}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <Circle className="w-2 h-2 fill-emerald-400" /> CLUSTER HEALTHY
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-indexed-docs">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">INDEX DOCUMENTS</span>
            <Database className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{totalDocs}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Across active sharded buckets
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-total-vocab">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">VOCABULARY SIZE</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{totalVocab}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Unique terms indexed
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-latency">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">AVG LATENCY</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {avgLatency.toFixed(1)} <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono mt-1">
            Parallel C++ index search time
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-qps">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">COORDINATOR QPS</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {metricsHistory.qps[metricsHistory.qps.length - 1]?.toFixed(1) || '0.0'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Queries serving per second
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col justify-between" id="stat-cache-hit">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-mono">CACHE HIT RATIO</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {(metricsHistory.hitRatio[metricsHistory.hitRatio.length - 1] * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            LRU Cache lookup saves
          </div>
        </div>
      </div>

      {/* 2. Interactive Shard Topology Control */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg" id="topology-control">
        <h3 className="text-slate-200 text-sm font-semibold font-mono mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" /> DISTRIBUTED SHARD NODES (gRPC Topologies)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="shards-status-grid">
          {shards.map((node) => {
            const isOnline = node.status === 'ONLINE';
            return (
              <div 
                key={node.id} 
                className={`border p-4 rounded-lg relative overflow-hidden transition-all ${
                  isOnline 
                  ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700' 
                  : 'bg-red-950/10 border-red-900/40'
                }`}
                id={`shard-card-${node.id}`}
              >
                {/* Edge Status Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${isOnline ? 'bg-sky-500' : 'bg-red-500'}`} />

                {/* Shard Metadata */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500">SHARD 0{node.id}</span>
                    <h4 className="text-slate-200 text-sm font-bold font-mono">{node.name}</h4>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                    isOnline ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}>
                    {isOnline ? <CheckCircle className="w-2.5 d-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                    {node.status}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-2 mb-4 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>gRPC Endpoint:</span>
                    <span className="text-slate-300">{node.address}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Documents:</span>
                    <span className="text-slate-300">{isOnline ? node.documentCount : 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Vocabulary Size:</span>
                    <span className="text-slate-300">{isOnline ? node.vocabularySize : 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Query Latency:</span>
                    <span className="text-slate-300">{isOnline ? `${node.latencyMs.toFixed(1)} ms` : 'N/A'}</span>
                  </div>

                  {/* Resource Bar charts */}
                  {isOnline && (
                    <div className="space-y-1.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>CPU LOAD:</span>
                          <span>{node.cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                          <div className="bg-sky-400 h-full rounded-full" style={{ width: `${node.cpuUsage}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>MEM FREE:</span>
                          <span>{node.memUsage} MB</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                          <div className="bg-purple-400 h-full rounded-full" style={{ width: `${(node.memUsage / 128) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interrupt action button */}
                <button
                  onClick={() => toggleShard(node.id)}
                  className={`w-full mt-2 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 border ${
                    isOnline 
                    ? 'bg-red-950/25 hover:bg-red-950/50 text-red-300 border-red-900/30' 
                    : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 border-emerald-900/30'
                  }`}
                  id={`shard-toggle-btn-${node.id}`}
                >
                  {isOnline ? <AlertTriangle className="w-3.5 h-3.5" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                  {isOnline ? 'Inject Node Partition / Fault' : 'Reboot Node (gRPC Handshake)'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Live Metrics Chart Series */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="metrics-charts-grid">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">QPS INTENSITY</span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {metricsHistory.qps[metricsHistory.qps.length - 1]?.toFixed(1) || '0.0'} <span className="text-xs text-slate-400">req/s</span>
          </div>
          <div className="mt-4 bg-slate-950 p-2 rounded border border-slate-900" id="qps-chart">
            {renderSVGLine(metricsHistory.qps, '#6366f1', 'qpsGrad', 0, 10)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">SEARCH LATENCY LATERAL FLUIDITY</span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {avgLatency.toFixed(1)} <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="mt-4 bg-slate-950 p-2 rounded border border-slate-900" id="latency-chart">
            {renderSVGLine(metricsHistory.latency, '#f59e0b', 'latGrad', 0, 180)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
          <span className="text-slate-400 text-xs font-mono">CACHE HIT EFFICIENCY LEVEL</span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {(metricsHistory.hitRatio[metricsHistory.hitRatio.length - 1] * 100).toFixed(0)}%
          </div>
          <div className="mt-4 bg-slate-950 p-2 rounded border border-slate-900" id="cache-chart">
            {renderSVGLine(metricsHistory.hitRatio, '#10b981', 'cacheGrad', 0, 1)}
          </div>
        </div>
      </div>

      {/* 4. Active gRPC Call Telemetry Logs */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-[280px]" id="grpc-logs-panel">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-slate-200 text-sm font-semibold font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" /> ACTIVE CLUSTER gRPC TELEMETRY & CALL TRACES
          </h3>
          <button 
            onClick={clearLogs}
            className="text-slate-500 hover:text-slate-300 text-xs font-mono py-1 px-2.5 rounded hover:bg-slate-800 transition"
          >
            Clear Telemetry Logs
          </button>
        </div>

        <div className="flex-1 bg-slate-950 border border-slate-950 p-4 rounded overflow-y-auto font-mono text-xs text-slate-300 space-y-2 h-[180px]">
          {traceLogs.length === 0 ? (
            <div className="text-slate-600 flex flex-col items-center justify-center h-full gap-2">
              <Zap className="w-4 h-4 text-slate-700 animate-pulse" />
              <span>Waiting for query routing metrics, client registrations, or web crawling events...</span>
            </div>
          ) : (
            traceLogs.map((log) => {
              const isError = log.status === 'ERROR';
              const directionIcon = log.status === 'SEND' ? '➜' : '➜';
              return (
                <div key={log.id} className="flex gap-2 leading-relaxed border-b border-slate-900/30 pb-1.5 last:border-0 hover:bg-slate-900/10 px-1 rounded">
                  <span className="text-slate-600">{log.timestamp}</span>
                  <span className="text-emerald-500">[{log.source}]</span>
                  <span className="text-slate-400">{directionIcon}</span>
                  <span className="text-indigo-400">[{log.destination}]</span>
                  <span className={`${isError ? 'text-red-400 font-semibold' : 'text-slate-200'}`}>
                    {log.messageType}:
                  </span>
                  <span className="text-slate-400 flex-1">{log.details}</span>
                  <span className={`text-[10px] uppercase. px-1.5 py-0.2 rounded font-semibold ${
                    isError ? 'bg-red-950 text-red-400' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {log.status === 'SUCCESS' ? 'OK' : log.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
