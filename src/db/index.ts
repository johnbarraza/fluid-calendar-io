/**
 * Drizzle Database Client
 * Replaces Prisma with Drizzle ORM for better Windows compatibility
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Database URL from environment with fallback
// IMPORTANT: In WSL2, use Windows host IP (10.255.255.254), not localhost or 127.0.0.1
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://fluid:fluid@10.255.255.254:5432/fluid_calendar";

// Create pg Pool connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 20000, // Close idle connections after 20 seconds
  connectionTimeoutMillis: 10000, // Timeout for initial connection
});

// Create Drizzle instance with schema
export const db = drizzle(pool, { schema });

// Export schema for use in queries
export * from "./schema";

// Helper to close database connection
export async function closeDatabase() {
  await pool.end();
}
