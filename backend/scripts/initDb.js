/*
  One-time Postgres schema initializer matching Drizzle schema (for local/dev).
  Usage: node scripts/initDb.js
*/
require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'artisan',
        business_name VARCHAR(120),
        phone VARCHAR(20),
        address JSONB,
        instagram JSONB,
        profile_image TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        last_login TIMESTAMP,
        preferences JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);

    // Products
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        artisan_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        images JSONB NOT NULL DEFAULT '[]',
        category VARCHAR(50) NOT NULL,
        tags TEXT[],
        stock INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        dimensions JSONB,
        weight JSONB,
        shipping JSONB,
        memes JSONB NOT NULL DEFAULT '[]',
        seo_title VARCHAR(160),
        seo_description VARCHAR(255),
        meta_keywords TEXT[],
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_artisan ON products(artisan_id);
      CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
      CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
    `);

    // Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(64) NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        artisan_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        items JSONB NOT NULL,
        shipping_address JSONB NOT NULL,
        billing_address JSONB,
        pricing JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        payment JSONB NOT NULL,
        shipping JSONB,
        notes JSONB,
        timeline JSONB,
        source VARCHAR(20) NOT NULL DEFAULT 'direct',
        utm JSONB,
        notifications JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_artisan ON orders(artisan_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('Database schema is ready.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('DB init failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
