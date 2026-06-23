import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
  });

export function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  if (isAccelerateUrl(databaseUrl)) {
    return new PrismaClient({ accelerateUrl: databaseUrl })
      .$extends(withAccelerate({ fetch: accelerateFetch })) as unknown as PrismaClient;
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

function isAccelerateUrl(databaseUrl: string): boolean {
  return databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://");
}
