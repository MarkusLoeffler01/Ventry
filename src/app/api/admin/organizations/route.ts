import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const orgs = await prisma.adminOrganization.findMany({
    where: {
      members: { some: { adminId: auth.adminId } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      ownerId: true,
      createdAt: true,
      _count: { select: { members: true, events: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ organizations: orgs });
}

export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: z.infer<typeof createOrgSchema>;
  try {
    body = createOrgSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", issues: err }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: auth.adminId },
    select: {
      type: true,
      organizationMemberships: { select: { organizationId: true } },
    },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
  }

  // Individual admins may only create an org if they have no existing org memberships
  if (admin.organizationMemberships.length > 0) {
    return NextResponse.json(
      { error: "Cannot create organization: already a member of an organization" },
      { status: 409 },
    );
  }

  const slugTaken = await prisma.adminOrganization.findUnique({ where: { slug: body.slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Organization slug already taken" }, { status: 409 });
  }

  const org = await prisma.$transaction(async tx => {
    const created = await tx.adminOrganization.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        ownerId: auth.adminId!,
        members: {
          create: { adminId: auth.adminId!, permissions: [] },
        },
      },
    });
    await tx.admin.update({
      where: { id: auth.adminId! },
      data: { type: "ORGANIZATION" },
    });
    return created;
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}
