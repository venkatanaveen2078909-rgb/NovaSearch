import { Pool, Client } from 'pg';
import { mockDocuments, trieWords } from '../src/data';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbName = 'novasearch';
const rootConnectionString = process.env.DATABASE_URL_ROOT || 'postgresql://postgres:root@localhost:5432/postgres';
const connectionString = process.env.DATABASE_URL || `postgresql://postgres:root@localhost:5432/${dbName}`;

async function init() {
  console.log('Connecting to root database to create target database if it does not exist...');
  const rootClient = new Client({ connectionString: rootConnectionString });
  await rootClient.connect();
  
  try {
    const res = await rootClient.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'`);
    if (res.rowCount === 0) {
      console.log(`Database ${dbName} not found. Creating...`);
      await rootClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (e) {
    console.error('Error checking/creating database:', e);
  } finally {
    await rootClient.end();
  }

  console.log('Connecting to target database to create tables...');
  const pool = new Pool({ connectionString });
  
  try {
    // Drop existing tables
    await pool.query('DROP TABLE IF EXISTS autocomplete_trie CASCADE;');
    await pool.query('DROP TABLE IF EXISTS documents CASCADE;');
    await pool.query('DROP TABLE IF EXISTS shards CASCADE;');

    // Create shards table
    await pool.query(`
      CREATE TABLE shards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'ONLINE'
      );
    `);

    // Create documents table
    // We store tsvector for full text search
    await pool.query(`
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        raw_html TEXT NOT NULL,
        page_size VARCHAR(50),
        pagerank REAL DEFAULT 1.0,
        shard_id INTEGER REFERENCES shards(id),
        search_vector tsvector
      );
    `);

    // Create index on search_vector
    await pool.query(`
      CREATE INDEX idx_documents_search_vector ON documents USING GIN(search_vector);
    `);

    // Create autocomplete table
    await pool.query(`
      CREATE TABLE autocomplete_trie (
        word VARCHAR(255) PRIMARY KEY,
        freq INTEGER DEFAULT 0
      );
    `);

    // Insert Shards
    console.log('Inserting shards...');
    await pool.query(`
      INSERT INTO shards (id, name, address, status) VALUES 
      (1, 'ns-shard-leaf-001', '0.0.0.0:5001', 'ONLINE'),
      (2, 'ns-shard-leaf-002', '0.0.0.0:5002', 'ONLINE'),
      (3, 'ns-shard-leaf-003', '0.0.0.0:5003', 'ONLINE')
    `);

    // Insert Documents
    console.log('Inserting documents...');
    for (const doc of mockDocuments) {
      // Arbitrarily assign to shards based on ID
      let shardId = 3;
      if (doc.id === 1 || doc.id === 4) shardId = 1;
      else if (doc.id === 2 || doc.id === 5 || doc.id === 7) shardId = 2;

      await pool.query(`
        INSERT INTO documents (id, url, title, content, raw_html, page_size, pagerank, shard_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [doc.id, doc.url, doc.title, doc.content, doc.rawHtml, doc.pageSize, doc.pagerank, shardId]);
    }

    // Update sequence
    await pool.query(`SELECT setval('documents_id_seq', (SELECT MAX(id) FROM documents));`);

    // Update tsvector column
    console.log('Updating search vectors...');
    await pool.query(`
      UPDATE documents SET search_vector = 
        setweight(to_tsvector('english', title), 'A') || 
        setweight(to_tsvector('english', content), 'B');
    `);

    // Insert Autocomplete Words
    console.log('Inserting autocomplete words...');
    for (const item of trieWords) {
      await pool.query(`
        INSERT INTO autocomplete_trie (word, freq)
        VALUES ($1, $2)
      `, [item.word, item.freq]);
    }

    console.log('Database initialization completed successfully!');
  } catch (e) {
    console.error('Error during database initialization:', e);
  } finally {
    await pool.end();
  }
}

init();
