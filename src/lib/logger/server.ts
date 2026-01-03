import "server-only";

import { db, logs } from "@/db";

import { LogEntry } from "./types";

const LOG_SOURCE = "ServerLogger";

export class ServerLogger {
  async writeLog(entry: LogEntry) {
    try {
      await db.insert(logs).values({
        id: crypto.randomUUID(),
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        source: entry.source || null,
        timestamp: entry.timestamp,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days retention
      }).returning();
    } catch (error) {
      console.error("Failed to write log to database:", error);
    }
  }
}
