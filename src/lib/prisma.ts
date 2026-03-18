/**
 * Prisma singleton for Next.js.
 *
 * In development, Next.js hot-reload creates new module instances on every
 * code change. Without this singleton the process accumulates open PrismaClient
 * instances and quickly exhausts the PostgreSQL connection pool.
 *
 * In production each long-lived Node process has exactly one instance.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// eslint-disable-next-line no-restricted-syntax -- This is the singleton pattern itself; instantiation is required here
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
