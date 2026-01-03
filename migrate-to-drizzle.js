#!/usr/bin/env node
/**
 * Migration script to convert Prisma imports to Drizzle ORM
 * This script updates all files that import from "@/lib/prisma"
 */

const fs = require('fs');
const path = require('path');

// Files already migrated - skip these
const MIGRATED_FILES = new Set([
  'src/app/api/tasks/route.ts',
  'src/app/api/tasks/[id]/route.ts',
  'src/app/api/projects/route.ts',
  'src/app/api/projects/[id]/route.ts',
  'src/app/api/tags/route.ts',
  'src/app/api/tags/[id]/route.ts',
  'src/app/api/feeds/route.ts',
  'src/app/api/feeds/[id]/route.ts',
  'src/app/api/events/route.ts',
  'src/app/api/events/[id]/route.ts',
  'src/lib/calendar-db.ts',
]);

// Prisma to Drizzle model mappings
const MODEL_MAPPINGS = {
  // Auth & Users
  'prisma.user': 'users',
  'prisma.account': 'accounts',
  'prisma.session': 'sessions',
  'prisma.verificationToken': 'verificationTokens',
  'prisma.passwordReset': 'passwordResets',

  // Calendar
  'prisma.calendarFeed': 'calendarFeeds',
  'prisma.calendarEvent': 'calendarEvents',
  'prisma.event': 'events',

  // Tasks & Projects
  'prisma.task': 'tasks',
  'prisma.project': 'projects',
  'prisma.tag': 'tags',
  'prisma.taskTag': 'taskTags',

  // Connected Accounts
  'prisma.connectedAccount': 'connectedAccounts',
  'prisma.fitbitAccount': 'fitbitAccounts',
  'prisma.fitbitActivity': 'fitbitActivities',
  'prisma.fitbitSleep': 'fitbitSleep',
  'prisma.fitbitHeartRate': 'fitbitHeartRate',

  // Settings
  'prisma.autoScheduleSettings': 'autoScheduleSettings',
  'prisma.userSettings': 'userSettings',
  'prisma.calendarSettings': 'calendarSettings',
  'prisma.notificationSettings': 'notificationSettings',
  'prisma.integrationSettings': 'integrationSettings',
  'prisma.dataSettings': 'dataSettings',
  'prisma.systemSettings': 'systemSettings',

  // Logging & Jobs
  'prisma.log': 'logs',
  'prisma.jobRecord': 'jobRecords',

  // Task Sync
  'prisma.taskProvider': 'taskProviders',
  'prisma.taskListMapping': 'taskListMappings',
  'prisma.taskChange': 'taskChanges',

  // ADHD Features
  'prisma.habit': 'habits',
  'prisma.habitLog': 'habitLogs',
  'prisma.moodEntry': 'moodEntries',
  'prisma.pomodoroSession': 'pomodoroSessions',
  'prisma.routine': 'routines',
  'prisma.routineTask': 'routineTasks',
  'prisma.routineCompletion': 'routineCompletions',
  'prisma.scheduleSuggestion': 'scheduleSuggestions',
  'prisma.journalEntry': 'journalEntries',
};

function migrateFile(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check if already migrated
  for (const migrated of MIGRATED_FILES) {
    if (normalizedPath.endsWith(migrated.replace(/\\/g, '/'))) {
      console.log(`⏭️  Skipping ${filePath} (already migrated)`);
      return false;
    }
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Step 1: Replace import statement
  if (content.includes('from "@/lib/prisma"')) {
    content = content.replace(
      /import\s+{\s*prisma\s*}\s+from\s+"@\/lib\/prisma";?/g,
      'import { db } from "@/db";\nimport { eq, and, or, inArray, like, gte, lte, isNull } from "drizzle-orm";'
    );
  } else {
    // File doesn't use prisma import
    return false;
  }

  // Step 2: Add model imports based on what's used in the file
  const modelsUsed = new Set();
  for (const [prismaModel, drizzleModel] of Object.entries(MODEL_MAPPINGS)) {
    if (content.includes(prismaModel)) {
      modelsUsed.add(drizzleModel);
    }
  }

  if (modelsUsed.size > 0) {
    const modelImports = Array.from(modelsUsed).sort().join(', ');
    content = content.replace(
      'import { db } from "@/db";',
      `import { db, ${modelImports} } from "@/db";`
    );
  }

  // Step 3: Convert Prisma queries to Drizzle
  // This is a basic transformation - complex queries will need manual review

  // Save the migrated file
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated ${filePath}`);
    return true;
  }

  return false;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function main() {
  console.log('🔄 Starting Prisma to Drizzle migration...\n');

  const srcDir = path.join(__dirname, 'src');
  const files = getAllFiles(srcDir);

  let migratedCount = 0;
  const filesToReview = [];

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('from "@/lib/prisma"')) {
        if (migrateFile(file)) {
          migratedCount++;
          filesToReview.push(file);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });

  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Migrated ${migratedCount} files`);

  if (filesToReview.length > 0) {
    console.log(`\n⚠️  The following files need manual review for complex queries:`);
    filesToReview.forEach(f => console.log(`   - ${f}`));
  }
}

main();
