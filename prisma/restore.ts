import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

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
        id: u.id,
        name: u.name,
        email: u.email,
        bio: u.bio,
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth) : null,
        pronouns: u.pronouns,
        showAge: u.showAge,
        isAdmin: u.isAdmin,
        emailVerified: u.emailVerified,
        image: u.image,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
        profilePictures: {
          create: u.profilePictures?.map((pp: any) => {
            const { userID, ...restPP } = pp;
            return {
              ...restPP,
              createdAt: new Date(pp.createdAt),
              updatedAt: new Date(pp.updatedAt),
              cachedUntil: pp.cachedUntil ? new Date(pp.cachedUntil) : null
            };
          })
        }
      }
    });

    if (u.adminProfile) {
      await prisma.admin.create({
        data: {
          ...u.adminProfile,
          createdAt: new Date(u.adminProfile.createdAt),
          updatedAt: new Date(u.adminProfile.updatedAt),
        }
      });
    }

    // Auth models
    if (u.accounts) {
      for (const acc of u.accounts) {
        await prisma.account.create({
          data: {
            ...acc,
            accessTokenExpiresAt: acc.accessTokenExpiresAt ? new Date(acc.accessTokenExpiresAt) : null,
            refreshTokenExpiresAt: acc.refreshTokenExpiresAt ? new Date(acc.refreshTokenExpiresAt) : null,
            createdAt: new Date(acc.createdAt),
            updatedAt: new Date(acc.updatedAt),
          }
        });
      }
    }
    
    if (u.passkeys) {
      for (const pk of u.passkeys) {
        await prisma.passkey.create({
          data: { ...pk, createdAt: new Date(pk.createdAt) }
        });
      }
    }

    if (u.twofactors) {
      for (const tf of u.twofactors) {
        await prisma.twoFactor.create({
          data: { ...tf }
        });
      }
    }
  }

  // 3. Restore Events
  console.log("📅 Restoring events...");
  for (const e of data.events) {
    await prisma.event.create({
      data: {
        id: e.id,
        name: e.name,
        description: e.description,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
        imageUrl: e.imageUrl,
        status: e.status,
        publishAt: e.publishAt ? new Date(e.publishAt) : null,
        registrationOpensAt: e.registrationOpensAt ? new Date(e.registrationOpensAt) : null,
        maxRegistrations: e.maxRegistrations,
        paymentDeadline: e.paymentDeadline ? new Date(e.paymentDeadline) : null,
        stayPolicy: e.stayPolicy,
        customFields: e.customFields,
        ownerId: e.ownerId,
        schedule: e.schedule,
        requiresHotel: e.requiresHotel,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        location: e.location ? {
          create: { ...e.location }
        } : undefined,
        products: {
          create: e.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            type: p.type,
            capacity: p.capacity,
            soldCount: p.soldCount,
            allowWaitlist: p.allowWaitlist
          }))
        }
      }
    });
  }

  // 4. Restore Registrations and dependencies
  console.log("📝 Restoring registrations...");
  for (const r of data.registrations) {
    await prisma.registration.create({
      data: {
        id: r.id,
        ticketId: r.ticketId,
        userId: r.userId,
        eventId: r.eventId,
        status: r.status,
        preferences: r.preferences,
        customFieldData: r.customFieldData,
        expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
        notes: r.notes,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
        registrationItems: {
          create: r.registrationItems.map((ri: any) => ({
            ...ri,
            createdAt: new Date(ri.createdAt),
            updatedAt: new Date(ri.updatedAt)
          }))
        },
        waitlistEntries: {
          create: r.waitlistEntries.map((we: any) => ({
            ...we,
            createdAt: new Date(we.createdAt),
            updatedAt: new Date(we.updatedAt)
          }))
        },
        payments: {
          create: r.payments.map((p: any) => ({
            id: p.id,
            userId: p.userId,
            amount: p.amount,
            currency: p.currency,
            paymentStatus: p.paymentStatus,
            paymentProvider: p.paymentProvider,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }))
        },
        history: {
          create: r.history.map((h: any) => ({
            ...h,
            createdAt: new Date(h.createdAt)
          }))
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
