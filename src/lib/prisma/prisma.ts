import { PrismaClient, type Prisma } from "@/generated/prisma";
import crypto from "node:crypto";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient().$extends({
    model: {
        user: {
            create(original: Prisma.UserDelegate["create"]) {
                return (args: Prisma.UserCreateArgs) => {

                    const data = {
                        ...args.data,
                        sessionKey: args.data.sessionKey ?? crypto.randomUUID()
                    }
                    return original({ ...args, data });
                }
            }
        }
    }
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


export default prisma;