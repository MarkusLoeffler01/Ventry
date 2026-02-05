import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prismaExportDir = process.env.PRISMA_EXPORT_DIR || path.join(__dirname, "exports");

const prisma = new PrismaClient();

async function main() {
  console.log("Restoring data from export...");

  const dataPath = path.join(prismaExportDir, "exported_data.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No export file found. Running standard seed.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // 1. Restore Users and create Admin profiles
  console.log("Restoring users and admin profiles...");
  for (const u of data.users) {
    const user = await prisma.user.create({
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
      }
    });

    if (u.isAdmin) {
      await prisma.admin.create({
        data: {
          userId: user.id,
          stripeConnectId: u.stripeConnectId,
        }
      });
    }

    // Restore Accounts
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

  // 2. Restore Events
  console.log("Restoring events...");
  for (const e of data.events) {
    // Map the ownerId from User to Admin
    let adminProfileId = null;
    if (e.ownerId) {
      const adminProfile = await prisma.admin.findUnique({
        where: { userId: e.ownerId }
      });
      adminProfileId = adminProfile?.id;
    }

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
        ownerId: adminProfileId,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        location: e.location ? {
          create: {
            name: e.location.name,
            address: e.location.address,
            city: e.location.city,
            state: e.location.state,
            country: e.location.country,
            postalCode: e.location.postalCode,
          }
        } : undefined,
        products: {
          create: e.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
          }))
        }
      }
    });
  }

  // 3. Restore Registrations and Payments
  console.log("Restoring registrations...");
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
        }
      }
    });
  }

  console.log("Data restoration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });