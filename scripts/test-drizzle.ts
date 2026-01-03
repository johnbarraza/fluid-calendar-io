#!/usr/bin/env bun

/**
 * Test Drizzle connection and basic query
 */

import { db, users, systemSettings } from "@/db";
import { sql } from "drizzle-orm";

async function testConnection() {
  console.log("🔌 Testing Drizzle database connection...\n");

  try {
    // Test 1: Raw SQL query
    console.log("Test 1: Raw SQL query");
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ Raw query successful:", result);

    // Test 2: Count users
    console.log("\nTest 2: Count users");
    const userCount = await db.select().from(users);
    console.log(`✅ Found ${userCount.length} users`);

    // Test 3: System settings
    console.log("\nTest 3: System settings");
    const settings = await db.select().from(systemSettings);
    console.log(`✅ Found ${settings.length} system settings`);

    console.log("\n🎉 All tests passed! Drizzle is working correctly.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error testing Drizzle:", error);
    process.exit(1);
  }
}

testConnection();
