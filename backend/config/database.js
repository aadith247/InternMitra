// Legacy database configuration - kept for backward compatibility
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database (legacy pool)');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
  process.exit(-1);
});

// Export both legacy pool and new Drizzle db
module.exports = pool;

// Also export Drizzle db for new code
const { db } = require('./db.js');
module.exports.db = db;
