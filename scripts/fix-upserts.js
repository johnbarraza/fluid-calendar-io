#!/usr/bin/env node
/**
 * Fix upsert operations in migrated files
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_FILES = [
  'src/app/api/auto-schedule-settings/route.ts',
  'src/app/api/calendar-settings/route.ts',
  'src/app/api/data-settings/route.ts',
  'src/app/api/integration-settings/route.ts',
  'src/app/api/notification-settings/route.ts',
];

function fixUpserts(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Pattern: await // TODO: Manually migrate upsert - db.query.MODELNAME...{
  // Replace with proper find-then-insert/update pattern

  // This is a simplified fix for settings files
  // For more complex cases, manual review is still needed

  content = content.replace(
    /const settings = await \/\/ TODO: Manually migrate upsert - db\.query\.\w+\.\.\.{\s*where: { userId },\s*update: {},\s*create: {\s*userId,\s*([\s\S]*?)\s*},\s*}\);/gm,
    (match, createFields) => {
      const tableName = match.match(/db\.query\.(\w+)/)?.[1] || 'unknownTable';
      return `let settings = await db.query.${tableName}.findFirst({
      where: (${tableName}, { eq }) => eq(${tableName}.userId, userId),
    });

    if (!settings) {
      [settings] = await db
        .insert(${tableName})
        .values({
          id: crypto.randomUUID(),
          userId,
          ${createFields}
        })
        .returning();
    }`;
    }
  );

  content = content.replace(
    /const settings = await \/\/ TODO: Manually migrate upsert - db\.query\.\w+\.\.\.{\s*where: { userId },\s*update: updates,\s*create: {\s*userId,\s*([\s\S]*?)\s*},\s*}\);/gm,
    (match, createFields) => {
      const tableName = match.match(/db\.query\.(\w+)/)?.[1] || 'unknownTable';
      return `let settings = await db.query.${tableName}.findFirst({
      where: (${tableName}, { eq }) => eq(${tableName}.userId, userId),
    });

    if (settings) {
      [settings] = await db
        .update(${tableName})
        .set(updates)
        .where(eq(${tableName}.userId, userId))
        .returning();
    } else {
      [settings] = await db
        .insert(${tableName})
        .values({
          id: crypto.randomUUID(),
          userId,
          ${createFields}
        })
        .returning();
    }`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed upserts in ${path.relative(process.cwd(), filePath)}`);
    return true;
  }

  return false;
}

function main() {
  console.log('🔧 Fixing upsert operations...\n');

  let fixedCount = 0;

  for (const file of SETTINGS_FILES) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      if (fixUpserts(filePath)) {
        fixedCount++;
      }
    }
  }

  console.log(`\n✨ Fixed ${fixedCount} files`);
}

main();
