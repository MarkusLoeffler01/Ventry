import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
}).strict();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id } = await params;

  const org = await prisma.adminOrganization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          admin: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
        },
      },
      _count: { select: { events: true, invitations: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const isMember = org.members.some(m => m.adminId === auth.adminId);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ organization: org });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id } = await params;

  const org = await prisma.adminOrganization.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (org.ownerId !== auth.adminId) return NextResponse.json({ error: "Only the owner can update the organization" }, { status: 403 });

  let body: z.infer<typeof updateOrgSchema>;
  try {
    body = updateOrgSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", issues: err }, { status: 400 });
  }

  const updated = await prisma.adminOrganization.update({
    where: { id },
    data: body,
  });

  return NextResponse.json({ organization: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id } = await params;

  const org = await prisma.adminOrganization.findUnique({
    where: { id },
    select: { ownerId: true, _count: { select: { events: true } } },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (org.ownerId !== auth.adminId) return NextResponse.json({ error: "Only the owner can delete the organization" }, { status: 403 });
  if (org._count.events > 0) return NextResponse.json({ error: "Cannot delete organization with active events" }, { status: 409 });

  await prisma.adminOrganization.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
