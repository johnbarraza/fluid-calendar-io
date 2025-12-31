/**
 * Script to clean duplicate habits for a user
 *
 * Usage:
 *   npx ts-node scripts/clean-duplicate-habits.ts
 *
 * This will keep only the most recent habit of each unique name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateHabits() {
  try {
    console.log('🧹 Cleaning duplicate habits...\n');

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    for (const user of users) {
      console.log(`\n📋 Checking habits for user: ${user.email}`);

      // Get all habits for this user grouped by name
      const habits = await prisma.habit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }, // Most recent first
      });

      // Group habits by name
      const habitsByName = new Map<string, typeof habits>();
      habits.forEach((habit) => {
        const existing = habitsByName.get(habit.name) || [];
        existing.push(habit);
        habitsByName.set(habit.name, existing);
      });

      // Find duplicates
      let totalDeleted = 0;
      for (const [name, habitGroup] of habitsByName) {
        if (habitGroup.length > 1) {
          console.log(`  Found ${habitGroup.length} habits named "${name}"`);

          // Keep the first one (most recent), delete the rest
          const [keepHabit, ...deleteHabits] = habitGroup;
          console.log(`  ✅ Keeping: ${keepHabit.id} (created: ${keepHabit.createdAt})`);

          for (const habit of deleteHabits) {
            console.log(`  ❌ Deleting: ${habit.id} (created: ${habit.createdAt})`);

            // Delete associated logs first
            await prisma.habitLog.deleteMany({
              where: { habitId: habit.id },
            });

            // Delete the habit
            await prisma.habit.delete({
              where: { id: habit.id },
            });

            totalDeleted++;
          }
        }
      }

      if (totalDeleted > 0) {
        console.log(`\n  🗑️  Deleted ${totalDeleted} duplicate habit(s) for ${user.email}`);
      } else {
        console.log(`  ✨ No duplicates found for ${user.email}`);
      }
    }

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning duplicate habits:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateHabits()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
