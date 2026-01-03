#!/usr/bin/env node
/**
 * Comprehensive Prisma to Drizzle migration script
 * Handles complex query transformations
 */

const fs = require('fs');
const path = require('path');

const MIGRATED_FILES = new Set([
  'src\\app\\api\\tasks\\route.ts',
  'src\\app\\api\\tasks\\[id]\\route.ts',
  'src\\app\\api\\projects\\route.ts',
  'src\\app\\api\\projects\\[id]\\route.ts',
  'src\\app\\api\\tags\\route.ts',
  'src\\app\\api\\tags\\[id]\\route.ts',
  'src\\app\\api\\feeds\\route.ts',
  'src\\app\\api\\feeds\\[id]\\route.ts',
  'src\\app\\api\\events\\route.ts',
  'src\\app\\api\\events\\[id]\\route.ts',
  'src\\lib\\calendar-db.ts',
]);

const MODEL_MAP = {
  user: 'users',
  account: 'accounts',
  session: 'sessions',
  verificationToken: 'verificationTokens',
  passwordReset: 'passwordResets',
  calendarFeed: 'calendarFeeds',
  calendarEvent: 'calendarEvents',
  event: 'events',
  task: 'tasks',
  project: 'projects',
  tag: 'tags',
  taskTag: 'taskTags',
  connectedAccount: 'connectedAccounts',
  fitbitAccount: 'fitbitAccounts',
  fitbitActivity: 'fitbitActivities',
  fitbitSleep: 'fitbitSleep',
  fitbitHeartRate: 'fitbitHeartRate',
  autoScheduleSettings: 'autoScheduleSettings',
  userSettings: 'userSettings',
  calendarSettings: 'calendarSettings',
  notificationSettings: 'notificationSettings',
  integrationSettings: 'integrationSettings',
  dataSettings: 'dataSettings',
  systemSettings: 'systemSettings',
  log: 'logs',
  jobRecord: 'jobRecords',
  taskProvider: 'taskProviders',
  taskListMapping: 'taskListMappings',
  taskChange: 'taskChanges',
  habit: 'habits',
  habitLog: 'habitLogs',
  moodEntry: 'moodEntries',
  pomodoroSession: 'pomodoroSessions',
  routine: 'routines',
  routineTask: 'routineTasks',
  routineCompletion: 'routineCompletions',
  scheduleSuggestion: 'scheduleSuggestions',
  journalEntry: 'journalEntries',
};

function extractModelsUsed(content) {
  const models = new Set();
  for (const [prismaModel, drizzleModel] of Object.entries(MODEL_MAP)) {
    const regex = new RegExp(`prisma\\.${prismaModel}\\b`, 'g');
    if (regex.test(content)) {
      models.add(drizzleModel);
    }
  }
  return Array.from(models);
}

