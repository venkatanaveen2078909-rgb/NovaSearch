import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const SHARD_ID = parseInt(process.env.SHARD_ID || '1', 10);
const PORT = parseInt(process.env.PORT || '5001', 10);

app.post('/api/search', async (req, res) => {
  const { query, algo } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // Convert boolean operators to Postgres tsquery syntax
  const pgQuery = query
    .replace(/ OR /gi, ' | ')
    .replace(/ AND /gi, ' & ')
    .replace(/ NOT /gi, ' ! ')
    .trim()
    .split(/\s+/)
    .join(' & ')
    .replace(/& \| &/g, '|')
    .replace(/& ! &/g, '& !');

  try {
    let sql = '';
    const params: any[] = [SHARD_ID];

    if (algo === 'tfidf') {
      sql = `
        SELECT id, url, title, content as snippet, shard_id,
               ts_rank(search_vector, to_tsquery('english', $2)) AS score
        FROM documents
        WHERE shard_id = $1
          AND search_vector @@ to_tsquery('english', $2)
        ORDER BY score DESC
        LIMIT 10;
      `;
      params.push(pgQuery);
    } else {
      sql = `
        SELECT id, url, title, content as snippet, shard_id,
               ts_rank_cd(search_vector, to_tsquery('english', $2)) AS score
        FROM documents
        WHERE shard_id = $1
          AND search_vector @@ to_tsquery('english', $2)
        ORDER BY score DESC
        LIMIT 10;
      `;
      params.push(pgQuery);
    }

    const result = await pool.query(sql, params);

    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const formattedResults = result.rows.map((row: any) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      snippet: row.snippet,
      score: parseFloat(row.score),
      shardId: row.shard_id,
      matchTerms: queryTerms
    }));

    res.json({
      shardId: SHARD_ID,
      results: formattedResults,
      latency: Math.random() * 20 + 5
    });
  } catch (e: any) {
    console.error(`[Shard ${SHARD_ID}] Search error:`, e.message);
    // Fallback: plain ILIKE text search if tsquery syntax is invalid
    try {
      const fallbackSql = `
        SELECT id, url, title, content as snippet, shard_id,
               1.0 AS score
        FROM documents
        WHERE shard_id = $1
          AND (content ILIKE $2 OR title ILIKE $2)
        LIMIT 10;
      `;
      const result = await pool.query(fallbackSql, [SHARD_ID, `%${query}%`]);
      res.json({
        shardId: SHARD_ID,
        results: result.rows.map((row: any) => ({
          id: row.id, url: row.url, title: row.title,
          snippet: row.snippet, score: parseFloat(row.score),
          shardId: row.shard_id, matchTerms: [query]
        })),
        latency: Math.random() * 20 + 5
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Internal search error' });
    }
  }
});

app.post('/api/index', async (req, res) => {
  const { url, title, content, rawHtml, pageSize } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO documents (url, title, content, raw_html, page_size, shard_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [url, title, content, rawHtml, pageSize, SHARD_ID]
    );

    await pool.query(
      `UPDATE documents SET search_vector = 
        setweight(to_tsvector('english', title), 'A') || 
        setweight(to_tsvector('english', content), 'B')
       WHERE id = $1`,
      [result.rows[0].id]
    );

    res.json({ success: true, docId: result.rows[0].id });
  } catch (e: any) {
    console.error(`[Shard ${SHARD_ID}] Index error:`, e.message);
    res.status(500).json({ error: 'Failed to index document' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', shardId: SHARD_ID });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Shard ${SHARD_ID}] listening on port ${PORT}`);
});
