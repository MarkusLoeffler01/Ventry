import { Prisma, PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ModelMeta = {
  scalarFields: string[];
  dateFields: Set<string>;
};

const modelMeta = new Map<string, ModelMeta>(
  Prisma.dmmf.datamodel.models.map((model) => {
    const scalarFields = model.fields
      .filter((field) => field.kind === "scalar")
      .map((field) => field.name);
    const dateFields = new Set(
      model.fields
        .filter((field) => field.kind === "scalar" && field.type === "DateTime")
        .map((field) => field.name),
    );

    return [model.name, { scalarFields, dateFields }];
  }),
);

function toModelData<T extends Record<string, unknown>>(modelName: string, source: T | null | undefined) {
  if (!source) {
    return {} as Record<string, unknown>;
  }

  const meta = modelMeta.get(modelName);
  if (!meta) {
    throw new Error(`Unknown Prisma model metadata for: ${modelName}`);
  }

  const target: Record<string, unknown> = {};
  for (const field of meta.scalarFields) {
    if (!(field in source)) {
      continue;
    }

    const value = source[field];
    if (value === undefined) {
      continue;
    }

    if (meta.dateFields.has(field) && value !== null) {
      target[field] = value instanceof Date ? value : new Date(String(value));
      continue;
    }

    target[field] = value;
  }

  return target;
}

async function main() {
  const backupPath = process.argv[2] || path.join(process.cwd(), "backups", "json", "latest.json");

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`🚀 Restoring Ventry data from: ${backupPath}...`);
  const data = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  // 1. Clear existing data in reverse dependency order
  console.log("🧹 Cleaning up database...");
  await prisma.registrationHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.registrationItem.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.product.deleteMany();
  await prisma.location.deleteMany();
  await prisma.event.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.passkey.deleteMany();
  await prisma.twoFactor.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profilePicture.deleteMany();
  await prisma.user.deleteMany();

  // 2. Restore Users and Profiles
  console.log("👤 Restoring users and profiles...");
  for (const u of data.users) {
    await prisma.user.create({
      data: {
        ...toModelData("User", u),
        profilePictures: {
          create: (u.profilePictures || []).map((pp: Record<string, unknown>) => toModelData("ProfilePicture", pp))
        }
      }
    });

    if (u.adminProfile) {
      await prisma.admin.create({
        data: toModelData("Admin", u.adminProfile)
      });
    }

    // Auth models
    if (u.accounts) {
      for (const acc of u.accounts) {
        await prisma.account.create({
          data: toModelData("Account", acc)
        });
      }
    }
    
    if (u.passkeys) {
      for (const pk of u.passkeys) {
        await prisma.passkey.create({
          data: toModelData("Passkey", pk)
        });
      }
    }

    if (u.twofactors) {
      for (const tf of u.twofactors) {
        await prisma.twoFactor.create({
          data: toModelData("TwoFactor", tf)
        });
      }
    }
  }

  // 3. Restore Events
  console.log("📅 Restoring events...");
  for (const e of data.events) {
    await prisma.event.create({
      data: {
        ...toModelData("Event", e),
        location: e.location ? {
          create: toModelData("Location", e.location)
        } : undefined,
        products: {
          create: (e.products || []).map((p: Record<string, unknown>) => toModelData("Product", p))
        }
      }
    });
  }

  // 4. Restore Registrations and dependencies
  console.log("📝 Restoring registrations...");
  for (const r of data.registrations) {
    await prisma.registration.create({
      data: {
        ...toModelData("Registration", r),
        registrationItems: {
          create: (r.registrationItems || []).map((ri: Record<string, unknown>) => toModelData("RegistrationItem", ri))
        },
        waitlistEntries: {
          create: (r.waitlistEntries || []).map((we: Record<string, unknown>) => toModelData("WaitlistEntry", we))
        },
        payments: {
          create: (r.payments || []).map((p: Record<string, unknown>) => toModelData("Payment", p))
        },
        history: {
          create: (r.history || []).map((h: Record<string, unknown>) => toModelData("RegistrationHistory", h))
        }
      }
    });
  }

  console.log("✅ Data restoration complete!");
}

main()
  .catch((e) => {
    console.error("❌ Restore failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
