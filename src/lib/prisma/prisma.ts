import { createPrismaClient } from "./client";

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as {
  prisma?: AppPrismaClient;
  prismaDatabaseUrl?: string;
};

const databaseUrl = process.env.DATABASE_URL;
const shouldReuseClient = globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl === databaseUrl;

export const prisma = shouldReuseClient ? globalForPrisma.prisma! : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = databaseUrl;
}

export default prisma;
