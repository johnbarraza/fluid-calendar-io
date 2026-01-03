#!/usr/bin/env node
/**
 * Script to fix remaining Drizzle migration TODOs
 * Handles count queries and other common patterns
 */

const fs = require('fs');
const path = require('path');

const filesWithTodos = [
  'src/services/fitbit/FitbitSyncService.ts',
  'src/services/adhd/RoutineTrackingService.ts',
  'src/services/adhd/RescheduleSuggestionService.ts',
  'src/lib/token-manager.ts',
  'src/lib/setup-actions.ts',
  'src/app/api/notification-settings/route.ts',
  'src/app/api/logs/settings/route.ts',
  'src/app/api/logs/route.ts',
  'src/app/api/integration-settings/route.ts',
  'src/app/api/fitbit/callback/route.ts',
  'src/app/api/data-settings/route.ts',
  'src/app/api/calendar-settings/route.ts',
  'src/app/api/auto-schedule-settings/route.ts',
];

function fixCountQueries(content) {
  // Pattern: const varName = await // TODO: Manually migrate count - db.select...
  const countPattern = /const\s+(\w+)\s*=\s*await\s*\/\/\s*TODO:\s*Manually\s+migrate\s+count\s*-\s*db\.select\(\{\s*count:\s*sql`count\(\*\)`\s*\}\)\.from\((\w+)\)\);/g;

  return content.replace(countPattern, (match, varName, tableName) => {
    return `const result = await db.select({ count: sql<number>\`count(*)::int\` }).from(${tableName});\n    const ${varName} = result[0]?.count || 0;`;
  });
}

function fixUpsertQueries(content) {
  // This is more complex and may need manual review
  // For now, just flag them
  return content;
}

function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Skipping ${filePath} (not found)`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;

    // Apply fixes
    content = fixCountQueries(content);

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing Drizzle migration TODOs...\n');

  let fixedCount = 0;

  filesWithTodos.forEach(file => {
    if (processFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✨ Done! Fixed ${fixedCount} files.`);

  if (fixedCount < filesWithTodos.length) {
    console.log(`\n⚠️  Some files may need manual review for complex patterns.`);
  }
}

main();
