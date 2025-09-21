import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

// Prefer client-safe URL in browser; fall back to server env when available
const connectionString =
  process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL || process.env.NEXT_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'Database URL is not set. Set NEXT_PUBLIC_DATABASE_URL for client, or DATABASE_URL/NEXT_DATABASE_URL on server.'
  );
}

const sql = neon(connectionString);
export const db = drizzle(sql);
