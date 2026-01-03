import { db, calendarFeeds, tasks, projects, tags, connectedAccounts, autoScheduleSettings } from "@/db";
import { eq, and, or, inArray, like, gte, lte, isNull, desc, asc, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";


const LOG_SOURCE = "SetupMigration";

/**
 * Migrates existing data to be associated with the admin user
 * This is used during the first-time setup process
 * @param adminUserId The ID of the admin user to associate data with
 */
export async function migrateExistingData(adminUserId: string) {
  logger.info(
    "Starting migration of existing data to admin user",
    { adminUserId },
    LOG_SOURCE
  );

  try {
    // Migrate CalendarFeeds - this table has a userId field
    const feedsToMigrate = await db.query.calendarFeeds.findMany({
      where: (feeds, { isNull }) => isNull(feeds.userId),
    });

    logger.info(
      "Found calendar feeds to migrate",
      { count: feedsToMigrate.length },
      LOG_SOURCE
    );

    if (feedsToMigrate.length > 0) {
      await db.update(calendarFeeds)
        .set({ userId: adminUserId })
        .where(isNull(calendarFeeds.userId));

      logger.info(
        "Migrated calendar feeds",
        { count: feedsToMigrate.length },
        LOG_SOURCE
      );
    }

    // Migrate ConnectedAccounts - now has a userId field
    const accountsToMigrate = await db.query.connectedAccounts.findMany({
      where: (accounts, { isNull }) => isNull(accounts.userId),
    });

    logger.info(
      "Found connected accounts to migrate",
      { count: accountsToMigrate.length },
      LOG_SOURCE
    );

    if (accountsToMigrate.length > 0) {
      await db.update(connectedAccounts)
        .set({ userId: adminUserId })
        .where(isNull(connectedAccounts.userId));

      logger.info(
        "Migrated connected accounts",
        { count: accountsToMigrate.length },
        LOG_SOURCE
      );
    }

    // Migrate Tags - now has a userId field
    const tagsToMigrate = await db.query.tags.findMany({
      where: (tags, { isNull }) => isNull(tags.userId),
    });

    logger.info("Found tags to migrate", { count: tagsToMigrate.length }, LOG_SOURCE);

    if (tagsToMigrate.length > 0) {
      await db.update(tags)
        .set({ userId: adminUserId })
        .where(isNull(tags.userId));

      logger.info("Migrated tags", { count: tagsToMigrate.length }, LOG_SOURCE);
    }

    // Migrate Tasks - now has a userId field
    const tasksToMigrate = await db.query.tasks.findMany({
      where: (tasks, { isNull }) => isNull(tasks.userId),
    });

    logger.info("Found tasks to migrate", { count: tasksToMigrate.length }, LOG_SOURCE);

    if (tasksToMigrate.length > 0) {
      await db.update(tasks)
        .set({ userId: adminUserId })
        .where(isNull(tasks.userId));

      logger.info("Migrated tasks", { count: tasksToMigrate.length }, LOG_SOURCE);
    }

    // Migrate Projects - now has a userId field
    const projectsToMigrate = await db.query.projects.findMany({
      where: (projects, { isNull }) => isNull(projects.userId),
    });

    logger.info(
      "Found projects to migrate",
      { count: projectsToMigrate.length },
      LOG_SOURCE
    );

    if (projectsToMigrate.length > 0) {
      await db.update(projects)
        .set({ userId: adminUserId })
        .where(isNull(projects.userId));

      logger.info(
        "Migrated projects",
        { count: projectsToMigrate.length },
        LOG_SOURCE
      );
    }

    // Create AutoScheduleSettings for the admin user if they don't exist
    const existingAutoScheduleSettings =
      await db.query.autoScheduleSettings.findFirst({
        where: (table, { eq }) => eq(table.userId, adminUserId),
      });

    if (!existingAutoScheduleSettings) {
      await db.insert(autoScheduleSettings).values({
        id: crypto.randomUUID(),
        userId: adminUserId,
        workDays: "[1,2,3,4,5]", // Monday to Friday
        workHourStart: 9,
        workHourEnd: 17,
        bufferMinutes: 15,
      }).returning();
      logger.info(
        "Created auto schedule settings for admin user",
        {},
        LOG_SOURCE
      );
    }

    logger.info(
      "Migration of existing data completed successfully",
      {},
      LOG_SOURCE
    );
    return { success: true };
  } catch (error) {
    logger.error(
      "Failed to migrate existing data",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    throw error;
  }
}
