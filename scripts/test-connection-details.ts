#!/usr/bin/env bun

/**
 * Test detallado de conexión a PostgreSQL
 */

import { Pool } from "pg";

console.log("🔍 Testing PostgreSQL Connection in Detail\n");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://fluid:fluid@localhost:5432/fluid_calendar";

console.log("1️⃣  CONNECTION STRING:");
console.log("   ", DATABASE_URL);

// Parse the connection string manually
const url = new URL(DATABASE_URL);
console.log("\n2️⃣  PARSED COMPONENTS:");
console.log("   Protocol:", url.protocol);
console.log("   Username:", url.username);
console.log("   Password:", url.password);
console.log("   Host:", url.hostname);
console.log("   Port:", url.port);
console.log("   Database:", url.pathname.substring(1));

// Try with explicit config instead of connection string
console.log("\n3️⃣  CREATING POOL WITH EXPLICIT CONFIG:");

const pool = new Pool({
  user: "fluid",
  password: "fluid",
  host: "localhost",
  port: 5432,
  database: "fluid_calendar",
});

console.log("   Pool created successfully");

console.log("\n4️⃣  ATTEMPTING CONNECTION:");

try {
  const client = await pool.connect();
  console.log("   ✅ Connection successful!");

  const result = await client.query("SELECT version()");
  console.log("\n5️⃣  DATABASE INFO:");
  console.log("   ", result.rows[0].version);

  const users = await client.query("SELECT usename FROM pg_user");
  console.log("\n6️⃣  USERS IN DATABASE:");
  users.rows.forEach((row) => {
    console.log("   -", row.usename);
  });

  client.release();
  await pool.end();

  console.log("\n✅ ALL TESTS PASSED!");
  process.exit(0);
} catch (error: any) {
  console.error("\n❌ CONNECTION FAILED!");
  console.error("\n📋 Error Details:");
  console.error("   Message:", error.message);
  console.error("   Code:", error.code);
  console.error("   Severity:", error.severity);
  console.error("   File:", error.file);
  console.error("   Line:", error.line);
  console.error("   Routine:", error.routine);

  await pool.end();
  process.exit(1);
}
