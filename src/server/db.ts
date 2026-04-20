import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";

function buildDbUrl(base: string) {
  // Always override pool settings to avoid P2024 under concurrent background tasks
  const url = new URL(base);
  url.searchParams.set("connection_limit", "25");
  url.searchParams.set("pool_timeout", "60");
  return url.toString();
}

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: buildDbUrl(env.DATABASE_URL),
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Reuse the singleton in all environments to avoid exhausting the connection pool
export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;
