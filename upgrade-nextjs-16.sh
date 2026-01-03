#!/bin/bash
# Upgrade to Next.js 16 canary
# Run this AFTER Drizzle migration is complete

echo "🚀 Upgrading to Next.js 16 canary..."
echo ""

# Install Next.js 16 canary
echo "📦 Installing next@canary..."
bun install next@canary

# Also upgrade related packages that might need canary versions
echo "📦 Installing @next/eslint-plugin-next@canary..."
bun install -D @next/eslint-plugin-next@canary

echo ""
echo "✨ Next.js 16 canary installed!"
echo ""
echo "ℹ️  Note: This is a canary (pre-release) version and may have bugs"
echo "📚 Check the changelog: https://github.com/vercel/next.js/releases"
echo ""
echo "🔄 Restart your dev server to apply changes"
