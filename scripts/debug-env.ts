#!/usr/bin/env bun

/**
 * Script para debuggear variables de entorno
 */

console.log("=".repeat(80));
console.log("🔍 DEBUG: Variables de Entorno");
console.log("=".repeat(80));

console.log("\n📋 DATABASE_URL:");
console.log("  Value:", process.env.DATABASE_URL);
console.log("  Length:", process.env.DATABASE_URL?.length || 0);
console.log("  Type:", typeof process.env.DATABASE_URL);

console.log("\n📋 Todas las variables que empiezan con 'DATABASE':");
Object.keys(process.env)
  .filter((key) => key.startsWith("DATABASE"))
  .forEach((key) => {
    console.log(`  ${key}:`, process.env[key]);
  });

console.log("\n📋 Variables relacionadas con Google:");
Object.keys(process.env)
  .filter((key) => key.includes("GOOGLE"))
  .forEach((key) => {
    console.log(`  ${key}:`, process.env[key]?.substring(0, 20) + "...");
  });

console.log("\n📋 Variables relacionadas con Fitbit:");
Object.keys(process.env)
  .filter((key) => key.includes("FITBIT"))
  .forEach((key) => {
    console.log(`  ${key}:`, process.env[key]?.substring(0, 20) + "...");
  });

console.log("\n📋 NEXTAUTH_SECRET:");
console.log("  Exists:", !!process.env.NEXTAUTH_SECRET);
console.log("  Length:", process.env.NEXTAUTH_SECRET?.length || 0);

console.log("\n📋 Total environment variables:", Object.keys(process.env).length);

console.log("\n" + "=".repeat(80));
console.log("✅ Debug completo");
console.log("=".repeat(80));