function migrateFileContent(content, filePath) {
  if (!content.includes('from "@/lib/prisma"')) {
    return null; // No migration needed
  }

  let migrated = content;

  // 1. Replace import
  migrated = migrated.replace(
    /import\s+{\s*prisma\s*}\s+from\s+"@\/lib\/prisma";?\n?/g,
    ''
  );

  // 2. Extract models used
  const models = extractModelsUsed(migrated);

  if (models.length === 0) {
    return null;
  }

  // 3. Add Drizzle imports
  const drizzleImport = `import { db, ${models.join(', ')} } from "@/db";\nimport { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";\n`;

  // Add import after existing imports
  const importMatch = migrated.match(/(import.*from.*\n)+/);
  if (importMatch) {
    const lastImportIndex = importMatch.index + importMatch[0].length;
    migrated = migrated.slice(0, lastImportIndex) + drizzleImport + migrated.slice(lastImportIndex);
  } else {
    migrated = drizzleImport + migrated;
  }

  // 4. Transform queries
  for (const [prismaModel, drizzleModel] of Object.entries(MODEL_MAP)) {
    // findUnique -> findFirst with eq
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.findUnique\\s*\\(\\s*{\\s*where:\\s*{\\s*(\\w+)\\s*}`, 'g'),
      (match, field) => `db.query.${drizzleModel}.findFirst({ where: (${drizzleModel}, { eq }) => eq(${drizzleModel}.${field}, ${field})`
    );

    // findUnique with two fields -> findFirst with and
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.findUnique\\s*\\(\\s*{\\s*where:\\s*{\\s*(\\w+),\\s*(\\w+)\\s*}`, 'g'),
      (match, field1, field2) => `db.query.${drizzleModel}.findFirst({ where: (${drizzleModel}, { and, eq }) => and(eq(${drizzleModel}.${field1}, ${field1}), eq(${drizzleModel}.${field2}, ${field2}))`
    );

    // findMany basic
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.findMany\\s*\\(`, 'g'),
      `db.query.${drizzleModel}.findMany(`
    );

    // findFirst basic
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.findFirst\\s*\\(`, 'g'),
      `db.query.${drizzleModel}.findFirst(`
    );

    // create
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.create\\s*\\(\\s*{\\s*data:\\s*`, 'g'),
      `db.insert(${drizzleModel}).values(`
    );

    // Simple update
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.update\\s*\\(\\s*{\\s*where:\\s*{\\s*id\\s*},\\s*data:\\s*`, 'g'),
      `db.update(${drizzleModel}).set(`
    );

    // upsert
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.upsert\\s*\\(`, 'g'),
      `// TODO: Manually migrate upsert - db.query.${drizzleModel}...`
    );

    // delete
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.delete\\s*\\(\\s*{\\s*where:\\s*{\\s*id\\s*}`, 'g'),
      `db.delete(${drizzleModel}).where(eq(${drizzleModel}.id, id)`
    );

    // count
    migrated = migrated.replace(
      new RegExp(`prisma\\.${prismaModel}\\.count\\s*\\(`, 'g'),
      `// TODO: Manually migrate count - db.select({ count: sql\`count(*)\` }).from(${drizzleModel})`
    );

    // $transaction
    migrated = migrated.replace(
      /prisma\.\$transaction/g,
      'db.transaction'
    );

    // include -> with
    migrated = migrated.replace(/include:/g, 'with:');

    // select in includes -> columns
    migrated = migrated.replace(/select:/g, 'columns:');
  }

  // Add .returning() after insert/update operations
  migrated = migrated.replace(/\)\.values\((.*?)\)\s*;/gs, (match) => {
    if (!match.includes('.returning()')) {
      return match.replace(/\)\s*;/, ').returning();');
    }
    return match;
  });

  // Fix id generation for create operations
  migrated = migrated.replace(
    /db\.insert\((.*?)\)\.values\(\s*{/g,
    (match, model) => `db.insert(${model}).values({\n        id: crypto.randomUUID(),`
  );

  return migrated;
}

function migrateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const migrated = migrateFileContent(content, filePath);

    if (migrated && migrated !== content) {
      fs.writeFileSync(filePath, migrated, 'utf8');
      console.log(`✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
  }
  return false;
}

function findFilesWithPrisma(dir) {
  const files = [];

  function walk(directory) {
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', '.git', '.next', 'dist'].includes(item)) {
          walk(fullPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('from "@/lib/prisma"')) {
            // Check if not already migrated
            const relativePath = path.relative(process.cwd(), fullPath);
            if (!MIGRATED_FILES.has(relativePath) && !MIGRATED_FILES.has(relativePath.replace(/\//g, '\\\\'))) {
              files.push(fullPath);
            }
          }
        } catch (err) {
          // Ignore read errors
        }
      }
    }
  }

  walk(dir);
  return files;
}

function main() {
  console.log('🚀 Starting comprehensive Prisma to Drizzle migration...\n');

  const srcDir = path.join(__dirname, '..', 'src');
  const files = findFilesWithPrisma(srcDir);

  console.log(`Found ${files.length} files to migrate\n`);

  let migratedCount = 0;

  for (const file of files) {
    if (migrateFile(file)) {
      migratedCount++;
    }
  }

  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Successfully migrated ${migratedCount} files`);
  console.log(`\n⚠️  Please review all migrated files for complex queries that may need manual adjustment`);
  console.log(`🔍 Look for "TODO: Manually migrate" comments in the code`);
}

main();
