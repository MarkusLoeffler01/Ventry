import "dotenv/config";
import { createPrismaClient } from "./src/lib/prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaExportDir = process.env.PRISMA_EXPORT_DIR || path.join(__dirname, "exports");

const prisma = createPrismaClient();

async function main() {
  console.log("Exporting data...");

  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      passkeys: true,
      twofactors: true,
    }
  });
  
  const events = await prisma.event.findMany({
    include: {
      location: true,
      products: true,
    }
  });

  const registrations = await prisma.registration.findMany({
    include: {
      payments: true,
    }
  });

  const data = {
    users,
    events,
    registrations,
  };

  const outputPath = path.join(prismaExportDir, "exported_data.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Data exported to ${outputPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
