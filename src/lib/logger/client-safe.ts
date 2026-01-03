/**
 * Client-safe logger export
 * This file can be safely imported by client components
 */

import { ClientLogger } from "./client";
import { LogLevel, LogMetadata, LogStorageConfig } from "./types";

class ClientSafeLogger {
  private static instance: ClientSafeLogger;
  private clientLogger: ClientLogger;

  private constructor(config?: Partial<LogStorageConfig>) {
    this.clientLogger = new ClientLogger(config);
  }

  public static getInstance(config?: Partial<LogStorageConfig>): ClientSafeLogger {
    if (!ClientSafeLogger.instance) {
      ClientSafeLogger.instance = new ClientSafeLogger(config);
    }
    return ClientSafeLogger.instance;
  }

  async log(message: string, metadata?: LogMetadata, source?: string) {
    this.debug(message, metadata, source);
  }

  async debug(message: string, metadata?: LogMetadata, source?: string) {
    await this.clientLogger.debug(message, metadata, source);
  }

  async info(message: string, metadata?: LogMetadata, source?: string) {
    await this.clientLogger.info(message, metadata, source);
  }

  async warn(message: string, metadata?: LogMetadata, source?: string) {
    await this.clientLogger.warn(message, metadata, source);
  }

  async error(message: string, metadata?: LogMetadata, source?: string) {
    await this.clientLogger.error(message, metadata, source);
  }
}

// Export a singleton instance for client use
export const logger = ClientSafeLogger.getInstance();
