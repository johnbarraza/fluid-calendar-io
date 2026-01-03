#!/usr/bin/env bun

/**
 * Test node-postgres connection directly
 */

import { Pool } from "pg";

async function testPG() {
  console.log("Testing direct node-postgres connection...\n");

  const DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://fluid:fluid@localhost:5432/fluid_calendar";

  console.log("Connection string:", DATABASE_URL);

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const result = await pool.query("SELECT 1 as test");
    console.log("✅ Success:", result.rows);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await pool.end();
    process.exit(1);
  }
}

testPG();
