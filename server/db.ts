import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // fallback

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/novasearch';

const pool = new Pool({
  connectionString
});

export default pool;
