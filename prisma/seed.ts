import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create a test admin user if it doesn't exist
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Super Admin",
      isAdmin: true,
      emailVerified: true,
    },
  });

  console.log(`Admin user: ${admin.email}`);

  // 2. Create a Convention Event
  const convention = await prisma.event.create({
    data: {
      name: "Mega Furry Con 2026",
      description: "A large convention for enthusiasts of anthropomorphic art and culture.",
      startDate: new Date("2026-06-01T10:00:00Z"),
      endDate: new Date("2026-06-04T18:00:00Z"),
      status: "PUBLISHED",
      ownerId: admin.id,
      stayPolicy: {
        main: {
          checkIn: "2026-06-01",
          checkOut: "2026-06-04",
        },
        earlyArrival: {
          enabled: true,
          from: "2026-05-31",
          feePerNight: 50,
        },
        lateDeparture: {
          enabled: true,
          until: "2026-06-05",
          feePerNight: 50,
        },
      },
      location: {
        create: {
          name: "Grand Hotel & Convention Center",
          address: "123 Event Ave",
          city: "Berlin",
          state: "Berlin",
          country: "Germany",
          postalCode: "10115",
        },
      },
      products: {
        create: [
          { name: "Standard Badge", description: "Full access to the convention", price: 60 },
          { name: "Sponsor Badge", description: "Standard badge + exclusive t-shirt and goodie bag", price: 120 },
          { name: "Super Sponsor Badge", description: "Sponsor badge + dinner with guests of honor", price: 250 },
        ],
      },
    },
  });

  console.log(`Created event: ${convention.name}`);

  // 3. Create a simple Meetup Event
  const meetup = await prisma.event.create({
    data: {
      name: "Spring Park Walk",
      description: "A casual walk through the park. Everyone is welcome!",
      startDate: new Date("2026-04-15T14:00:00Z"),
      endDate: new Date("2026-04-15T17:00:00Z"),
      status: "DRAFT",
      ownerId: admin.id,
      location: {
        create: {
          name: "Tiergarten",
          address: "Str. des 17. Juni",
          city: "Berlin",
          state: "Berlin",
          country: "Germany",
          postalCode: "10785",
        },
      },
    },
  });

  console.log(`Created event: ${meetup.name} (Draft)`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
