import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
  });

export function createPrismaClient(): PrismaClient {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) throw new Error("DATABASE_URL is not set");
  
  return new PrismaClient({ accelerateUrl })
    .$extends(withAccelerate({ fetch: accelerateFetch })) as unknown as PrismaClient;
}
