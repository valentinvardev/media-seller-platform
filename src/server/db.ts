import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";

function buildDbUrl(base: string) {
  // Strip existing pool params then append new values
  let url = base
    .replace(/[&?]connection_limit=[^&]*/g, "")
    .replace(/[&?]pool_timeout=[^&]*/g, "");
  // Fix leftover ?& after removal
  url = url.replace(/\?&/, "?").replace(/[?&]$/, "");
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=25&pool_timeout=60`;
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
