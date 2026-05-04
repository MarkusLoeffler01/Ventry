import { createPrismaClient } from "./client";

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as { prisma?: AppPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
