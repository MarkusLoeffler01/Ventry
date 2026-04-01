import { Prisma, PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type ModelMeta = {
  scalarFields: string[];
  dateFields: Set<string>;
};

type RestoreCreateFn = (args: { data: Record<string, unknown> }) => Promise<unknown>;

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

async function createWithColumnFallback(
  modelLabel: string,
  createFn: RestoreCreateFn,
  data: Record<string, unknown>,
) {
  const mutableData = { ...data };

  while (true) {
    try {
      return await createFn({ data: mutableData });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
        const rawColumn = String(error.meta?.column || "");
        const column = rawColumn.includes(".") ? rawColumn.split(".").at(-1) || "" : rawColumn;

        if (!column || !(column in mutableData)) {
          throw error;
        }

        console.warn(`⚠️ ${modelLabel}: skipping missing database column \"${column}\" during restore.`);
        delete mutableData[column];
        continue;
      }

      throw error;
    }
  }
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
    await createWithColumnFallback("User", prisma.user.create.bind(prisma.user) as unknown as RestoreCreateFn, toModelData("User", u));

    for (const pp of u.profilePictures || []) {
      await createWithColumnFallback(
        "ProfilePicture",
        prisma.profilePicture.create.bind(prisma.profilePicture) as unknown as RestoreCreateFn,
        toModelData("ProfilePicture", pp),
      );
    }

    if (u.adminProfile) {
      await createWithColumnFallback("Admin", prisma.admin.create.bind(prisma.admin) as unknown as RestoreCreateFn, toModelData("Admin", u.adminProfile));
    }

    // Auth models
    if (u.accounts) {
      for (const acc of u.accounts) {
        await createWithColumnFallback("Account", prisma.account.create.bind(prisma.account) as unknown as RestoreCreateFn, toModelData("Account", acc));
      }
    }
    
    if (u.passkeys) {
      for (const pk of u.passkeys) {
        await createWithColumnFallback("Passkey", prisma.passkey.create.bind(prisma.passkey) as unknown as RestoreCreateFn, toModelData("Passkey", pk));
      }
    }

    if (u.twofactors) {
      for (const tf of u.twofactors) {
        await createWithColumnFallback("TwoFactor", prisma.twoFactor.create.bind(prisma.twoFactor) as unknown as RestoreCreateFn, toModelData("TwoFactor", tf));
      }
    }
  }

  // 3. Restore Events
  console.log("📅 Restoring events...");
  for (const e of data.events) {
    await createWithColumnFallback("Event", prisma.event.create.bind(prisma.event) as unknown as RestoreCreateFn, toModelData("Event", e));

    if (e.location) {
      await createWithColumnFallback("Location", prisma.location.create.bind(prisma.location) as unknown as RestoreCreateFn, toModelData("Location", e.location));
    }

    for (const p of e.products || []) {
      await createWithColumnFallback("Product", prisma.product.create.bind(prisma.product) as unknown as RestoreCreateFn, toModelData("Product", p));
    }
  }

  // 4. Restore Registrations and dependencies
  console.log("📝 Restoring registrations...");
  for (const r of data.registrations) {
    await createWithColumnFallback("Registration", prisma.registration.create.bind(prisma.registration) as unknown as RestoreCreateFn, toModelData("Registration", r));

    for (const ri of r.registrationItems || []) {
      await createWithColumnFallback(
        "RegistrationItem",
        prisma.registrationItem.create.bind(prisma.registrationItem) as unknown as RestoreCreateFn,
        toModelData("RegistrationItem", ri),
      );
    }

    for (const we of r.waitlistEntries || []) {
      await createWithColumnFallback(
        "WaitlistEntry",
        prisma.waitlistEntry.create.bind(prisma.waitlistEntry) as unknown as RestoreCreateFn,
        toModelData("WaitlistEntry", we),
      );
    }

    for (const p of r.payments || []) {
      await createWithColumnFallback("Payment", prisma.payment.create.bind(prisma.payment) as unknown as RestoreCreateFn, toModelData("Payment", p));
    }

    for (const h of r.history || []) {
      await createWithColumnFallback(
        "RegistrationHistory",
        prisma.registrationHistory.create.bind(prisma.registrationHistory) as unknown as RestoreCreateFn,
        toModelData("RegistrationHistory", h),
      );
    }
  }

  console.log("✅ Data restoration complete!");
}

main()
  .catch((e) => {
    console.log("❌ An error occurred during restoration:", e);
    console.error("❌ Restore failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
