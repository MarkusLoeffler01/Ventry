import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { AdminOrgPermission, AdminInvitationStatus } from "@/generated/prisma";

const createInvitationSchema = z.object({
  email: z.string().email(),
  permissions: z.array(z.nativeEnum(AdminOrgPermission)).default([]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id: orgId } = await params;

  const org = await prisma.adminOrganization.findUnique({
    where: { id: orgId },
    select: { ownerId: true, members: { select: { adminId: true } } },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const isMember = org.members.some(m => m.adminId === auth.adminId);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invitations = await prisma.adminInvitation.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      invitedEmail: true,
      permissions: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      invitedByAdmin: { select: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invitations });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id: orgId } = await params;

  const org = await prisma.adminOrganization.findUnique({
    where: { id: orgId },
    select: { ownerId: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (org.ownerId !== auth.adminId) {
    return NextResponse.json({ error: "Only the organization owner can send invitations" }, { status: 403 });
  }

  let body: z.infer<typeof createInvitationSchema>;
  try {
    body = createInvitationSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid request", issues: err }, { status: 400 });
  }

  // Stripe permissions are sensitive — must be explicitly in the request (already handled by schema)
  // Block re-inviting an already-active member
  const existingMember = await prisma.adminOrganizationMembership.findFirst({
    where: {
      organizationId: orgId,
      admin: { user: { email: body.email } },
    },
  });
  if (existingMember) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 409 });
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.adminInvitation.findFirst({
    where: {
      organizationId: orgId,
      invitedEmail: body.email,
      status: AdminInvitationStatus.PENDING,
    },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "Pending invitation already exists for this email" }, { status: 409 });
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email: body.email },
    select: { adminProfile: { select: { id: true } } },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invitation = await prisma.adminInvitation.create({
    data: {
      organizationId: orgId,
      invitedEmail: body.email,
      invitedAdminId: invitedUser?.adminProfile?.id ?? null,
      invitedByAdminId: auth.adminId,
      permissions: body.permissions,
      expiresAt,
    },
  });

  return NextResponse.json({ invitation }, { status: 201 });
}
