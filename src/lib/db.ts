import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // If connection_limit is already explicitly defined, return as is
  if (url.includes("connection_limit")) return url;
  const separator = url.includes("?") ? "&" : "?";
  // Enforce 1 connection per serverless/node worker and a 20s pool timeout
  return `${url}${separator}connection_limit=1&pool_timeout=20`;
}

const dbUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always cache client on globalThis so serverless containers & hot reloads reuse the active connection
globalThis.prismaGlobal = prisma;

/**
 * Retry wrapper for critical database operations.
 * Automatically retries on transient connection errors (e.g. brief database hiccups).
 * - maxRetries: number of retries before throwing (default 3)
 * - delayMs: delay between retries in milliseconds (default 400ms, doubles each retry)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 400
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

      await sleep(delayMs * Math.pow(2, attempt)); // Exponential backoff: 400ms, 800ms, 1600ms
    }
  }
  throw lastError;
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const name = (error.name || "").toLowerCase();
  return (
    name.includes("initializationerror") ||
    msg.includes("can't reach database server") ||
    msg.includes("cant reach database server") ||
    msg.includes("database is locked") ||
    msg.includes("connection refused") ||
    msg.includes("connection reset") ||
    msg.includes("connection closed") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("timed out") ||
    msg.includes("pool timeout") ||
    msg.includes("connection pool") ||
    msg.includes("busy") ||
    msg.includes("too many connections") ||
    msg.includes("prepared statement") ||
    msg.includes("deadlock") ||
    msg.includes("server has closed the connection") ||
    msg.includes("terminating connection")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default prisma;

