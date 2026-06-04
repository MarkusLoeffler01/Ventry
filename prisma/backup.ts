import "dotenv/config";
import { createPrismaClient } from "../src/lib/prisma/client";
import fs from "fs";
import path from "path";

const prisma = createPrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", "json");
  const outputPath = path.join(backupDir, `backup-${timestamp}.json`);

  console.log("🚀 Starting Prisma Model Backup...");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Fetch Users with all authentication and profile data
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      sessions: true,
      passkeys: true,
      twofactors: true,
      adminProfile: true,
      profilePictures: true,
    }
  });

  // 2. Fetch Events with locations, products, and schedule
  const events = await prisma.event.findMany({
    include: {
      location: true,
      products: true,
    }
  });

  // 3. Fetch Registrations with items, payments, and history
  const registrations = await prisma.registration.findMany({
    include: {
      payments: true,
      registrationItems: true,
      waitlistEntries: true,
      history: true,
    }
  });

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      project: "Ventry"
    },
    users,
    events,
    registrations
  };

  fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2));

  // Also update a "latest.json" symlink or copy for easy restore
  const latestPath = path.join(backupDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));

  console.log(`✅ Backup complete! Saved to: ${outputPath}`);
  console.log(`💡 Tip: Use 'npx tsx prisma/restore.ts' to restore this data.`);
}

main()
  .catch((e) => {
    console.error("❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });