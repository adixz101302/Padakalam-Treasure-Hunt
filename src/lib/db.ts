import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

/**
 * Retry wrapper for critical database operations.
 * Automatically retries on transient connection errors (e.g. brief database hiccups).
 * - maxRetries: number of retries before throwing (default 3)
 * - delayMs: delay between retries in milliseconds (default 500ms, doubles each retry)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const isTransient = isTransientError(error);

      if (!isTransient || attempt === maxRetries) {
        throw error;
      }

      console.warn(
        `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed with transient error, retrying in ${delayMs}ms...`,
        error instanceof Error ? error.message : error
      );

      await sleep(delayMs * Math.pow(2, attempt)); // Exponential backoff: 500ms, 1000ms, 2000ms
    }
  }
  throw lastError;
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("database is locked") ||
    msg.includes("connection refused") ||
    msg.includes("connection reset") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("timed out") ||
    msg.includes("busy") ||
    msg.includes("too many connections") ||
    msg.includes("prepared statement") ||
    msg.includes("deadlock")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default prisma;
