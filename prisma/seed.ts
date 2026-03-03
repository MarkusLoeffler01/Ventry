import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/bcrypt";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(process.cwd(), "backups", "json", "latest.json");
  
  if (fs.existsSync(dataPath)) {
    console.log("🚀 Found latest JSON backup. Restoring from backup instead of default seed...");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    // 1. Restore Users
    console.log("👤 Restoring users...");
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
    }

    // 2. Restore Events
    console.log("📅 Restoring events...");
    for (const e of data.events) {
      await prisma.event.create({
        data: {
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
          publishAt: e.publishAt ? new Date(e.publishAt) : null,
          registrationOpensAt: e.registrationOpensAt ? new Date(e.registrationOpensAt) : null,
          paymentDeadline: e.paymentDeadline ? new Date(e.paymentDeadline) : null,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
          location: e.location ? { create: { ...e.location } } : undefined,
          products: {
            create: e.products.map((p: any) => ({
              ...p,
              createdAt: undefined, // Let DB handle if present
              updatedAt: undefined
            }))
          }
        }
      });
    }

    // 3. Restore Registrations
    console.log("📝 Restoring registrations...");
    for (const r of data.registrations) {
      await prisma.registration.create({
        data: {
          ...r,
          expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          payments: {
            create: r.payments.map((p: any) => ({
              ...p,
              createdAt: new Date(p.createdAt),
              updatedAt: new Date(p.updatedAt)
            }))
          }
        }
      });
    }
    console.log("✅ Data restoration complete!");

  } else {
    console.log("🌱 No backup found. Seeding initial development data...");
    
    // Create Default Admin
    /**
    const admin = await prisma.user.create({
      data: {
        email: "admin@ventry.dev",
        name: "Ventry Admin",
        isAdmin: true,
        emailVerified: true,
        adminProfile: {
          create: {}
        }
      }
    });


    console.log(`Created admin: ${admin.email}`);
    */
    const types = ["ADMIN", "PRIMARY", "SECONDARY"];
    for (const type of types) {
      const email = process.env[`DEV_USER_${type}_EMAIL`];
      const password = process.env[`DEV_USER_${type}_PASSWORD`];
      if (!email || !password) {
        console.warn(`⚠️ Missing environment variables for ${type} user. Skipping creation.`);
        continue;
      }

      await prisma.user.create({
        data: {
          email,
          name: `Dev ${type} User`,
          isAdmin: type === "ADMIN",
          emailVerified: true,
          accounts: {
            create: {
              providerId: "credential",
              password: await hashPassword(password),
            }
          }, 
          adminProfile: type === "ADMIN" ? { create: {} } : undefined
        }
      });

      console.log(`Created ${type} user: ${email}`);
    }

    const randomAdmin = await prisma.admin.findFirst();
    if (!randomAdmin) {
      console.warn("⚠️ No admin found after seeding users! Events will have no owner.");
    } else {
      console.log(`Found admin: ${randomAdmin.id}`);
    }
    const randomAdminId = randomAdmin?.id;

    // Create Sample Event
    const meetup = await prisma.event.create({
      data: {
        name: "Ventry Launch Meetup",
        description: "Join us for the official launch of the Ventry Event Management platform!",
        startDate: new Date("2026-04-15T09:00:00Z"),
        endDate: new Date("2026-04-15T17:00:00Z"),
        status: "DRAFT",
        ownerId: randomAdminId,
        location: {
          create: {
            name: "Ventry HQ",
            address: "Königstrasse 1",
            city: "Stuttgart",
            state: "Baden-Wuerttemberg",
            country: "Germany",
            postalCode: "70173",
          },
        },
        products: {
          create: [
            {
              name: "Standard Ticket",
              price: 49,
              description: "Full access to all sessions",
              type: "TICKET"
            }
          ]
        }
      },
    });


    // Create a published event with registration open
    const publishedEvent = await prisma.event.create({
      data: {
        name: "Ventry Open Conference",
        description: "An open conference showcasing the capabilities of Ventry.",
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 1 week + 1 day from now
        status: "PUBLISHED",
        registrationOpensAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Opened 2 days ago
        ownerId: randomAdminId,
        imageUrl: `${process.env.SUPABASE_BANNERS_BUCKET_URL}/events/TestEvent/banner0.jpg`,
        location: {
          create: {
            name: "Ventry Convention Center",
            address: "Messepiazza 1",
            city: "Stuttgart",
            state: "Baden-Wuerttemberg",
            country: "Germany",
            postalCode: "70629",
          },
        },
        products: {
          create: [
            {
              name: "Early Bird Ticket",
              price: 29,
              description: "Discounted ticket for early registrants",
              type: "TICKET"
            },
            {
              name: "Regular Ticket",
              price: 59,
              description: "Full access to all sessions",
              type: "TICKET"
            }
          ]
        }
      },
    });

    console.log(`Created event: ${meetup.name}`);
    console.log("Seeding completed!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
