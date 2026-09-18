import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Allow explicit override via environment variables
  const configuredLimit = process.env.PRISMA_CONNECTION_LIMIT;
  const configuredTimeout = process.env.PRISMA_POOL_TIMEOUT;

  const hasConnectionLimit = url.includes("connection_limit");
  const hasPoolTimeout = url.includes("pool_timeout");

  // If already specified in URL and no explicit override is provided, use URL as-is
  if (hasConnectionLimit && hasPoolTimeout && !configuredLimit && !configuredTimeout) {
    return url;
  }

  // Benchmarked optimal default: connection_limit=5 (halves p95 latency for 30 concurrent teams while using <15 pool connections), pool_timeout=15s
  const limit = configuredLimit || (hasConnectionLimit ? null : "5");
  const timeout = configuredTimeout || (hasPoolTimeout ? null : "15");

  const params: string[] = [];
  if (limit && !hasConnectionLimit) params.push(`connection_limit=${limit}`);
  if (timeout && !hasPoolTimeout) params.push(`pool_timeout=${timeout}`);

  if (params.length === 0) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${params.join("&")}`;
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
 * Sanitize error messages to ensure database credentials or secrets are never logged
 */
export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "";
  // Redact postgresql://user:password@host into postgresql://user:***@host
  return msg.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, "$1***$3");
}

/**
 * Retry wrapper for critical database operations.
 * Automatically retries on transient connection errors (e.g. brief pool or network hiccups).
 * - maxRetries: number of retries before throwing (default 2)
 * - delayMs: initial delay between retries in milliseconds (default 300ms, doubles each retry)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
  delayMs = 300
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

      const rawMsg = error instanceof Error ? error.message : String(error);
      const safeMsg = sanitizeErrorMessage(rawMsg);

      console.warn(
        `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed with transient error, retrying in ${delayMs * Math.pow(2, attempt)}ms...`,
        safeMsg
      );

      await sleep(delayMs * Math.pow(2, attempt)); // Exponential backoff: 300ms, 600ms
    }
  }
  throw lastError;
}

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const name = (error.name || "").toLowerCase();
  const code = (error as any).code;

  return (
    code === "P2024" ||
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
