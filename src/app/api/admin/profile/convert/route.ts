import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";

const convertSchema = z.object({
  organization: z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    description: z.string().max(500).optional(),
  }),
});

/**
 * Convert an individual admin to an organization admin.
 * Blocked when the admin is already a member of any organization.
 */
export async function POST(req: NextRequest) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: auth.adminId },
    select: {
      type: true,
      organizationMemberships: { select: { organizationId: true } },
    },
  });

  if (!admin) return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });
  if (admin.type === "ORGANIZATION") {
    return NextResponse.json({ error: "Already an organization admin" }, { status: 409 });
  }
  if (admin.organizationMemberships.length > 0) {
    return NextResponse.json(
      { error: "Cannot convert: already a member of an organization" },
      { status: 409 },
    );
  }

  let body: z.infer<typeof convertSchema>;
  try {
    body = convertSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", issues: err }, { status: 400 });
  }

  const slugTaken = await prisma.adminOrganization.findUnique({ where: { slug: body.organization.slug } });
  if (slugTaken) {
    return NextResponse.json({ error: "Organization slug already taken" }, { status: 409 });
  }

  const result = await prisma.$transaction(async tx => {
    const org = await tx.adminOrganization.create({
      data: {
        name: body.organization.name,
        slug: body.organization.slug,
        description: body.organization.description,
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
    return org;
  });

  return NextResponse.json({ organization: result }, { status: 201 });
}
