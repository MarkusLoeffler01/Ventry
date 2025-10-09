import { PrismaClient } from "@/generated/prisma";
import { ensureSessionKey } from "./middleware/sessionKey";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient().$extends({
    model: {
        user: {
            create(original: any) {
                return (args: any) => {
                    if (!args.data.sessionKey) {
                        args.data.sessionKey = crypto.randomUUID();
                    }
                    return original(args);
                }
            }
        }
    }
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;


export default prisma;