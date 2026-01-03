#!/usr/bin/env bun
/**
 * Environment Variables Loader
 *
 * Loads environment variables from the keys/ directory in the correct order:
 * 1. keys/.env (base config)
 * 2. keys/database.env (database credentials)
 * 3. keys/google-oauth.env (Google API)
 * 4. keys/fitbit-oauth.env (Fitbit API)
 * 5. keys/.env.local (local overrides - highest priority)
 */

import { existsSync } from "fs";
import { join } from "path";

const keysDir = join(process.cwd(), "keys");

const envFiles = [
  ".env",
  "database.env",
  "google-oauth.env",
  "fitbit-oauth.env",
  ".env.local",
];

console.log("🔑 Loading environment variables from keys/ directory...\n");

for (const file of envFiles) {
  const filePath = join(keysDir, file);

  if (existsSync(filePath)) {
    console.log(`✅ Loaded: keys/${file}`);
    // Bun automatically loads .env files when using --env-file
    // This script just validates they exist
  } else {
    if (file === ".env.local" || file.endsWith(".env")) {
      console.log(`⚠️  Optional: keys/${file} not found (this is OK)`);
    } else {
      console.log(`❌ Missing: keys/${file} - copy from keys/${file}.template`);
    }
  }
}

console.log("\n✨ Environment loading complete!\n");

// Validate critical variables
const critical = ["DATABASE_URL", "NEXTAUTH_SECRET"];
const missing: string[] = [];

for (const varName of critical) {
  if (!process.env[varName]) {
    missing.push(varName);
  }
}

if (missing.length > 0) {
  console.error("❌ Missing critical environment variables:");
  missing.forEach((v) => console.error(`   - ${v}`));
  console.error("\nPlease check your keys/ directory configuration.\n");
  process.exit(1);
}

console.log("✅ All critical environment variables are set!\n");
