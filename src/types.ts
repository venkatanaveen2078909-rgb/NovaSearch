export interface MockDocument {
  id: number;
  url: string;
  title: string;
  content: string;
  rawHtml: string;
  pageSize: string; // kb
  pagerank: number;
}

export interface SearchResultItem {
  id: number;
  url: string;
  title: string;
  snippet: string;
  score: number;
  shardId: number;
  matchTerms: string[];
}

export interface ShardNodeStat {
  id: number;
  name: string;
  address: string;
  status: 'ONLINE' | 'PARTITIONED' | 'FAILED';
  documentCount: number;
  vocabularySize: number;
  latencyMs: number;
  qps: number;
  cpuUsage: number;
  memUsage: number; // MB
}

export interface MetricStream {
  qps: number[];
  latency: number[];
  hitRatio: number[];
  crawlSpeed: number[];
  timeline: string[];
}

export interface GRPCTraceEvent {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  messageType: string;
  details: string;
  status: 'SEND' | 'RECEIVE' | 'SUCCESS' | 'ERROR';
}

export interface CrawlerLog {
  id: string;
  timestamp: string;
  url: string;
  status: 'QUEUED' | 'PARSING' | 'ROBOTS_CHECK' | 'POLITENESS_DELAY' | 'INDEXED' | 'DISALLOWED';
  details: string;
}
