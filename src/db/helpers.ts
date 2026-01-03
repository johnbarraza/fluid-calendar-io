/**
 * Drizzle Query Helpers
 * Common patterns and utilities for Drizzle queries
 */

import { eq, and, or, inArray, like, gte, lte, SQL } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "./index";

/**
 * Helper to create userId filter condition
 * Usage: where(withUserId(userId, tasks))
 */
export const withUserId = <T extends PgTable>(
  userId: string,
  table: T
): SQL => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return eq((table as any).userId, userId);
};

/**
 * Helper to verify ownership of a record
 * Throws error if record not found or doesn't belong to user
 */
export async function verifyOwnership<T extends PgTable>(
  table: T,
  tableName: string,
  id: string,
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (db.query as any)[tableName].findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: and(eq((table as any).id, id), eq((table as any).userId, userId)),
  });

  if (!record) {
    throw new Error("Not found or access denied");
  }

  return record;
}

/**
 * Transaction helper (alias for db.transaction)
 */
export const transaction = db.transaction.bind(db);

/**
 * Common relation includes for queries
 */
export const relations = {
  taskWithTags: { tags: true },
  taskWithProject: { project: true },
  taskWithAll: { tags: true, project: true },
  projectWithTasks: { tasks: true },
  tagWithTasks: { tasks: true },
};
