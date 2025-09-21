const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || '';

// Safe default pool; in production, tune via env (max, idleTimeoutMillis)
const pool = new Pool({ connectionString });

const db = drizzle(pool);

module.exports = { db, pool };
