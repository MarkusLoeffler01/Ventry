import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { headers } from "next/headers";
import { AdminType } from "@/generated/prisma";

const individualSchema = z.object({
  type: z.literal("INDIVIDUAL"),
});

const organizationSchema = z.object({
  type: z.literal("ORGANIZATION"),
  organization: z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    description: z.string().max(500).optional(),
  }),
});

const registerAdminSchema = z.discriminatedUnion("type", [individualSchema, organizationSchema]);

export async function POST(req: NextRequest) {
  const session = await getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true, adminProfile: { select: { id: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.isAdmin || user.adminProfile) {
    return NextResponse.json({ error: "Already registered as admin" }, { status: 409 });
  }

  let body: z.infer<typeof registerAdminSchema>;
  try {
    body = registerAdminSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", issues: err }, { status: 400 });
  }

  if (body.type === "INDIVIDUAL") {
    const admin = await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: user.id }, data: { isAdmin: true } });
      return tx.admin.create({ data: { userId: user.id, type: AdminType.INDIVIDUAL } });
    });
    return NextResponse.json({ adminId: admin.id, type: "INDIVIDUAL" }, { status: 201 });
  }

  // ORGANIZATION type: create admin profile + organization atomically
  const { organization } = body;

  const slugTaken = await prisma.adminOrganization.findUnique({ where: { slug: organization.slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Organization slug already taken" }, { status: 409 });
  }

  const result = await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { isAdmin: true } });
    const admin = await tx.admin.create({ data: { userId: user.id, type: AdminType.ORGANIZATION } });
    const org = await tx.adminOrganization.create({
      data: {
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        ownerId: admin.id,
        members: {
          create: {
            adminId: admin.id,
            permissions: [],
          },
        },
      },
    });
    return { admin, org };
  });

  return NextResponse.json(
    { adminId: result.admin.id, type: "ORGANIZATION", organizationId: result.org.id },
    { status: 201 },
  );
}
