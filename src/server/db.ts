import { env } from "~/env";
import { PrismaClient } from "../../generated/prisma";

function buildDbUrl(base: string) {
  // Strip existing pool params then append new values
  let url = base
    .replace(/[&?]connection_limit=[^&]*/g, "")
    .replace(/[&?]pool_timeout=[^&]*/g, "")
    .replace(/[&?]connect_timeout=[^&]*/g, "");
  // Fix leftover ?& after removal
  url = url.replace(/\?&/, "?").replace(/[?&]$/, "");
  const sep = url.includes("?") ? "&" : "?";
  // pool_timeout=10: fail fast when pool is saturated instead of stacking 60s waits
  // connect_timeout=15: don't wait forever to establish a connection
  // connection_limit=15: lower than before — Supabase pooler free tier only allows ~60 total
  return `${url}${sep}connection_limit=15&pool_timeout=10&connect_timeout=15`;
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
