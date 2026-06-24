import express from 'express';
import cors from 'cors';
import axios from 'axios';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3001', 10);

const SHARDS = [
  { id: 1, url: 'http://localhost:5001', name: 'ns-shard-leaf-001' },
  { id: 2, url: 'http://localhost:5002', name: 'ns-shard-leaf-002' },
  { id: 3, url: 'http://localhost:5003', name: 'ns-shard-leaf-003' },
];

// In-memory query cache (LRU simulation)
const queryCache: Record<string, { results: any[]; latency: number }> = {};

// POST /api/search — Fan-out to all shards, merge results
app.post('/api/search', async (req, res) => {
  const { query, algo } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const cacheKey = query + '-' + algo;
  if (queryCache[cacheKey]) {
    return res.json({
      cacheHit: true,
      latency: queryCache[cacheKey].latency,
      results: queryCache[cacheKey].results
    });
  }

  const start = Date.now();

  // Fan-out search to all shard servers in parallel
  const promises = SHARDS.map(async (shard) => {
    try {
      const response = await axios.post(shard.url + '/api/search', { query, algo }, { timeout: 3000 });
      return { success: true, shardId: shard.id, data: response.data };
    } catch (e) {
      console.error('Failed to query shard ' + shard.id);
      return { success: false, shardId: shard.id, error: 'Timeout or connection refused' };
    }
  });

  const responses = await Promise.all(promises);

  // Merge results from all shards
  let mergedResults: any[] = [];
  const shardResponses: any[] = [];
  
  responses.forEach(r => {
    shardResponses.push({
      shardId: r.shardId,
      success: r.success,
      resultCount: r.success && r.data ? r.data.results.length : 0
    });
    if (r.success && r.data && r.data.results) {
      mergedResults = mergedResults.concat(r.data.results);
    }
  });

  // Global sort by score descending
  mergedResults.sort((a: any, b: any) => b.score - a.score);

  const end = Date.now();
  const latency = end - start; // real ms

  queryCache[cacheKey] = { results: mergedResults, latency };

  res.json({
    cacheHit: false,
    latency,
    results: mergedResults,
    shardResponses
  });
});

// POST /api/crawl — Route document to a specific shard for indexing
app.post('/api/crawl', async (req, res) => {
  const { shardId } = req.body;
  const targetShard = SHARDS.find(s => s.id === shardId);
  if (!targetShard) return res.status(400).json({ error: 'Invalid shard ID' });

  try {
    const response = await axios.post(targetShard.url + '/api/index', req.body);
    res.json(response.data);
  } catch (e) {
    console.error('Coordinator index relay failed');
    res.status(500).json({ error: 'Failed to index on shard' });
  }
});

// GET /api/autocomplete — Prefix trie lookup from Postgres
app.get('/api/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.length < 2) return res.json([]);

  try {
    const result = await pool.query(
      'SELECT word, freq FROM autocomplete_trie WHERE word LIKE $1 AND word != $2 ORDER BY freq DESC LIMIT 4',
      [q + '%', q]
    );
    res.json(result.rows.map((r: any) => r.word));
  } catch (e) {
    console.error('Autocomplete error:', e);
    res.json([]);
  }
});

// GET /api/shards — Return shard status with real doc counts from Postgres
app.get('/api/shards', async (_req, res) => {
  try {
    const shardsData = [];
    for (const shard of SHARDS) {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM documents WHERE shard_id = $1',
        [shard.id]
      );
      const count = parseInt(result.rows[0].count, 10);

      // Also try to ping the shard health endpoint
      let status = 'FAILED';
      try {
        await axios.get(shard.url + '/health', { timeout: 1000 });
        status = 'ONLINE';
      } catch {
        status = 'FAILED';
      }

      shardsData.push({
        id: shard.id,
        name: shard.name,
        address: shard.url.replace('http://', ''),
        status,
        documentCount: count,
        vocabularySize: count * 20,
        latencyMs: 12 + Math.random() * 5,
        qps: 1.2,
        cpuUsage: 10 + Math.random() * 5,
        memUsage: 30 + Math.random() * 10
      });
    }
    res.json(shardsData);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch shard info' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('[Coordinator] listening on port ' + PORT);
});
