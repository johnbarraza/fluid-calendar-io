#!/usr/bin/env bun

/**
 * Development server starter with proper environment variable loading
 * This script ensures DATABASE_URL is available before starting Next.js
 */

import { spawn } from "child_process";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

const ROOT_DIR = join(__dirname, "..");
const KEYS_DIR = join(ROOT_DIR, "keys");

// Environment files to load (in order of priority)
const ENV_FILES = [
  join(KEYS_DIR, ".env"),
  join(KEYS_DIR, "database.env"),
  join(KEYS_DIR, "google-oauth.env"),
  join(KEYS_DIR, "fitbit-oauth.env"),
  join(KEYS_DIR, ".env.local"),
];

// Load environment variables from file
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, ""); // Remove quotes

      // Only set if not already defined (respects priority)
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

// Load all environment files
console.log("🔧 Loading environment variables...\n");
for (const file of ENV_FILES) {
  loadEnvFile(file);
  console.log(`✓ Loaded: ${file}`);
}

// Verify critical variables
const criticalVars = ["DATABASE_URL", "NEXTAUTH_SECRET"];
const missing = criticalVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n❌ Missing critical environment variables:");
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error("\nPlease check your files in the keys/ directory.\n");
  process.exit(1);
}

console.log("\n✅ All critical variables loaded");
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.slice(0, 30)}...`);
console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? "***" : "NOT SET"}\n`);

// Start Next.js dev server
console.log("🚀 Starting Next.js development server...\n");

const nextDev = spawn("bun", ["run", "dev:next"], {
  cwd: ROOT_DIR,
  stdio: "inherit",
  env: process.env as NodeJS.ProcessEnv,
});

nextDev.on("exit", (code) => {
  process.exit(code || 0);
});
